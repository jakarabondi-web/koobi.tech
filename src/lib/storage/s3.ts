import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage. Used for artifacts that must be genuinely
 * private (never a public URL) — currently only the manual identity
 * verification uploads (see src/server/services/manual-identity-verification.ts).
 *
 * Unconfigured by default: without all five STORAGE_* env vars, every
 * function here throws rather than silently no-opping, because a "fake
 * success" for a file upload is actively misleading — unlike other mocked
 * integrations in this app (payments, identity, email) that simulate a
 * plausible outcome, there is no meaningful decision to fake for "did this
 * image actually get stored."
 */

export class StorageError extends Error {}

function config() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region = process.env.STORAGE_REGION;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function isStorageConfigured(): boolean {
  return config() !== null;
}

let client: S3Client | null = null;
function s3() {
  const c = config();
  if (!c) throw new StorageError("Object storage is not configured (STORAGE_* env vars missing).");
  if (!client) {
    client = new S3Client({
      endpoint: c.endpoint,
      region: c.region,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    });
  }
  return { client, bucket: c.bucket };
}

/** Uploads a private object. Never returns a public URL — use getSignedReadUrl to read it back. */
export async function uploadPrivateFile(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      // Belt-and-suspenders: some S3-compatible providers default new
      // objects to bucket policy, not object ACL — this pins it explicitly
      // for providers that do honor per-object ACLs.
      ACL: "private",
    })
  );
}

/** A time-limited URL for reading a private object — never store this, generate it fresh per view. */
export async function getSignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
}

export async function deletePrivateFile(key: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
