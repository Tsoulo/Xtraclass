import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

// Email configuration
const EMAIL_CONFIG = {
  fromEmail: 'noreply@xtraclass.ai',
  fromName: 'XtraClass.ai',
  templates: {
    welcome: 'd-33445780245c44f8857b6348e3d84af9',
  }
};

/**
 * Get the base URL for the application based on environment
 * Development: Uses REPLIT_DEV_DOMAIN
 * Production: Uses PUBLIC_APP_URL or defaults to https://xtraclass.ai
 */
function getBaseUrl(): string {
  // Check if we're in development (Replit dev environment)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Use PUBLIC_APP_URL if set (for production)
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL;
  }
  
  // Default to production domain
  return 'https://xtraclass.ai';
}

/**
 * Get the dashboard URL for the application
 */
function getDashboardUrl(): string {
  return `${getBaseUrl()}/dashboard`;
}

interface WelcomeEmailData {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Send a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!apiKey) {
    console.error('SENDGRID_API_KEY not configured. Skipping welcome email.');
    return;
  }

  try {
    const msg = {
      to: data.email,
      from: {
        email: EMAIL_CONFIG.fromEmail,
        name: EMAIL_CONFIG.fromName,
      },
      templateId: EMAIL_CONFIG.templates.welcome,
      dynamic_template_data: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        dashboardLink: getDashboardUrl(),
      },
    };

    await sgMail.send(msg);
    console.log(`✅ Welcome email sent to ${data.email}`);
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error.response?.body || error.message);
    // Don't throw - we don't want email failures to block registration
  }
}

/**
 * Send a password reset email (template to be created)
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (!apiKey) {
    console.error('SENDGRID_API_KEY not configured. Skipping password reset email.');
    return;
  }

  // TODO: Implement when template is ready
  console.log(`Password reset email functionality not yet implemented for ${email}`);
}

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  getDashboardUrl,
  getBaseUrl,
};
