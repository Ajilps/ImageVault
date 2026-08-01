import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import { assertUploadedImage, createPresignedDownloadUrl, createPresignedUploadUrl, storageUri, } from "./storage.service.js";
function organizationIdFor(user) {
    if (!user.organizationId) {
        throw new AppError("You must belong to an organisation to use this feature.", 403, "ORGANISATION_REQUIRED");
    }
    return user.organizationId;
}
function objectKeyFor(user, fileName) {
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
};
async function withDownloadUrl(image) {
    return {
        ...image,
        downloadUrl: await createPresignedDownloadUrl(image.objectKey),
    };
}
export async function getQuota(user) {
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
export async function requestImageUpload(user, input) {
    if (!input.contentType.startsWith("image/")) {
        throw new AppError("Only image uploads are allowed.", 400, "INVALID_IMAGE_TYPE");
    }
    const quota = await getQuota(user);
    if (quota.remaining < 1) {
        throw new AppError("Your image quota has been exhausted. Purchase another five-slot pack to continue.", 403, "QUOTA_EXHAUSTED");
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
export async function completeImageUpload(user, input) {
    const organizationId = organizationIdFor(user);
    const expectedPrefix = `organisations/${organizationId}/users/${user.id}/`;
    if (!input.objectKey.startsWith(expectedPrefix)) {
        throw new AppError("This upload key does not belong to the current user.", 403, "INVALID_UPLOAD_KEY");
    }
    await assertUploadedImage(input.objectKey);
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
    const image = await prisma.$transaction(async (transaction) => {
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
            throw new AppError("Your image quota has been exhausted. Purchase another five-slot pack to continue.", 403, "QUOTA_EXHAUSTED");
        }
        const createdImage = await transaction.image.create({
            data: {
                url: storageUri(input.objectKey),
                objectKey: input.objectKey,
                uploadedById: user.id,
                organizationId,
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
        const receiverUserIds = uniqueTagUserIds.length
            ? uniqueTagUserIds
            : (await transaction.user.findMany({
                where: { organizationId },
                select: { id: true },
            })).map((member) => member.id);
        await transaction.notification.create({
            data: {
                organizationId,
                senderId: user.id,
                imageId: createdImage.id,
                receiverUsers: {
                    connect: receiverUserIds.map((id) => ({ id })),
                },
                message: uniqueTagUserIds.length
                    ? `${currentUser.name} tagged you in an image upload.`
                    : `${currentUser.name} uploaded a new image.`,
            },
        });
        return createdImage;
    });
    return withDownloadUrl(image);
}
export async function listOrganisationImages(user, taggedUserId) {
    const images = await prisma.image.findMany({
        where: {
            organizationId: organizationIdFor(user),
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
    return Promise.all(images.map(withDownloadUrl));
}
export async function listNotifications(user) {
    const notifications = await prisma.notification.findMany({
        where: {
            organizationId: organizationIdFor(user),
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
    return Promise.all(notifications.map(async (notification) => ({
        ...notification,
        image: {
            ...notification.image,
            downloadUrl: await createPresignedDownloadUrl(notification.image.objectKey),
        },
    })));
}
