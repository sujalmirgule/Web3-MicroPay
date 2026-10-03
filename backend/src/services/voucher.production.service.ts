import "dotenv/config";
import { ethers } from "ethers";
import { prisma } from "../db/prisma.client";
import { getRedisClient } from "../redis/redis.client";
import { ProductionRedisService } from "../redis/redis.production.service";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";
import {
  MICRO_VOUCHER_TYPES,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  getMicroPayDomain,
} from "@web3-micropay/shared";

/**
 * Production Voucher Service — 11-step verification pipeline.
 * Backed by PostgreSQL (prisma) + Redis (atomic nonce/capacity checks).
 */
export class ProductionVoucherService {
  constructor(private readonly redisService: ProductionRedisService) {}

  public async submitVoucher(payload: unknown): Promise<{
    authorized: boolean;
    channelId: string;
    nonce: number;
    cumulativeAmount: string;
    availableBalance: string;
  }> {
    // ── Step 1: Schema validation ─────────────────────────────────────────────
    const voucher = parseVoucherPayload(payload);

    // ── Step 2: Channel existence check ──────────────────────────────────────
    const channel = await prisma.paymentChannel.findUnique({
      where: { channel_id: voucher.channelId },
    });
    if (!channel) {
      throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, `Channel ${voucher.channelId} does not exist.`);
    }

    // ── Step 3: Channel status check ──────────────────────────────────────────
    if (channel.status !== "OPEN") {
      throw new AppError("ERR_CHANNEL_CLOSED", 400, `Channel status is ${channel.status}. Expected OPEN.`);
    }

    // ── Step 4: Expiration check ──────────────────────────────────────────────
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));
    if (nowSecs >= channel.expiration_timestamp) {
      throw new AppError("ERR_VOUCHER_EXPIRED", 400, "Voucher submitted after channel expiration.");
    }

    // ── Step 5: Nonce monotonicity check (advisory — enforced atomically in Step 9) ─
    // Step 9's Lua script is authoritative; this is a fast early-exit
    const highestVoucher = await prisma.voucher.findFirst({
      where: { channel_id: voucher.channelId },
      orderBy: { nonce: "desc" },
    });
    if (highestVoucher && voucher.nonce <= Number(highestVoucher.nonce)) {
      throw new AppError(
        "ERR_VOUCHER_NONCE_STALE",
        400,
        `Submitted nonce ${voucher.nonce} is not greater than active channel nonce ${highestVoucher.nonce}.`
      );
    }

    // ── Step 6: Cumulative monotonicity check ─────────────────────────────────
    if (highestVoucher) {
      const lastCumulative = BigInt(highestVoucher.cumulative_amount.toString());
      if (BigInt(voucher.cumulativeAmount) <= lastCumulative) {
        throw new AppError(
          "ERR_VOUCHER_AMOUNT_BELOW_SETTLED",
          400,
          `Cumulative amount ${voucher.cumulativeAmount} must be greater than last voucher's ${lastCumulative}.`
        );
      }
    }

    // ── Step 7: Capacity check (advisory) ────────────────────────────────────
    const totalDeposit = BigInt(channel.total_deposit.toString());
    if (BigInt(voucher.cumulativeAmount) > totalDeposit) {
      throw new AppError(
        "ERR_CHANNEL_CAPACITY_EXCEEDED",
        400,
        `Cumulative amount exceeds channel total deposit.`
      );
    }

    // ── Step 8: EIP-712 signature verification ────────────────────────────────
    const chainId = parseInt(process.env.CHAIN_ID ?? "31337");
    const recoveredSigner = recoverVoucherSigner(voucher, channel, chainId);

    if (recoveredSigner.toLowerCase() !== channel.payer_address.toLowerCase()) {
      throw new AppError(
        "ERR_VOUCHER_SIGNATURE_INVALID",
        400,
        `Recovered signer ${recoveredSigner} does not match channel payer ${channel.payer_address}.`
      );
    }

    // ── Step 9: Atomic Redis reservation (authoritative nonce gate) ───────────
    const atomicResult = await this.redisService.atomicVerifyAndReserveVoucher(
      voucher.channelId,
      voucher.nonce,
      BigInt(voucher.cumulativeAmount),
      totalDeposit
    );

    if (!atomicResult.success) {
      throw new AppError("ERR_VOUCHER_NONCE_STALE", 409, atomicResult.reason ?? "Atomic nonce reservation failed.");
    }

    // ── Step 10: Persist voucher to PostgreSQL ────────────────────────────────
    const savedVoucher = await prisma.$transaction(async (tx) => {
      const v = await tx.voucher.create({
        data: {
          channel_id:        voucher.channelId,
          nonce:             BigInt(voucher.nonce),
          cumulative_amount: voucher.cumulativeAmount,
          signature:         voucher.signature,
          valid_until:       BigInt(voucher.validUntil ?? channel.expiration_timestamp.toString()),
        },
      });

      // Update channel reserved amount
      await tx.paymentChannel.update({
        where: { channel_id: voucher.channelId },
        data:  { reserved_amount: voucher.cumulativeAmount },
      });

      return v;
    });

    // ── Step 11: Return authorization ─────────────────────────────────────────
    const available = totalDeposit - BigInt(voucher.cumulativeAmount);

    logger.info(
      { channelId: voucher.channelId, nonce: voucher.nonce, cumulative: voucher.cumulativeAmount },
      "Voucher authorized and persisted"
    );

    return {
      authorized:       true,
      channelId:        voucher.channelId,
      nonce:            voucher.nonce,
      cumulativeAmount: voucher.cumulativeAmount,
      availableBalance: available.toString(),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ParsedVoucher {
  channelId:        string;
  nonce:            number;
  cumulativeAmount: string;
  signature:        string;
  validUntil?:      string;
}

function parseVoucherPayload(raw: unknown): ParsedVoucher {
  if (typeof raw !== "object" || raw === null) {
    throw new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, "Request body must be a JSON object.");
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.channelId !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(body.channelId))
    throw new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, "Invalid channelId format.");
  if (typeof body.nonce !== "number" || body.nonce < 1)
    throw new AppError("ERR_VOUCHER_NONCE_STALE", 400, "nonce must be a positive integer.");
  if (typeof body.cumulativeAmount !== "string" || !/^\d+$/.test(body.cumulativeAmount))
    throw new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, "cumulativeAmount must be a decimal string.");
  if (typeof body.signature !== "string" || !/^0x[a-fA-F0-9]{130}$/.test(body.signature))
    throw new AppError("ERR_VOUCHER_SIGNATURE_INVALID", 400, "Invalid signature format.");

  return {
    channelId:        body.channelId,
    nonce:            body.nonce,
    cumulativeAmount: body.cumulativeAmount,
    signature:        body.signature,
    validUntil:       typeof body.validUntil === "string" ? body.validUntil : undefined,
  };
}

function recoverVoucherSigner(
  voucher: ParsedVoucher,
  channel: { payer_address: string; recipient_address: string; expiration_timestamp: bigint },
  chainId: number
): string {
  const vaultAddress = process.env.MICROPAY_VAULT_ADDRESS;
  if (!vaultAddress) {
    throw new AppError("ERR_CHANNEL_NOT_FOUND", 500, "MICROPAY_VAULT_ADDRESS not configured.");
  }

  const domain = getMicroPayDomain(chainId, vaultAddress);

  const value = {
    channelId:        voucher.channelId,
    payer:            ethers.getAddress(channel.payer_address),
    recipient:        ethers.getAddress(channel.recipient_address),
    cumulativeAmount: BigInt(voucher.cumulativeAmount),
    nonce:            voucher.nonce,
    validUntil:       voucher.validUntil ? Number(voucher.validUntil) : Number(channel.expiration_timestamp),
  };

  return ethers.verifyTypedData(domain, MICRO_VOUCHER_TYPES, value, voucher.signature);
}
