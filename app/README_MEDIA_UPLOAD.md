# Media Upload - Phase 2 Implementation

## Overview

Phase 2 adds the ability to upload photos and videos directly from the mobile app to S3, with files served via CloudFront CDN.

## Architecture

```
Mobile App → API Service → S3 Bucket → CloudFront CDN
            (Presigned URL)
```

## Components

### 1. Services

**`services/mediaUploadService.ts`**
- `storeAppSecret(secret: string)` - Store app secret in SecureStore
- `getAppSecret()` - Retrieve app secret
- `hasAppSecret()` - Check if secret is configured
- `uploadMedia(uri: string, onProgress?)` - Upload single file
- `uploadMultipleMedia(uris: string[], onProgress?)` - Upload multiple files

**Features:**
- Time-based HMAC authentication (SHA-256)
- Presigned URL generation via API
- Direct S3 upload using FileSystem.uploadAsync
- Progress tracking
- Automatic filename generation (DATE_TIMESTAMP.extension)
- Content-type detection
- CDN URL generation

### 2. Hooks

**`hooks/use-media-upload.ts`**
- `useMediaUpload()` - Single file upload with progress
- `useMultiMediaUpload()` - Multiple file upload with progress

**Returns:**
- `isUploading: boolean`
- `progress: UploadProgress | null`
- `result: UploadResult | null`
- `error: string | null`
- `uploadMedia(uri: string)` - Trigger upload
- `reset()` - Reset state

### 3. UI Components

**`components/MediaPicker.tsx`**

Updated to support three modes:
- `google-photos` - Only Google Photos album browser
- `s3-upload` - Only S3 direct upload
- `both` - Both options (default)

**New Features:**
- Pick image from library
- Take photo with camera
- Real-time upload progress
- Integration with editor via `onMediaUpload` callback

**Settings Screen (`app/settings.tsx`)**
- App secret configuration
- Secure storage indicator
- Configuration status badge

## Setup Instructions

### 1. Configure App Secret

1. Open the app settings
2. Enter the app secret (same as `NOMOSCRIBE_APP_SECRET` on API)
3. Save configuration

The secret is stored securely using `expo-secure-store`.

### 2. Usage in Editor

```tsx
import { MediaPicker } from '@/components/MediaPicker';
import { useMediaUpload } from '@/hooks/use-media-upload';

function EditorScreen() {
  const { isUploading, progress } = useMediaUpload();

  const handleMediaUpload = (cdnUrl: string) => {
    // Insert CDN URL into markdown editor
    editor.commands.insertContent(`![](${cdnUrl})`);
  };

  return (
    <MediaPicker
      mode="s3-upload"
      onMediaUpload={handleMediaUpload}
    />
  );
}
```

### 3. Standalone Upload

```tsx
import { uploadMedia } from '@/services/mediaUploadService';

async function uploadPhoto(uri: string) {
  const result = await uploadMedia(uri, (progress) => {
    console.log(`Upload: ${progress.percentage}%`);
  });

  if (result.success) {
    console.log('CDN URL:', result.cdnUrl);
    // Use result.cdnUrl in markdown
  } else {
    console.error('Upload failed:', result.error);
  }
}
```

## File Naming Convention

Uploaded files are automatically renamed:
- Format: `YYYY-MM-DD_TIMESTAMP.extension`
- Example: `2025-12-16_1734340800000.jpg`

This ensures:
- No name collisions
- Sortable by date
- Traceable upload time

## CDN URLs

Uploaded files are accessible via CloudFront:
```
https://dkt41sp0pphbb.cloudfront.net/2025-12-16_1734340800000.jpg
```

These URLs can be:
- Embedded in markdown: `![Photo](https://...)`
- Synced to GitHub
- Rendered in web app

## Security

1. **App Secret**: Stored in SecureStore (encrypted on device)
2. **Time-based Auth**: HMAC-SHA256 with timestamp validation (±5 min window)
3. **Direct Upload**: Files never pass through API server
4. **No Public Write**: S3 bucket is private, presigned URLs are temporary (15 min)

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "App secret not configured" | Secret not set | Configure in settings |
| "Failed to get upload URL" | API authentication failed | Check secret matches API |
| "Upload failed with status XXX" | S3 upload failed | Check network, retry |
| "Permission Required" | Camera/library denied | Grant permissions in iOS/Android settings |

## Testing

### Test Upload Flow

1. **Configure Secret**
   ```bash
   # In app settings, enter the app secret
   ```

2. **Pick/Take Photo**
   - Tap "Pick Photo" or "Take Photo"
   - Select image
   - Watch progress indicator

3. **Verify Upload**
   ```bash
   # Check CloudFront URL is accessible
   curl -I https://dkt41sp0pphbb.cloudfront.net/FILENAME
   ```

4. **Test in Editor**
   - Upload photo
   - Verify markdown has `![](https://...)` with CDN URL
   - Preview/save story

## Dependencies

Added in Phase 2:
- `expo-secure-store` - Encrypted credential storage
- `expo-image-picker` - Camera and photo library access
- `expo-file-system` - File upload with progress
- `expo-crypto` - HMAC-SHA256 signature generation

## Next Steps (Phase 3)

- [ ] Compute CloudFront URLs from object keys
- [ ] Embed media in markdown automatically
- [ ] Render images in story viewer
- [ ] Generate video thumbnails
- [ ] Optimize image display (lazy loading, caching)

## API Reference

### API Endpoint

**POST** `https://travel-journal-lyart-kappa.vercel.app/media/upload-url`

**Headers:**
- `Content-Type: application/json`
- `X-App-Timestamp: <unix_timestamp>`
- `X-App-Signature: <hmac_sha256(secret + timestamp)>`

**Body:**
```json
{
  "filename": "2025-12-16_1734340800000.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "objectKey": "2025-12-16_1734340800000.jpg"
}
```

## Troubleshooting

### "Module not found: expo-secure-store"

Run:
```bash
cd app && npx expo install expo-secure-store
```

### Upload stuck at 25%

This means presigned URL was received but S3 upload failed. Check:
- Network connectivity
- File permissions
- S3 bucket configuration

### Authentication failures

Verify:
1. App secret matches API secret exactly
2. Device time is synchronized (±5 min tolerance)
3. API is accessible from device network
