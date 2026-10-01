import { ethers, BrowserProvider, Contract, Signer } from "ethers";
import {
  getMicroPayDomain,
  MICRO_VOUCHER_TYPES,
  MicroVoucher,
  ChannelDTO,
  ChannelStatus,
  MICRO_PAY_VAULT_ABI,
} from "@web3-micropay/shared";

export interface TransactionStatus {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  error?: string;
}

export class Web3MicroPayClient {
  private provider: BrowserProvider | ethers.JsonRpcProvider;
  private signer: Signer | null = null;
  private vaultAddress: string;
  private chainId: bigint;

  constructor(
    provider: BrowserProvider | ethers.JsonRpcProvider,
    vaultAddress: string,
    chainId: bigint
  ) {
    this.provider = provider;
    this.vaultAddress = vaultAddress;
    this.chainId = chainId;
  }

  /**
   * Connect wallet and verify network
   */
  public async connect(signer?: Signer): Promise<{ address: string; chainId: bigint }> {
    if (signer) {
      this.signer = signer;
    } else if (this.provider instanceof BrowserProvider) {
      this.signer = await this.provider.getSigner();
    } else {
      throw new Error("No signer provided and provider is not a BrowserProvider");
    }

    const network = await this.provider.getNetwork();
    if (network.chainId !== this.chainId) {
      throw new Error(`Network mismatch: connected to ${network.chainId}, expected ${this.chainId}`);
    }

    const address = await this.signer.getAddress();
    return { address, chainId: network.chainId };
  }

  public getSigner(): Signer {
    if (!this.signer) throw new Error("Wallet not connected");
    return this.signer;
  }

  public getVaultContract(): Contract {
    return new Contract(this.vaultAddress, MICRO_PAY_VAULT_ABI, this.signer ?? this.provider);
  }

  /**
   * Fetch on-chain channel state from public mapping
   */
  public async getChannelState(channelId: string): Promise<Partial<ChannelDTO>> {
    const vault = this.getVaultContract();
    const data = await vault.channels(channelId);
    const statuses: ChannelStatus[] = ["NONE", "OPEN", "DISPUTED", "CLOSED"];
    
    return {
      channelId: channelId as `0x${string}`,
      payerAddress: data.payer as `0x${string}`,
      recipientAddress: data.recipient as `0x${string}`,
      tokenAddress: data.token as `0x${string}`,
      totalDeposit: data.totalDeposit.toString(),
      settledAmount: data.settledAmount.toString(),
      expirationTimestamp: Number(data.expiration),
      disputePeriodSeconds: Number(data.disputePeriod),
      disputeExpiresAt: Number(data.disputeExpiresAt),
      status: statuses[Number(data.status)],
    };
  }

  /**
   * EIP-712 sign a micro-payment voucher
   */
  public async signVoucher(voucher: Omit<MicroVoucher, "signature">): Promise<MicroVoucher> {
    if (!this.signer) throw new Error("Wallet not connected");

    const domain = getMicroPayDomain(this.chainId, this.vaultAddress);
    const types = {
      MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher,
    };

    const value = {
      channelId: voucher.channelId,
      payer: voucher.payer,
      recipient: voucher.recipient,
      cumulativeAmount: BigInt(voucher.cumulativeAmount),
      nonce: voucher.nonce,
      validUntil: voucher.validUntil,
    };

    const signature = (await this.signer.signTypedData(domain, types, value)) as `0x${string}`;

    return {
      ...voucher,
      signature,
    };
  }

  /**
   * Open channel with Native ETH or ERC-20
   */
  public async openChannel(
    recipientAddress: string,
    tokenAddress: string,
    depositAmount: bigint,
    expirationTimestamp: number,
    disputePeriodSeconds: number = 86400
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = this.getVaultContract();
    const isNative = tokenAddress === ethers.ZeroAddress;

    if (isNative) {
      return vault.openChannel(
        recipientAddress,
        tokenAddress,
        depositAmount,
        expirationTimestamp,
        disputePeriodSeconds,
        { value: depositAmount }
      );
    } else {
      return vault.openChannel(
        recipientAddress,
        tokenAddress,
        depositAmount,
        expirationTimestamp,
        disputePeriodSeconds
      );
    }
  }

  /**
   * Monitor a transaction until required confirmations
   */
  public async waitForConfirmation(
    txHash: string,
    confirmations: number = 1
  ): Promise<TransactionStatus> {
    const receipt = await this.provider.waitForTransaction(txHash, confirmations);
    if (!receipt) {
      return { hash: txHash, status: "failed", confirmations: 0, error: "Receipt null" };
    }
    return {
      hash: txHash,
      status: receipt.status === 1 ? "confirmed" : "failed",
      confirmations,
    };
  }
}
