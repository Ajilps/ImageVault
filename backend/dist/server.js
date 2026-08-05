import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultProductOwner } from "./services/auth.service.js";
import { assertStorageReady } from "./services/storage.service.js";
const PORT = env.port;
const HOST = "0.0.0.0";
let server;
async function start() {
    try {
        await prisma.$connect();
        await ensureDefaultProductOwner();
        await assertStorageReady();
        server = app.listen(PORT, HOST, () => {
            console.log(`Server is running on port${HOST}:${PORT}`);
            console.log(`Default Product Owner account ensured: ${env.defaultProductOwnerEmail}`);
        });
    }
    catch (error) {
        console.error("Unable to connect to the database.", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}
async function shutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully.`);
    server?.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
void start();
