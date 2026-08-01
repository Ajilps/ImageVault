import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, type AuthenticatedUser } from "./auth.service.js";

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
} as const;

function organizationIdFor(admin: AuthenticatedUser): string {
  if (!admin.organizationId) {
    throw new AppError("This admin is not assigned to an organisation.", 409, "ORGANISATION_REQUIRED");
  }

  return admin.organizationId;
}

export async function listUsers(admin: AuthenticatedUser) {
  return prisma.user.findMany({
    where: {
      organizationId: organizationIdFor(admin),
    },
    select: managedUserSelect,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function createUser(
  admin: AuthenticatedUser,
  input: { name: string; email: string; password: string },
) {
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409, "EMAIL_IN_USE");
  }

  return prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      role: "USER",
      organizationId: organizationIdFor(admin),
    },
    select: managedUserSelect,
  });
}

export async function updateUser(
  admin: AuthenticatedUser,
  userId: string,
  input: Partial<{ name: string; email: string; password: string }>,
) {
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

export async function deleteUser(admin: AuthenticatedUser, userId: string) {
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

  await prisma.$transaction(async (transaction) => {
    const uploads = await transaction.image.findMany({
      where: { uploadedById: userId },
      select: { id: true },
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
  });
}
