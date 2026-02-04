import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env file (if it exists)
// This allows the project to work in different environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Try to load .env file (works in local/production, Replit uses Secrets)
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Environment variables loaded from .env file');
} else {
  console.log('ℹ️ No .env file found, using system environment variables (e.g., Replit Secrets)');
}

/**
 * Environment Configuration
 * 
 * This module provides type-safe access to environment variables
 * and validates that all required variables are present.
 */
export interface EnvironmentConfig {
  // Required - Database
  DATABASE_URL: string;
  
  // Required - Paystack (Payment)
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  PREMIUM_PLAN: string;
  
  // Optional - Application URLs
  PUBLIC_APP_URL?: string;
  REPLIT_DEV_DOMAIN?: string;
  FRONTEND_URL?: string;
  
  // Optional - External Services
  OPENAI_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  
  // Optional - Configuration
  JWT_SECRET?: string;
  NODE_ENV?: string;
  PAYMENT_BUFFER_MINUTES?: string;
}

/**
 * List of required environment variables
 */
const REQUIRED_VARS = [
  'DATABASE_URL',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'PREMIUM_PLAN'
] as const;

/**
 * List of optional environment variables with descriptions
 */
const OPTIONAL_VARS = {
  PUBLIC_APP_URL: 'Production URL (e.g., https://xtraclass.ai)',
  REPLIT_DEV_DOMAIN: 'Auto-provided by Replit in development',
  FRONTEND_URL: 'Frontend URL for emails (defaults to PUBLIC_APP_URL)',
  OPENAI_API_KEY: 'OpenAI API key for AI features',
  SENDGRID_API_KEY: 'SendGrid API key for email notifications',
  FROM_EMAIL: 'Email sender address (defaults to noreply@xtraclass.ai)',
  JWT_SECRET: 'Secret for JWT token signing (auto-generated if not provided)',
  NODE_ENV: 'Environment mode (development, production, test)',
  PAYMENT_BUFFER_MINUTES: 'Buffer time for payment processing (default: 30)'
} as const;

/**
 * Validate and load environment configuration
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  const missing: string[] = [];
  
  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  // If any required variables are missing, throw error
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please set these variables in:');
    console.error('   - Replit: Use the Secrets tab (🔒 icon)');
    console.error('   - Local: Create a .env file in the project root');
    console.error('   - Production: Set in your deployment environment\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Log configuration status
  console.log('\n✅ Environment configuration loaded:');
  console.log('   Required variables: ✓ All present');
  
  const optionalPresent: string[] = [];
  const optionalMissing: string[] = [];
  
  for (const [varName, description] of Object.entries(OPTIONAL_VARS)) {
    if (process.env[varName]) {
      optionalPresent.push(varName);
    } else {
      optionalMissing.push(`${varName} (${description})`);
    }
  }
  
  if (optionalPresent.length > 0) {
    console.log(`   Optional variables: ${optionalPresent.length} configured`);
  }
  
  if (optionalMissing.length > 0) {
    console.log('   ℹ️ Optional variables not set:');
    optionalMissing.forEach(info => {
      console.log(`      - ${info}`);
    });
  }
  
  console.log('');
  
  // Return typed configuration
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY!,
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY!,
    PREMIUM_PLAN: process.env.PREMIUM_PLAN!,
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
    FRONTEND_URL: process.env.FRONTEND_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PAYMENT_BUFFER_MINUTES: process.env.PAYMENT_BUFFER_MINUTES
  };
}

/**
 * Helper to get the application base URL
 * Uses REPLIT_DEPLOYMENT flag to detect production vs development
 * - Production (deployed): Uses PUBLIC_APP_URL
 * - Development: Uses REPLIT_DEV_DOMAIN
 */
export function getBaseUrl(): string {
  // Check if we're in a deployed production environment
  const isDeployed = process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isDeployed && process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL;
  }
  
  // In development, use the dev domain
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  return 'http://localhost:5000';
}

/**
 * Helper to check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Helper to check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Helper to check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Validate and export configuration
export const env = loadEnvironmentConfig();

// Export individual helpers for convenience
export default {
  env,
  getBaseUrl,
  isProduction,
  isDevelopment,
  isTest
};
