import { ethers } from "ethers";
import { redisService } from "../redis/redis.service";
import { dbStore } from "../db/memory-store";
import { voucherEngine } from "../services/voucher.service";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";
import {
  SIWENonceRequestSchema,
  SIWEVerifyRequestSchema,
  ChannelRegisterRequestSchema,
  VoucherSubmitRequestSchema,
  SettlementClaimRequestSchema,
} from "./schemas";
import { ChannelDTO } from "@web3-micropay/shared";

export class APIServer {
  /**
   * POST /v1/auth/nonce
   */
  public async handleSIWENonce(body: any) {
    const parsed = SIWENonceRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "Validation failed", parsed.error.format());
    }

    const nonce = ethers.hexlify(ethers.randomBytes(16)).replace("0x", "");
    const walletAddress = parsed.data.walletAddress.toLowerCase();

    await redisService.setex(`siwe:nonce:${walletAddress}`, 300, nonce);

    return {
      success: true,
      data: {
        nonce,
        statement: "Sign in to Web3 MicroPay to authenticate your off-chain session.",
        issuedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /v1/auth/verify-siwe
   */
  public async handleSIWEVerify(body: any) {
    const parsed = SIWEVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "Validation failed", parsed.error.format());
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(parsed.data.message, parsed.data.signature);
    } catch {
      throw new AppError("ERR_AUTH_INVALID_SIGNATURE", 401, "Signature recovery failed.");
    }

    const cachedNonce = await redisService.getdel(`siwe:nonce:${recoveredAddress.toLowerCase()}`);
    if (!cachedNonce || !parsed.data.message.includes(cachedNonce)) {
      throw new AppError("ERR_AUTH_INVALID_NONCE", 401, "Challenge nonce expired or invalid.");
    }

    const user = {
      id: `usr_${Date.now()}`,
      wallet_address: recoveredAddress,
      role: "USER" as const,
      created_at: new Date(),
    };
    dbStore.users.set(recoveredAddress.toLowerCase(), user);

    return {
      success: true,
      data: {
        accessToken: `jwt_mock_${Date.now()}_${recoveredAddress}`,
        expiresIn: 86400,
        user: {
          walletAddress: recoveredAddress,
          role: "USER",
        },
      },
    };
  }

  /**
   * POST /v1/channels/register
   */
  public async handleChannelRegister(body: any, idempotencyKey?: string) {
    if (idempotencyKey) {
      const check = await redisService.checkOrSetIdempotency(idempotencyKey);
      if (check.isDuplicate) return check.cachedResponse;
    }

    const parsed = ChannelRegisterRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "Validation failed", parsed.error.format());
    }

    const channelDto: ChannelDTO = {
      channelId: parsed.data.channelId as `0x${string}`,
      payerAddress: parsed.data.payerAddress as `0x${string}`,
      recipientAddress: parsed.data.recipientAddress as `0x${string}`,
      tokenAddress: parsed.data.tokenAddress as `0x${string}`,
      totalDeposit: parsed.data.depositAmount,
      settledAmount: "0",
      reservedAmount: "0",
      remainingAvailable: parsed.data.depositAmount,
      expirationTimestamp: parsed.data.expirationTimestamp,
      disputePeriodSeconds: parsed.data.disputePeriodSeconds,
      status: "OPEN",
      openTxHash: parsed.data.openTxHash,
    };

    dbStore.saveChannel(channelDto);

    const response = {
      success: true,
      data: {
        channelId: channelDto.channelId,
        status: channelDto.status,
      },
    };

    if (idempotencyKey) {
      await redisService.saveIdempotencyResponse(idempotencyKey, response);
    }

    return response;
  }

  /**
   * POST /v1/vouchers/submit
   */
  public async handleVoucherSubmit(body: any, idempotencyKey?: string) {
    if (idempotencyKey) {
      const check = await redisService.checkOrSetIdempotency(idempotencyKey);
      if (check.isDuplicate) return check.cachedResponse;
    }

    const parsed = VoucherSubmitRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "Validation failed", parsed.error.format());
    }

    const result = await voucherEngine.verifyAndAuthorizeVoucher(parsed.data as any);

    const response = {
      success: true,
      data: {
        voucherId: result.voucherId,
        authorized: true,
        deltaAmount: result.deltaAmount,
        newCumulativeAmount: parsed.data.cumulativeAmount,
      },
    };

    if (idempotencyKey) {
      await redisService.saveIdempotencyResponse(idempotencyKey, response);
    }

    return response;
  }
}

export const apiServer = new APIServer();
