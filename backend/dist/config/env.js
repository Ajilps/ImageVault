import "dotenv/config";
import { AppError } from "../errors/appError.js";
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new AppError(`${name} must be configured.`, 500, "CONFIGURATION_ERROR");
    }
    return value;
}
function requiredInteger(name, minimum = 1) {
    const value = required(name);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum) {
        throw new AppError(`${name} must be an integer greater than or equal to ${minimum}.`, 500, "CONFIGURATION_ERROR");
    }
    return parsed;
}
function minioEndpoint() {
    const endpoint = required("MINIO_ENDPOINT");
    const useSsl = required("MINIO_USE_SSL");
    const protocol = useSsl === "true" ? "https" : "http";
    const port = requiredInteger("MINIO_PORT");
    if (useSsl !== "true" && useSsl !== "false") {
        throw new AppError("MINIO_USE_SSL must be either 'true' or 'false'.", 500, "CONFIGURATION_ERROR");
    }
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
        return endpoint;
    }
    return `${protocol}://${endpoint}:${port}`;
}
function corsOrigins() {
    const configuredOrigins = required("CORS_ORIGIN")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    return configuredOrigins;
}
function defaultAccountPassword() {
    const password = process.env.DEFAULT_ACCOUNT_PASSWORD;
    const minimum = requiredInteger("PASSWORD_MIN_LENGTH");
    const maximum = requiredInteger("PASSWORD_MAX_LENGTH");
    if (password && password.length >= minimum && password.length <= maximum) {
        return password;
    }
    throw new AppError(`DEFAULT_ACCOUNT_PASSWORD must be configured with ${minimum} to ${maximum} characters.`, 500, "CONFIGURATION_ERROR");
}
function defaultProductOwnerEmail() {
    const email = process.env.DEFAULT_PRODUCT_OWNER_EMAIL?.trim().toLowerCase();
    if (email) {
        return email;
    }
    throw new AppError("DEFAULT_PRODUCT_OWNER_EMAIL must be configured.", 500, "CONFIGURATION_ERROR");
}
const storageProvider = required("STORAGE_PROVIDER").toLowerCase();
if (storageProvider !== "minio" && storageProvider !== "s3") {
    throw new AppError("STORAGE_PROVIDER must be either 'minio' or 's3'.", 500, "CONFIGURATION_ERROR");
}
const vapidValues = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY, process.env.VAPID_SUBJECT];
if (vapidValues.some(Boolean) && !vapidValues.every(Boolean)) {
    throw new AppError("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be configured together.", 500, "CONFIGURATION_ERROR");
}
export const env = {
    nodeEnv: required("NODE_ENV"),
    port: requiredInteger("PORT"),
    corsOrigins: corsOrigins(),
    defaultAccountPassword: defaultAccountPassword(),
    defaultProductOwnerName: required("DEFAULT_PRODUCT_OWNER_NAME").trim(),
    defaultProductOwnerEmail: defaultProductOwnerEmail(),
    jwtAccessSecret: required("JWT_ACCESS_SECRET"),
    jwtAccessExpiresIn: required("JWT_ACCESS_EXPIRES_IN"),
    bcryptSaltRounds: requiredInteger("BCRYPT_SALT_ROUNDS"),
    defaultImageQuota: requiredInteger("DEFAULT_IMAGE_QUOTA"),
    slotPackSize: requiredInteger("SLOT_PACK_SIZE"),
    slotPackPriceInr: requiredInteger("SLOT_PACK_PRICE_INR"),
    maxSlotPacksPerOrder: requiredInteger("MAX_SLOT_PACKS_PER_ORDER"),
    maxAdminSlotAllocation: requiredInteger("MAX_ADMIN_SLOT_ALLOCATION"),
    maxUserImageQuota: requiredInteger("MAX_USER_IMAGE_QUOTA"),
    maxTagsPerImage: requiredInteger("MAX_TAGS_PER_IMAGE"),
    passwordMinLength: requiredInteger("PASSWORD_MIN_LENGTH"),
    passwordMaxLength: requiredInteger("PASSWORD_MAX_LENGTH"),
    nameMaxLength: requiredInteger("NAME_MAX_LENGTH"),
    emailMaxLength: requiredInteger("EMAIL_MAX_LENGTH"),
    addressMaxLength: requiredInteger("ADDRESS_MAX_LENGTH"),
    phoneMinLength: requiredInteger("PHONE_MIN_LENGTH"),
    phoneMaxLength: requiredInteger("PHONE_MAX_LENGTH"),
    urlMaxLength: requiredInteger("URL_MAX_LENGTH"),
    fileNameMaxLength: requiredInteger("FILE_NAME_MAX_LENGTH"),
    objectKeyMaxLength: requiredInteger("OBJECT_KEY_MAX_LENGTH"),
    maxFileSize: requiredInteger("MAX_FILE_SIZE"),
    publicShareTokenBytes: requiredInteger("PUBLIC_SHARE_TOKEN_BYTES", 16),
    jsonBodyLimitBytes: requiredInteger("JSON_BODY_LIMIT_BYTES"),
    loginRateLimitWindowMs: requiredInteger("LOGIN_RATE_LIMIT_WINDOW_MS"),
    loginRateLimitMax: requiredInteger("LOGIN_RATE_LIMIT_MAX_REQUESTS"),
    apiRateLimitWindowMs: requiredInteger("API_RATE_LIMIT_WINDOW_MS"),
    apiRateLimitMax: requiredInteger("API_RATE_LIMIT_MAX_REQUESTS"),
    rateLimitMaxTrackedClients: requiredInteger("RATE_LIMIT_MAX_TRACKED_CLIENTS"),
    quotaTransactionMaxRetries: requiredInteger("QUOTA_TRANSACTION_MAX_RETRIES"),
    notificationPollIntervalMs: requiredInteger("NOTIFICATION_POLL_INTERVAL_MS"),
    storageProvider,
    storageBucket: storageProvider === "minio"
        ? required("MINIO_BUCKET")
        : required("S3_BUCKET"),
    awsRegion: required("AWS_REGION"),
    storageEndpoint: process.env.S3_ENDPOINT ?? (storageProvider === "minio" ? minioEndpoint() : undefined),
    storageAccessKeyId: storageProvider === "minio"
        ? process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY
        : process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
    storageSecretAccessKey: storageProvider === "minio"
        ? process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY
        : process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
    presignExpiresIn: requiredInteger("S3_PRESIGN_EXPIRES_IN"),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT,
};
if (env.passwordMaxLength < env.passwordMinLength) {
    throw new AppError("PASSWORD_MAX_LENGTH must be greater than or equal to PASSWORD_MIN_LENGTH.", 500, "CONFIGURATION_ERROR");
}
if (env.phoneMaxLength < env.phoneMinLength) {
    throw new AppError("PHONE_MAX_LENGTH must be greater than or equal to PHONE_MIN_LENGTH.", 500, "CONFIGURATION_ERROR");
}
if (env.maxAdminSlotAllocation > env.maxUserImageQuota) {
    throw new AppError("MAX_ADMIN_SLOT_ALLOCATION must not exceed MAX_USER_IMAGE_QUOTA.", 500, "CONFIGURATION_ERROR");
}
