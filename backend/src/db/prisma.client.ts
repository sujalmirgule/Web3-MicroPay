import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

// Global singleton to avoid connection pool exhaustion during hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
    ],
  });

  client.$on("warn", (e) => logger.warn({ msg: e.message }, "Prisma warn"));
  client.$on("error", (e) => logger.error({ msg: e.message }, "Prisma error"));

  return client;
}

export const prisma: PrismaClient =
  global.__prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info("PostgreSQL connected via Prisma");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
}
