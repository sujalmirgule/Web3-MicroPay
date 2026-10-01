import Redis from "ioredis";
import { logger } from "../utils/logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on("connect", () => logger.info("Redis connected"));
    redisClient.on("ready", () => logger.info("Redis ready"));
    redisClient.on("error", (err) => logger.error({ err }, "Redis error"));
    redisClient.on("close", () => logger.warn("Redis connection closed"));
    redisClient.on("reconnecting", () => logger.info("Redis reconnecting"));
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  await getRedisClient().connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis disconnected");
  }
}
