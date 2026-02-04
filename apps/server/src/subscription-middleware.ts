import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { verifyToken } from './auth';

/**
 * Middleware to check if the application requires a premium subscription
 * and if the user has an active subscription or trial period
 */
export async function checkSubscriptionAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Skip subscription check for auth routes, subscription management, and admin routes
    // Note: When mounted with app.use('/api', middleware), req.path doesn't include '/api'
    const publicPaths = [
      '/auth/', // All auth routes (login, register, logout, etc.)
      '/users', // User registration
      '/verify-email/', // Email verification (public link in emails)
      '/subscription/', // All subscription routes (plans, initialize, verify, webhook, etc.)
      '/subscription-plans', // View available plans
      '/admin/', // All admin routes
      '/schools/public', // Public schools list for registration
      '/students/check', // Student verification during registration
      '/children/check', // Child verification for parents
      '/children', // Allow children management for parents
      '/notifications/', // Allow notification access
      '/chat/', // Allow chat/conversation access
      '/parents/', // Allow parent analytics and features
      '/demo-request', // Demo request form on landing page
    ];

    // Check if the path starts with any public path
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Allow parent status and contact endpoints for subscription consent flow
    if (req.path.match(/^\/students\/\d+\/parent-(status|contact)$/)) {
      return next();
    }

    // Check if premium subscription is required (admin setting)
    const premiumSetting = await storage.getAdminSetting('require_premium_subscription');
    const requirePremium = premiumSetting?.settingValue?.enabled === true;

    // If premium is not required, allow access
    if (!requirePremium) {
      return next();
    }

    // Extract and verify JWT token to get user info
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        requiresSubscription: true,
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        requiresSubscription: true,
      });
    }

    // Use decoded user info for subscription check
    const userId = decoded.id;
    const userRole = decoded.role;

    // Admins and parents bypass subscription check
    if (userRole === 'admin' || userRole === 'parent') {
      return next();
    }

    // Check user's subscription status
    const subscription = await storage.getSubscriptionByUserId(userId);

    if (!subscription) {
      // No personal subscription - check for organization-based access (for students)
      if (userRole === 'student') {
        try {
          const orgMembership = await storage.getOrganizationStudentMembership(userId);
          if (orgMembership && orgMembership.isActive) {
            const orgFeatures = await storage.getOrganizationSubscriptionFeatures(orgMembership.organizationId);
            if (orgFeatures) {
              console.log(`✅ Student ${userId} has organization-based subscription access via organization ${orgMembership.organizationId}`);
              return next();
            }
          }
        } catch (error) {
          console.error(`⚠️ Error checking organization membership for user ${userId}:`, error);
        }
      }

      return res.status(403).json({
        error: 'Premium subscription required',
        requiresSubscription: true,
        message: 'This application requires a premium subscription. Please subscribe to continue.',
      });
    }

    // Check subscription status and expiration
    const now = new Date();

    // Handle trial period
    if (subscription.status === 'trial') {
      if (subscription.trialEndDate && new Date(subscription.trialEndDate) < now) {
        // Trial expired
        await storage.updateSubscription(subscription.id, { status: 'expired' });
        return res.status(403).json({
          error: 'Trial period expired',
          requiresSubscription: true,
          message: 'Your trial period has ended. Please subscribe to continue using the application.',
        });
      }
      // Trial still active
      return next();
    }

    // Handle active subscription
    if (subscription.status === 'active') {
      // Check if subscription has expired based on next_payment_date
      if (!subscription.nextPaymentDate) {
        // No next payment date - subscription data incomplete, deny access
        await storage.updateSubscription(subscription.id, { status: 'expired' });
        return res.status(403).json({
          error: 'Subscription data incomplete',
          requiresSubscription: true,
          message: 'Your subscription needs to be renewed. Please contact support or resubscribe.',
        });
      }
      
      if (new Date(subscription.nextPaymentDate) < now) {
        // Subscription expired - payment due date has passed
        await storage.updateSubscription(subscription.id, { status: 'expired' });
        return res.status(403).json({
          error: 'Subscription expired',
          requiresSubscription: true,
          message: 'Your subscription has expired. Please renew to continue using the application.',
        });
      }
      
      // Subscription active and not expired
      return next();
    }

    // Handle cancelled subscription - user retains access until nextPaymentDate
    if (subscription.status === 'cancelled') {
      // Check if user still has access until the paid period ends
      if (!subscription.nextPaymentDate) {
        // No next payment date - subscription expired
        await storage.updateSubscription(subscription.id, { status: 'expired' });
        return res.status(403).json({
          error: 'Subscription expired',
          requiresSubscription: true,
          message: 'Your subscription has expired. Please renew to continue using the application.',
        });
      }
      
      if (new Date(subscription.nextPaymentDate) < now) {
        // Paid period has ended - update to expired
        await storage.updateSubscription(subscription.id, { status: 'expired' });
        return res.status(403).json({
          error: 'Subscription expired',
          requiresSubscription: true,
          message: 'Your subscription has expired. Please renew to continue using the application.',
        });
      }
      
      // User still has access until nextPaymentDate (non-renewing)
      return next();
    }

    // Handle other statuses (expired, failed, etc.)
    return res.status(403).json({
      error: 'Invalid subscription status',
      requiresSubscription: true,
      subscriptionStatus: subscription.status,
      message: 'Your subscription is not active. Please subscribe or renew to continue.',
    });

  } catch (error) {
    console.error('Subscription middleware error:', error);
    // On error, allow access to prevent blocking the entire app
    next();
  }
}

/**
 * Helper function to check subscription status for a specific user
 * Returns subscription info without blocking the request
 */
export async function getUserSubscriptionStatus(userId: number): Promise<{
  hasAccess: boolean;
  subscription?: any;
  requiresPremium: boolean;
  message?: string;
}> {
  try {
    // Check if premium subscription is required
    const premiumSetting = await storage.getAdminSetting('require_premium_subscription');
    const requirePremium = premiumSetting?.settingValue?.enabled === true;

    if (!requirePremium) {
      return {
        hasAccess: true,
        requiresPremium: false,
      };
    }

    // Get user's subscription
    const subscription = await storage.getSubscriptionByUserId(userId);

    if (!subscription) {
      return {
        hasAccess: false,
        requiresPremium: true,
        message: 'No active subscription found',
      };
    }

    const now = new Date();

    // Check trial status
    if (subscription.status === 'trial') {
      const trialValid = subscription.trialEndDate && new Date(subscription.trialEndDate) >= now;
      return {
        hasAccess: trialValid || false,
        subscription,
        requiresPremium: true,
        message: trialValid ? 'Trial active' : 'Trial expired',
      };
    }

    // Check active subscription
    if (subscription.status === 'active') {
      const subscriptionValid = subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) >= now;
      return {
        hasAccess: subscriptionValid || false,
        subscription,
        requiresPremium: true,
        message: subscriptionValid ? 'Subscription active' : 'Subscription expired',
      };
    }

    // Check cancelled subscription - user retains access until nextPaymentDate
    if (subscription.status === 'cancelled') {
      const hasAccessUntilExpiry = subscription.nextPaymentDate && new Date(subscription.nextPaymentDate) >= now;
      return {
        hasAccess: hasAccessUntilExpiry || false,
        subscription,
        requiresPremium: true,
        message: hasAccessUntilExpiry ? 'Subscription cancelled (access until paid period ends)' : 'Subscription expired',
      };
    }

    return {
      hasAccess: false,
      subscription,
      requiresPremium: true,
      message: `Subscription status: ${subscription.status}`,
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      hasAccess: true, // Default to allowing access on error
      requiresPremium: false,
      message: 'Error checking subscription',
    };
  }
}
