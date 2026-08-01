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
export async function registerProductOwner(input) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError("An account with this email already exists.", 409, "EMAIL_IN_USE");
    }
    const user = await prisma.user.create({
        data: {
            name: input.name,
            email,
            passwordHash: await hashPassword(input.password),
            role: "PRODUCT_OWNER",
        },
        select: userSelect,
    });
    return {
        user,
        accessToken: createAccessToken(user),
    };
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
    return {
        user: safeUser,
        accessToken: createAccessToken(safeUser),
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
