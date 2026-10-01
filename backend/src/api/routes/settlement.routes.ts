import { z } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../../db/prisma.client";
import { AppError } from "../../errors/app-error";
import { logger } from "../../utils/logger";

const ClaimSettlementSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid channelId"),
});

export function buildSettlementRoutes() {
  /**
   * POST /settlements/claim
   * Merchant requests an on-chain settlement claim for the highest valid voucher.
   * Auth: Merchant API Key or JWT with MERCHANT role.
   */
  const claimSettlement: RequestHandler = async (req, res, next) => {
    try {
      const body = ClaimSettlementSchema.parse(req.body);
      const caller = (req as any).user ?? (req as any).merchant;

      const channel = await prisma.paymentChannel.findUnique({
        where: { channel_id: body.channelId },
      });

      if (!channel) {
        throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, `Channel ${body.channelId} not found.`);
      }

      if (channel.status !== "OPEN") {
        throw new AppError("ERR_CHANNEL_CLOSED", 400, `Channel is not in OPEN state. Current status: ${channel.status}`);
      }

      // IDOR: only the recipient can trigger settlement
      const callerAddress = caller?.sub ?? caller?.walletAddress;
      if (
        callerAddress !== channel.recipient_address &&
        caller?.role !== "ADMIN"
      ) {
        throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Only the channel recipient may trigger settlement.");
      }

      // Find the highest-nonce unsettled voucher
      const highestVoucher = await prisma.voucher.findFirst({
        where: { channel_id: body.channelId, is_settled: false },
        orderBy: { nonce: "desc" },
      });

      if (!highestVoucher) {
        throw new AppError("ERR_VOUCHER_NONCE_STALE", 404, "No eligible voucher found for settlement.");
      }

      // Create settlement record inside a transaction
      const settlement = await prisma.$transaction(async (tx: any) => {
        const newSettlement = await tx.settlement.create({
          data: {
            channel_id:    body.channelId,
            voucher_id:    highestVoucher.id,
            claimed_amount: highestVoucher.cumulative_amount,
            net_payout:    highestVoucher.cumulative_amount, // adjusted by relayer after gas calculation
            status:        "PENDING",
          },
        });

        // Append transactional outbox entry for any configured webhooks
        const webhookConfigs = await tx.webhookConfig.findMany({
          where: {
            merchant_id: { in: await getMerchantIdByWallet(tx, channel.recipient_address) },
            is_enabled: true,
            subscribed_events: { has: "settlement.confirmed" },
          },
        });

        for (const wh of webhookConfigs) {
          await tx.notificationOutbox.create({
            data: {
              merchant_id: wh.merchant_id,
              event_type:  "settlement.queued",
              payload:     { settlementId: newSettlement.id, channelId: body.channelId, claimedAmount: highestVoucher.cumulative_amount.toString() },
              target_url:  wh.url,
            },
          });
        }

        return newSettlement;
      });

      logger.info({ settlementId: settlement.id, channelId: body.channelId }, "Settlement queued");

      res.status(202).json({
        success: true,
        data: {
          settlementId:        settlement.id,
          channelId:           body.channelId,
          status:              settlement.status,
          claimedAmount:       settlement.claimed_amount.toString(),
          estimatedGasCostGwei: "0.12", // advisory; actual determined by relayer
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
   * GET /settlements/:settlementId
   * Returns settlement status.
   */
  const getSettlement: RequestHandler = async (req, res, next) => {
    try {
      const settlementId = req.params.settlementId as string;
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: { receipt: true },
      }) as any;

      if (!settlement) {
        throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, `Settlement ${settlementId} not found.`);
      }

      res.status(200).json({
        success: true,
        data: {
          settlementId:  settlement.id,
          channelId:     settlement.channel_id,
          status:        settlement.status,
          claimedAmount: settlement.claimed_amount.toString(),
          netPayout:     settlement.net_payout.toString(),
          txHash:        settlement.tx_hash ?? settlement.receipt?.tx_hash ?? null,
          blockNumber:   settlement.receipt?.block_number.toString() ?? null,
          finalizedAt:   settlement.finalized_at?.toISOString() ?? null,
        },
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  return { claimSettlement, getSettlement };
}

async function getMerchantIdByWallet(tx: any, walletAddress: string): Promise<string[]> {
  const merchant = await tx.merchant.findUnique({ where: { wallet_address: walletAddress } });
  return merchant ? [merchant.id] : [];
}
