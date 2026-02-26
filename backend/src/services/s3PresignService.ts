import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isS3Enabled = Boolean(
  process.env.AWS_S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

const PRESIGN_EXPIRES_IN = 15 * 60; // 15 minutes

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return s3Client;
}

/**
 * Extract S3 object key from imageUrl.
 * - Full S3 URL (https://bucket.s3.region.amazonaws.com/crop-images/xxx.png) -> crop-images/xxx.png
 * - Key only (crop-images/xxx.png) -> crop-images/xxx.png
 * - Local path (/uploads/...) or other -> null
 */
function getS3Key(imageUrl: string): string | null {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return null;

  if (trimmed.includes('amazonaws.com')) {
    try {
      const u = new URL(trimmed);
      const pathname = u.pathname;
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('crop-images/')) {
    return trimmed;
  }

  return null;
}

/**
 * Returns a presigned GET URL for the given imageUrl when it points to S3.
 * For non-S3 URLs (e.g. local /uploads/...), returns the original URL.
 */
export async function getPresignedImageUrl(
  imageUrl: string | null | undefined
): Promise<string | null | undefined> {
  if (!imageUrl || !imageUrl.trim()) {
    return imageUrl;
  }

  if (!isS3Enabled) {
    return imageUrl;
  }

  const key = getS3Key(imageUrl);
  if (!key) {
    return imageUrl; // local path or unknown format
  }

  const bucket = process.env.AWS_S3_BUCKET as string;
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });

  try {
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGN_EXPIRES_IN,
    });
    return signedUrl;
  } catch (err) {
    console.error('Failed to generate presigned URL for', key, err);
    return imageUrl; // fallback to original (may 403 in browser)
  }
}

/**
 * Resolve imageUrl for a single crop: presign if S3, else return as-is.
 */
export async function withPresignedCropImageUrl<T extends { imageUrl?: string | null }>(
  crop: T
): Promise<T> {
  const json = typeof (crop as any).toJSON === 'function' ? (crop as any).toJSON() : { ...crop };
  const imageUrl = await getPresignedImageUrl(json.imageUrl);
  return { ...json, imageUrl } as T;
}

/**
 * Resolve imageUrl for multiple crops: presign S3 URLs for each.
 */
export async function withPresignedCropImageUrls<
  T extends { imageUrl?: string | null } = { imageUrl?: string | null }
>(crops: T[]): Promise<T[]> {
  return Promise.all(
    crops.map(async (crop) => {
      const json = typeof (crop as any).toJSON === 'function' ? (crop as any).toJSON() : { ...crop };
      const imageUrl = await getPresignedImageUrl(json.imageUrl);
      return { ...json, imageUrl } as T;
    })
  );
}
