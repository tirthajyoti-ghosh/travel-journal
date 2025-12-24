# Travel Journal Mobile App

A beautiful mobile application for creating, editing, and managing travel stories with rich media support and GitHub synchronization.

## Overview

This is a React Native mobile app built with [Expo](https://expo.dev) that allows users to create travel journals with:
- Rich text editing with markdown support
- Photo and video uploads via S3/CloudFront CDN
- City autocomplete with SQLite database
- GitHub synchronization for backup and cross-platform access
- Offline-first architecture with local storage
- Archive and draft management

## Features

### 📝 Story Management
- **Rich Text Editor**: Create beautiful travel stories using TipTap editor with markdown support
- **Draft System**: Save drafts locally and publish when ready
- **Archive**: Archive stories to keep them on GitHub but remove from main feed
- **Smart Organization**: Stories automatically organized into drafts and published sections

### 📸 Media Upload
- **Direct S3 Upload**: Upload photos and videos directly to S3 with presigned URLs
- **Camera Integration**: Take photos or pick from library
- **Progress Tracking**: Real-time upload progress indicators
- **CDN Delivery**: Media served via CloudFront CDN for fast loading
- **Environment Separation**: Automatic dev/prod storage organization

### 🗺️ Location Features
- **City Autocomplete**: Smart city search powered by local SQLite database
- **Location Tracking**: Optional location capture with stories

### 🔄 Sync & Backup
- **GitHub Sync**: Automatic synchronization with GitHub repository
- **Offline Support**: Work offline, sync when connected
- **Network Status**: Real-time network status indicators
- **Conflict Resolution**: Smart merge strategies for data conflicts

### 🎨 Design
- **Beautiful UI**: Modern, journal-inspired design with custom fonts
- **Scrapbook Aesthetic**: Doodles, textures, and handwritten elements
- **Dark Status Bar**: Optimized for readability
- **Responsive Layout**: Adapts to different screen sizes

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android)

### Installation

1. **Install dependencies**

```bash
cd app
npm install
```

2. **Start the development server**

```bash
npx expo start
```

3. **Run on device/simulator**

In the terminal output, you'll find options to:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

### Configuration

#### App Secret (Required for Media Upload)

1. Open app settings screen
2. Enter the app secret (same as `NOMOSCRIBE_APP_SECRET` on API service)
3. Secret is stored securely using `expo-secure-store`

#### GitHub Token (Required for Sync)

Configure your GitHub personal access token in the settings screen for story synchronization.

## Project Structure

```
app/
├── app/                      # Screen components (file-based routing)
│   ├── _layout.tsx          # Root layout with navigation
│   ├── index.tsx            # Home screen with story list
│   ├── editor.tsx           # Story editor with rich text
│   ├── viewer/[id].tsx      # Story viewer
│   ├── archived.tsx         # Archived stories
│   └── settings.tsx         # App configuration
├── components/              # Reusable UI components
│   ├── StoryCard.tsx       # Story preview card
│   ├── MediaPicker.tsx     # Photo/video picker
│   ├── CityAutocomplete.tsx # City search
│   ├── EmptyState.tsx      # Empty state UI
│   └── SyncStatusBar.tsx   # Sync indicator
├── services/                # Business logic
│   ├── storageService.ts   # Local storage (AsyncStorage)
│   ├── githubService.ts    # GitHub API integration
│   ├── mediaUploadService.ts # S3 upload handling
│   ├── syncService.ts      # Sync orchestration
│   ├── citySearchService.ts # City search
│   └── markdownConverter.ts # HTML/Markdown conversion
├── hooks/                   # Custom React hooks
│   ├── use-sync.ts         # Sync state management
│   ├── use-media-upload.ts # Upload state
│   └── use-network-status.ts # Network monitoring
├── theme/                   # Design system
│   ├── colors.ts           # Color palette
│   ├── typography.ts       # Font definitions
│   └── editorStyles.ts     # Editor styling
├── types/                   # TypeScript types
└── assets/                  # Images, fonts, databases
    ├── doodles/            # Decorative illustrations
    └── cities.db           # SQLite city database
```

## Architecture

### Data Flow

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    v         v
┌────────┐  ┌──────────┐
│ Local  │  │  GitHub  │
│Storage │  │   API    │
└────────┘  └─────┬────┘
                  │
              ┌───┴───┐
              │  S3   │
              │ Media │
              └───┬───┘
                  │
              ┌───┴────────┐
              │ CloudFront │
              │    CDN     │
              └────────────┘
```

### Storage Strategy

- **Local First**: All data stored locally in AsyncStorage
- **Lazy Sync**: Sync to GitHub on demand or periodically
- **Media Separation**: Media files in S3, metadata in GitHub

## Media Upload System

### Overview

The app supports direct upload of photos and videos to AWS S3 with CloudFront CDN delivery.

### Architecture

```
Mobile App → API Service → S3 Bucket → CloudFront CDN
            (Presigned URL)
```

### Components

#### Services

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

#### Hooks

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

#### UI Components

**`components/MediaPicker.tsx`**

Supports three modes:
- `google-photos` - Only Google Photos album browser
- `s3-upload` - Only S3 direct upload
- `both` - Both options (default)

**Features:**
- Pick image from library
- Take photo with camera
- Real-time upload progress
- Integration with editor via `onMediaUpload` callback

### Usage Examples

#### In Editor

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

#### Standalone Upload

```tsx
import { uploadMedia } from '@/services/mediaUploadService';

async function uploadPhoto(uri: string) {
  const result = await uploadMedia(uri, (progress) => {
    console.log(`Upload: ${progress.percentage}%`);
  });

  if (result.success) {
    console.log('CDN URL:', result.cdnUrl);
  } else {
    console.error('Upload failed:', result.error);
  }
}
```

### File Naming Convention

Uploaded files are automatically renamed:
- Format: `YYYY-MM-DD_TIMESTAMP_RANDOMHEX.extension`
- Example: `2025-12-16_1734340800000_a1b2c3d4.jpg`

This ensures:
- No name collisions (timestamp + 8-char random hex)
- Sortable by date
- Traceable upload time

### Environment-Based Storage

Media uploads are automatically organized by environment:

**Development Mode** (`__DEV__ = true`):
- Uploads to `dev/` prefix in S3
- Example: `s3://bucket/dev/2025-12-16_1734340800000_a1b2c3d4.jpg`
- CDN URL: `https://dkt41sp0pphbb.cloudfront.net/dev/2025-12-16_1734340800000_a1b2c3d4.jpg`

**Production Mode** (`__DEV__ = false`):
- Uploads to `prod/` prefix in S3
- Example: `s3://bucket/prod/2025-12-16_1734340800000_a1b2c3d4.jpg`
- CDN URL: `https://dkt41sp0pphbb.cloudfront.net/prod/2025-12-16_1734340800000_a1b2c3d4.jpg`

**Benefits:**
- Easy cleanup of dev test files
- S3 lifecycle policies can auto-expire dev files
- No risk of dev files polluting production storage

### Security

1. **App Secret**: Stored in SecureStore (encrypted on device)
2. **Time-based Auth**: HMAC-SHA256 with timestamp validation (±5 min window)
3. **Direct Upload**: Files never pass through API server
4. **No Public Write**: S3 bucket is private, presigned URLs are temporary (15 min)

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
  "objectKey": "dev/2025-12-16_1734340800000_a1b2c3d4.jpg"
}
```

Note: `objectKey` includes environment prefix (`dev/` or `prod/`) based on API environment.

## Tech Stack

### Core
- **React Native** (0.81.5) - Mobile framework
- **Expo** (~54.0) - Development platform
- **TypeScript** (~5.9) - Type safety

### Navigation & Routing
- **Expo Router** (~6.0) - File-based routing
- **React Navigation** (^7.1) - Navigation library

### UI & Design
- **React Native Gesture Handler** - Touch interactions
- **React Native Reanimated** - Smooth animations
- **Expo Symbols** - System icons
- **Custom Fonts**: Lora, Inter, Reenie Beanie

### Editor
- **@10play/tentap-editor** (^1.0) - Rich text editor (TipTap for React Native)

### Storage & Data
- **AsyncStorage** - Local key-value storage
- **Expo SQLite** - City database
- **Expo SecureStore** - Encrypted credential storage

### Media
- **Expo Image** - Optimized image component
- **Expo Image Picker** - Camera and photo library
- **Expo File System** - File operations and uploads
- **Expo Image Manipulator** - Image processing
- **Expo Video Thumbnails** - Video preview generation

### Network & Sync
- **@react-native-community/netinfo** - Network status
- **Expo Crypto** - HMAC signing for API authentication
- **pako** - Gzip compression for GitHub API

### Development
- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Static typing

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

For Android:
```bash
npm run android
```

For iOS:
```bash
npm run ios
```

### EAS Build (Production)

```bash
eas build --platform android
eas build --platform ios
```

## Troubleshooting

### "Module not found: expo-secure-store"

```bash
cd app && npx expo install expo-secure-store
```

### Upload stuck at 25%

Presigned URL received but S3 upload failed. Check:
- Network connectivity
- File permissions
- S3 bucket configuration

### Authentication failures

Verify:
1. App secret matches API secret exactly
2. Device time is synchronized (±5 min tolerance)
3. API is accessible from device network

### Sync issues

1. Check network status indicator
2. Verify GitHub token in settings
3. Check GitHub repository permissions
4. Review sync logs in developer console

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "App secret not configured" | Secret not set | Configure in settings |
| "Failed to get upload URL" | API authentication failed | Check secret matches API |
| "Upload failed with status XXX" | S3 upload failed | Check network, retry |
| "Permission Required" | Camera/library denied | Grant permissions in system settings |
| "Sync failed" | GitHub API error | Check token and network |

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Test on both iOS and Android

## License

Private project - All rights reserved
