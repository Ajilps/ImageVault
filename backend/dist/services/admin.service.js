import { AppError } from "../errors/appError.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "./auth.service.js";
import { deleteStoredObjects } from "./storage.service.js";
const managedUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    imageQuota: true,
    organizationId: true,
    createdAt: true,
    _count: {
        select: {
            uploads: true,
        },
    },
};
function organizationIdFor(admin) {
    if (!admin.organizationId) {
        throw new AppError("This admin is not assigned to an organisation.", 409, "ORGANISATION_REQUIRED");
    }
    return admin.organizationId;
}
export async function listUsers(admin) {
    return prisma.user.findMany({
        where: {
            organizationId: organizationIdFor(admin),
        },
        select: managedUserSelect,
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
}
export async function createUser(admin, input) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError("An account with this email already exists.", 409, "EMAIL_IN_USE");
    }
    return prisma.user.create({
        data: {
            name: input.name,
            email,
            passwordHash: await hashPassword(env.defaultAccountPassword),
            role: "USER",
            imageQuota: env.defaultImageQuota,
            organizationId: organizationIdFor(admin),
        },
        select: managedUserSelect,
    });
}
export async function updateUser(admin, userId, input) {
    const organizationId = organizationIdFor(admin);
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            organizationId,
            role: "USER",
        },
        select: { id: true },
    });
    if (!user) {
        throw new AppError("User not found in your organisation.", 404, "USER_NOT_FOUND");
    }
    if (input.email) {
        const existingUser = await prisma.user.findFirst({
            where: {
                email: input.email.toLowerCase(),
                NOT: { id: userId },
            },
            select: { id: true },
        });
        if (existingUser) {
            throw new AppError("An account with this email already exists.", 409, "EMAIL_IN_USE");
        }
    }
    const data = {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    };
    return prisma.user.update({
        where: { id: userId },
        data,
        select: managedUserSelect,
    });
}
export async function allocateUserSlots(admin, userId, additionalSlots) {
    const organizationId = organizationIdFor(admin);
    const maximumCurrentQuota = env.maxUserImageQuota - additionalSlots;
    const updated = await prisma.user.updateMany({
        where: {
            id: userId,
            organizationId,
            role: "USER",
            imageQuota: { lte: maximumCurrentQuota },
        },
        data: {
            imageQuota: { increment: additionalSlots },
        },
    });
    if (!updated.count) {
        const user = await prisma.user.findFirst({
            where: { id: userId, organizationId, role: "USER" },
            select: { imageQuota: true },
        });
        if (!user) {
            throw new AppError("User not found in your organisation.", 404, "USER_NOT_FOUND");
        }
        throw new AppError(`This allocation would exceed the configured maximum quota of ${env.maxUserImageQuota}.`, 400, "QUOTA_LIMIT_EXCEEDED");
    }
    return prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: managedUserSelect,
    });
}
export async function deleteUser(admin, userId) {
    const organizationId = organizationIdFor(admin);
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            organizationId,
            role: "USER",
        },
        select: { id: true },
    });
    if (!user) {
        throw new AppError("User not found in your organisation.", 404, "USER_NOT_FOUND");
    }
    const objectKeys = await prisma.$transaction(async (transaction) => {
        const uploads = await transaction.image.findMany({
            where: { uploadedById: userId },
            select: { id: true, objectKey: true },
        });
        const imageIds = uploads.map((image) => image.id);
        await transaction.notification.deleteMany({
            where: {
                OR: [
                    { senderId: userId },
                    ...(imageIds.length ? [{ imageId: { in: imageIds } }] : []),
                ],
            },
        });
        await transaction.image.deleteMany({ where: { uploadedById: userId } });
        await transaction.payment.deleteMany({ where: { userId } });
        await transaction.user.delete({ where: { id: userId } });
        return uploads.map((image) => image.objectKey);
    });
    try {
        await deleteStoredObjects(objectKeys);
    }
    catch (error) {
        console.error("User records were deleted, but storage cleanup failed.", { userId, error });
    }
}
