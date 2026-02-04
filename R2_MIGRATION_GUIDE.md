# R2 Storage Migration Implementation Guide

## What Was Changed

### 1. **Created New File Storage Modules**

#### `/apps/server/src/r2-storage.ts`
- Implements Cloudflare R2 client using AWS SDK
- Handles file uploads, downloads, and deletions
- Supports base64 image uploads
- Generates unique filenames to prevent collisions

#### `/apps/server/src/storage-adapter.ts`
- Abstract storage interface (`IStorage`)
- `LocalStorage` class for filesystem storage
- `R2Storage` class for Cloudflare R2
- Auto-detection based on environment variables
- `getStorage()` function to get active storage instance

#### `/apps/server/src/file-storage.ts`
- Re-exports storage functionality for clean imports

### 2. **Updated Configuration Files**

#### `wrangler.toml`
```toml
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "xtraclass-uploads"
```

#### `.env.wrangler`
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=xtraclass-uploads
R2_PUBLIC_URL=https://uploads.xtraclass.com
```

#### `package.json`
Added dependencies:
```json
{
  "@aws-sdk/client-s3": "^3.400.0",
  "@aws-sdk/s3-request-presigner": "^3.400.0"
}
```

### 3. **Updated routes.ts**
- Added import: `import { getStorage } from "./file-storage";`
- Updated `savePdfPageImages()` to use `fileStorage.uploadBase64Image()`
- Remaining functions still use local filesystem

## How to Use

### For Development (Local Storage)
No changes needed. The system automatically uses local storage if R2 credentials aren't provided:

```bash
npm run dev
# Uses: /uploads/ directory
```

### For Production (Cloudflare R2)
1. Create an R2 bucket in Cloudflare Dashboard
2. Generate API token credentials
3. Set environment variables:

```bash
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxx
R2_BUCKET_NAME=xtraclass-uploads
R2_PUBLIC_URL=https://uploads.xtraclass.com
```

4. Deploy with Wrangler:

```bash
npm run deploy:wrangler
```

## Updated Functions

### ✅ Completed
- `savePdfPageImages()` - Now uses R2 or local storage

### 🔄 Still Need Migration
These functions still use local filesystem - migrate as needed:

1. **`convertPdfToImages()`** - Converts PDFs to image files
   - Uses temp files in `/tmp/pdf-conversion`
   - Save output with: `await fileStorage.uploadBase64Image(...)`

2. **`cropAndSaveDiagramImages()`** - Crops question images
   - Saves cropped images locally
   - Update save logic to use `fileStorage.uploadFile()`

3. **Organization Logo Upload** (line ~3590)
   - Currently: Saves to `uploads/logos/`
   - Migrate to: `await fileStorage.uploadFile()`

4. **Past Paper Image Uploads** (line ~4782)
   - Currently: Saves to `uploads/question-images/`
   - Migrate to: `await fileStorage.uploadFile()`

5. **Exercise Image Operations** (lines ~16160, 16627, 16681, 16831)
   - Currently: Various local file saves
   - Migrate to: `await fileStorage.uploadFile()` or `uploadBase64Image()`

## API Changes

Old way (local storage):
```typescript
const filepath = 'uploads/images/file.png';
writeFileSync(filepath, buffer);
const url = `/uploads/images/file.png`;
```

New way (abstracted - works with R2 or local):
```typescript
const fileStorage = getStorage();
const result = await fileStorage.uploadFile(buffer, 'file.png', 'uploads/images');
const url = result.fileUrl; // Works with both R2 and local
```

## Testing

### Test Local Storage
```bash
cd apps/server
npm install
npm run dev
# Upload a file - should save to /uploads/
```

### Test R2 Storage (with mock credentials)
```bash
export CLOUDFLARE_ACCOUNT_ID=test
export R2_ACCESS_KEY_ID=test
export R2_SECRET_ACCESS_KEY=test
npm run dev:wrangler
```

## Migration Checklist

- [x] Create R2 storage module
- [x] Create storage adapter (local + R2)
- [x] Update wrangler.toml
- [x] Update environment configuration
- [x] Add AWS SDK dependencies
- [x] Migrate savePdfPageImages()
- [ ] Migrate convertPdfToImages()
- [ ] Migrate cropAndSaveDiagramImages()
- [ ] Migrate organization logo upload
- [ ] Migrate past paper image uploads
- [ ] Migrate exercise image operations
- [ ] Test with real R2 bucket
- [ ] Deploy to production

## Cost Optimization

**Keep these operations local** (in Express, not Workers):
- PDF processing (expensive CPU operation)
- Image cropping with sharp
- Large file operations
- Background tasks

**Use R2 for**:
- Final output storage (images, PDFs)
- Long-term file serving
- Cross-region distribution

**Current Recommendation**:
- Keep Express server running for heavy operations
- Use R2 for file storage
- Use Cloudflare Pages for frontend
- Use Cloudflare CDN for R2 access
