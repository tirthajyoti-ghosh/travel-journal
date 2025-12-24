import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateRequest } from './middleware/auth.js';
import { generatePresignedUploadUrl } from './services/s3.js';

const app = express();
app.use(express.json());

/**
 * Determine the current environment (development or production)
 * Priority order:
 * 1. Explicit NOMOSCRIBE_ENVIRONMENT variable
 * 2. VERCEL_ENV (for Vercel deployments)
 * 3. NODE_ENV
 * 4. Default to 'development'
 */
function getEnvironment(): 'development' | 'production' {
  // Explicit override
  if (process.env.NOMOSCRIBE_ENVIRONMENT) {
    return process.env.NOMOSCRIBE_ENVIRONMENT === 'production' 
      ? 'production' 
      : 'development';
  }
  
  // Vercel-specific
  if (process.env.VERCEL_ENV === 'production') {
    return 'production';
  }
  
  // Standard Node.js
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  return 'development';
}

/**
 * Get the S3 prefix for the current environment
 * - development: 'dev/'
 * - production: 'prod/'
 */
function getEnvironmentPrefix(): string {
  const env = getEnvironment();
  return env === 'production' ? 'prod' : 'dev';
}

interface UploadUrlRequest {
  filename: string;
  contentType: string;
}

interface UploadUrlResponse {
  objectKey: string;
  uploadUrl: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

// Health check endpoint (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'nomoscribe-media-api',
    environment: getEnvironment(),
    prefix: getEnvironmentPrefix()
  });
});

/**
 * POST /media/upload-url
 * 
 * Generate a presigned S3 upload URL for media files
 * 
 * Request body:
 * {
 *   "filename": "IMG_20250321_181233.jpg",
 *   "contentType": "image/jpeg"
 * }
 * 
 * Response:
 * {
 *   "objectKey": "IMG_20250321_181233.jpg",
 *   "uploadUrl": "https://s3-presigned-url..."
 * }
 */
app.post('/media/upload-url', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body as UploadUrlRequest;

    // Validate input
    if (!filename || !contentType) {
      const response: ErrorResponse = {
        error: 'Bad Request',
        message: 'filename and contentType are required',
      };
      res.status(400).json(response);
      return;
    }

    // Validate filename format (basic validation)
    if (typeof filename !== 'string' || filename.length === 0 || filename.length > 255) {
      const response: ErrorResponse = {
        error: 'Bad Request',
        message: 'Invalid filename',
      };
      res.status(400).json(response);
      return;
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/quicktime',
    ];

    if (!allowedTypes.includes(contentType.toLowerCase())) {
      const response: ErrorResponse = {
        error: 'Bad Request',
        message: 'Unsupported content type',
      };
      res.status(400).json(response);
      return;
    }

    const bucket = process.env.NOMOSCRIBE_AWS_S3_BUCKET;
    if (!bucket) {
      console.error('NOMOSCRIBE_AWS_S3_BUCKET not configured');
      const response: ErrorResponse = {
        error: 'Server configuration error',
        message: 'Server configuration error',
      };
      res.status(500).json(response);
      return;
    }

    // Append 8-char random hex to ensure uniqueness
    const randomHex = crypto.randomBytes(4).toString('hex'); // 4 bytes = 8 hex chars
    const nameParts = filename.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    
    // Add environment prefix to object key (dev/ or prod/)
    const envPrefix = getEnvironmentPrefix();
    const objectKey = extension 
      ? `${envPrefix}/${baseName}_${randomHex}.${extension}` 
      : `${envPrefix}/${filename}_${randomHex}`;

    // Generate presigned upload URL
    const uploadUrl = await generatePresignedUploadUrl(bucket, objectKey, contentType);

    // Return response
    const response: UploadUrlResponse = {
      objectKey,
      uploadUrl,
    };
    res.json(response);
  } catch (error) {
    console.error('Error generating upload URL:', error);
    const response: ErrorResponse = {
      error: 'Internal Server Error',
      message: 'Failed to generate upload URL',
    };
    res.status(500).json(response);
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  const response: ErrorResponse = {
    error: 'Not Found',
    message: 'Endpoint not found',
  };
  res.status(404).json(response);
});

// Start server (only if not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Environment: ${getEnvironment()}`);
    console.log(`S3 prefix: ${getEnvironmentPrefix()}`);
  });
}

export default app;
