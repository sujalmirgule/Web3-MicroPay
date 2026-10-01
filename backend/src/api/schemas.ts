import { z } from "zod";

export const SIWENonceRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format"),
});

export const SIWEVerifyRequestSchema = z.object({
  message: z.string().min(10),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Invalid 65-byte ECDSA signature format"),
});

export const ChannelRegisterRequestSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid 32-byte channel ID format"),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  depositAmount: z.string().regex(/^\d+$/, "Amount must be a numeric integer string"),
  expirationTimestamp: z.number().int().positive(),
  disputePeriodSeconds: z.number().int().min(86400, "Dispute period must be at least 24 hours"),
  openTxHash: z.string().optional(),
});

export const VoucherSubmitRequestSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  payer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  cumulativeAmount: z.string().regex(/^\d+$/),
  nonce: z.number().int().positive(),
  validUntil: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
});

export const SettlementClaimRequestSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  voucherId: z.string().optional(),
});
