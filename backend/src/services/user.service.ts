import { randomBytes, randomUUID } from "node:crypto";
import { basename } from "node:path";

import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import {
  assertUploadedImage,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  storageUri,
} from "./storage.service.js";
import type { AuthenticatedUser } from "./auth.service.js";
import { sendPushNotifications } from "./push.service.js";
import { visibleImageFilterFor } from "./imageVisibility.js";

function organizationIdFor(user: AuthenticatedUser): string {
  if (!user.organizationId) {
    throw new AppError("You must belong to an organisation to use this feature.", 403, "ORGANISATION_REQUIRED");
  }

  return user.organizationId;
}

function objectKeyFor(user: AuthenticatedUser, fileName: string): string {
  const safeFileName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  return `organisations/${organizationIdFor(user)}/users/${user.id}/${randomUUID()}-${safeFileName || "image"}`;
}

const imageInclude = {
  uploadedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

async function withDownloadUrl<T extends { objectKey: string; shareToken?: string | null }>(image: T, revealShareToken = false) {
  const { shareToken, ...safeImage } = image;
  return {
    ...safeImage,
    shareToken: revealShareToken ? shareToken ?? null : null,
    downloadUrl: await createPresignedDownloadUrl(image.objectKey),
  };
}

export async function getQuota(user: AuthenticatedUser) {
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      imageQuota: true,
      _count: {
        select: {
          uploads: true,
        },
      },
    },
  });

  if (!currentUser) {
    throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  }

  const used = currentUser._count.uploads;

  return {
    total: currentUser.imageQuota,
    used,
    remaining: Math.max(currentUser.imageQuota - used, 0),
  };
}

export async function requestImageUpload(
  user: AuthenticatedUser,
  input: { fileName: string; contentType: string },
) {
  if (!input.contentType.startsWith("image/")) {
    throw new AppError("Only image uploads are allowed.", 400, "INVALID_IMAGE_TYPE");
  }

  const quota = await getQuota(user);

  if (quota.remaining < 1) {
    throw new AppError(`Your image quota has been exhausted. Purchase another ${env.slotPackSize}-slot pack to continue.`, 403, "QUOTA_EXHAUSTED");
  }

  const objectKey = objectKeyFor(user, input.fileName);
  const uploadUrl = await createPresignedUploadUrl({
    objectKey,
    contentType: input.contentType,
  });

  return {
    objectKey,
    uploadUrl,
    expiresIn: env.presignExpiresIn,
    maxFileSize: env.maxFileSize,
  };
}

export async function completeImageUpload(
  user: AuthenticatedUser,
  input: { objectKey: string; tagUserIds: string[]; visibility: "PUBLIC" | "PRIVATE" },
) {
  const organizationId = organizationIdFor(user);
  const expectedPrefix = `organisations/${organizationId}/users/${user.id}/`;

  if (!input.objectKey.startsWith(expectedPrefix)) {
    throw new AppError("This upload key does not belong to the current user.", 403, "INVALID_UPLOAD_KEY");
  }

  await assertUploadedImage(input.objectKey);

  if (input.visibility === "PRIVATE" && input.tagUserIds.length) {
    throw new AppError("Private images cannot tag other users.", 400, "PRIVATE_IMAGE_TAGS_NOT_ALLOWED");
  }

  const uniqueTagUserIds = [...new Set(input.tagUserIds)];
  const taggedUsers = uniqueTagUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: uniqueTagUserIds },
          organizationId,
        },
        select: { id: true },
      })
    : [];

  if (taggedUsers.length !== uniqueTagUserIds.length) {
    throw new AppError("Every tagged user must belong to your organisation.", 400, "INVALID_TAGGED_USER");
  }

  const createImageAndNotification = () => prisma.$transaction(async (transaction) => {
    const currentUser = await transaction.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        imageQuota: true,
      },
    });

    if (!currentUser) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    const imageCount = await transaction.image.count({
      where: { uploadedById: user.id },
    });

    if (imageCount >= currentUser.imageQuota) {
      throw new AppError(
        `Your image quota has been exhausted. Purchase another ${env.slotPackSize}-slot pack to continue.`,
        403,
        "QUOTA_EXHAUSTED",
      );
    }

    const createdImage = await transaction.image.create({
      data: {
        url: storageUri(input.objectKey),
        objectKey: input.objectKey,
        uploadedById: user.id,
        organizationId,
        visibility: input.visibility,
        ...(uniqueTagUserIds.length
          ? {
              tags: {
                connect: uniqueTagUserIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: imageInclude,
    });

    if (input.visibility === "PRIVATE") {
      return { createdImage, receiverUserIds: [] as string[], message: null as string | null };
    }

    const receiverUserIds = uniqueTagUserIds.length
      ? uniqueTagUserIds
      : (
          await transaction.user.findMany({
            where: { organizationId },
            select: { id: true },
          })
        ).map((member) => member.id);

    const message = uniqueTagUserIds.length
      ? `${currentUser.name} tagged you in an image upload.`
      : `${currentUser.name} uploaded a new image.`;

    await transaction.notification.create({
      data: {
        organizationId,
        senderId: user.id,
        imageId: createdImage.id,
        receiverUsers: {
          connect: receiverUserIds.map((id) => ({ id })),
        },
        message,
      },
    });

    return { createdImage, receiverUserIds, message: message as string | null };
  }, { isolationLevel: "Serializable" });

  let result: Awaited<ReturnType<typeof createImageAndNotification>> | undefined;
  for (let attempt = 1; attempt <= env.quotaTransactionMaxRetries; attempt += 1) {
    try {
      result = await createImageAndNotification();
      break;
    } catch (error) {
      const isWriteConflict = (error as { code?: string }).code === "P2034";
      if (!isWriteConflict || attempt === env.quotaTransactionMaxRetries) {
        throw error;
      }
    }
  }

  if (!result) {
    throw new AppError("The upload could not be completed safely. Please retry.", 409, "UPLOAD_CONFLICT");
  }

  if (result.message && result.receiverUserIds.length) {
    void sendPushNotifications(result.receiverUserIds, {
      title: "ImageVault notification",
      body: result.message,
      url: "/notifications",
    }).catch((error) => console.error("Push notification dispatch failed.", error));
  }

  return withDownloadUrl(result.createdImage, true);
}

export async function listOrganisationImages(user: AuthenticatedUser, taggedUserId?: string) {
  const images = await prisma.image.findMany({
    where: {
      organizationId: organizationIdFor(user),
      ...visibleImageFilterFor(user.id),
      ...(taggedUserId
        ? {
            tags: {
              some: { id: taggedUserId },
            },
          }
        : {}),
    },
    include: imageInclude,
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(images.map((image) => withDownloadUrl(image, image.uploadedById === user.id)));
}

export async function createPublicImageShare(user: AuthenticatedUser, imageId: string) {
  const image = await prisma.image.findFirst({
    where: {
      id: imageId,
      uploadedById: user.id,
      organizationId: organizationIdFor(user),
    },
    select: { id: true, visibility: true, shareToken: true },
  });

  if (!image) {
    throw new AppError("Image not found among your uploads.", 404, "IMAGE_NOT_FOUND");
  }

  if (image.visibility !== "PUBLIC") {
    throw new AppError("Only organisation-public images can have a public link.", 400, "PRIVATE_IMAGE_NOT_SHAREABLE");
  }

  if (image.shareToken) {
    return { shareToken: image.shareToken };
  }

  const shareToken = randomBytes(env.publicShareTokenBytes).toString("base64url");
  const updated = await prisma.image.updateMany({
    where: { id: image.id, shareToken: null },
    data: { shareToken },
  });

  if (updated.count) {
    return { shareToken };
  }

  const current = await prisma.image.findUnique({
    where: { id: image.id },
    select: { shareToken: true },
  });

  if (!current?.shareToken) {
    throw new AppError("The public link could not be created safely. Please retry.", 409, "PUBLIC_SHARE_CONFLICT");
  }

  return { shareToken: current.shareToken };
}

export async function revokePublicImageShare(user: AuthenticatedUser, imageId: string) {
  const updated = await prisma.image.updateMany({
    where: {
      id: imageId,
      uploadedById: user.id,
      organizationId: organizationIdFor(user),
    },
    data: { shareToken: null },
  });

  if (!updated.count) {
    throw new AppError("Image not found among your uploads.", 404, "IMAGE_NOT_FOUND");
  }
}

export async function getPublicSharedImage(shareToken: string) {
  const image = await prisma.image.findUnique({
    where: { shareToken },
    include: imageInclude,
  });

  if (!image || image.visibility !== "PUBLIC") {
    throw new AppError("This public image link is invalid or has been revoked.", 404, "PUBLIC_SHARE_NOT_FOUND");
  }

  const { objectKey, shareToken: _shareToken, url: _url, organizationId: _organizationId, uploadedById: _uploadedById, tags: _tags, ...publicImage } = image;
  return {
    ...publicImage,
    downloadUrl: await createPresignedDownloadUrl(objectKey),
  };
}

export async function listOrganisationMembers(user: AuthenticatedUser) {
  return prisma.user.findMany({
    where: { organizationId: organizationIdFor(user) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      imageQuota: true,
      organizationId: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function listNotifications(user: AuthenticatedUser) {
  const notifications = await prisma.notification.findMany({
    where: {
      organizationId: organizationIdFor(user),
      image: { visibility: "PUBLIC" },
      receiverUsers: {
        some: { id: user.id },
      },
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
      image: {
        select: {
          id: true,
          objectKey: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    notifications.map(async (notification) => ({
      ...notification,
      image: {
        ...notification.image,
        downloadUrl: await createPresignedDownloadUrl(notification.image.objectKey),
      },
    })),
  );
}
