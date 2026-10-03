import "dotenv/config";
import { ethers } from "ethers";
import { prisma } from "../db/prisma.client";
import { getRedisClient } from "../redis/redis.client";
import { ProductionRedisService } from "../redis/redis.production.service";
import { logger } from "../utils/logger";
import { MICRO_PAY_VAULT_ABI } from "@web3-micropay/shared";

const GAS_BUMP_FACTOR      = 120n;  // +20% → multiply by 120, divide by 100
const STUCK_TX_TIMEOUT_MS  = 300_000; // 5 minutes
const RECONCILE_INTERVAL_MS = 60_000; // 1 minute

/**
 * Production Relayer Service.
 * Processes queued settlement claims, constructs EIP-1559 txs,
 * broadcasts, monitors, and gas-bumps stuck transactions.
 *
 * NOTE: In production, RELAYER_PRIVATE_KEY is replaced with AWS KMS signing.
 * For local development, the key is loaded from the environment variable.
 */
export class RelayerService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private redisService: ProductionRedisService;
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;
  private operatorNonce = 0n;

  constructor() {
    this.redisService = new ProductionRedisService(getRedisClient());
  }

  private initProvider(): void {
    if (this.provider) return;

    const rpcUrl    = process.env.BLOCKCHAIN_RPC_URL;
    const privKey   = process.env.RELAYER_PRIVATE_KEY;
    const vaultAddr = process.env.MICROPAY_VAULT_ADDRESS;

    if (!rpcUrl || !privKey || !vaultAddr) {
      logger.warn("Relayer: missing RPC_URL, RELAYER_PRIVATE_KEY, or VAULT_ADDRESS — Relayer disabled");
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet   = new ethers.Wallet(privKey, this.provider);
    this.contract = new ethers.Contract(vaultAddr, MICRO_PAY_VAULT_ABI, this.wallet);

    logger.info({ relayerAddress: this.wallet.address }, "Relayer: provider initialized");
  }

  /**
   * Starts the periodic settlement reconciliation loop.
   */
  public startReconciliationLoop(): void {
    this.initProvider();
    if (!this.provider) return;

    logger.info("Relayer: reconciliation loop started");
    this.reconcileTimer = setInterval(
      () => void this.processQueuedSettlements(),
      RECONCILE_INTERVAL_MS
    );
  }

  public stopReconciliationLoop(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }

  // ─── Settlement processing ────────────────────────────────────────────────

  private async processQueuedSettlements(): Promise<void> {
    if (!this.provider || !this.wallet || !this.contract) return;

    // Acquire relayer nonce lock (serialise all dispatches)
    const locked = await this.redisService.acquireLock("relayer:nonce:lock", 60);
    if (!locked) return;

    try {
      const pending = await prisma.settlement.findMany({
        where: { status: "PENDING" },
        include: { voucher: true, channel: true },
        orderBy: { created_at: "asc" },
        take: 5,
      });

      for (const settlement of pending) {
        await this.executeSettlement(settlement);
      }

      // Check for stuck SUBMITTED transactions
      await this.handleStuckTransactions();
    } catch (err) {
      logger.error({ err }, "Relayer: reconciliation error");
    } finally {
      await this.redisService.releaseLock("relayer:nonce:lock");
    }
  }

  public async processSettlementById(settlementId: string): Promise<void> {
    this.initProvider();
    if (!this.provider || !this.wallet || !this.contract) return;

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { voucher: true, channel: true },
    });

    if (settlement && settlement.status === "PENDING") {
      await this.executeSettlement(settlement);
    }
  }

  private async executeSettlement(settlement: {
    id:        string;
    channel_id: string;
    voucher:   { nonce: bigint; cumulative_amount: { toString(): string }; signature: string; valid_until: bigint };
    channel:   { token_address: string };
  }): Promise<void> {
    if (!this.provider || !this.wallet || !this.contract) return;

    logger.info({ settlementId: settlement.id, channelId: settlement.channel_id }, "Relayer: executing settlement");

    try {
      const feeData = await this.provider.getFeeData();
      const maxFee       = feeData.maxFeePerGas ?? 10_000_000_000n;
      const maxPriorityFee = feeData.maxPriorityFeePerGas ?? 1_000_000_000n;

      // Sync operator nonce from chain on first run or after restart
      if (this.operatorNonce === 0n) {
        const onchainNonce = await this.provider.getTransactionCount(this.wallet.address);
        this.operatorNonce = BigInt(onchainNonce);
      }

      const tx = await this.contract.settleClaim(
        settlement.channel_id,
        BigInt(settlement.voucher.cumulative_amount.toString()),
        BigInt(settlement.voucher.nonce.toString()),
        Number(settlement.voucher.valid_until.toString()),
        settlement.voucher.signature,
        {
          nonce:              Number(this.operatorNonce),
          maxFeePerGas:       maxFee,
          maxPriorityFeePerGas: maxPriorityFee,
          type:               2,
        }
      );

      this.operatorNonce++;

      logger.info({ settlementId: settlement.id, txHash: tx.hash, nonce: tx.nonce }, "Relayer: transaction broadcast");

      await prisma.settlement.update({
        where: { id: settlement.id },
        data:  { status: "SUBMITTED", tx_hash: tx.hash },
      });

      // Monitor in background
      void this.monitorTransaction(settlement.id, tx);
    } catch (err) {
      logger.error({ err, settlementId: settlement.id }, "Relayer: settlement execution failed");
      await prisma.settlement.update({
        where: { id: settlement.id },
        data:  { retry_count: { increment: 1 } },
      });
    }
  }

  private async monitorTransaction(
    settlementId: string,
    tx: ethers.TransactionResponse
  ): Promise<void> {
    if (!this.provider) return;

    try {
      const receipt = await tx.wait(6); // wait for 6 confirmations
      if (!receipt) return;

      await prisma.$transaction(async (dbTx) => {
        await dbTx.settlement.update({
          where: { id: settlementId },
          data:  {
            status:       "CONFIRMED",
            finalized_at: new Date(),
          },
        });

        await dbTx.settlementReceipt.create({
          data: {
            settlement_id:       settlementId,
            tx_hash:             receipt.hash,
            block_number:        BigInt(receipt.blockNumber),
            gas_used:            receipt.gasUsed,
            effective_gas_price: receipt.gasPrice ?? 0n,
          },
        });
      });

      logger.info({ settlementId, txHash: receipt.hash, block: receipt.blockNumber }, "Relayer: settlement confirmed");
    } catch (err) {
      logger.error({ err, settlementId }, "Relayer: transaction monitoring error");
    }
  }

  // ─── Gas bump for stuck transactions ─────────────────────────────────────

  private async handleStuckTransactions(): Promise<void> {
    if (!this.provider || !this.wallet || !this.contract) return;

    const stuckCutoff = new Date(Date.now() - STUCK_TX_TIMEOUT_MS);
    const stuckSettlements = await prisma.settlement.findMany({
      where: {
        status:     "SUBMITTED",
        created_at: { lt: stuckCutoff },
      },
      include: { voucher: true, channel: true },
    });

    for (const settlement of stuckSettlements) {
      logger.warn({ settlementId: settlement.id }, "Relayer: replacing stuck transaction (+20% gas bump)");

      const feeData = await this.provider.getFeeData();
      const maxFee       = ((feeData.maxFeePerGas ?? 10_000_000_000n) * GAS_BUMP_FACTOR) / 100n;
      const maxPriorityFee = ((feeData.maxPriorityFeePerGas ?? 1_000_000_000n) * GAS_BUMP_FACTOR) / 100n;

      try {
        const tx = await this.contract.settleClaim(
          settlement.channel_id,
          BigInt(settlement.voucher.cumulative_amount.toString()),
          BigInt(settlement.voucher.nonce.toString()),
          Number(settlement.voucher.valid_until.toString()),
          settlement.voucher.signature,
          {
            nonce:                Number(settlement.tx_hash ? 0 : this.operatorNonce), // use same nonce
            maxFeePerGas:         maxFee,
            maxPriorityFeePerGas: maxPriorityFee,
            type:                 2,
          }
        );

        await prisma.settlement.update({
          where: { id: settlement.id },
          data:  { tx_hash: tx.hash },
        });

        logger.info({ settlementId: settlement.id, newTxHash: tx.hash }, "Relayer: replacement transaction broadcast");
        void this.monitorTransaction(settlement.id, tx);
      } catch (err) {
        logger.error({ err, settlementId: settlement.id }, "Relayer: gas bump failed");
      }
    }
  }
}
