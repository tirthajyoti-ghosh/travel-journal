import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Time-based signature authentication middleware
 * 
 * Validates requests using:
 * - X-App-Timestamp: Unix timestamp in seconds
 * - X-App-Signature: SHA-256(APP_SECRET + timestamp)
 * 
 * Rejects requests that are:
 * - Missing required headers
 * - Outside ±5 minute timestamp window
 * - Have invalid signatures
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  const timestamp = req.headers['x-app-timestamp'] as string | undefined;
  const signature = req.headers['x-app-signature'] as string | undefined;

  // Check required headers
  if (!timestamp || !signature) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing authentication headers'
    });
    return;
  }

  // Validate timestamp format
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid timestamp format'
    });
    return;
  }

  // Check timestamp window (±5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - requestTime);
  const MAX_TIME_DRIFT = 300; // 5 minutes in seconds

  if (timeDiff > MAX_TIME_DRIFT) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Request timestamp outside acceptable window'
    });
    return;
  }

  // Compute expected signature
  const appSecret = process.env.NOMOSCRIBE_APP_SECRET;
  if (!appSecret) {
    console.error('NOMOSCRIBE_APP_SECRET not configured');
    res.status(500).json({
      error: 'Server configuration error'
    });
    return;
  }

  const expectedSignature = crypto
    .createHash('sha256')
    .update(appSecret + timestamp)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
      return;
    }
  } catch (error) {
    // Handle invalid hex string
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid signature format'
    });
    return;
  }

  // Authentication successful
  next();
}
