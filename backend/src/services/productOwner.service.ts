import { randomUUID } from "node:crypto";

import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "./auth.service.js";

const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const organisationSelect = {
  id: true,
  name: true,
  logoUrl: true,
  address: true,
  phone: true,
  adminId: true,
  createdAt: true,
  _count: {
    select: {
      users: true,
      images: true,
    },
  },
} as const;

export async function listOrganisations() {
  return prisma.organisation.findMany({
    select: organisationSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createOrganisation(input: {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  admin: {
    name: string;
    email: string;
    password: string;
  };
}) {
  const organisationId = randomUUID();
  const adminId = randomUUID();
  const adminEmail = input.admin.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingUser) {
    throw new AppError("The default admin email is already in use.", 409, "EMAIL_IN_USE");
  }

  return prisma.$transaction(async (transaction) => {
    const admin = await transaction.user.create({
      data: {
        id: adminId,
        name: input.admin.name,
        email: adminEmail,
        passwordHash: await hashPassword(input.admin.password),
        role: "ADMIN",
      },
      select: adminSelect,
    });

    const organisation = await transaction.organisation.create({
      data: {
        id: organisationId,
        name: input.name,
        logoUrl: input.logoUrl,
        address: input.address,
        phone: input.phone,
        adminId,
      },
      select: organisationSelect,
    });

    await transaction.user.update({
      where: { id: adminId },
      data: { organizationId: organisationId },
    });

    return { ...organisation, admin };
  });
}

export async function updateOrganisation(
  organisationId: string,
  input: Partial<{
    name: string;
    logoUrl: string;
    address: string;
    phone: string;
  }>,
) {
  const organisation = await prisma.organisation.update({
    where: { id: organisationId },
    data: input,
    select: organisationSelect,
  });

  return organisation;
}

export async function deleteOrganisation(organisationId: string) {
  const existingOrganisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true },
  });

  if (!existingOrganisation) {
    throw new AppError("Organisation not found.", 404, "ORGANISATION_NOT_FOUND");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.notification.deleteMany({ where: { organizationId: organisationId } });
    await transaction.image.deleteMany({ where: { organizationId: organisationId } });
    await transaction.payment.deleteMany({ where: { organizationId: organisationId } });
    await transaction.user.deleteMany({ where: { organizationId: organisationId } });
    await transaction.organisation.delete({ where: { id: organisationId } });
  });
}
