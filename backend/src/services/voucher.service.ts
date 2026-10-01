import { ethers } from "ethers";
import {
  MicroVoucher,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  MICRO_VOUCHER_TYPES,
} from "@web3-micropay/shared";
import { redisService } from "../redis/redis.service";
import { dbStore, DBVoucher } from "../db/memory-store";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";

export class VoucherVerificationEngine {
  private chainId: number;
  private vaultAddress: string;

  constructor(chainId: number = 31337, vaultAddress: string = ethers.ZeroAddress) {
    this.chainId = chainId;
    this.vaultAddress = vaultAddress;
  }

  public setVaultAddress(address: string) {
    this.vaultAddress = address;
  }

  public setChainId(chainId: number) {
    this.chainId = chainId;
  }

  /**
   * Executes the exact 11-step verification pipeline.
   */
  public async verifyAndAuthorizeVoucher(
    voucher: MicroVoucher,
    authenticatedUserAddress?: string
  ): Promise<{ authorized: boolean; deltaAmount: string; voucherId: string }> {
    logger.info({ channelId: voucher.channelId, nonce: voucher.nonce }, "Starting 11-step voucher verification");

    // 1. Validate request structure & 5. Schema check
    if (!voucher.channelId || !voucher.payer || !voucher.recipient || !voucher.signature) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "Voucher missing required cryptographic fields.");
    }

    // 2. Validate authentication context (if user is authenticated, must match payer)
    if (authenticatedUserAddress && authenticatedUserAddress.toLowerCase() !== voucher.payer.toLowerCase()) {
      throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Authenticated user does not match voucher payer.");
    }

    // 3. Validate channel existence
    const channel = dbStore.getChannel(voucher.channelId);
    if (!channel) {
      throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, `Channel ${voucher.channelId} not found.`);
    }

    // 4. Validate participant relationship
    if (
      channel.payerAddress.toLowerCase() !== voucher.payer.toLowerCase() ||
      channel.recipientAddress.toLowerCase() !== voucher.recipient.toLowerCase()
    ) {
      throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Voucher participants do not match channel definition.");
    }

    if (channel.status !== "OPEN") {
      throw new AppError("ERR_CHANNEL_NOT_ACTIVE", 400, `Channel is in ${channel.status} state, not OPEN.`);
    }

    // 6. Validate EIP-712 domain & 7. Recover Signer
    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId: this.chainId,
      verifyingContract: this.vaultAddress,
    };

    const types = {
      MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher,
    };

    const value = {
      channelId: voucher.channelId,
      payer: voucher.payer,
      recipient: voucher.recipient,
      cumulativeAmount: BigInt(voucher.cumulativeAmount),
      nonce: voucher.nonce,
      validUntil: voucher.validUntil,
    };

    let recoveredSigner: string;
    try {
      recoveredSigner = ethers.verifyTypedData(domain, types, value, voucher.signature);
    } catch (err: any) {
      logger.warn({ error: err.message }, "ECDSA signature recovery failed");
      throw new AppError("ERR_VOUCHER_SIGNATURE_INVALID", 400, "Malformed EIP-712 signature.");
    }

    // 8. Validate signer ownership
    if (recoveredSigner.toLowerCase() !== channel.payerAddress.toLowerCase()) {
      throw new AppError(
        "ERR_VOUCHER_SIGNATURE_INVALID",
        400,
        `Signature recovered signer ${recoveredSigner} does not match channel payer ${channel.payerAddress}.`
      );
    }

    // 10. Validate expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (voucher.validUntil < nowSeconds) {
      throw new AppError("ERR_CHANNEL_EXPIRED", 400, "Voucher timestamp has expired.");
    }

    const cumulativeWei = BigInt(voucher.cumulativeAmount);
    const settledWei = BigInt(channel.settledAmount);
    const totalDepositWei = BigInt(channel.totalDeposit);

    // 9. Validate cumulative amount monotonicity & capacity
    if (cumulativeWei <= settledWei) {
      throw new AppError(
        "ERR_VOUCHER_CAPACITY_EXCEEDED",
        400,
        `Cumulative amount ${cumulativeWei.toString()} must be strictly greater than settled amount ${settledWei.toString()}.`
      );
    }

    // 11. Atomic Redis Reservation & Persist
    const reservation = await redisService.atomicVerifyAndReserveVoucher(
      voucher.channelId,
      voucher.nonce,
      cumulativeWei,
      totalDepositWei
    );

    if (!reservation.success) {
      throw new AppError("ERR_VOUCHER_NONCE_OUT_OF_ORDER", 400, reservation.reason || "Voucher verification failed.");
    }

    const deltaAmount = (cumulativeWei - settledWei).toString();
    const voucherId = `vouch_${Date.now()}_${voucher.nonce}`;

    const dbVoucher: DBVoucher = {
      id: voucherId,
      channel_id: voucher.channelId,
      nonce: voucher.nonce,
      cumulative_amount: voucher.cumulativeAmount,
      signature: voucher.signature,
      valid_until: voucher.validUntil,
      is_settled: false,
      created_at: new Date(),
    };

    dbStore.saveVoucher(dbVoucher);

    // Update channel off-chain reserved amount
    channel.reservedAmount = voucher.cumulativeAmount;
    dbStore.saveChannel(channel);

    logger.info(
      { voucherId, deltaAmount, cumulativeAmount: voucher.cumulativeAmount },
      "Voucher successfully verified and authorized"
    );

    return {
      authorized: true,
      deltaAmount,
      voucherId,
    };
  }
}

export const voucherEngine = new VoucherVerificationEngine();
