import "dotenv/config";
import { buildServer }          from "./api/server";
import { connectDatabase, disconnectDatabase } from "./db/prisma.client";
import { connectRedis, disconnectRedis }        from "./redis/redis.client";
import { IndexerService }       from "./indexer/indexer.service";
import { RelayerService }       from "./relayer/relayer.service";
import { NotificationOutboxWorker } from "./notifications/outbox.worker";
import { ProductionRedisService }   from "./redis/redis.production.service";
import { getRedisClient }           from "./redis/redis.client";
import { logger }                   from "./utils/logger";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const HOST = process.env.HOST ?? "localhost";

async function main(): Promise<void> {
  logger.info({ env: process.env.NODE_ENV, port: PORT }, "Web3 MicroPay API starting");

  // ── Infrastructure connections ───────────────────────────────────────────────
  await connectDatabase();
  await connectRedis();

  // ── Build and start HTTP server ─────────────────────────────────────────────
  const app    = buildServer();
  const server = app.listen(PORT, HOST, () => {
    logger.info({ host: HOST, port: PORT }, "HTTP server listening");
  });

  // ── Start background workers ─────────────────────────────────────────────────
  const redisService = new ProductionRedisService(getRedisClient());
  const outboxWorker = new NotificationOutboxWorker(redisService);
  outboxWorker.start();

  // ── Indexer (WebSocket listener) ─────────────────────────────────────────────
  const indexer = new IndexerService();
  await indexer.start();

  // ── Relayer reconciliation cron ───────────────────────────────────────────────
  const relayer = new RelayerService();
  relayer.startReconciliationLoop();

  // ── Graceful shutdown ─────────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutdown signal received");

    outboxWorker.stop();
    await indexer.stop();

    server.close(async () => {
      await disconnectDatabase();
      await disconnectRedis();
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Force exit after 15 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 15_000);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT",  () => void shutdown("SIGINT"));
  process.on("uncaughtException",  (err) => logger.error({ err }, "Uncaught exception"));
  process.on("unhandledRejection", (reason) => logger.error({ reason }, "Unhandled rejection"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
