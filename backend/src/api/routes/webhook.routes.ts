import crypto from "node:crypto";
import { z } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../../db/prisma.client";
import { AppError } from "../../errors/app-error";
import { logger } from "../../utils/logger";

const WebhookConfigSchema = z.object({
  url: z.string().url("Must be a valid HTTPS URL"),
  subscribedEvents: z
    .array(z.enum(["payment.authorized", "settlement.confirmed", "channel.disputed"]))
    .min(1, "At least one event must be subscribed"),
});

const ReplaySchema = z.object({
  webhookConfigId: z.string().uuid("Must be a valid webhook config UUID"),
});

export function buildWebhookRoutes() {
  /**
   * POST /webhooks/configs
   * Configures a merchant webhook URL. Auth: API Key.
   */
  const createWebhookConfig: RequestHandler = async (req, res, next) => {
    try {
      const body = WebhookConfigSchema.parse(req.body);
      const merchant = (req as any).merchant;

      if (!merchant) {
        throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Webhook configuration requires merchant API key authentication.");
      }

      // Generate per-endpoint HMAC signing secret
      const hmacSecret = "whsec_" + crypto.randomBytes(16).toString("hex");

      const config = await prisma.webhookConfig.create({
        data: {
          merchant_id:      merchant.merchantId,
          url:              body.url,
          hmac_secret:      hmacSecret,
          subscribed_events: body.subscribedEvents,
        },
      });

      logger.info({ webhookId: config.id, merchantId: merchant.merchantId }, "Webhook configured");

      res.status(201).json({
        success: true,
        data: {
          webhookId:  config.id,
          hmacSecret, // returned once; merchant must store it securely
          url:        config.url,
          events:     config.subscribed_events,
          createdAt:  config.created_at.toISOString(),
        },
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, err.errors[0]?.message ?? "Validation error"));
      } else {
        next(err);
      }
    }
  };

  /**
   * GET /webhooks/configs
   * Lists all webhook configs for the authenticated merchant.
   */
  const listWebhookConfigs: RequestHandler = async (req, res, next) => {
    try {
      const merchant = (req as any).merchant;

      const configs = await prisma.webhookConfig.findMany({
        where: { merchant_id: merchant.merchantId, is_enabled: true },
        select: {
          id: true,
          url: true,
          subscribed_events: true,
          is_enabled: true,
          created_at: true,
        },
      });

      res.status(200).json({
        success: true,
        data: configs.map((c: any) => ({
          webhookId:  c.id,
          url:        c.url,
          events:     c.subscribed_events,
          isEnabled:  c.is_enabled,
          createdAt:  c.created_at.toISOString(),
        })),
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /webhooks/replay
   * Re-enqueues DEAD_LETTER outbox items for a webhook config.
   */
  const replayWebhooks: RequestHandler = async (req, res, next) => {
    try {
      const body = ReplaySchema.parse(req.body);
      const merchant = (req as any).merchant;

      const webhookConfig = await prisma.webhookConfig.findUnique({
        where: { id: body.webhookConfigId },
      });

      if (!webhookConfig || webhookConfig.merchant_id !== merchant.merchantId) {
        throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, "Webhook config not found.");
      }

      const result = await prisma.notificationOutbox.updateMany({
        where: {
          merchant_id:     merchant.merchantId,
          target_url:      webhookConfig.url,
          delivery_status: "DEAD_LETTER",
        },
        data: {
          delivery_status: "PENDING",
          attempts:        0,
          next_retry_at:   new Date(),
          last_error:      null,
        },
      });

      logger.info({ count: result.count, merchantId: merchant.merchantId }, "Dead-letter items re-queued");

      res.status(200).json({
        success: true,
        data: { requeued: result.count },
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, err.errors[0]?.message ?? "Validation error"));
      } else {
        next(err);
      }
    }
  };

  return { createWebhookConfig, listWebhookConfigs, replayWebhooks };
}
