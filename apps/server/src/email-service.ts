/**
 * Email Service for XtraClass.ai
 * Handles all email notifications including welcome emails, password resets, and notifications
 */

import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("✅ SendGrid API configured");
} else {
  console.warn("⚠️ SENDGRID_API_KEY not found. Email functionality will be disabled.");
}

/**
 * Get the base URL for the application based on environment
 * Uses REPLIT_DEPLOYMENT to detect production vs development
 * - Production (REPLIT_DEPLOYMENT=1): Uses PUBLIC_APP_URL or default production domain
 * - Development: Uses REPLIT_DEV_DOMAIN for dev URLs
 */
function getBaseUrl(): string {
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isProduction) {
    // In production: use PUBLIC_APP_URL or default to xtraclass.ai
    return process.env.PUBLIC_APP_URL || 'https://xtraclass.ai';
  }
  
  // In development: use REPLIT_DEV_DOMAIN for dev URLs
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Fallback (local development without Replit)
  return 'http://localhost:5000';
}

/**
 * Get the dashboard URL for the application
 */
function getDashboardUrl(): string {
  return `${getBaseUrl()}/dashboard`;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'tutor';
  schoolName?: string;
  gradeLevel?: string;
  subjects?: string[];
  childName?: string;
}

class EmailService {
  private readonly fromEmail = process.env.FROM_EMAIL || 'noreply@xtraclass.ai';
  private readonly fromName = 'XtraClass.ai Team';
  private readonly isEnabled = !!process.env.SENDGRID_API_KEY;

  /**
   * Send email using SendGrid
   */
  async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        html,
        text,
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send welcome email using SendGrid template (recommended)
   */
  async sendWelcomeEmailWithTemplate(userData: WelcomeEmailData): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const msg = {
        to: userData.email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-33445780245c44f8857b6348e3d84af9', // Welcome email template
        dynamic_template_data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          dashboardLink: getDashboardUrl(),
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Welcome email sent to: ${userData.email} (${userData.role}) using template`);
      console.log(`📍 Dashboard URL: ${getDashboardUrl()}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send welcome email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send parent subscription request email using SendGrid template
   */
  async sendParentSubscriptionRequest(
    parentEmail: string,
    parentName: string,
    studentName: string,
    studentEmail: string,
    consentLink: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const msg = {
        to: parentEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-ef7654f0a560434cab81293dd985df82', // Parent subscription request template
        dynamic_template_data: {
          parentName: parentName,
          studentName: studentName,
          studentEmail: studentEmail,
          consentLink: consentLink,
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Parent subscription request email sent to: ${parentEmail} using template`);
      console.log(`📍 Consent Link: ${consentLink}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send parent subscription request email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send email confirmation using SendGrid template (for students/parents)
   */
  async sendEmailConfirmation(
    email: string,
    firstName: string,
    lastName: string,
    verificationToken: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const verifyLink = `${getBaseUrl()}/api/verify-email/${verificationToken}`;
      
      // Use the same working template as teachers
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-df8efabb4335469e9d7835339201e40a', // Teacher email confirmation template (works for all users)
        dynamic_template_data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          verifyLink: verifyLink,
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Email confirmation sent to: ${email}`);
      console.log(`📍 Verification Link: ${verifyLink}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email confirmation:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send email confirmation for teachers using SendGrid template
   */
  async sendTeacherEmailConfirmation(
    email: string,
    firstName: string,
    lastName: string,
    verificationToken: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const verifyLink = `${getBaseUrl()}/api/verify-email/${verificationToken}`;
      
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-df8efabb4335469e9d7835339201e40a', // Teacher email confirmation template
        dynamic_template_data: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          verifyLink: verifyLink,
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Teacher email confirmation sent to: ${email}`);
      console.log(`📍 Verification Link: ${verifyLink}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send teacher email confirmation:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const resetLink = `${getBaseUrl()}/reset-password/${resetToken}`;
      
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Reset Your XtraClass.ai Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00AACC; margin: 0;">XtraClass.ai</h1>
            </div>
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #00AACC; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              XtraClass.ai - Building Mathematical Confidence
            </p>
          </div>
        `,
        text: `Hi ${firstName},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request a password reset, you can safely ignore this email.\n\nXtraClass.ai - Building Mathematical Confidence`,
      };

      await sgMail.send(msg);
      console.log(`✅ Password reset email sent to: ${email}`);
      console.log(`📍 Reset Link: ${resetLink}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send parent credentials email with auto-generated login details using SendGrid template
   */
  async sendParentCredentialsEmail(
    parentEmail: string,
    parentName: string,
    temporaryPassword: string,
    studentName: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const msg = {
        to: parentEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-7173b5026eac41beba3219dc94a42adc', // Parent credentials template
        dynamic_template_data: {
          parentName: parentName,
          studentName: studentName,
          parentEmail: parentEmail,
          temporaryPassword: temporaryPassword,
          dashboardLink: getDashboardUrl(),
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Parent credentials email sent to: ${parentEmail} using template`);
      console.log(`👤 Parent: ${parentName}`);
      console.log(`👨‍👩‍👧 Student: ${studentName}`);
      console.log(`📍 Dashboard URL: ${getDashboardUrl()}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send parent credentials email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send student subscription confirmation email using SendGrid template
   */
  async sendStudentSubscriptionConfirmation(
    studentEmail: string,
    studentFirstName: string,
    studentLastName: string,
    planName?: string,
    billingCycle?: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const msg = {
        to: studentEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: 'd-07e973cbedb442228cf9fa275a152459', // Student subscription confirmation template
        dynamic_template_data: {
          first_name: studentFirstName,
          last_name: studentLastName,
          email: studentEmail,
          service_name: 'XtraClass.ai',
          plan_name: planName || 'Premium',
          start_date: formattedDate,
          billing_cycle: billingCycle || 'Monthly',
          login_link: getDashboardUrl(),
          support_email: 'info@xtraclass.ai',
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Student subscription confirmation email sent to: ${studentEmail} using template`);
      console.log(`👨‍🎓 Student: ${studentFirstName} ${studentLastName}`);
      console.log(`📦 Plan: ${planName || 'Premium'} (${billingCycle || 'Monthly'})`);
      console.log(`📍 Login URL: ${getDashboardUrl()}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send student subscription confirmation email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send welcome email based on user role (legacy - uses HTML templates)
   */
  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<boolean> {
    const template = this.getWelcomeTemplate(userData);
    
    return await this.sendEmail(
      userData.email,
      template.subject,
      template.html,
      template.text
    );
  }

  /**
   * Get welcome email template based on user role
   */
  private getWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    switch (userData.role) {
      case 'student':
        return this.getStudentWelcomeTemplate(userData);
      case 'parent':
        return this.getParentWelcomeTemplate(userData);
      case 'teacher':
        return this.getTeacherWelcomeTemplate(userData);
      case 'tutor':
        return this.getTutorWelcomeTemplate(userData);
      default:
        return this.getDefaultWelcomeTemplate(userData);
    }
  }

  /**
   * Student Welcome Email Template
   */
  private getStudentWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    const subject = `🎉 Welcome to XtraClass.ai, ${userData.firstName}! Your Learning Adventure Begins!`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XtraClass.ai</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-badge {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            color: #8b4513;
            padding: 15px 25px;
            border-radius: 25px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
            font-size: 18px;
        }
        .features {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
        }
        .feature-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .cta-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .grade-badge {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            color: #2c3e50;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎓 XtraClass.ai</div>
            <h1>Welcome to Your Learning Adventure!</h1>
        </div>
        
        <div class="content">
            <div class="welcome-badge">
                🌟 Welcome, ${userData.firstName}! 🌟
            </div>
            
            <p>Hi <strong>${userData.firstName}</strong>,</p>
            
            <p>🎉 Congratulations on joining XtraClass.ai! You're about to embark on an exciting learning journey where education meets gamification.</p>
            
            ${userData.gradeLevel ? `<p>We see you're in <span class="grade-badge">Grade ${userData.gradeLevel}</span> - perfect! We have tons of engaging content designed specifically for your level.</p>` : ''}
            
            ${userData.subjects && userData.subjects.length > 0 ? `
            <p><strong>Your Selected Subjects:</strong></p>
            <div style="margin: 15px 0;">
                ${userData.subjects.map(subject => `<span class="grade-badge">${subject}</span>`).join(' ')}
            </div>
            ` : ''}
            
            <div class="features">
                <h3>🚀 What's Waiting for You:</h3>
                
                <div class="feature-item">
                    <div class="feature-icon">🎯</div>
                    <div>
                        <strong>Personalized Learning</strong><br>
                        AI-powered homework and exercises tailored just for you
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">🏆</div>
                    <div>
                        <strong>Gamified Experience</strong><br>
                        Earn points, unlock achievements, and level up your knowledge
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">💬</div>
                    <div>
                        <strong>AI Learning Assistant</strong><br>
                        Get instant help and explanations whenever you're stuck
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div>
                        <strong>Progress Tracking</strong><br>
                        Watch your skills grow with detailed progress reports
                    </div>
                </div>
            </div>
            
            <h3>🎮 Ready to Start Learning?</h3>
            <p>Your dashboard is ready and waiting! Log in to explore your personalized learning space, complete your first exercise, and start earning points!</p>
            
            <div style="text-align: center;">
                <a href="${getDashboardUrl()}" class="cta-button">
                    🎯 Start Your Learning Journey
                </a>
            </div>
            
            <p><strong>💡 Pro Tips to Get Started:</strong></p>
            <ul>
                <li>Complete your profile for better personalized content</li>
                <li>Try your first exercise to see how the AI helps you learn</li>
                <li>Check out the tutorial videos in your dashboard</li>
                <li>Don't hesitate to ask the AI assistant for help!</li>
            </ul>
            
            <p>Welcome to the XtraClass.ai family, ${userData.firstName}! We're excited to be part of your educational journey. 🌟</p>
            
            <p>Happy Learning!<br>
            <strong>The XtraClass.ai Team</strong></p>
        </div>
        
        <div class="footer">
            <p>🌐 XtraClass.ai - Where Learning Meets Innovation</p>
            <p>Need help? Contact us at support@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai, ${userData.firstName}!

Congratulations on joining XtraClass.ai! You're about to embark on an exciting learning journey where education meets gamification.

${userData.gradeLevel ? `We see you're in Grade ${userData.gradeLevel} - perfect! We have tons of engaging content designed specifically for your level.` : ''}

${userData.subjects && userData.subjects.length > 0 ? `Your Selected Subjects: ${userData.subjects.join(', ')}` : ''}

What's Waiting for You:
🎯 Personalized Learning - AI-powered homework and exercises tailored just for you
🏆 Gamified Experience - Earn points, unlock achievements, and level up your knowledge  
💬 AI Learning Assistant - Get instant help and explanations whenever you're stuck
📊 Progress Tracking - Watch your skills grow with detailed progress reports

Ready to Start Learning?
Your dashboard is ready and waiting! Log in to explore your personalized learning space, complete your first exercise, and start earning points!

Visit: ${getDashboardUrl()}

Pro Tips to Get Started:
- Complete your profile for better personalized content
- Try your first exercise to see how the AI helps you learn
- Check out the tutorial videos in your dashboard
- Don't hesitate to ask the AI assistant for help!

Welcome to the XtraClass.ai family! We're excited to be part of your educational journey.

Happy Learning!
The XtraClass.ai Team

Need help? Contact us at support@xtraclass.ai
`;

    return { subject, html, text };
  }

  /**
   * Parent Welcome Email Template
   */
  private getParentWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    const subject = `👨‍👩‍👧‍👦 Welcome to XtraClass.ai! Supporting Your Child's Learning Journey`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XtraClass.ai</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-badge {
            background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
            font-size: 18px;
        }
        .features {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
        }
        .feature-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .cta-button {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .highlight-box {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #0984e3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👨‍👩‍👧‍👦 XtraClass.ai</div>
            <h1>Supporting Your Child's Success</h1>
        </div>
        
        <div class="content">
            <div class="welcome-badge">
                🌟 Welcome, ${userData.firstName}! 🌟
            </div>
            
            <p>Dear <strong>${userData.firstName}</strong>,</p>
            
            <p>Welcome to XtraClass.ai! Thank you for choosing us to support your child's educational journey. As a parent, you play a crucial role in your child's academic success, and we're here to make that journey more engaging and effective.</p>
            
            <div class="highlight-box">
                <h3>🎯 Our Mission</h3>
                <p>We believe every child deserves personalized, engaging education that adapts to their unique learning style. With AI-powered learning and gamification, we make studying fun while ensuring real academic progress.</p>
            </div>
            
            <div class="features">
                <h3>📊 Parent Dashboard Features:</h3>
                
                <div class="feature-item">
                    <div class="feature-icon">📈</div>
                    <div>
                        <strong>Real-Time Progress Tracking</strong><br>
                        Monitor your child's learning progress across all subjects
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">🎯</div>
                    <div>
                        <strong>Detailed Performance Reports</strong><br>
                        Weekly insights into strengths and areas for improvement
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">🏆</div>
                    <div>
                        <strong>Achievement Notifications</strong><br>
                        Celebrate your child's milestones and accomplishments
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">💬</div>
                    <div>
                        <strong>Communication Hub</strong><br>
                        Connect with teachers and receive important updates
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📚</div>
                    <div>
                        <strong>Learning Resources</strong><br>
                        Access tips and strategies to support learning at home
                    </div>
                </div>
            </div>
            
            <h3>🚀 Getting Started:</h3>
            <ol>
                <li><strong>Access Your Parent Dashboard</strong> - View your child's progress and activities</li>
                <li><strong>Set Learning Goals</strong> - Work together to establish achievable targets</li>
                <li><strong>Monitor Daily Progress</strong> - Stay informed about homework and exercise completion</li>
                <li><strong>Celebrate Achievements</strong> - Acknowledge your child's hard work and progress</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="${getDashboardUrl()}" class="cta-button">
                    📊 Access Parent Dashboard
                </a>
            </div>
            
            <div class="highlight-box">
                <h3>💡 Tips for Supporting Your Child:</h3>
                <ul>
                    <li>Create a dedicated study space at home</li>
                    <li>Establish consistent study routines</li>
                    <li>Celebrate small wins and progress</li>
                    <li>Communicate regularly about their learning experience</li>
                    <li>Use our progress reports to identify areas that need extra attention</li>
                </ul>
            </div>
            
            <p>We're committed to making your child's educational journey both successful and enjoyable. Our team is always here to support you and answer any questions you might have.</p>
            
            <p>Thank you for trusting us with your child's education!</p>
            
            <p>Best regards,<br>
            <strong>The XtraClass.ai Team</strong></p>
        </div>
        
        <div class="footer">
            <p>🌐 XtraClass.ai - Empowering Parents, Inspiring Students</p>
            <p>Questions? Reach out to us at support@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai!

Dear ${userData.firstName},

Welcome to XtraClass.ai! Thank you for choosing us to support your child's educational journey. As a parent, you play a crucial role in your child's academic success, and we're here to make that journey more engaging and effective.

Our Mission:
We believe every child deserves personalized, engaging education that adapts to their unique learning style. With AI-powered learning and gamification, we make studying fun while ensuring real academic progress.

Parent Dashboard Features:
📈 Real-Time Progress Tracking - Monitor your child's learning progress across all subjects
🎯 Detailed Performance Reports - Weekly insights into strengths and areas for improvement
🏆 Achievement Notifications - Celebrate your child's milestones and accomplishments
💬 Communication Hub - Connect with teachers and receive important updates
📚 Learning Resources - Access tips and strategies to support learning at home

Getting Started:
1. Access Your Parent Dashboard - View your child's progress and activities
2. Set Learning Goals - Work together to establish achievable targets
3. Monitor Daily Progress - Stay informed about homework and exercise completion
4. Celebrate Achievements - Acknowledge your child's hard work and progress

Access your dashboard: ${getDashboardUrl()}

Tips for Supporting Your Child:
- Create a dedicated study space at home
- Establish consistent study routines
- Celebrate small wins and progress
- Communicate regularly about their learning experience
- Use our progress reports to identify areas that need extra attention

We're committed to making your child's educational journey both successful and enjoyable. Our team is always here to support you and answer any questions you might have.

Thank you for trusting us with your child's education!

Best regards,
The XtraClass.ai Team

Questions? Reach out to us at support@xtraclass.ai
`;

    return { subject, html, text };
  }

  /**
   * Teacher Welcome Email Template
   */
  private getTeacherWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    const subject = `👩‍🏫 Welcome to XtraClass.ai! Revolutionize Your Teaching Experience`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XtraClass.ai</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-badge {
            background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
            font-size: 18px;
        }
        .features {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
        }
        .feature-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .cta-button {
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .highlight-box {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #00b894;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">👩‍🏫 XtraClass.ai</div>
            <h1>Empowering Educators</h1>
        </div>
        
        <div class="content">
            <div class="welcome-badge">
                🌟 Welcome, Educator ${userData.firstName}! 🌟
            </div>
            
            <p>Dear <strong>${userData.firstName}</strong>,</p>
            
            <p>Welcome to XtraClass.ai! We're thrilled to have you join our community of innovative educators who are transforming the way students learn and engage with education.</p>
            
            <div class="highlight-box">
                <h3>🚀 Revolutionize Your Teaching</h3>
                <p>XtraClass.ai combines the power of artificial intelligence with gamification to create an engaging, personalized learning experience that reduces your workload while improving student outcomes.</p>
            </div>
            
            <div class="features">
                <h3>🛠️ Teacher Tools & Features:</h3>
                
                <div class="feature-item">
                    <div class="feature-icon">🤖</div>
                    <div>
                        <strong>AI-Powered Content Generation</strong><br>
                        Automatically create homework, quizzes, and exercises aligned with CAPS curriculum
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">⚡</div>
                    <div>
                        <strong>Instant Grading & Feedback</strong><br>
                        AI evaluates student work and provides detailed feedback instantly
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div>
                        <strong>Advanced Analytics</strong><br>
                        Track class performance, identify learning gaps, and monitor progress
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">🎯</div>
                    <div>
                        <strong>Personalized Learning Paths</strong><br>
                        AI creates individual learning experiences for each student
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📚</div>
                    <div>
                        <strong>Curriculum Management</strong><br>
                        Organize lessons by topics, themes, and CAPS requirements
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">💬</div>
                    <div>
                        <strong>Parent Communication</strong><br>
                        Keep parents informed with automated progress reports
                    </div>
                </div>
            </div>
            
            <h3>📈 Getting Started - Your First Week:</h3>
            <ol>
                <li><strong>Set Up Your Classes</strong> - Add your students and organize by grade/subject</li>
                <li><strong>Create Your First Assignment</strong> - Use AI to generate curriculum-aligned content</li>
                <li><strong>Explore Analytics</strong> - Understand your students' baseline performance</li>
                <li><strong>Customize Settings</strong> - Tailor the platform to your teaching style</li>
                <li><strong>Engage with Students</strong> - Watch as they discover gamified learning</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="${getDashboardUrl()}" class="cta-button">
                    🏫 Access Teacher Dashboard
                </a>
            </div>
            
            <div class="highlight-box">
                <h3>💡 Pro Tips for Success:</h3>
                <ul>
                    <li>Start with one class to familiarize yourself with the platform</li>
                    <li>Use AI-generated content as a starting point, then customize as needed</li>
                    <li>Encourage students to use the AI learning assistant for help</li>
                    <li>Review analytics weekly to identify students who need extra support</li>
                    <li>Join our teacher community for best practices and support</li>
                </ul>
            </div>
            
            <h3>🎓 Professional Development</h3>
            <p>We offer comprehensive training sessions, webinars, and resources to help you maximize the potential of XtraClass.ai. Check your dashboard for upcoming training opportunities!</p>
            
            <p>We're here to support you every step of the way. Our team believes that empowered teachers create exceptional learning experiences.</p>
            
            <p>Ready to transform your classroom? Let's get started!</p>
            
            <p>Best regards,<br>
            <strong>The XtraClass.ai Team</strong></p>
        </div>
        
        <div class="footer">
            <p>🌐 XtraClass.ai - Empowering Educators, Inspiring Students</p>
            <p>Support & Training: support@xtraclass.ai | teacher-training@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai!

Dear ${userData.firstName},

Welcome to XtraClass.ai! We're thrilled to have you join our community of innovative educators who are transforming the way students learn and engage with education.

Revolutionize Your Teaching:
XtraClass.ai combines the power of artificial intelligence with gamification to create an engaging, personalized learning experience that reduces your workload while improving student outcomes.

Teacher Tools & Features:
🤖 AI-Powered Content Generation - Automatically create homework, quizzes, and exercises aligned with CAPS curriculum
⚡ Instant Grading & Feedback - AI evaluates student work and provides detailed feedback instantly
📊 Advanced Analytics - Track class performance, identify learning gaps, and monitor progress
🎯 Personalized Learning Paths - AI creates individual learning experiences for each student
📚 Curriculum Management - Organize lessons by topics, themes, and CAPS requirements
💬 Parent Communication - Keep parents informed with automated progress reports

Getting Started - Your First Week:
1. Set Up Your Classes - Add your students and organize by grade/subject
2. Create Your First Assignment - Use AI to generate curriculum-aligned content
3. Explore Analytics - Understand your students' baseline performance
4. Customize Settings - Tailor the platform to your teaching style
5. Engage with Students - Watch as they discover gamified learning

Access your dashboard: ${getDashboardUrl()}

Pro Tips for Success:
- Start with one class to familiarize yourself with the platform
- Use AI-generated content as a starting point, then customize as needed
- Encourage students to use the AI learning assistant for help
- Review analytics weekly to identify students who need extra support
- Join our teacher community for best practices and support

Professional Development:
We offer comprehensive training sessions, webinars, and resources to help you maximize the potential of XtraClass.ai. Check your dashboard for upcoming training opportunities!

We're here to support you every step of the way. Our team believes that empowered teachers create exceptional learning experiences.

Ready to transform your classroom? Let's get started!

Best regards,
The XtraClass.ai Team

Support & Training: support@xtraclass.ai | teacher-training@xtraclass.ai
`;

    return { subject, html, text };
  }

  /**
   * Tutor Welcome Email Template
   */
  private getTutorWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    const subject = `🎯 Welcome to XtraClass.ai! Your Tutoring Practice, Enhanced`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XtraClass.ai</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-badge {
            background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
            font-size: 18px;
        }
        .features {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
        }
        .feature-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .cta-button {
            background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .highlight-box {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #fd79a8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 XtraClass.ai</div>
            <h1>Enhance Your Tutoring Practice</h1>
        </div>
        
        <div class="content">
            <div class="welcome-badge">
                🌟 Welcome, Tutor ${userData.firstName}! 🌟
            </div>
            
            <p>Dear <strong>${userData.firstName}</strong>,</p>
            
            <p>Welcome to XtraClass.ai! We're excited to have you join our platform where tutoring meets cutting-edge technology. You're about to discover how AI can enhance your tutoring sessions and help your students achieve better results.</p>
            
            <div class="highlight-box">
                <h3>🎯 Elevate Your Tutoring</h3>
                <p>Our AI-powered platform helps you deliver more personalized, effective tutoring sessions while providing valuable insights into each student's learning progress and areas for improvement.</p>
            </div>
            
            <div class="features">
                <h3>💼 Tutor Tools & Features:</h3>
                
                <div class="feature-item">
                    <div class="feature-icon">🎲</div>
                    <div>
                        <strong>AI Content Generation</strong><br>
                        Create personalized exercises and assessments for each student
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📈</div>
                    <div>
                        <strong>Student Progress Tracking</strong><br>
                        Monitor individual progress and identify learning gaps
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">🧠</div>
                    <div>
                        <strong>Adaptive Learning Insights</strong><br>
                        Get AI recommendations for each student's learning path
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">⏱️</div>
                    <div>
                        <strong>Session Management</strong><br>
                        Schedule and track tutoring sessions with built-in tools
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div>
                        <strong>Performance Analytics</strong><br>
                        Detailed reports to share with students and parents
                    </div>
                </div>
                
                <div class="feature-item">
                    <div class="feature-icon">💬</div>
                    <div>
                        <strong>Parent Communication</strong><br>
                        Keep parents updated on their child's progress
                    </div>
                </div>
            </div>
            
            <h3>🚀 Getting Started Guide:</h3>
            <ol>
                <li><strong>Set Up Your Profile</strong> - Add your expertise areas and availability</li>
                <li><strong>Add Your Students</strong> - Create profiles for each student you tutor</li>
                <li><strong>Assess Current Levels</strong> - Use our diagnostic tools to understand baselines</li>
                <li><strong>Create Learning Plans</strong> - Develop personalized curricula with AI assistance</li>
                <li><strong>Track Progress</strong> - Monitor improvements and adjust strategies</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="${getDashboardUrl()}" class="cta-button">
                    🎯 Access Tutor Dashboard
                </a>
            </div>
            
            <div class="highlight-box">
                <h3>💡 Tutoring Success Tips:</h3>
                <ul>
                    <li>Use AI-generated exercises to supplement your lesson plans</li>
                    <li>Review student analytics before each session</li>
                    <li>Set weekly goals and track achievement together</li>
                    <li>Share progress reports with parents regularly</li>
                    <li>Encourage students to use the AI assistant between sessions</li>
                </ul>
            </div>
            
            <h3>🤝 Building Your Tutoring Practice</h3>
            <p>XtraClass.ai doesn't just help you teach better—it helps you demonstrate the value you provide. With detailed analytics and progress tracking, you can show parents exactly how their children are improving under your guidance.</p>
            
            <h3>📚 Professional Development</h3>
            <p>Access our tutor resources, best practice guides, and training materials to continuously improve your tutoring effectiveness and leverage our AI tools to their fullest potential.</p>
            
            <p>We're committed to supporting your success as an educator. Together, we can make learning more engaging and effective for every student you work with.</p>
            
            <p>Ready to enhance your tutoring practice? Let's get started!</p>
            
            <p>Best regards,<br>
            <strong>The XtraClass.ai Team</strong></p>
        </div>
        
        <div class="footer">
            <p>🌐 XtraClass.ai - Empowering Tutors, Inspiring Students</p>
            <p>Support & Resources: support@xtraclass.ai | tutor-resources@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai!

Dear ${userData.firstName},

Welcome to XtraClass.ai! We're excited to have you join our platform where tutoring meets cutting-edge technology. You're about to discover how AI can enhance your tutoring sessions and help your students achieve better results.

Elevate Your Tutoring:
Our AI-powered platform helps you deliver more personalized, effective tutoring sessions while providing valuable insights into each student's learning progress and areas for improvement.

Tutor Tools & Features:
🎲 AI Content Generation - Create personalized exercises and assessments for each student
📈 Student Progress Tracking - Monitor individual progress and identify learning gaps
🧠 Adaptive Learning Insights - Get AI recommendations for each student's learning path
⏱️ Session Management - Schedule and track tutoring sessions with built-in tools
📊 Performance Analytics - Detailed reports to share with students and parents
💬 Parent Communication - Keep parents updated on their child's progress

Getting Started Guide:
1. Set Up Your Profile - Add your expertise areas and availability
2. Add Your Students - Create profiles for each student you tutor
3. Assess Current Levels - Use our diagnostic tools to understand baselines
4. Create Learning Plans - Develop personalized curricula with AI assistance
5. Track Progress - Monitor improvements and adjust strategies

Access your dashboard: ${getDashboardUrl()}

Tutoring Success Tips:
- Use AI-generated exercises to supplement your lesson plans
- Review student analytics before each session
- Set weekly goals and track achievement together
- Share progress reports with parents regularly
- Encourage students to use the AI assistant between sessions

Building Your Tutoring Practice:
XtraClass.ai doesn't just help you teach better—it helps you demonstrate the value you provide. With detailed analytics and progress tracking, you can show parents exactly how their children are improving under your guidance.

Professional Development:
Access our tutor resources, best practice guides, and training materials to continuously improve your tutoring effectiveness and leverage our AI tools to their fullest potential.

We're committed to supporting your success as an educator. Together, we can make learning more engaging and effective for every student you work with.

Ready to enhance your tutoring practice? Let's get started!

Best regards,
The XtraClass.ai Team

Support & Resources: support@xtraclass.ai | tutor-resources@xtraclass.ai
`;

    return { subject, html, text };
  }

  /**
   * Default Welcome Email Template (fallback)
   */
  private getDefaultWelcomeTemplate(userData: WelcomeEmailData): EmailTemplate {
    const subject = `🎉 Welcome to XtraClass.ai, ${userData.firstName}!`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XtraClass.ai</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .content {
            padding: 40px 30px;
        }
        .cta-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 XtraClass.ai</h1>
            <h2>Welcome to the Future of Learning!</h2>
        </div>
        
        <div class="content">
            <p>Dear <strong>${userData.firstName}</strong>,</p>
            
            <p>Welcome to XtraClass.ai! We're thrilled to have you join our educational community.</p>
            
            <p>Get ready to experience learning like never before with our AI-powered platform that makes education engaging, personalized, and fun!</p>
            
            <div style="text-align: center;">
                <a href="${getDashboardUrl()}" class="cta-button">
                    🚀 Get Started
                </a>
            </div>
            
            <p>If you have any questions, our support team is here to help!</p>
            
            <p>Best regards,<br>
            <strong>The XtraClass.ai Team</strong></p>
        </div>
        
        <div class="footer">
            <p>🌐 XtraClass.ai - Where Learning Meets Innovation</p>
            <p>Support: support@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai!

Dear ${userData.firstName},

Welcome to XtraClass.ai! We're thrilled to have you join our educational community.

Get ready to experience learning like never before with our AI-powered platform that makes education engaging, personalized, and fun!

Get started: ${getDashboardUrl()}

If you have any questions, our support team is here to help!

Best regards,
The XtraClass.ai Team

Support: support@xtraclass.ai
`;

    return { subject, html, text };
  }

  /**
   * Send demo request email to info@xtraclass.ai
   */
  async sendDemoRequest(
    name: string,
    email: string,
    institution?: string,
    message?: string
  ): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    try {
      const subject = `🎓 New Demo Request from ${name}`;
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo Request</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .content {
            padding: 30px;
        }
        .info-row {
            margin: 15px 0;
            padding: 10px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
        }
        .label {
            font-weight: bold;
            color: #667eea;
            display: block;
            margin-bottom: 5px;
        }
        .value {
            color: #2c3e50;
        }
        .footer {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            text-align: center;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 New Demo Request</h1>
        </div>
        
        <div class="content">
            <p>A new demo request has been submitted through the XtraClass.ai website.</p>
            
            <div class="info-row">
                <span class="label">Full Name:</span>
                <span class="value">${name}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Email Address:</span>
                <span class="value">${email}</span>
            </div>
            
            ${institution ? `
            <div class="info-row">
                <span class="label">School/Institution:</span>
                <span class="value">${institution}</span>
            </div>
            ` : ''}
            
            ${message ? `
            <div class="info-row">
                <span class="label">Message:</span>
                <span class="value">${message}</span>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">
                <strong>Next Steps:</strong><br>
                Please respond to this request within 24 hours at: <a href="mailto:${email}">${email}</a>
            </p>
        </div>
        
        <div class="footer">
            <p>XtraClass.ai Demo Request System</p>
        </div>
    </div>
</body>
</html>`;

      const text = `
New Demo Request - XtraClass.ai

Full Name: ${name}
Email Address: ${email}
${institution ? `School/Institution: ${institution}` : ''}
${message ? `Message: ${message}` : ''}

Please respond to this request within 24 hours at: ${email}

---
XtraClass.ai Demo Request System
`;

      await this.sendEmail('info@xtraclass.ai', subject, html, text);
      console.log(`✅ Demo request email sent to info@xtraclass.ai from: ${email}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send demo request email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to parent when their child is added to XtraClass
   * Uses SendGrid dynamic template - template ID to be configured
   */
  async sendParentStudentAddedEmail(data: {
    parentEmail: string;
    parentName?: string;
    studentFirstName: string;
    studentLastName: string;
    schoolName: string;
    grade: string;
    className: string;
    subject: string;
    teacherName?: string;
  }): Promise<boolean> {
    if (!this.isEnabled) {
      console.warn('📧 Email service disabled - SENDGRID_API_KEY not configured');
      return false;
    }

    if (!data.parentEmail) {
      console.warn('📧 No parent email provided - skipping parent notification');
      return false;
    }

    try {
      // Template ID placeholder - to be replaced with actual SendGrid template ID
      const templateId = process.env.SENDGRID_PARENT_STUDENT_ADDED_TEMPLATE_ID;
      
      if (!templateId) {
        console.warn('📧 SENDGRID_PARENT_STUDENT_ADDED_TEMPLATE_ID not configured - using fallback email');
        // Fallback to inline HTML email if template not configured
        return await this.sendParentStudentAddedEmailFallback(data);
      }

      const msg = {
        to: data.parentEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: templateId,
        dynamic_template_data: {
          parent_name: data.parentName || 'Parent',
          student_first_name: data.studentFirstName,
          student_last_name: data.studentLastName,
          student_full_name: `${data.studentFirstName} ${data.studentLastName}`,
          school_name: data.schoolName,
          grade: data.grade,
          class_name: data.className,
          subject: data.subject,
          teacher_name: data.teacherName || 'their teacher',
          dashboard_link: getDashboardUrl(),
          login_link: `${getBaseUrl()}/auth`,
        },
      };

      await sgMail.send(msg);
      console.log(`✅ Parent notification email sent to: ${data.parentEmail} for student ${data.studentFirstName} ${data.studentLastName}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send parent notification email:', error);
      return false;
    }
  }

  /**
   * Fallback email when SendGrid template is not configured
   */
  private async sendParentStudentAddedEmailFallback(data: {
    parentEmail: string;
    parentName?: string;
    studentFirstName: string;
    studentLastName: string;
    schoolName: string;
    grade: string;
    className: string;
    subject: string;
    teacherName?: string;
  }): Promise<boolean> {
    const parentName = data.parentName || 'Parent';
    const studentName = `${data.studentFirstName} ${data.studentLastName}`;
    const teacherName = data.teacherName || 'their teacher';
    const dashboardUrl = getDashboardUrl();
    const loginUrl = `${getBaseUrl()}/auth`;

    const subject = `Welcome to XtraClass.ai - ${studentName} has been added`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .info-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
        }
        .info-value {
            color: #1e293b;
            font-weight: 600;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            background: #1e293b;
            color: #94a3b8;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Welcome to XtraClass.ai</h1>
            <p>Your child's learning journey begins here</p>
        </div>
        
        <div class="content">
            <p>Dear ${parentName},</p>
            
            <p>Great news! <strong>${studentName}</strong> has been added to XtraClass.ai by ${teacherName}.</p>
            
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Student</span>
                    <span class="info-value">${studentName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">School</span>
                    <span class="info-value">${data.schoolName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Grade</span>
                    <span class="info-value">${data.grade}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Class</span>
                    <span class="info-value">${data.className}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Subject</span>
                    <span class="info-value">${data.subject}</span>
                </div>
            </div>
            
            <p>XtraClass.ai is an AI-powered learning platform that helps students build mathematical confidence through personalized practice and instant feedback.</p>
            
            <p>As a parent, you can:</p>
            <ul>
                <li>Track your child's progress and performance</li>
                <li>View homework assignments and deadlines</li>
                <li>See detailed feedback on completed work</li>
                <li>Communicate with teachers</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${loginUrl}" class="cta-button">Log In to XtraClass.ai</a>
            </p>
            
            <p>If you haven't registered yet, please create a parent account using this email address to link with your child's profile.</p>
            
            <p>Welcome to the XtraClass.ai family!</p>
            
            <p>Best regards,<br>The XtraClass.ai Team</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} XtraClass.ai - Africa's First AI Learning Platform</p>
            <p>Questions? Contact us at support@xtraclass.ai</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to XtraClass.ai

Dear ${parentName},

Great news! ${studentName} has been added to XtraClass.ai by ${teacherName}.

Student Details:
- Student: ${studentName}
- School: ${data.schoolName}
- Grade: ${data.grade}
- Class: ${data.className}
- Subject: ${data.subject}

XtraClass.ai is an AI-powered learning platform that helps students build mathematical confidence through personalized practice and instant feedback.

As a parent, you can:
- Track your child's progress and performance
- View homework assignments and deadlines
- See detailed feedback on completed work
- Communicate with teachers

Log in at: ${loginUrl}

If you haven't registered yet, please create a parent account using this email address to link with your child's profile.

Welcome to the XtraClass.ai family!

Best regards,
The XtraClass.ai Team

---
© ${new Date().getFullYear()} XtraClass.ai - Africa's First AI Learning Platform
Questions? Contact us at support@xtraclass.ai
`;

    return await this.sendEmail(data.parentEmail, subject, html, text);
  }
}

export const emailService = new EmailService();