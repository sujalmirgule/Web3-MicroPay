import "dotenv/config";
import { ethers } from "ethers";
import { prisma } from "../db/prisma.client";
import { logger } from "../utils/logger";
import { MICRO_PAY_VAULT_ABI } from "@web3-micropay/shared";

const CONFIRMATION_DEPTH   = 6;
const BACKFILL_CHUNK_SIZE  = 1000;
const INDEXER_LAG_WARN     = 5;
const INDEXER_LAG_CRITICAL = 15;

/**
 * Production Indexer Service — WebSocket blockchain event subscription.
 * Replaces Phase 3 stub with real ethers.js provider integration.
 */
export class IndexerService {
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private confirmationBuffer = new Map<number, ethers.Log[]>(); // block → pending logs
  private lastIndexedBlock   = 0n;
  private stopRequested      = false;

  public async start(): Promise<void> {
    const wsUrl      = process.env.BLOCKCHAIN_WS_RPC_URL;
    const vaultAddr  = process.env.MICROPAY_VAULT_ADDRESS;

    if (!wsUrl || !vaultAddr) {
      logger.warn("BLOCKCHAIN_WS_RPC_URL or MICROPAY_VAULT_ADDRESS not set — Indexer disabled");
      return;
    }

    try {
      this.provider = new ethers.WebSocketProvider(wsUrl);
      this.contract = new ethers.Contract(vaultAddr, MICRO_PAY_VAULT_ABI, this.provider);

      // Determine backfill start block
      const lastRow = await prisma.blockchainEvent.findFirst({
        orderBy: { block_number: "desc" },
        select:  { block_number: true },
      });
      this.lastIndexedBlock = lastRow?.block_number ?? 0n;

      // Backfill missed blocks
      await this.backfill();

      // Subscribe to real-time events
      this.subscribeToEvents();

      // Monitor for indexer lag every 30 seconds
      this.startLagMonitor();

      logger.info({ vaultAddress: vaultAddr, lastIndexedBlock: this.lastIndexedBlock.toString() }, "Indexer started");
    } catch (err) {
      logger.error({ err }, "Indexer failed to start — will retry on next deployment");
    }
  }

  public async stop(): Promise<void> {
    this.stopRequested = true;
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }
    logger.info("Indexer stopped");
  }

  // ─── Backfill ─────────────────────────────────────────────────────────────

  private async backfill(): Promise<void> {
    if (!this.provider || !this.contract) return;

    const currentHead = await this.provider.getBlockNumber();
    let fromBlock     = Number(this.lastIndexedBlock) + 1;

    if (fromBlock >= currentHead) {
      logger.info("Indexer: no backfill needed, already at chain head");
      return;
    }

    logger.info({ fromBlock, toBlock: currentHead }, "Indexer: backfilling missed blocks");

    while (fromBlock <= currentHead && !this.stopRequested) {
      const toBlock = Math.min(fromBlock + BACKFILL_CHUNK_SIZE - 1, currentHead);
      const logs    = await this.provider.getLogs({
        address:   await this.contract.getAddress(),
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        await this.processLog(log, true);
      }

      fromBlock = toBlock + 1;
    }

    logger.info({ upToBlock: currentHead }, "Indexer: backfill complete");
  }

  // ─── Real-time subscription ───────────────────────────────────────────────

  private subscribeToEvents(): void {
    if (!this.provider || !this.contract) return;

    // Listen to all contract events
    this.contract.on("*", async (event: any) => {
      const rawLog = event?.log ?? event;
      if (rawLog && typeof rawLog.blockNumber === "number") {
        await this.processLog(rawLog, false);
      }
    });

    // Track new blocks for confirmation depth enforcement
    this.provider.on("block", async (blockNumber: number) => {
      await this.flushConfirmedLogs(blockNumber);
    });

    logger.info("Indexer: real-time subscriptions active");
  }

  // ─── Log processing pipeline ──────────────────────────────────────────────

  private async processLog(log: ethers.Log, immediate: boolean): Promise<void> {
    if (!this.contract) return;

    const confirmationThreshold = immediate
      ? 0
      : CONFIRMATION_DEPTH;

    if (!immediate) {
      // Queue for confirmation depth check
      const blockNum = log.blockNumber;
      if (!this.confirmationBuffer.has(blockNum)) {
        this.confirmationBuffer.set(blockNum, []);
      }
      this.confirmationBuffer.get(blockNum)!.push(log);
      return;
    }

    await this.persistLog(log);
  }

  private async flushConfirmedLogs(currentHead: number): Promise<void> {
    const confirmedThreshold = currentHead - CONFIRMATION_DEPTH;
    for (const [blockNum, logs] of this.confirmationBuffer.entries()) {
      if (blockNum <= confirmedThreshold) {
        for (const log of logs) {
          await this.persistLog(log);
        }
        this.confirmationBuffer.delete(blockNum);
      }
    }
  }

  private async persistLog(log: ethers.Log): Promise<void> {
    if (!this.contract) return;

    try {
      const iface = this.contract.interface;
      let eventName = "Unknown";
      let channelId = "0x" + "0".repeat(64);
      let decoded: any = {};

      try {
        const parsed = iface.parseLog(log);
        eventName = parsed?.name ?? "Unknown";
        decoded   = parsed?.args ?? {};
        channelId = decoded.channelId ?? channelId;
      } catch {
        // Unknown event signature — log raw
      }

      // Idempotency: skip if already indexed (uq_tx_log_index)
      await prisma.blockchainEvent.upsert({
        where:  { uq_tx_log_index: { tx_hash: log.transactionHash, log_index: log.index } },
        create: {
          event_name:   eventName,
          channel_id:   channelId,
          tx_hash:      log.transactionHash,
          block_number: BigInt(log.blockNumber),
          log_index:    log.index,
          raw_data:     decoded,
        },
        update: {}, // already exists — no-op
      });

      // Sync channel state based on event
      await this.syncChannelState(eventName, channelId, decoded, log);

      this.lastIndexedBlock = BigInt(log.blockNumber);

      logger.debug({ eventName, channelId, txHash: log.transactionHash, block: log.blockNumber }, "Event indexed");
    } catch (err: any) {
      if (err?.code === "P2002") return; // Unique constraint — duplicate, skip
      logger.error({ err, txHash: log.transactionHash }, "Error persisting event log");
    }
  }

  // ─── Channel state synchronization ────────────────────────────────────────

  private async syncChannelState(
    eventName: string,
    channelId: string,
    args: Record<string, any>,
    log: ethers.Log
  ): Promise<void> {
    switch (eventName) {
      case "ChannelOpened":
        await prisma.paymentChannel.upsert({
          where:  { channel_id: channelId },
          create: {
            channel_id:             channelId,
            payer_address:          (args.payer ?? "").toLowerCase(),
            recipient_address:      (args.recipient ?? "").toLowerCase(),
            token_address:          (args.token ?? "0x" + "0".repeat(40)).toLowerCase(),
            total_deposit:          args.amount?.toString() ?? "0",
            expiration_timestamp:   BigInt(args.expiration?.toString() ?? "0"),
            status:                 "OPEN",
            open_tx_hash:           log.transactionHash,
            open_block_number:      log.blockNumber,
          },
          update: { status: "OPEN", open_tx_hash: log.transactionHash },
        });
        break;

      case "ClaimSettled":
        await prisma.paymentChannel.update({
          where:  { channel_id: channelId },
          data:   { settled_amount: args.cumulativeAmount?.toString() ?? "0" },
        }).catch(() => null);
        // Mark voucher as settled
        await prisma.voucher.updateMany({
          where: { channel_id: channelId, nonce: BigInt(args.nonce?.toString() ?? "0") },
          data:  { is_settled: true },
        }).catch(() => null);
        break;

      case "ChannelCloseInitiated":
        await prisma.paymentChannel.update({
          where:  { channel_id: channelId },
          data:   { status: "DISPUTED" },
        }).catch(() => null);
        await prisma.dispute.upsert({
          where:  { channel_id: channelId },
          create: {
            channel_id:         channelId,
            initiated_by:       (args.initiatedBy ?? "").toLowerCase(),
            dispute_expires_at: BigInt(args.closeDeadline?.toString() ?? "0"),
          },
          update: {},
        }).catch(() => null);
        break;

      case "ChannelCooperativelyClosed":
      case "ChannelForceFinalized":
        await prisma.paymentChannel.update({
          where:  { channel_id: channelId },
          data:   { status: "CLOSED" },
        }).catch(() => null);
        break;

      default:
        break;
    }
  }

  // ─── Lag monitoring ────────────────────────────────────────────────────────

  private startLagMonitor(): void {
    setInterval(async () => {
      if (!this.provider || this.stopRequested) return;
      try {
        const head = await this.provider.getBlockNumber();
        const lag  = head - Number(this.lastIndexedBlock);
        if (lag > INDEXER_LAG_CRITICAL) {
          logger.error({ lag, head, lastIndexed: this.lastIndexedBlock.toString() }, "CRITICAL: Indexer lag exceeds 15 blocks");
        } else if (lag > INDEXER_LAG_WARN) {
          logger.warn({ lag }, "WARNING: Indexer lag exceeds 5 blocks");
        }
      } catch {
        // RPC briefly disconnected
      }
    }, 30_000);
  }
}
