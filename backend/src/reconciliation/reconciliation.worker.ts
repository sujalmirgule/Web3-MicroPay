import "dotenv/config";
import { ethers } from "ethers";
import { prisma } from "../db/prisma.client";
import { logger } from "../utils/logger";
import { MICRO_PAY_VAULT_ABI } from "@web3-micropay/shared";

export interface ReconciliationMismatch {
  channelId: string;
  field: "settled_amount" | "total_deposit" | "status";
  dbValue: string;
  onChainValue: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  detectedAt: Date;
}

export interface ChannelReconciliationResult {
  channelId: string;
  isMatched: boolean;
  mismatches: ReconciliationMismatch[];
}

const ON_CHAIN_STATUS_MAP: Record<number, string> = {
  0: "NONE",
  1: "OPEN",
  2: "DISPUTED",
  3: "CLOSED",
};

/**
 * Reconciliation Worker — Phase 5
 * Periodic verification of PostgreSQL state vs authoritative on-chain contract state.
 * Detects discrepancies in settled amounts, total deposits, and channel lifecycles.
 * CRITICAL RULE: Never silently overwrite state. Mismatches generate alerts and audit logs.
 */
export class ReconciliationWorker {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly checkIntervalMs: number;

  constructor(checkIntervalMs: number = 60_000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  private initProvider(): void {
    if (this.provider) return;

    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const vaultAddr = process.env.MICROPAY_VAULT_ADDRESS;

    if (!rpcUrl || !vaultAddr) {
      logger.warn("ReconciliationWorker: missing BLOCKCHAIN_RPC_URL or MICROPAY_VAULT_ADDRESS");
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(vaultAddr, MICRO_PAY_VAULT_ABI, this.provider);
  }

  public start(): void {
    this.initProvider();
    if (!this.provider) {
      logger.warn("ReconciliationWorker: Provider not available, worker disabled");
      return;
    }

    logger.info({ intervalMs: this.checkIntervalMs }, "ReconciliationWorker: Started periodic loop");
    this.timer = setInterval(() => void this.reconcileAllActiveChannels(), this.checkIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("ReconciliationWorker: Stopped");
    }
  }

  /**
   * Reconciles a single channel on demand.
   * Compares PostgreSQL state against on-chain contract state.
   */
  public async reconcileChannel(channelId: string): Promise<ChannelReconciliationResult> {
    this.initProvider();
    if (!this.contract) {
      throw new Error("ReconciliationWorker: On-chain contract provider not initialized");
    }

    const dbChannel = await prisma.paymentChannel.findUnique({
      where: { channel_id: channelId },
    });

    if (!dbChannel) {
      throw new Error(`ReconciliationWorker: Channel not found in database: ${channelId}`);
    }

    // Query authoritative state from MicroPayVault smart contract
    const onChainData = await this.contract.channels(channelId);
    const onChainPayer: string = onChainData.payer;
    const onChainTotalDeposit: bigint = onChainData.totalDeposit;
    const onChainSettledAmount: bigint = onChainData.settledAmount;
    const onChainStatusNum: number = Number(onChainData.status);
    const onChainStatusStr = ON_CHAIN_STATUS_MAP[onChainStatusNum] ?? "UNKNOWN";

    const mismatches: ReconciliationMismatch[] = [];

    // 1. Check settled amount mismatch
    const dbSettledAmount = BigInt(dbChannel.settled_amount.toString());
    if (dbSettledAmount !== onChainSettledAmount) {
      const mismatch: ReconciliationMismatch = {
        channelId,
        field: "settled_amount",
        dbValue: dbSettledAmount.toString(),
        onChainValue: onChainSettledAmount.toString(),
        severity: "CRITICAL",
        detectedAt: new Date(),
      };
      mismatches.push(mismatch);

      logger.error(
        {
          channelId,
          dbSettledAmount: dbSettledAmount.toString(),
          onChainSettledAmount: onChainSettledAmount.toString(),
          delta: (onChainSettledAmount - dbSettledAmount).toString(),
        },
        "🚨 RECONCILIATION MISMATCH: Settled amount differs between PostgreSQL and Blockchain!"
      );
    }

    // 2. Check total deposit mismatch
    const dbTotalDeposit = BigInt(dbChannel.total_deposit.toString());
    if (dbTotalDeposit !== onChainTotalDeposit) {
      const mismatch: ReconciliationMismatch = {
        channelId,
        field: "total_deposit",
        dbValue: dbTotalDeposit.toString(),
        onChainValue: onChainTotalDeposit.toString(),
        severity: "HIGH",
        detectedAt: new Date(),
      };
      mismatches.push(mismatch);

      logger.error(
        {
          channelId,
          dbTotalDeposit: dbTotalDeposit.toString(),
          onChainTotalDeposit: onChainTotalDeposit.toString(),
        },
        "🚨 RECONCILIATION MISMATCH: Total deposit differs between PostgreSQL and Blockchain!"
      );
    }

    // 3. Check status mismatch (excluding transient PENDING state in DB)
    if (dbChannel.status !== onChainStatusStr && dbChannel.status !== "PENDING") {
      const mismatch: ReconciliationMismatch = {
        channelId,
        field: "status",
        dbValue: dbChannel.status,
        onChainValue: onChainStatusStr,
        severity: "HIGH",
        detectedAt: new Date(),
      };
      mismatches.push(mismatch);

      logger.warn(
        {
          channelId,
          dbStatus: dbChannel.status,
          onChainStatus: onChainStatusStr,
        },
        "⚠️ RECONCILIATION WARNING: Channel status differs between PostgreSQL and Blockchain!"
      );
    }

    const isMatched = mismatches.length === 0;
    if (isMatched) {
      logger.debug({ channelId }, "Reconciliation: Channel matches blockchain state perfectly");
    }

    return {
      channelId,
      isMatched,
      mismatches,
    };
  }

  /**
   * Periodic reconciliation loop: checks all non-closed channels in the database.
   */
  public async reconcileAllActiveChannels(): Promise<ChannelReconciliationResult[]> {
    const results: ChannelReconciliationResult[] = [];

    try {
      const channels = await prisma.paymentChannel.findMany({
        where: {
          status: { in: ["OPEN", "DISPUTED"] },
        },
        take: 50,
      });

      for (const ch of channels) {
        try {
          const res = await this.reconcileChannel(ch.channel_id);
          results.push(res);
        } catch (err) {
          logger.error({ err, channelId: ch.channel_id }, "ReconciliationWorker: Error checking channel");
        }
      }
    } catch (err) {
      logger.error({ err }, "ReconciliationWorker: Error fetching channels for reconciliation");
    }

    return results;
  }
}
