import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import crypto from "node:crypto";
import { z } from "zod";

// Route builders
import { buildAuthRoutes }       from "./routes/auth.routes";
import { buildChannelRoutes }    from "./routes/channel.routes";
import { buildSettlementRoutes } from "./routes/settlement.routes";
import { buildWebhookRoutes }    from "./routes/webhook.routes";
import { buildAiRoutes }         from "./routes/ai.routes";

// Middleware
import { requireAuth, requireApiKey, requireRole } from "../auth/auth.middleware";
import { AuthService }                              from "../auth/auth.service";
import { ProductionRedisService }                   from "../redis/redis.production.service";
import { getRedisClient }                           from "../redis/redis.client";

// Core services
import { ProductionVoucherService } from "../services/voucher.production.service";
import { AppError }          from "../errors/app-error";
import { logger }            from "../utils/logger";

// ─── Build App ────────────────────────────────────────────────────────────────

export function buildServer(): express.Application {
  const app = express();

  // ── Security Headers ────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin:  process.env.CORS_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "Idempotency-Key"],
  }));

  // ── Body Parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // ── Request ID injection ────────────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).requestId = crypto.randomBytes(8).toString("hex");
    next();
  });

  // ── Service Instantiation ────────────────────────────────────────────────────
  const redisService = new ProductionRedisService(getRedisClient());
  const authService  = new AuthService(redisService);
  const voucherService = new ProductionVoucherService(redisService);

  // ── Route Builders ──────────────────────────────────────────────────────────
  const authRoutes       = buildAuthRoutes(authService);
  const channelRoutes    = buildChannelRoutes();
  const settlementRoutes = buildSettlementRoutes();
  const webhookRoutes    = buildWebhookRoutes();
  const aiRoutes         = buildAiRoutes();

  const auth    = requireAuth(authService);
  const apiKey  = requireApiKey(authService);
  const admin   = requireRole("ADMIN");

  // ─── /health ────────────────────────────────────────────────────────────────
  app.get("/health", (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: "ok",
      service: "web3-micropay-api",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── /v1/auth ───────────────────────────────────────────────────────────────
  app.post("/v1/auth/nonce",       authRoutes.getNonce);
  app.post("/v1/auth/verify-siwe", authRoutes.verifySiwe);
  app.get( "/v1/auth/me",          auth, authRoutes.getMe);

  // ─── /v1/channels ───────────────────────────────────────────────────────────
  app.post("/v1/channels/register", auth, channelRoutes.registerChannel);
  app.get( "/v1/channels",          auth, channelRoutes.listChannels);
  app.get( "/v1/channels/:channelId", auth, channelRoutes.getChannel);

  // ─── /v1/vouchers ───────────────────────────────────────────────────────────
  app.post("/v1/vouchers/submit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await voucherService.submitVoucher(req.body);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── /v1/settlements ────────────────────────────────────────────────────────
  app.post("/v1/settlements/claim",           auth, settlementRoutes.claimSettlement);
  app.get( "/v1/settlements/:settlementId",   auth, settlementRoutes.getSettlement);

  // ─── /v1/webhooks ───────────────────────────────────────────────────────────
  app.post("/v1/webhooks/configs",   apiKey, webhookRoutes.createWebhookConfig);
  app.get( "/v1/webhooks/configs",   apiKey, webhookRoutes.listWebhookConfigs);
  app.post("/v1/webhooks/replay",    apiKey, webhookRoutes.replayWebhooks);

  // ─── /v1/ai ─────────────────────────────────────────────────────────────────
  app.post("/v1/ai/evaluate-risk", auth, admin, aiRoutes.evaluateRisk);

  // ─── 404 handler ────────────────────────────────────────────────────────────
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError("ERR_CHANNEL_NOT_FOUND", 404, "Route not found."));
  });

  // ─── Global error handler ────────────────────────────────────────────────────
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn({ requestId: (req as any).requestId, code: err.code, status: err.statusCode }, err.message);
      res.status(err.statusCode).json({
        success: false,
        error: {
          code:      err.code,
          message:   err.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (err instanceof z.ZodError) {
      const firstError = err.errors[0];
      res.status(400).json({
        success: false,
        error: {
          code:      "ERR_INVALID_VOUCHER_PARAMS",
          message:   firstError?.message ?? "Request validation failed",
          details:   err.errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    logger.error({ requestId: (req as any).requestId, err }, "Unhandled error");
    res.status(500).json({
      success: false,
      error: {
        code:      "ERR_INTERNAL_SERVER",
        message:   "An unexpected error occurred. Please try again.",
        timestamp: new Date().toISOString(),
      },
    });
  });

  return app;
}
