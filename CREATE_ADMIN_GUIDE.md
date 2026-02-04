# Admin Account Creation Guide

This guide explains how to create an admin account for your XtraClass production database.

## Prerequisites

- Access to your production environment (Replit deployment or server)
- The `DATABASE_URL` environment variable configured for production database
- Node.js and the project dependencies installed

## Method 1: Using Command Line Arguments (Recommended)

Run the script with command line arguments:

```bash
npx tsx server/create-admin.ts --email admin@xtraclass.ai --password YourSecurePassword123 --firstName John --lastName Doe --cellNumber "+27123456789"
```

### Required Parameters:
- `--email` - Admin email address
- `--password` - Admin password (minimum 6 characters)
- `--firstName` - Admin first name
- `--lastName` - Admin last name

### Optional Parameters:
- `--cellNumber` - Admin cell phone number

## Method 2: Using Environment Variables

Set environment variables and run the script:

```bash
export ADMIN_EMAIL="admin@xtraclass.ai"
export ADMIN_PASSWORD="YourSecurePassword123"
export ADMIN_FIRST_NAME="John"
export ADMIN_LAST_NAME="Doe"
export ADMIN_CELL_NUMBER="+27123456789"

npx tsx server/create-admin.ts
```

## Production Deployment Steps

### On Replit:

1. Open your deployed Replit
2. Open the Shell
3. Make sure you're using the production DATABASE_URL:
   ```bash
   echo $DATABASE_URL
   ```
4. Run the creation command:
   ```bash
   npx tsx server/create-admin.ts --email admin@xtraclass.ai --password SecurePass123 --firstName Admin --lastName User
   ```

### On Your Own Server:

1. SSH into your production server
2. Navigate to your project directory
3. Run the creation command with production environment:
   ```bash
   DATABASE_URL="your_production_database_url" npx tsx server/create-admin.ts --email admin@xtraclass.ai --password SecurePass123 --firstName Admin --lastName User
   ```

## What the Script Does

The script will:
1. ✅ Validate all input parameters
2. ✅ Connect to the database using `DATABASE_URL`
3. ✅ Hash the password securely using bcrypt
4. ✅ Create an admin user with:
   - Role: `admin`
   - Active status: `true` (can login immediately)
   - Points: 0
5. ✅ Display the created account details

## Example Output

```
🔧 XtraClass Admin Creation Script

══════════════════════════════════════════════════

📋 Admin Account Details:
  Email: admin@xtraclass.ai
  Name: John Doe
  Cell: +27123456789

⚙️  Connecting to database...
🔐 Hashing password...
💾 Creating admin account...

✅ Admin account created successfully!

══════════════════════════════════════════════════

📧 Login Credentials:
  Email: admin@xtraclass.ai
  Password: SecurePass123
  Role: admin
  User ID: 42
  Active: true

⚠️  IMPORTANT: Save these credentials securely!

══════════════════════════════════════════════════
```

## Security Notes

- ⚠️ **Never commit admin credentials to version control**
- 🔐 **Use strong passwords**:
  - Minimum: 6 characters (script enforced)
  - Recommended: 12+ characters with mix of uppercase, lowercase, numbers, and symbols
  - Example: `MyAdmin2024!SecurePass`
- 📝 Save the credentials in a secure password manager
- 🔒 The password is hashed before storage - even database admins can't see it
- ✅ The script validates email format and password strength
- 🗑️ **Revoke test admin accounts**: If you create test admin accounts for verification, delete or deactivate them afterwards to maintain security

## Troubleshooting

### Error: "An account with this email already exists!"

This means the email is already registered. Either:
- Use a different email address
- Manually update the existing account's role in the database to 'admin'

### Error: "DATABASE_URL environment variable not set!"

Make sure you have the `DATABASE_URL` set in your environment. Check with:
```bash
echo $DATABASE_URL
```

### Error: "Invalid email format!"

Ensure your email follows the format: `user@domain.com`

### Error: "Password must be at least 6 characters long!"

Use a longer password. Recommended: 12+ characters with mix of letters, numbers, and symbols.

## Alternative: Manual Database Update

If you prefer, you can manually update an existing user's role to admin:

1. Go to Database pane in Replit
2. Select Production database
3. Click 'Edit' under 'My data'
4. Find the user in the `users` table
5. Update their `role` field to `'admin'`

## Need Help?

If you encounter any issues not covered here, check:
- Database connection is working
- All dependencies are installed (`npm install`)
- You have the correct permissions to access the production database
