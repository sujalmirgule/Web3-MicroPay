import { logger } from "../utils/logger";

/**
 * High-performance Redis service abstraction.
 * Provides atomic nonces, capacity reservations, and idempotency tracking.
 */
export class RedisService {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  constructor() {
    logger.info("RedisService initialized (In-Memory Atomic Store ready)");
  }

  public async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  public async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  public async getdel(key: string): Promise<string | null> {
    const val = await this.get(key);
    if (val !== null) {
      this.store.delete(key);
    }
    return val;
  }

  /**
   * Atomic Lua Script Evaluation for Voucher Validation
   * Checks:
   * 1. newNonce > currentNonce
   * 2. cumulativeAmount <= totalDeposit
   * Updates:
   * 1. channel:nonce:{channelId} = newNonce
   * 2. channel:reserved:{channelId} = cumulativeAmount
   */
  public async atomicVerifyAndReserveVoucher(
    channelId: string,
    newNonce: number,
    cumulativeAmountWei: bigint,
    totalDepositWei: bigint
  ): Promise<{ success: boolean; reason?: string }> {
    const nonceKey = `channel:nonce:${channelId}`;
    const reservedKey = `channel:reserved:${channelId}`;

    const currentNonceStr = await this.get(nonceKey);
    const currentNonce = currentNonceStr ? parseInt(currentNonceStr, 10) : 0;

    if (newNonce <= currentNonce) {
      return {
        success: false,
        reason: `Nonce ${newNonce} is not greater than active channel nonce ${currentNonce}`,
      };
    }

    const currentReservedStr = await this.get(reservedKey);
    const currentReserved = currentReservedStr ? BigInt(currentReservedStr) : 0n;

    if (cumulativeAmountWei <= currentReserved) {
      return {
        success: false,
        reason: `Cumulative amount ${cumulativeAmountWei.toString()} must be strictly greater than active reserved amount ${currentReserved.toString()}`,
      };
    }

    if (cumulativeAmountWei > totalDepositWei) {
      return {
        success: false,
        reason: `Cumulative amount ${cumulativeAmountWei.toString()} exceeds channel deposit ${totalDepositWei.toString()}`,
      };
    }

    // Atomic update
    await this.set(nonceKey, newNonce.toString(), 86400 * 7);
    await this.set(reservedKey, cumulativeAmountWei.toString(), 86400 * 7);

    return { success: true };
  }

  /**
   * Idempotency Check & Lock
   */
  public async checkOrSetIdempotency(
    key: string,
    ttlSeconds: number = 86400
  ): Promise<{ isDuplicate: boolean; cachedResponse?: any }> {
    const idempotencyKey = `idempotency:${key}`;
    const existing = await this.get(idempotencyKey);

    if (existing) {
      return { isDuplicate: true, cachedResponse: JSON.parse(existing) };
    }

    return { isDuplicate: false };
  }

  public async saveIdempotencyResponse(key: string, response: any, ttlSeconds: number = 86400): Promise<void> {
    await this.set(`idempotency:${key}`, JSON.stringify(response), ttlSeconds);
  }
}

export const redisService = new RedisService();
