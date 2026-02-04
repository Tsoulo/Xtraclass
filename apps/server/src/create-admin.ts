#!/usr/bin/env tsx
/**
 * Admin Account Creation Script
 * 
 * This script creates an admin user account in the production database.
 * 
 * Usage:
 *   npm run create-admin -- --email admin@xtraclass.ai --password SecurePass123 --firstName John --lastName Doe
 * 
 * Or set environment variables:
 *   ADMIN_EMAIL=admin@xtraclass.ai ADMIN_PASSWORD=SecurePass123 ADMIN_FIRST_NAME=John ADMIN_LAST_NAME=Doe npm run create-admin
 * 
 * The script will:
 * 1. Connect to the database using DATABASE_URL
 * 2. Hash the password securely
 * 3. Create an admin user with isActive=true
 * 4. Display the created account details
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { users } from '../shared/schema.js';
import bcrypt from 'bcryptjs';
import ws from 'ws';

// Configure Neon to use ws for WebSocket connections
neonConfig.webSocketConstructor = ws;

interface AdminConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  cellNumber?: string;
}

function parseArgs(): AdminConfig {
  const args = process.argv.slice(2);
  const config: Partial<AdminConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      config.email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      config.password = args[i + 1];
      i++;
    } else if (args[i] === '--firstName' && args[i + 1]) {
      config.firstName = args[i + 1];
      i++;
    } else if (args[i] === '--lastName' && args[i + 1]) {
      config.lastName = args[i + 1];
      i++;
    } else if (args[i] === '--cellNumber' && args[i + 1]) {
      config.cellNumber = args[i + 1];
      i++;
    }
  }

  // Fall back to environment variables
  const email = config.email || process.env.ADMIN_EMAIL;
  const password = config.password || process.env.ADMIN_PASSWORD;
  const firstName = config.firstName || process.env.ADMIN_FIRST_NAME;
  const lastName = config.lastName || process.env.ADMIN_LAST_NAME;
  const cellNumber = config.cellNumber || process.env.ADMIN_CELL_NUMBER;

  if (!email || !password || !firstName || !lastName) {
    console.error('\n❌ Missing required parameters!\n');
    console.log('Usage:');
    console.log('  npm run create-admin -- --email EMAIL --password PASSWORD --firstName FIRST --lastName LAST [--cellNumber CELL]\n');
    console.log('Or set environment variables:');
    console.log('  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_CELL_NUMBER\n');
    process.exit(1);
  }

  return { email, password, firstName, lastName, cellNumber };
}

async function createAdmin() {
  console.log('\n🔧 XtraClass Admin Creation Script\n');
  console.log('═'.repeat(50));

  // Parse configuration
  const config = parseArgs();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.email)) {
    console.error('\n❌ Invalid email format!\n');
    process.exit(1);
  }

  // Validate password strength
  if (config.password.length < 6) {
    console.error('\n❌ Password must be at least 6 characters long!\n');
    process.exit(1);
  }

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('\n❌ DATABASE_URL environment variable not set!\n');
    process.exit(1);
  }

  console.log('\n📋 Admin Account Details:');
  console.log('  Email:', config.email);
  console.log('  Name:', `${config.firstName} ${config.lastName}`);
  if (config.cellNumber) {
    console.log('  Cell:', config.cellNumber);
  }
  console.log('\n⚙️  Connecting to database...');

  // Create database connection
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    const db = drizzle(pool);

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(config.password, 10);

    // Insert admin user
    console.log('💾 Creating admin account...');
    const [admin] = await db.insert(users).values({
      email: config.email,
      password: hashedPassword,
      firstName: config.firstName,
      lastName: config.lastName,
      cellNumber: config.cellNumber || null,
      role: 'admin',
      isActive: true,
      points: 0,
    }).returning();

    console.log('\n✅ Admin account created successfully!\n');
    console.log('═'.repeat(50));
    console.log('\n📧 Login Credentials:');
    console.log('  Email:', admin.email);
    console.log('  Password:', config.password);
    console.log('  Role:', admin.role);
    console.log('  User ID:', admin.id);
    console.log('  Active:', admin.isActive);
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!\n');
    console.log('═'.repeat(50));
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Error creating admin account:\n');
    
    if (error.code === '23505') {
      // Unique constraint violation - email already exists
      console.error('  ⚠️  An account with this email already exists!\n');
      console.error('  Please use a different email address or update the existing account.\n');
    } else {
      console.error('  Error:', error.message);
      console.error('\n  Full error:', error);
    }
    
    process.exit(1);
  } finally {
    // Always close the database connection
    await pool.end();
  }
}

// Run the script
createAdmin();
