import Redis from "ioredis";
import { logger } from "../utils/logger";

/**
 * Production Redis service using ioredis with Lua atomics.
 * Replaces the Phase 3 in-memory Map adapter.
 */
export class ProductionRedisService {
  constructor(private readonly client: Redis) {}

  // ─── Lua script: Atomic voucher nonce + cumulative + capacity check ───────
  private static readonly VOUCHER_VALIDATE_SCRIPT = `
local nonceKey     = KEYS[1]
local reservedKey  = KEYS[2]
local newNonce     = tonumber(ARGV[1])
local newCumulative = tonumber(ARGV[2])
local totalDeposit  = tonumber(ARGV[3])
local ttl           = tonumber(ARGV[4])

local currentNonce   = tonumber(redis.call('GET', nonceKey) or '0')
local currentReserved = tonumber(redis.call('GET', reservedKey) or '0')

if newNonce <= currentNonce then
  return {0, 'NONCE_STALE', currentNonce}
end

if newCumulative <= currentReserved then
  return {0, 'CUMULATIVE_REGRESSIVE', currentReserved}
end

if newCumulative > totalDeposit then
  return {0, 'OVER_CAPACITY', totalDeposit}
end

redis.call('SETEX', nonceKey,    ttl, tostring(newNonce))
redis.call('SETEX', reservedKey, ttl, tostring(newCumulative))

return {1, 'OK', newCumulative}
`;

  /**
   * Atomically validates and reserves a voucher's nonce and cumulative amount.
   * The Lua script executes as a single indivisible unit in Redis.
   */
  public async atomicVerifyAndReserveVoucher(
    channelId: string,
    newNonce: number,
    cumulativeAmountWei: bigint,
    totalDepositWei: bigint,
    ttlSeconds: number = 86400 * 7
  ): Promise<{ success: boolean; reason?: string }> {
    const nonceKey = `channel:nonce:${channelId}`;
    const reservedKey = `channel:reserved:${channelId}`;

    const result = (await this.client.eval(
      ProductionRedisService.VOUCHER_VALIDATE_SCRIPT,
      2,
      nonceKey,
      reservedKey,
      newNonce.toString(),
      cumulativeAmountWei.toString(),
      totalDepositWei.toString(),
      ttlSeconds.toString()
    )) as [number, string, string];

    const [ok, reason] = result;
    if (ok === 1) return { success: true };

    const reasonMap: Record<string, string> = {
      NONCE_STALE: `Nonce ${newNonce} is not greater than active channel nonce`,
      CUMULATIVE_REGRESSIVE: `Cumulative amount must be strictly greater than active reserved amount`,
      OVER_CAPACITY: `Cumulative amount exceeds channel total deposit`,
    };

    return { success: false, reason: reasonMap[reason] ?? reason };
  }

  /**
   * Stores SIWE nonce with 5-minute TTL.
   */
  public async setSiweNonce(walletAddress: string, nonce: string): Promise<void> {
    const key = `siwe:nonce:${walletAddress.toLowerCase()}`;
    await this.client.setex(key, 300, nonce);
    logger.debug({ walletAddress }, "SIWE nonce stored");
  }

  /**
   * Retrieves and atomically deletes SIWE nonce (single-use enforcement).
   */
  public async consumeSiweNonce(walletAddress: string): Promise<string | null> {
    const key = `siwe:nonce:${walletAddress.toLowerCase()}`;
    const nonce = await this.client.getdel(key);
    return nonce;
  }

  /**
   * Check idempotency key; returns cached response if duplicate.
   */
  public async checkOrSetIdempotency(
    key: string,
    ttlSeconds: number = 86400
  ): Promise<{ isDuplicate: boolean; cachedResponse?: unknown }> {
    const idempotencyKey = `idempotency:${key}`;
    const existing = await this.client.get(idempotencyKey);
    if (existing) {
      return { isDuplicate: true, cachedResponse: JSON.parse(existing) };
    }
    return { isDuplicate: false };
  }

  public async saveIdempotencyResponse(
    key: string,
    response: unknown,
    ttlSeconds: number = 86400
  ): Promise<void> {
    await this.client.setex(
      `idempotency:${key}`,
      ttlSeconds,
      JSON.stringify(response)
    );
  }

  /**
   * Acquire a distributed mutex lock. Returns true if lock was acquired.
   */
  public async acquireLock(
    lockKey: string,
    ttlSeconds: number = 30
  ): Promise<boolean> {
    const result = await this.client.set(
      `lock:${lockKey}`,
      "1",
      "EX",
      ttlSeconds,
      "NX"
    );
    return result === "OK";
  }

  public async releaseLock(lockKey: string): Promise<void> {
    await this.client.del(`lock:${lockKey}`);
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }
}
