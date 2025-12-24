import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { getInfoAsync, uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';

// FileSystemUploadType enum from expo-file-system legacy types
enum FileSystemUploadType {
  BINARY_CONTENT = 0,
  MULTIPART = 1,
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
const CLOUDFRONT_DOMAIN = process.env.EXPO_PUBLIC_CLOUDFRONT_DOMAIN!;
const APP_SECRET_STORAGE_KEY = 'nomoscribe.app_secret'; // SecureStore key (hardcoded)

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  objectKey: string;
  cdnUrl: string;
  thumbnailBase64?: string;
  success: boolean;
  error?: string;
}

/**
 * Store the app secret securely
 */
export async function storeAppSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(APP_SECRET_STORAGE_KEY, secret);
}

/**
 * Retrieve the app secret from secure storage
 */
export async function getAppSecret(): Promise<string | null> {
  return await SecureStore.getItemAsync(APP_SECRET_STORAGE_KEY);
}

/**
 * Check if app secret is configured
 */
export async function hasAppSecret(): Promise<boolean> {
  const secret = await getAppSecret();
  return secret !== null && secret.length > 0;
}

/**
 * Generate time-based HMAC signature for API authentication
 */
async function generateSignature(timestamp: number): Promise<string> {
  const secret = await getAppSecret();
  if (!secret) {
    throw new Error('App secret not configured');
  }

  const message = secret + timestamp.toString();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );

  return digest;
}

/**
 * Get presigned upload URL from API
 */
async function getPresignedUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; objectKey: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await generateSignature(timestamp);

  const response = await fetch(`${API_BASE_URL}/media/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Timestamp': timestamp.toString(),
      'X-App-Signature': signature,
    },
    body: JSON.stringify({
      filename,
      contentType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get upload URL');
  }

  return await response.json();
}

/**
 * Upload file to S3 using presigned URL
 */
async function uploadToS3(
  uri: string,
  uploadUrl: string,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  const uploadResult = await uploadAsync(uploadUrl, uri, {
    httpMethod: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Upload failed with status ${uploadResult.status}`);
  }
}

/**
 * Get file info from URI
 */
async function getFileInfo(uri: string): Promise<FileSystem.FileInfo> {
  const info = await getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('File does not exist');
  }
  return info;
}

/**
 * Determine content type from file URI
 */
function getContentType(uri: string): string {
  const lowerUri = uri.toLowerCase();
  
  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerUri.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerUri.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lowerUri.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowerUri.endsWith('.mp4')) {
    return 'video/mp4';
  }
  if (lowerUri.endsWith('.mov')) {
    return 'video/quicktime';
  }
  
  // Default to JPEG for images, MP4 for videos
  return 'image/jpeg';
}

/**
 * Generate a unique filename based on original filename and timestamp
 */
function generateUniqueFilename(originalUri: string): string {
  const timestamp = Date.now();
  const date = new Date().toISOString().split('T')[0];
  
  // Extract original filename
  const parts = originalUri.split('/');
  const originalName = parts[parts.length - 1];
  
  // Extract extension
  const extensionMatch = originalName.match(/\.([^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : 'jpg';
  
  // Generate clean filename: DATE_TIMESTAMP.extension
  return `${date}_${timestamp}.${extension}`;
}

/**
 * Upload media file to S3 and return CDN URL
 */
export async function uploadMedia(
  uri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Verify app secret is configured
    if (!(await hasAppSecret())) {
      throw new Error('App secret not configured. Please configure in settings.');
    }

    // Get file info
    const fileInfo = await getFileInfo(uri);
    
    // Determine content type and generate filename
    const contentType = getContentType(uri);
    const filename = generateUniqueFilename(uri);

    // Generate thumbnail for videos
    let thumbnailBase64: string | undefined;
    if (contentType.startsWith('video/') && Platform.OS !== 'web') {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          quality: 0.3,
        });

        // Resize and compress thumbnail
        const manipulatedResult = await ImageManipulator.manipulateAsync(
          thumbUri,
          [{ resize: { width: 300 } }],
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipulatedResult.base64) {
          thumbnailBase64 = `data:image/jpeg;base64,${manipulatedResult.base64}`;
        }

        // Clean up temp files
        await FileSystem.deleteAsync(thumbUri, { idempotent: true });
        await FileSystem.deleteAsync(manipulatedResult.uri, { idempotent: true });
      } catch (e) {
        console.warn('Failed to generate thumbnail:', e);
      }
    }

    // Report initial progress
    if (onProgress) {
      onProgress({ loaded: 0, total: 100, percentage: 0 });
    }

    // Get presigned URL from API
    // Note: objectKey includes environment prefix (dev/ or prod/) from API
    const { uploadUrl, objectKey } = await getPresignedUrl(filename, contentType);

    // Report progress: got upload URL
    if (onProgress) {
      onProgress({ loaded: 25, total: 100, percentage: 25 });
    }

    // Upload to S3
    await uploadToS3(uri, uploadUrl, contentType, onProgress);

    // Report completion
    if (onProgress) {
      onProgress({ loaded: 100, total: 100, percentage: 100 });
    }

    // Construct CDN URL
    // objectKey already includes environment prefix: dev/file.jpg or prod/file.jpg
    const cdnUrl = `https://${CLOUDFRONT_DOMAIN}/${objectKey}`;

    return {
      objectKey,
      cdnUrl,
      thumbnailBase64,
      success: true,
    };
  } catch (error) {
    console.error('Media upload error:', error);
    return {
      objectKey: '',
      cdnUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple media files
 */
export async function uploadMultipleMedia(
  uris: string[],
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < uris.length; i++) {
    const result = await uploadMedia(uris[i], (progress) => {
      if (onProgress) {
        onProgress(i, progress);
      }
    });
    results.push(result);
  }

  return results;
}
