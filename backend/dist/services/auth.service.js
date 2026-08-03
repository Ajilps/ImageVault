import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
const userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    imageQuota: true,
    organizationId: true,
    organization: {
        select: {
            id: true,
            name: true,
        },
    },
    createdAt: true,
};
const roles = ["ADMIN", "PRODUCT_OWNER", "USER"];
export async function hashPassword(password) {
    return bcrypt.hash(password, env.bcryptSaltRounds);
}
export function createAccessToken(user) {
    return jwt.sign({
        role: user.role,
        organizationId: user.organizationId,
    }, env.jwtAccessSecret, {
        subject: user.id,
        expiresIn: env.jwtAccessExpiresIn,
    });
}
export function verifyAccessToken(token) {
    try {
        const payload = jwt.verify(token, env.jwtAccessSecret);
        if (typeof payload === "string" || typeof payload.sub !== "string") {
            throw new AppError("Invalid access token.", 401, "INVALID_TOKEN");
        }
        return { id: payload.sub };
    }
    catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Invalid or expired access token.", 401, "INVALID_TOKEN");
    }
}
export async function ensureDefaultProductOwner() {
    const existingUser = await prisma.user.findUnique({
        where: { email: env.defaultProductOwnerEmail },
        select: {
            id: true,
            role: true,
        },
    });
    if (existingUser) {
        assertProductOwner(existingUser);
        return existingUser;
    }
    const user = await prisma.user.upsert({
        where: { email: env.defaultProductOwnerEmail },
        update: {},
        create: {
            name: env.defaultProductOwnerName,
            email: env.defaultProductOwnerEmail,
            passwordHash: await hashPassword(env.defaultAccountPassword),
            role: "PRODUCT_OWNER",
            imageQuota: env.defaultImageQuota,
        },
        select: {
            id: true,
            role: true,
        },
    });
    assertProductOwner(user);
    return user;
}
function assertProductOwner(user) {
    if (user.role !== "PRODUCT_OWNER") {
        throw new AppError("DEFAULT_PRODUCT_OWNER_EMAIL is already assigned to a non-Product Owner account.", 500, "CONFIGURATION_ERROR");
    }
}
export async function login(input) {
    const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: {
            ...userSelect,
            passwordHash: true,
        },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    const accessToken = createAccessToken(safeUser);
    const payload = jwt.decode(accessToken);
    if (!payload || typeof payload === "string" || typeof payload.exp !== "number") {
        throw new AppError("The access token expiry could not be determined.", 500, "TOKEN_CONFIGURATION_ERROR");
    }
    return {
        user: safeUser,
        accessToken,
        accessTokenExpiresAt: payload.exp * 1000,
    };
}
export async function getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
    });
    if (!user) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }
    return user;
}
export async function changeOwnPassword(userId, input) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    if (!user) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
        throw new AppError("The current password is incorrect.", 400, "CURRENT_PASSWORD_INVALID");
    }
    if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
        throw new AppError("The new password must be different from the current password.", 400, "PASSWORD_UNCHANGED");
    }
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(input.newPassword) },
    });
}
