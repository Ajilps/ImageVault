import "dotenv/config";
import { AppError } from "../errors/appError.js";
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new AppError(`${name} must be configured.`, 500, "CONFIGURATION_ERROR");
    }
    return value;
}
function numberFromEnv(name, fallback) {
    const value = process.env[name];
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function minioEndpoint() {
    const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    const port = process.env.MINIO_PORT ?? "9000";
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
        return endpoint;
    }
    return `${protocol}://${endpoint}:${port}`;
}
const storageProvider = (process.env.STORAGE_PROVIDER ?? "minio").toLowerCase();
export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: numberFromEnv("PORT", 3000),
    jwtAccessSecret: required("JWT_ACCESS_SECRET"),
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    bcryptSaltRounds: numberFromEnv("BCRYPT_SALT_ROUNDS", 12),
    maxFileSize: numberFromEnv("MAX_FILE_SIZE", 5 * 1024 * 1024),
    storageProvider,
    storageBucket: storageProvider === "minio"
        ? process.env.MINIO_BUCKET ?? process.env.S3_BUCKET ?? "uploads"
        : required("S3_BUCKET"),
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    storageEndpoint: process.env.S3_ENDPOINT ?? (storageProvider === "minio" ? minioEndpoint() : undefined),
    storageAccessKeyId: storageProvider === "minio"
        ? process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY
        : process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
    storageSecretAccessKey: storageProvider === "minio"
        ? process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY
        : process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
    presignExpiresIn: numberFromEnv("S3_PRESIGN_EXPIRES_IN", 900),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
};
