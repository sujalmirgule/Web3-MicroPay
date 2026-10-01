export type ChannelStatus = "NONE" | "OPEN" | "DISPUTED" | "CLOSED";

export interface ChannelDTO {
  channelId: `0x${string}`;
  payerAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  totalDeposit: string;
  settledAmount: string;
  reservedAmount: string;
  remainingAvailable: string;
  expirationTimestamp: number;
  disputePeriodSeconds: number;
  disputeExpiresAt?: number;
  status: ChannelStatus;
  openTxHash?: string;
  openBlockNumber?: number;
}
