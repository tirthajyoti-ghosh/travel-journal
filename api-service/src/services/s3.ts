import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.NOMOSCRIBE_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NOMOSCRIBE_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.NOMOSCRIBE_AWS_SECRET_KEY!,
  },
});

/**
 * Generate a presigned PUT URL for S3 upload
 * @param bucket - S3 bucket name
 * @param key - Object key
 * @param contentType - MIME type
 * @returns Presigned URL
 */
export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 15 minutes
  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return url;
}
