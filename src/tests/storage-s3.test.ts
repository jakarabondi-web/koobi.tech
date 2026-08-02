import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_VARS = [
  "STORAGE_ENDPOINT",
  "STORAGE_REGION",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
] as const;

const originals = Object.fromEntries(STORAGE_VARS.map((k) => [k, process.env[k]]));

function clearStorageEnv() {
  for (const k of STORAGE_VARS) delete process.env[k];
}

function setStorageEnv() {
  process.env.STORAGE_ENDPOINT = "https://s3.example.com";
  process.env.STORAGE_REGION = "us-east-1";
  process.env.STORAGE_BUCKET = "test-bucket";
  process.env.STORAGE_ACCESS_KEY_ID = "key";
  process.env.STORAGE_SECRET_ACCESS_KEY = "secret";
}

beforeEach(() => {
  clearStorageEnv();
  vi.resetModules();
});

afterEach(() => {
  for (const k of STORAGE_VARS) {
    if (originals[k] === undefined) delete process.env[k];
    else process.env[k] = originals[k];
  }
});

describe("isStorageConfigured", () => {
  it("is false when any of the five env vars is missing", async () => {
    const { isStorageConfigured } = await import("@/lib/storage/s3");
    expect(isStorageConfigured()).toBe(false);
  });

  it("is true when all five are set", async () => {
    setStorageEnv();
    const { isStorageConfigured } = await import("@/lib/storage/s3");
    expect(isStorageConfigured()).toBe(true);
  });
});

describe("configured storage", () => {
  it("sends a PutObjectCommand through the S3 client on upload", async () => {
    const send = vi.fn().mockResolvedValue({});
    class FakeS3Client {
      send = send;
    }
    class FakeCommand {
      input: unknown;
      constructor(input: unknown) {
        this.input = input;
      }
    }
    vi.doMock("@aws-sdk/client-s3", () => ({
      S3Client: FakeS3Client,
      PutObjectCommand: FakeCommand,
      DeleteObjectCommand: FakeCommand,
      GetObjectCommand: FakeCommand,
    }));
    vi.doMock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }));

    setStorageEnv();
    const { uploadPrivateFile } = await import("@/lib/storage/s3");
    await uploadPrivateFile({ key: "identity-verification/u1/doc", body: Buffer.from("x"), contentType: "image/png" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ Bucket: "test-bucket", Key: "identity-verification/u1/doc" }) })
    );
    vi.doUnmock("@aws-sdk/client-s3");
    vi.doUnmock("@aws-sdk/s3-request-presigner");
  });
});

describe("unconfigured storage", () => {
  it("throws StorageError rather than silently no-opping on upload", async () => {
    const { uploadPrivateFile, StorageError } = await import("@/lib/storage/s3");
    await expect(
      uploadPrivateFile({ key: "k", body: Buffer.from("x"), contentType: "image/png" })
    ).rejects.toThrow(StorageError);
  });

  it("throws StorageError on getSignedReadUrl", async () => {
    const { getSignedReadUrl, StorageError } = await import("@/lib/storage/s3");
    await expect(getSignedReadUrl("k")).rejects.toThrow(StorageError);
  });

  it("throws StorageError on deletePrivateFile", async () => {
    const { deletePrivateFile, StorageError } = await import("@/lib/storage/s3");
    await expect(deletePrivateFile("k")).rejects.toThrow(StorageError);
  });
});
