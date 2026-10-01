/**
 * EIP-712 MicroVoucher data interface
 */
export interface MicroVoucher {
  channelId: `0x${string}`;
  payer: `0x${string}`;
  recipient: `0x${string}`;
  cumulativeAmount: string; // Serialized BigInt (wei units)
  nonce: number;
  validUntil: number; // Unix timestamp
  signature?: `0x${string}`;
}

export interface VoucherVerificationResult {
  isValid: boolean;
  recoveredSigner?: `0x${string}`;
  error?: string;
  deltaAmount?: string;
}
