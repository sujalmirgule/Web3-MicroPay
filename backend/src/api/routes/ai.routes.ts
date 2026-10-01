import { z } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../../db/prisma.client";
import { AppError } from "../../errors/app-error";
import { logger } from "../../utils/logger";

const AiEvaluateRiskSchema = z.object({
  channelId:      z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  windowMinutes:  z.number().int().positive().max(60).default(10),
  voucherCount:   z.number().int().nonnegative(),
  totalVolumeWei: z.string().regex(/^\d+$/, "totalVolumeWei must be a decimal string"),
});

/**
 * Heuristic risk engine (AI advisory layer — zero authority over execution).
 * In production, replace with a real AI call (e.g., Gemini Flash via Vertex AI).
 */
function computeRiskScore(
  voucherCount: number,
  windowMinutes: number,
  totalVolumeWei: bigint
): { riskScore: number; flag: string; reasoningTags: string[] } {
  const reasoningTags: string[] = [];
  let riskScore = 0;

  // Velocity heuristic: > 100 vouchers in 10 minutes = high frequency
  const vpm = voucherCount / Math.max(windowMinutes, 1);
  if (vpm > 50) { riskScore += 40; reasoningTags.push("high_velocity_anomaly"); }
  else if (vpm > 20) { riskScore += 15; reasoningTags.push("elevated_velocity"); }
  else { reasoningTags.push("streaming_interval_uniform"); }

  // Volume heuristic: > 10 ETH equivalent in Wei
  const ethEquivalent = Number(totalVolumeWei) / 1e18;
  if (ethEquivalent > 100) { riskScore += 35; reasoningTags.push("large_volume_detected"); }
  else if (ethEquivalent > 10) { riskScore += 10; reasoningTags.push("moderate_volume"); }

  // Normalise
  riskScore = Math.min(riskScore, 100);

  let flag = "LOW_RISK";
  if (riskScore >= 70) flag = "HIGH_RISK";
  else if (riskScore >= 40) flag = "MEDIUM_RISK";

  return { riskScore, flag, reasoningTags };
}

export function buildAiRoutes() {
  /**
   * POST /ai/evaluate-risk
   * Evaluates voucher velocity and volume for anomaly detection.
   * Auth: Internal service token (Bearer with role=ADMIN or service account).
   */
  const evaluateRisk: RequestHandler = async (req, res, next) => {
    try {
      const body = AiEvaluateRiskSchema.parse(req.body);

      const evaluation = computeRiskScore(
        body.voucherCount,
        body.windowMinutes,
        BigInt(body.totalVolumeWei)
      );

      // Persist advisory evaluation for audit trail
      const record = await prisma.aiEvaluation.create({
        data: {
          channel_id:           body.channelId ?? null,
          evaluation_type:      "VELOCITY_RISK",
          risk_score:           evaluation.riskScore,
          reasoning_tags:       evaluation.reasoningTags,
          raw_advisory_payload: {
            input: body,
            output: evaluation,
            evaluatedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(
        { evaluationId: record.id, channelId: body.channelId, riskScore: evaluation.riskScore, flag: evaluation.flag },
        "AI risk evaluation completed"
      );

      res.status(200).json({
        success: true,
        data: {
          evaluationId:  record.id,
          riskScore:     evaluation.riskScore,
          flag:          evaluation.flag,
          reasoningTags: evaluation.reasoningTags,
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

  return { evaluateRisk };
}
