import { z } from "zod";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../../db/prisma.client";
import { AppError } from "../../errors/app-error";
import { logger } from "../../utils/logger";
import { ethers } from "ethers";

const RegisterChannelSchema = z.object({
  channelId:            z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid channelId"),
  payerAddress:         z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid payerAddress"),
  recipientAddress:     z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipientAddress"),
  tokenAddress:         z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid tokenAddress"),
  totalDeposit:         z.string().regex(/^\d+$/, "totalDeposit must be a decimal string"),
  expirationTimestamp:  z.number().int().positive("expirationTimestamp must be a positive integer"),
  disputePeriodSeconds: z.number().int().positive().default(86400),
  openTxHash:           z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  openBlockNumber:      z.number().int().positive().optional(),
});

export function buildChannelRoutes() {
  /**
   * POST /channels/register
   * Registers an on-chain opened channel in the database.
   * Auth: JWT (User or Merchant).
   */
  const registerChannel: RequestHandler = async (req, res, next) => {
    try {
      const body = RegisterChannelSchema.parse(req.body);
      const caller = (req as any).user;

      // Normalise addresses
      const payerAddress     = ethers.getAddress(body.payerAddress).toLowerCase();
      const recipientAddress = ethers.getAddress(body.recipientAddress).toLowerCase();

      // IDOR: caller must be the payer
      if (caller.sub !== payerAddress) {
        throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "You may only register channels where you are the payer.");
      }

      // Ensure user record exists
      await prisma.user.upsert({
        where:  { wallet_address: payerAddress },
        create: { wallet_address: payerAddress },
        update: {},
      });

      // Upsert merchant record for recipient (may be pre-registered by admin; this creates a placeholder)
      const merchant = await prisma.merchant.upsert({
        where:  { wallet_address: recipientAddress },
        create: {
          wallet_address: recipientAddress,
          business_name:  "Unknown Merchant",
          api_key_hash:   "placeholder_" + recipientAddress.slice(2, 18),
          is_active:      false,
        },
        update: {},
      });

      const channel = await prisma.paymentChannel.create({
        data: {
          channel_id:            body.channelId,
          payer_address:         payerAddress,
          recipient_address:     recipientAddress,
          token_address:         ethers.getAddress(body.tokenAddress).toLowerCase(),
          total_deposit:         body.totalDeposit,
          expiration_timestamp:  BigInt(body.expirationTimestamp),
          dispute_period_seconds: BigInt(body.disputePeriodSeconds),
          status:                body.openTxHash ? "OPEN" : "PENDING",
          open_tx_hash:          body.openTxHash ?? null,
          open_block_number:     body.openBlockNumber ?? null,
        },
      });

      logger.info({ channelId: channel.channel_id, payer: payerAddress }, "Channel registered");

      res.status(201).json({
        success: true,
        data: {
          channelId:        channel.channel_id,
          status:           channel.status,
          totalDeposit:     channel.total_deposit.toString(),
          settledAmount:    channel.settled_amount.toString(),
          reservedAmount:   channel.reserved_amount.toString(),
          expirationTimestamp: channel.expiration_timestamp.toString(),
          createdAt:        channel.created_at.toISOString(),
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
   * GET /channels/:channelId
   * Returns channel state. Auth: JWT (payer or recipient only).
   */
  const getChannel: RequestHandler = async (req, res, next) => {
    try {
      const channelId = req.params.channelId as string;
      const caller = (req as any).user;

      const channel = await prisma.paymentChannel.findUnique({
        where: { channel_id: channelId },
      });

      if (!channel) {
        throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, `Channel ${channelId} not found.`);
      }

      // IDOR: caller must be payer or recipient
      if (
        caller.sub !== channel.payer_address &&
        caller.sub !== channel.recipient_address &&
        caller.role !== "ADMIN"
      ) {
        throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Access denied. You are not a party to this channel.");
      }

      const available =
        BigInt(channel.total_deposit.toString()) -
        BigInt(channel.reserved_amount.toString());

      res.status(200).json({
        success: true,
        data: {
          channelId:           channel.channel_id,
          payerAddress:        channel.payer_address,
          recipientAddress:    channel.recipient_address,
          tokenAddress:        channel.token_address,
          totalDeposit:        channel.total_deposit.toString(),
          settledAmount:       channel.settled_amount.toString(),
          reservedAmount:      channel.reserved_amount.toString(),
          availableBalance:    available.toString(),
          status:              channel.status,
          expirationTimestamp: channel.expiration_timestamp.toString(),
          openTxHash:          channel.open_tx_hash,
          createdAt:           channel.created_at.toISOString(),
          updatedAt:           channel.updated_at.toISOString(),
        },
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /channels
   * Lists channels owned by the authenticated wallet.
   */
  const listChannels: RequestHandler = async (req, res, next) => {
    try {
      const caller = (req as any).user;
      const channels = await prisma.paymentChannel.findMany({
        where: {
          OR: [
            { payer_address: caller.sub },
            { recipient_address: caller.sub },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 50,
      });

      res.status(200).json({
        success: true,
        data: channels.map((ch: any) => ({
          channelId:     ch.channel_id,
          status:        ch.status,
          totalDeposit:  ch.total_deposit.toString(),
          settledAmount: ch.settled_amount.toString(),
          reservedAmount: ch.reserved_amount.toString(),
          createdAt:     ch.created_at.toISOString(),
        })),
        meta: { timestamp: new Date().toISOString(), requestId: (req as any).requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  return { registerChannel, getChannel, listChannels };
}
