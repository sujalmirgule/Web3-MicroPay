import { ethers } from "ethers";

/**
 * Validates whether string is a valid EIP-55 Ethereum address
 */
export function isValidAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validates a 32-byte (0x + 64 hex characters) channel ID
 */
export function isValidChannelId(channelId: string | undefined | null): boolean {
  if (!channelId) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(channelId);
}

/**
 * Validates an Ethereum transaction hash
 */
export function isValidTxHash(hash: string | undefined | null): boolean {
  if (!hash) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates positive numerical amount input (integer or decimal)
 */
export function isValidPositiveAmount(val: string | undefined | null): boolean {
  if (!val) return false;
  const num = Number(val);
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Validates HTTPS webhook destination URL
 */
export function isValidHttpsUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
