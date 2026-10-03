import { ethers, BrowserProvider, Contract, Signer } from "ethers";
import {
  getMicroPayDomain,
  MICRO_VOUCHER_TYPES,
  MICRO_PAY_VAULT_ABI,
} from "@web3-micropay/shared";
import type { MicroVoucher, ChannelDTO, ChannelStatus } from "@web3-micropay/shared";

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
    chainId: bigint,
    signer?: Signer | null
  ) {
    this.provider = provider;
    this.vaultAddress = vaultAddress;
    this.chainId = chainId;
    if (signer) {
      this.signer = signer;
    }
  }

  public setSigner(signer: Signer | null): void {
    this.signer = signer;
  }

  /**
   * Ensures a Signer is available for write operations.
   * If not already set, attempts to obtain one from the BrowserProvider.
   */
  public async ensureSigner(): Promise<Signer> {
    if (this.signer) return this.signer;
    if (this.provider instanceof BrowserProvider) {
      this.signer = await this.provider.getSigner();
      return this.signer;
    }
    throw new Error("Cannot execute write transaction: no Signer connected to wallet provider");
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

  /**
   * Returns a contract instance backed by a Signer for write transactions.
   */
  public async getWriteContract(): Promise<Contract> {
    const signer = await this.ensureSigner();
    return new Contract(this.vaultAddress, MICRO_PAY_VAULT_ABI, signer);
  }

  /**
   * Returns a contract instance backed by the Provider for read-only calls.
   */
  public getReadContract(): Contract {
    return new Contract(this.vaultAddress, MICRO_PAY_VAULT_ABI, this.provider);
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

    const signer = await this.ensureSigner();
    const signature = (await signer.signTypedData(domain, types, value)) as `0x${string}`;

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
    const vault = await this.getWriteContract();
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
   * Top up an existing channel with additional collateral
   */
  public async topUpChannel(
    channelId: string,
    tokenAddress: string,
    additionalAmount: bigint
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = await this.getWriteContract();
    const isNative = tokenAddress === ethers.ZeroAddress;

    if (isNative) {
      return vault.topUpChannel(channelId, additionalAmount, { value: additionalAmount });
    } else {
      return vault.topUpChannel(channelId, additionalAmount);
    }
  }

  /**
   * Initiate unilateral dispute resolution window
   */
  public async initiateChannelClose(channelId: string): Promise<ethers.ContractTransactionResponse> {
    const vault = await this.getWriteContract();
    return vault.initiateChannelClose(channelId);
  }

  /**
   * Finalize channel closure after dispute period or expiration elapses
   */
  public async finalizeChannelClose(channelId: string): Promise<ethers.ContractTransactionResponse> {
    const vault = await this.getWriteContract();
    return vault.finalizeChannelClose(channelId);
  }

  /**
   * Settle highest cumulative voucher directly on-chain
   */
  public async settleClaim(
    channelId: string,
    cumulativeAmount: bigint,
    nonce: number,
    validUntil: number,
    signature: string
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = await this.getWriteContract();
    return vault.settleClaim(channelId, cumulativeAmount, nonce, validUntil, signature);
  }

  /**
   * Cooperatively close channel with mutual signatures
   */
  public async closeChannelCooperative(
    channelId: string,
    finalAmount: bigint,
    payerSignature: string,
    recipientSignature: string
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = await this.getWriteContract();
    return vault.closeChannelCooperative(channelId, finalAmount, payerSignature, recipientSignature);
  }

  /**
   * Sign a cooperative close agreement
   */
  public async signCooperativeClose(channelId: string, finalAmount: bigint): Promise<string> {
    const signer = await this.ensureSigner();

    const domain = getMicroPayDomain(this.chainId, this.vaultAddress);
    const types = {
      CooperativeClose: [
        { name: "channelId", type: "bytes32" },
        { name: "finalAmount", type: "uint256" },
      ],
    };
    const value = {
      channelId,
      finalAmount,
    };

    return signer.signTypedData(domain, types, value);
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

