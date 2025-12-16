# Nomoscribe Media API

Minimal API service for generating presigned S3 upload URLs.

## Architecture

```
Mobile App → API (auth) → S3 (direct upload)
```

## Authentication

Uses time-based signature authentication:
- Client sends `X-App-Timestamp` and `X-App-Signature` headers
- Signature = `SHA-256(APP_SECRET + timestamp)`
- Timestamp must be within ±5 minutes
- Prevents replay attacks

## Endpoints

### `GET /health`

Health check endpoint (no auth required).

**Response:**
```json
{
  "status": "ok",
  "service": "nomoscribe-media-api"
}
```

### `POST /media/upload-url`

Generate a presigned S3 upload URL.

**Headers:**
```
X-App-Timestamp: 1700000123
X-App-Signature: 5f9a7c2c0a4c8b7e...
Content-Type: application/json
```

**Request Body:**
```json
{
  "filename": "IMG_20250321_181233.jpg",
  "contentType": "image/jpeg"
}
```

**Response (200):**
```json
{
  "objectKey": "IMG_20250321_181233.jpg",
  "uploadUrl": "https://your-bucket.s3.your-region.amazonaws.com/..."
}
```

**Error Responses:

401 Unauthorized:
```json
{
  "error": "Unauthorized",
  "message": "Missing authentication headers"
}
```

400 Bad Request:
```json
{
  "error": "Bad Request",
  "message": "filename and contentType are required"
}
```

500 Internal Server Error:
```json
{
  "error": "Internal Server Error",
  "message": "Failed to generate upload URL"
}
```

## Supported Media Types

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/heic`
- `image/heif`
- `video/mp4`
- `video/quicktime`

## Environment Variables

Required for deployment:

```bash
AWS_ACCESS_KEY=your_access_key_here
AWS_SECRET_KEY=your_secret_key_here
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=your-aws-region
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
APP_SECRET=your_generated_secret_here
```

## Local Development

1. Install dependencies:
```bash
cd api-service
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. Start dev server:
```bash
npm run dev
```

4. Test with curl:
```bash
# Generate signature (example with Node.js)
node -e "const crypto = require('crypto'); const timestamp = Math.floor(Date.now()/1000); const sig = crypto.createHash('sha256').update(process.env.APP_SECRET + timestamp).digest('hex'); console.log('Timestamp:', timestamp); console.log('Signature:', sig);"

# Make request
curl -X POST http://localhost:3001/media/upload-url \
  -H "Content-Type: application/json" \
  -H "X-App-Timestamp: <timestamp>" \
  -H "X-App-Signature: <signature>" \
  -d '{
    "filename": "IMG_20250321_181233.jpg",
    "contentType": "image/jpeg"
  }'
```

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
cd api-service
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `api-service` folder
3. Add environment variables in project settings
4. Deploy

### Option 3: GitHub Integration

1. Push to GitHub
2. Import repository in Vercel
3. Set root directory to `api-service`
4. Add environment variables
5. Deploy

## Usage Flow

1. Mobile app requests upload URL from this API
2. API generates presigned PUT URL (15 min expiry)
3. Mobile app uploads directly to S3 using presigned URL
4. Mobile app computes CloudFront URL: `https://your-cloudfront-domain.cloudfront.net/${objectKey}`
5. Mobile app embeds CDN URL in story markdown

## Security Notes

- Presigned URLs expire after 15 minutes
- Authentication signatures expire after ±5 minutes
- S3 bucket is private (CloudFront provides public access)
- No secrets are logged or exposed
- Constant-time signature comparison prevents timing attacks

## Cost Considerations

- API: Free tier covers ~100k requests/month
- S3 PUT operations: $0.005 per 1,000 requests
- Minimal cost for personal use

## Future Improvements

- [ ] Rate limiting per device
- [ ] File size validation
- [ ] Metrics/monitoring
- [ ] Delete unused media endpoint
- [ ] Support for custom CDN domains
