import crypto from "node:crypto";
import { prisma } from "../db/prisma.client";
import { ProductionRedisService } from "../redis/redis.production.service";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";

const BACKOFF_DELAYS = [0, 5, 30, 300, 3600]; // seconds per attempt

export class NotificationOutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly pollingIntervalMs = 500;

  constructor(
    private readonly redisService: ProductionRedisService,
    private readonly webhookSigningSecret: string = process.env.WEBHOOK_SIGNING_SECRET ?? "whsec_dev"
  ) {}

  /**
   * Start polling the outbox every 500ms.
   */
  public start(): void {
    logger.info("NotificationOutboxWorker starting");
    this.timer = setInterval(() => void this.pollAndDispatch(), this.pollingIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("NotificationOutboxWorker stopped");
    }
  }

  private async pollAndDispatch(): Promise<void> {
    // Acquire distributed lock to avoid duplicate dispatch across workers
    const acquired = await this.redisService.acquireLock("outbox:dispatch", 10);
    if (!acquired) return;

    try {
      const pendingItems = await prisma.notificationOutbox.findMany({
        where: {
          delivery_status: "PENDING",
          next_retry_at: { lte: new Date() },
        },
        orderBy: { next_retry_at: "asc" },
        take: 10,
      });

      for (const item of pendingItems) {
        await this.dispatchWebhook(item);
      }
    } catch (err) {
      logger.error({ err }, "Outbox poll error");
    } finally {
      await this.redisService.releaseLock("outbox:dispatch");
    }
  }

  private async dispatchWebhook(item: {
    id: string;
    target_url: string;
    event_type: string;
    payload: unknown;
    attempts: number;
    merchant_id: string;
  }): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify(item.payload);
    const signedPayload = `${timestamp}.${rawBody}`;
    const signature = crypto
      .createHmac("sha256", this.webhookSigningSecret)
      .update(signedPayload)
      .digest("hex");

    logger.debug({ webhookId: item.id, url: item.target_url, event: item.event_type }, "Dispatching webhook");

    try {
      const response = await fetch(item.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MicroPay-Event": item.event_type,
          "X-MicroPay-Timestamp": timestamp,
          "X-MicroPay-Signature": `t=${timestamp},v1=${signature}`,
        },
        body: rawBody,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (response.ok) {
        await prisma.notificationOutbox.update({
          where: { id: item.id },
          data: { delivery_status: "DELIVERED" },
        });
        logger.info({ webhookId: item.id }, "Webhook delivered successfully");
      } else {
        await this.handleFailure(item, `HTTP ${response.status}`);
      }
    } catch (err: any) {
      await this.handleFailure(item, err?.message ?? "Network error");
    }
  }

  private async handleFailure(
    item: { id: string; attempts: number },
    errorMsg: string
  ): Promise<void> {
    const nextAttempt = item.attempts + 1;
    const isDeadLetter = nextAttempt >= BACKOFF_DELAYS.length;
    const delaySeconds = isDeadLetter ? 0 : BACKOFF_DELAYS[nextAttempt];
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    logger.warn({ webhookId: item.id, attempt: nextAttempt, error: errorMsg }, "Webhook delivery failed");

    await prisma.notificationOutbox.update({
      where: { id: item.id },
      data: {
        attempts: nextAttempt,
        last_error: errorMsg,
        delivery_status: isDeadLetter ? "DEAD_LETTER" : "PENDING",
        next_retry_at: nextRetryAt,
      },
    });
  }

  /**
   * Queue a webhook record transactionally (called from within a Prisma transaction).
   * The caller must pass the Prisma transaction client (tx).
   */
  public static async enqueue(
    tx: typeof prisma,
    merchantId: string,
    eventType: string,
    payload: Record<string, unknown>,
    targetUrl: string
  ): Promise<void> {
    await tx.notificationOutbox.create({
      data: {
        merchant_id: merchantId,
        event_type: eventType,
        payload:    payload as any,
        target_url: targetUrl,
      },
    });
  }
}
