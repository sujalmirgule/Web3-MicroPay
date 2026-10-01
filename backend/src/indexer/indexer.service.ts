import { ethers } from "ethers";
import { dbStore, DBBlockchainEvent, DBNotificationOutbox } from "../db/memory-store";
import { logger } from "../utils/logger";

export class BlockchainEventIndexer {
  private provider: ethers.Provider;
  private vaultAddress: string;
  private lastIndexedBlock: number = 0;
  private isRunning: boolean = false;
  private processedLogs: Set<string> = new Set(); // txHash + logIndex idempotency cache

  constructor(rpcUrl: string, vaultAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.vaultAddress = vaultAddress;
  }

  public async processEventLog(
    eventName: string,
    channelId: string,
    txHash: string,
    blockNumber: number,
    logIndex: number,
    eventData: any
  ): Promise<boolean> {
    const logKey = `${txHash}_${logIndex}`;
    if (this.processedLogs.has(logKey)) {
      logger.debug({ logKey }, "Duplicate event skipped by indexer");
      return false;
    }

    this.processedLogs.add(logKey);

    const dbEvent: DBBlockchainEvent = {
      id: `evt_${Date.now()}_${logIndex}`,
      event_name: eventName,
      channel_id: channelId,
      tx_hash: txHash,
      block_number: blockNumber,
      log_index: logIndex,
      raw_data: eventData,
      created_at: new Date(),
    };

    dbStore.blockchainEvents.push(dbEvent);

    // Synchronize DB Channel State
    const channel = dbStore.getChannel(channelId);
    if (channel) {
      if (eventName === "ChannelSettled") {
        channel.settledAmount = eventData.cumulativeAmount;
        dbStore.saveChannel(channel);

        // Transactional Outbox insert
        const outboxRecord: DBNotificationOutbox = {
          id: `outbox_${Date.now()}`,
          merchant_id: "m_seed_1",
          event_type: "settlement.confirmed",
          payload: { channelId, cumulativeAmount: eventData.cumulativeAmount, txHash },
          target_url: "https://merchant.example.com/webhook",
          delivery_status: "PENDING",
          attempts: 0,
          next_retry_at: new Date(),
          created_at: new Date(),
        };
        dbStore.notificationOutbox.push(outboxRecord);
      } else if (eventName === "ChannelClosed") {
        channel.status = "CLOSED";
        dbStore.saveChannel(channel);
      } else if (eventName === "ChannelDisputeInitiated") {
        channel.status = "DISPUTED";
        channel.disputeExpiresAt = eventData.disputeExpiresAt;
        dbStore.saveChannel(channel);
      }
    }

    logger.info({ eventName, channelId, txHash, blockNumber }, "Blockchain event indexed successfully");
    return true;
  }

  public getProcessedCount(): number {
    return this.processedLogs.size;
  }
}
