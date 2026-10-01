import { ethers } from "ethers";
import { dbStore, DBSettlement } from "../db/memory-store";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";

export interface RelayerConfig {
  rpcUrl: string;
  vaultAddress: string;
  operatorPrivateKey?: string; // Used in local development
}

export class RelayerService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;
  private vaultAddress: string;

  constructor(config: RelayerConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.vaultAddress = config.vaultAddress;

    if (config.operatorPrivateKey) {
      this.signer = new ethers.Wallet(config.operatorPrivateKey, this.provider);
      logger.info("RelayerService initialized with local operator wallet");
    }
  }

  public setSigner(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Enqueues and submits a cumulative settlement claim to the smart contract.
   */
  public async submitSettlementClaim(
    channelId: string,
    voucherId?: string
  ): Promise<{ settlementId: string; txHash: string; netPayout: string }> {
    if (!this.signer) {
      throw new AppError("ERR_RELAYER_LOW_BALANCE", 502, "Relayer signer not configured.");
    }

    const channel = dbStore.getChannel(channelId);
    if (!channel) {
      throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, "Channel not found.");
    }

    // Fetch highest valid voucher
    const voucher = voucherId
      ? dbStore.vouchers.find((v) => v.id === voucherId)
      : dbStore.getLatestVoucher(channelId);

    if (!voucher) {
      throw new AppError("ERR_VALIDATION_FAILED", 400, "No valid voucher found for settlement.");
    }

    const settlementId = `settle_${Date.now()}`;
    const cumulativeWei = BigInt(voucher.cumulative_amount);
    const settledWei = BigInt(channel.settledAmount);
    const netPayout = (cumulativeWei - settledWei).toString();

    logger.info(
      { channelId, settlementId, cumulativeAmount: voucher.cumulative_amount, netPayout },
      "Submitting settlement claim to on-chain vault"
    );

    const vaultAbi = [
      "function settleClaim(bytes32 channelId, uint256 cumulativeAmount, uint256 nonce, uint48 validUntil, bytes calldata signature) external",
    ];

    const vaultContract = new ethers.Contract(this.vaultAddress, vaultAbi, this.signer);

    // EIP-1559 Fee Estimation
    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 120n) / 100n : undefined; // +20% safety
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? undefined;

    let tx: ethers.ContractTransactionResponse;
    try {
      tx = await vaultContract.settleClaim(
        channelId,
        cumulativeWei,
        voucher.nonce,
        voucher.valid_until,
        voucher.signature,
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
        }
      );
    } catch (err: any) {
      logger.error({ error: err.message }, "Smart contract settleClaim transaction failed");
      throw new AppError("ERR_TX_REVERTED", 500, `On-chain settlement reverted: ${err.message}`);
    }

    const dbSettlement: DBSettlement = {
      id: settlementId,
      channel_id: channelId,
      voucher_id: voucher.id,
      claimed_amount: voucher.cumulative_amount,
      net_payout: netPayout,
      relayer_gas_fee: "0",
      status: "PENDING",
      tx_hash: tx.hash,
      created_at: new Date(),
    };

    dbStore.settlements.set(settlementId, dbSettlement);

    // Wait for mining
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      dbSettlement.status = "FAILED";
      throw new AppError("ERR_TX_REVERTED", 500, "Settlement transaction reverted in block.");
    }

    dbSettlement.status = "CONFIRMED";
    dbSettlement.block_number = receipt.blockNumber;
    dbSettlement.relayer_gas_fee = (receipt.gasUsed * (receipt.gasPrice || 0n)).toString();

    // Update channel settled amount in DB
    channel.settledAmount = voucher.cumulative_amount;
    dbStore.saveChannel(channel);

    logger.info(
      { settlementId, txHash: tx.hash, blockNumber: receipt.blockNumber },
      "Settlement confirmed on-chain successfully"
    );

    return {
      settlementId,
      txHash: tx.hash,
      netPayout,
    };
  }

  /**
   * Implements +20% Gas Bumping for Replacement Transactions
   */
  public calculateBumperFee(currentFee: bigint): bigint {
    return (currentFee * 120n) / 100n; // Exactly +20% as specified in Phase 2
  }
}
