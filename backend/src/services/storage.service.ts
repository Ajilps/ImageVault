import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";

const isMinio = env.storageProvider === "minio";

if (!isMinio && env.storageProvider !== "s3") {
  throw new AppError("STORAGE_PROVIDER must be either 'minio' or 's3'.", 500, "CONFIGURATION_ERROR");
}

const credentials =
  env.storageAccessKeyId && env.storageSecretAccessKey
    ? {
        accessKeyId: env.storageAccessKeyId,
        secretAccessKey: env.storageSecretAccessKey,
      }
    : undefined;

if (isMinio && !credentials) {
  throw new AppError(
    "MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be configured for MinIO storage.",
    500,
    "CONFIGURATION_ERROR",
  );
}

const storageClient = new S3Client({
  region: env.awsRegion,
  ...(env.storageEndpoint ? { endpoint: env.storageEndpoint } : {}),
  ...(isMinio ? { forcePathStyle: true } : {}),
  ...(credentials ? { credentials } : {}),
});

export async function createPresignedUploadUrl(input: {
  objectKey: string;
  contentType: string;
}): Promise<string> {
  return getSignedUrl(
    storageClient,
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: input.objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: env.presignExpiresIn },
  );
}

export async function assertUploadedImage(objectKey: string): Promise<void> {
  try {
    const object = await storageClient.send(
      new HeadObjectCommand({
        Bucket: env.storageBucket,
        Key: objectKey,
      }),
    );

    if (!object.ContentType?.startsWith("image/")) {
      throw new AppError("The uploaded object must be an image.", 400, "INVALID_IMAGE");
    }

    if (object.ContentLength && object.ContentLength > env.maxFileSize) {
      throw new AppError("The uploaded image exceeds the configured size limit.", 400, "FILE_TOO_LARGE");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("The uploaded image could not be found in storage.", 400, "UPLOAD_NOT_FOUND");
  }
}

export async function createPresignedDownloadUrl(objectKey: string): Promise<string> {
  return getSignedUrl(
    storageClient,
    new GetObjectCommand({
      Bucket: env.storageBucket,
      Key: objectKey,
    }),
    { expiresIn: env.presignExpiresIn },
  );
}

export function storageUri(objectKey: string): string {
  return `s3://${env.storageBucket}/${objectKey}`;
}

export async function deleteStoredObjects(objectKeys: string[]): Promise<void> {
  if (!objectKeys.length) {
    return;
  }

  await storageClient.send(
    new DeleteObjectsCommand({
      Bucket: env.storageBucket,
      Delete: {
        Objects: objectKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );
}
