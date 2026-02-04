# Cloudflare Workers Migration Guide

## Current Architecture
- **Frontend**: React + Vite (Cloudflare Pages)
- **Backend**: Express.js (to be migrated to Cloudflare Workers)
- **Database**: Currently local - needs migration to Cloudflare D1 (SQLite)
- **File Storage**: Currently local `/uploads` - needs migration to Cloudflare R2

## Key Changes Needed

### 1. **Database Migration**
- [ ] Create Cloudflare D1 database
- [ ] Migrate Drizzle ORM configuration to use D1
- [ ] Update connection strings in environment
- [ ] Use `wrangler d1` commands to manage migrations

### 2. **File Storage Migration**
Current: Local filesystem (`/uploads`, `/attached_assets`)
- [ ] Set up Cloudflare R2 bucket
- [ ] Update multer to use R2 instead of local disk
- [ ] Update file serving to use R2 URLs
- [ ] Migrate existing files to R2

```bash
# Install R2 helper
npm install @cloudflare/workers-types @cloudflare/wrangler
```

### 3. **Incompatible Libraries to Replace**
- `pdf2pic` - May need Node.js compatibility mode or alternative
- `fs` operations - Replace with R2
- `spawn`/`child_process` - Not available in Workers; use API calls instead
- `multer` with local storage - Use Cloudflare Stream or R2

### 4. **Environment Variables**
Update your `.env.wrangler`:
```env
ENVIRONMENT=production
DATABASE_URL=your-d1-database-url
R2_BUCKET_NAME=your-bucket-name
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
VITE_SERVER_URL=https://api.xtraclass.com
CORS_ORIGIN=https://xtraclass.com
```

### 5. **Deployment Commands**

**First time setup:**
```bash
# Install wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Create D1 database
wrangler d1 create xtraclass-db

# Create R2 bucket
wrangler r2 bucket create xtraclass-uploads

# Deploy
wrangler deploy
```

**Regular deployment:**
```bash
npm run deploy:wrangler
```

**Local testing:**
```bash
npm run dev:wrangler
```

## Testing Locally

1. **Test Express locally first:**
```bash
cd apps/server
npm run dev
```

2. **Test with Wrangler (simulates CF Workers):**
```bash
cd apps/server
npm run dev:wrangler
```

## Database Configuration

Update `drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",  // D1 uses SQLite
  driver: "d1-http",  // Use D1 HTTP driver
} satisfies Config;
```

## Monitoring & Logs

- Use `wrangler tail` to view live logs
- Monitor requests in Cloudflare Dashboard
- Set up error tracking (Sentry, etc.)

## Rollback Plan

Keep running on current Express setup while gradually migrating:
1. Deploy Cloudflare Workers alongside current setup
2. Route percentage of traffic to CF Workers
3. Monitor performance and errors
4. Gradually increase traffic percentage
5. Once stable, decommission Express server

## Cost Considerations

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **D1 (Database)**: Included in Workers standard plan
- **R2 (Storage)**: Pay per GB stored/transferred (first 10GB free)
- **Pages (Frontend)**: Free with unlimited builds

---

**Next Steps:**
1. Run the preparation steps above
2. Test `npm run dev:wrangler` locally
3. Set up Cloudflare D1 database
4. Configure R2 for file uploads
5. Update environment variables
6. Deploy to Cloudflare Workers
