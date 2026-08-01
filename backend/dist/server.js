import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
const PORT = process.env.PORT || 3000;
let server;
async function start() {
    try {
        await prisma.$connect();
        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
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
