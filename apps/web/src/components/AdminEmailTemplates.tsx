import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminEmailTemplates() {
  const { toast } = useToast();
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const copyToClipboard = (html: string, templateName: string) => {
    navigator.clipboard.writeText(html);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
    toast({
      title: "Copied!",
      description: `${templateName} template copied to clipboard`,
    });
  };

  const welcomeEmailHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to XtraClass.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #EEF2FF, #FFFFFF);">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(99, 102, 241, 0.1); overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center; background: white;">
              <img src="{{logoUrl}}" alt="XtraClass.ai" style="height: 50px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #3B82F6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 10px 0;">Welcome to XtraClass.ai! 🎉</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Africa's Premier AI Learning Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1E293B; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Hi {{firstName}},</h2>
              
              <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We're thrilled to have you join our community of learners! Your journey to educational excellence starts here.
              </p>
              
              <!-- Feature Cards -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background: linear-gradient(to right, #EEF2FF, #E0E7FF); border-radius: 12px; margin-bottom: 15px;">
                    <div style="color: #6366F1; font-size: 24px; margin-bottom: 8px;">✨</div>
                    <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">AI-Powered Learning</h3>
                    <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Get personalized feedback and tutorials tailored to your learning style</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; background: linear-gradient(to right, #F0FDFA, #CCFBF1); border-radius: 12px; margin: 15px 0;">
                    <div style="color: #14B8A6; font-size: 24px; margin-bottom: 8px;">🏆</div>
                    <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Gamified Experience</h3>
                    <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Earn points, climb leaderboards, and unlock achievements</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; background: linear-gradient(to right, #FFF7ED, #FED7AA); border-radius: 12px; margin-top: 15px;">
                    <div style="color: #F59E0B; font-size: 24px; margin-bottom: 8px;">📚</div>
                    <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Comprehensive Content</h3>
                    <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">Access lessons, exercises, and resources for Grades 8-12</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboardLink}}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions, our support team is always here to help.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 10px 0;">
                © 2025 XtraClass.ai - Transforming African Education
              </p>
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                This email was sent to {{email}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const passwordResetHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #FEF2F2, #FFFFFF);">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(239, 68, 68, 0.1); overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center; background: white;">
              <img src="{{logoUrl}}" alt="XtraClass.ai" style="height: 50px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
              <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0;">Password Reset Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1E293B; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Hi {{firstName}},</h2>
              
              <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset the password for your XtraClass.ai account. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{resetLink}}" style="display: inline-block; background: linear-gradient(135deg, #EF4444, #DC2626); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #991B1B; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
                </p>
              </div>
              
              <p style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0;">
                Or copy and paste this link into your browser:<br>
                <code style="background: #F1F5F9; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">{{resetLink}}</code>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 10px 0;">
                © 2025 XtraClass.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subscriptionConfirmationHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #ECFDF5, #FFFFFF);">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.1); overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center; background: white;">
              <img src="{{logoUrl}}" alt="XtraClass.ai" style="height: 50px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 10px;">✓</div>
              <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0;">Subscription Confirmed!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1E293B; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Welcome to Premium, {{firstName}}!</h2>
              
              <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for subscribing to XtraClass.ai Premium. You now have full access to all our features!
              </p>
              
              <!-- Subscription Details -->
              <table role="presentation" style="width: 100%; background: linear-gradient(to right, #ECFDF5, #D1FAE5); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="color: #065F46; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">Subscription Details</h3>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #047857; font-size: 14px; padding: 5px 0;">Plan:</td>
                        <td style="color: #065F46; font-size: 14px; font-weight: 600; text-align: right;">{{planName}}</td>
                      </tr>
                      <tr>
                        <td style="color: #047857; font-size: 14px; padding: 5px 0;">Amount:</td>
                        <td style="color: #065F46; font-size: 14px; font-weight: 600; text-align: right;">{{amount}}</td>
                      </tr>
                      <tr>
                        <td style="color: #047857; font-size: 14px; padding: 5px 0;">Next Payment:</td>
                        <td style="color: #065F46; font-size: 14px; font-weight: 600; text-align: right;">{{nextPaymentDate}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- What's Included -->
              <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0;">What's Included:</h3>
              <ul style="color: #64748B; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                <li>Unlimited AI-powered tutorials and feedback</li>
                <li>Access to all subjects (Grades 8-12)</li>
                <li>Priority support</li>
                <li>Advanced analytics and progress tracking</li>
                <li>Offline content download</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboardLink}}" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                      Access My Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 10px 0;">
                © 2025 XtraClass.ai
              </p>
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                Manage your subscription in your account settings
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const parentCredentialsHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your XtraClass.ai Account is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #F0F9FF, #FFFFFF);">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(59, 130, 246, 0.1); overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center; background: white;">
              <img src="{{logoUrl}}" alt="XtraClass.ai" style="height: 50px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
              <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">Your Account is Ready!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Thanks for subscribing to XtraClass.ai Premium</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1E293B; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Hi {{parentName}},</h2>
              
              <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for subscribing to XtraClass.ai Premium on behalf of <strong style="color: #1E293B;">{{studentName}}</strong>. Your parent account has been created and is now active!
              </p>
              
              <!-- Credentials Box -->
              <div style="background: linear-gradient(to right, #EFF6FF, #DBEAFE); border-left: 4px solid #3B82F6; padding: 20px; border-radius: 12px; margin: 25px 0;">
                <h3 style="color: #1E40AF; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">🔐 Your Login Credentials</h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #1E40AF; font-size: 14px; padding: 8px 0; font-weight: 600;">Email:</td>
                    <td style="color: #1E293B; font-size: 14px; padding: 8px 0; font-family: 'Courier New', monospace; background: white; padding: 8px 12px; border-radius: 6px; word-break: break-all;">{{parentEmail}}</td>
                  </tr>
                  <tr>
                    <td style="color: #1E40AF; font-size: 14px; padding: 8px 0; font-weight: 600; vertical-align: top; padding-top: 16px;">Password:</td>
                    <td style="color: #1E293B; font-size: 14px; padding: 8px 0; font-family: 'Courier New', monospace; background: white; padding: 8px 12px; border-radius: 6px; margin-top: 8px; word-break: break-all;">{{temporaryPassword}}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Security Notice -->
              <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #991B1B; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>🔒 Security Recommendation:</strong> Please change your password after logging in for the first time. Go to Settings → Privacy & Security to update your password.
                </p>
              </div>
              
              <!-- Student Info -->
              <div style="background: linear-gradient(to right, #F0FDF4, #DCFCE7); padding: 20px; border-radius: 12px; margin: 25px 0;">
                <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">👨‍👩‍👧 Student Information</h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #15803D; font-size: 14px; padding: 5px 0;">Student Name:</td>
                    <td style="color: #166534; font-size: 14px; font-weight: 600; text-align: right;">{{studentName}}</td>
                  </tr>
                  <tr>
                    <td style="color: #15803D; font-size: 14px; padding: 5px 0;">Subscription:</td>
                    <td style="color: #166534; font-size: 14px; font-weight: 600; text-align: right;">Premium (Active)</td>
                  </tr>
                </table>
              </div>
              
              <!-- What You Can Do -->
              <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0;">What You Can Do:</h3>
              <ul style="color: #64748B; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                <li>Monitor {{studentName}}'s learning progress</li>
                <li>View completed assignments and grades</li>
                <li>Track achievement milestones</li>
                <li>Manage subscription and payment details</li>
                <li>Communicate with teachers</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboardLink}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      Login to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions or need assistance, our support team is here to help.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 10px 0;">
                © 2025 XtraClass.ai - Transforming African Education
              </p>
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                This email contains sensitive login information. Please keep it secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const parentSubscriptionRequestHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Request from Student</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(to bottom, #EEF2FF, #FFFFFF);">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(99, 102, 241, 0.1); overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center; background: white;">
              <img src="{{logoUrl}}" alt="XtraClass.ai" style="height: 50px; width: auto; max-width: 200px;" />
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #3B82F6 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
              <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">Subscription Request</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Your child wants to join XtraClass.ai Premium</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1E293B; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Hi {{parentName}},</h2>
              
              <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your child, <strong style="color: #1E293B;">{{studentName}}</strong>, has requested to subscribe to XtraClass.ai Premium - Africa's premier AI-powered learning platform.
              </p>
              
              <!-- Student Info -->
              <div style="background: linear-gradient(to right, #F0FDF4, #DCFCE7); padding: 20px; border-radius: 12px; margin: 25px 0;">
                <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">👨‍🎓 Student Information</h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #15803D; font-size: 14px; padding: 5px 0;">Name:</td>
                    <td style="color: #166534; font-size: 14px; font-weight: 600; text-align: right;">{{studentName}}</td>
                  </tr>
                  <tr>
                    <td style="color: #15803D; font-size: 14px; padding: 5px 0;">Email:</td>
                    <td style="color: #166534; font-size: 14px; font-weight: 600; text-align: right; word-break: break-all;">{{studentEmail}}</td>
                  </tr>
                </table>
              </div>
              
              <!-- What is XtraClass -->
              <h3 style="color: #1E293B; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0;">What is XtraClass.ai Premium?</h3>
              <ul style="color: #64748B; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                <li><strong style="color: #1E293B;">AI-Powered Tutoring:</strong> Personalized feedback and tutorials</li>
                <li><strong style="color: #1E293B;">CAPS Curriculum Aligned:</strong> Content for grades 8-12</li>
                <li><strong style="color: #1E293B;">Gamified Learning:</strong> Earn points and achievements</li>
                <li><strong style="color: #1E293B;">Parent Dashboard:</strong> Track progress and performance</li>
                <li><strong style="color: #1E293B;">Unlimited Access:</strong> All subjects and AI features</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{consentLink}}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; text-decoration: none; padding: 18px 45px; border-radius: 12px; font-weight: 600; font-size: 18px; box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);">
                      Review & Subscribe →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                This link is unique and will expire after use.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 10px 0;">
                Questions? Contact us at support@xtraclass.ai
              </p>
              <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                © 2025 XtraClass.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const emailTemplates = [
    {
      id: "welcome",
      name: "Welcome Email",
      description: "Sent to new users when they create an account",
      html: welcomeEmailHTML,
      variables: ["{{logoUrl}}", "{{firstName}}", "{{email}}", "{{dashboardLink}}"],
    },
    {
      id: "password-reset",
      name: "Password Reset",
      description: "Sent when a user requests to reset their password",
      html: passwordResetHTML,
      variables: ["{{logoUrl}}", "{{firstName}}", "{{resetLink}}"],
    },
    {
      id: "subscription",
      name: "Subscription Confirmation",
      description: "Sent when a user successfully subscribes to premium",
      html: subscriptionConfirmationHTML,
      variables: ["{{logoUrl}}", "{{firstName}}", "{{planName}}", "{{amount}}", "{{nextPaymentDate}}", "{{dashboardLink}}"],
    },
    {
      id: "parent-subscription-request",
      name: "Parent Subscription Request",
      description: "Sent to parents requesting them to subscribe on behalf of their student",
      html: parentSubscriptionRequestHTML,
      variables: ["{{logoUrl}}", "{{parentName}}", "{{studentName}}", "{{studentEmail}}", "{{consentLink}}"],
    },
    {
      id: "parent-credentials",
      name: "Parent Account Credentials",
      description: "Sent to parents with their auto-generated login details after subscribing for a student",
      html: parentCredentialsHTML,
      variables: ["{{logoUrl}}", "{{parentName}}", "{{parentEmail}}", "{{temporaryPassword}}", "{{studentName}}", "{{dashboardLink}}"],
    },
  ];

  return (
    <div className="flex-1 p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Email Templates</h2>
        <p className="text-sm text-slate-600">
          XtraClass.ai branded email templates for various user communications
        </p>
      </div>

      <Tabs defaultValue="welcome" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          {emailTemplates.map((template) => (
            <TabsTrigger key={template.id} value={template.id} className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {template.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {emailTemplates.map((template) => (
          <TabsContent key={template.id} value={template.id} className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{template.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(template.html, template.name)}
                    className="flex items-center gap-1 h-8"
                  >
                    {copiedTemplate === template.name ? (
                      <>
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-xs">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">Copy HTML</span>
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Variables */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">Template Variables:</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <code
                        key={variable}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono"
                      >
                        {variable}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">Preview:</h4>
                  <div className="border border-slate-200 rounded overflow-hidden bg-white">
                    <iframe
                      srcDoc={template.html
                        .replace(/<img src="\{\{logoUrl\}\}"[^>]*>/g, '<div style="font-size: 24px; font-weight: bold; color: #6366F1;">XtraClass.ai</div>')
                        .replace(/\{\{firstName\}\}/g, 'John')
                        .replace(/\{\{email\}\}/g, 'john.doe@example.com')
                        .replace(/\{\{dashboardLink\}\}/g, 'https://xtraclass.ai/dashboard')
                        .replace(/\{\{resetLink\}\}/g, 'https://xtraclass.ai/reset-password/token123')
                        .replace(/\{\{planName\}\}/g, 'Premium Monthly')
                        .replace(/\{\{amount\}\}/g, 'R299')
                        .replace(/\{\{nextPaymentDate\}\}/g, 'November 29, 2025')
                        .replace(/\{\{parentName\}\}/g, 'Sarah Johnson')
                        .replace(/\{\{parentEmail\}\}/g, 'sarah.johnson@example.com')
                        .replace(/\{\{temporaryPassword\}\}/g, 'Xyz9K#mP4qR2')
                        .replace(/\{\{studentName\}\}/g, 'Michael Johnson')
                      }
                      title={`${template.name} Preview`}
                      className="w-full h-[600px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>

                {/* HTML Code */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">HTML Code:</h4>
                  <div className="relative overflow-hidden">
                    <pre className="bg-slate-900 text-slate-50 p-2 rounded overflow-auto text-xs max-h-[300px] break-words whitespace-pre-wrap">
                      <code className="break-words">{template.html}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
