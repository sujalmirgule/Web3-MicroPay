import { expect } from "chai";
import { ethers } from "ethers";
import { apiServer } from "../src/api/server";
import { voucherEngine } from "../src/services/voucher.service";
import { BlockchainEventIndexer } from "../src/indexer/indexer.service";
import { dbStore } from "../src/db/memory-store";
import { redisService } from "../src/redis/redis.service";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION, MICRO_VOUCHER_TYPES } from "@web3-micropay/shared";

describe("End-to-End Core Protocol Integration Pipeline", function () {
  const chainId = 31337;
  const vaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const payerWallet = ethers.Wallet.createRandom();
  const merchantWallet = ethers.Wallet.createRandom();

  const channelId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
  const depositAmount = ethers.parseEther("5.0").toString();
  const expiration = Math.floor(Date.now() / 1000) + 86400 * 30;

  let indexer: BlockchainEventIndexer;

  before(function () {
    voucherEngine.setChainId(chainId);
    voucherEngine.setVaultAddress(vaultAddress);
    indexer = new BlockchainEventIndexer("http://127.0.0.1:8545", vaultAddress);
  });

  it("Step 1: SIWE Authentication Flow", async function () {
    // 1. Request Nonce
    const nonceRes = await apiServer.handleSIWENonce({ walletAddress: payerWallet.address });
    expect(nonceRes.success).to.be.true;
    expect(nonceRes.data.nonce).to.be.a("string");

    // 2. Sign message
    const message = `localhost:3000 wants you to sign in with your Ethereum account:\n${payerWallet.address}\n\nSign in with nonce: ${nonceRes.data.nonce}`;
    const signature = await payerWallet.signMessage(message);

    // 3. Verify SIWE
    const verifyRes = await apiServer.handleSIWEVerify({ message, signature });
    expect(verifyRes.success).to.be.true;
    expect(verifyRes.data.accessToken).to.include("jwt_mock");
    expect(verifyRes.data.user.walletAddress).to.equal(payerWallet.address);
  });

  it("Step 2: Channel Registration & On-chain Simulation", async function () {
    const regRes = await apiServer.handleChannelRegister({
      channelId,
      payerAddress: payerWallet.address,
      recipientAddress: merchantWallet.address,
      tokenAddress: ethers.ZeroAddress,
      depositAmount,
      expirationTimestamp: expiration,
      disputePeriodSeconds: 86400,
      openTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    });

    expect(regRes.success).to.be.true;
    expect(regRes.data.status).to.equal("OPEN");

    const channel = dbStore.getChannel(channelId);
    expect(channel).to.not.be.undefined;
    expect(channel!.totalDeposit).to.equal(depositAmount);
  });

  it("Step 3: Off-Chain EIP-712 Voucher Generation & Ingestion (<50ms)", async function () {
    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };
    const types = {
      MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher,
    };
    const cumulativeAmount = ethers.parseEther("0.05").toString();
    const value = {
      channelId,
      payer: payerWallet.address,
      recipient: merchantWallet.address,
      cumulativeAmount: BigInt(cumulativeAmount),
      nonce: 1,
      validUntil: expiration,
    };

    const signature = await payerWallet.signTypedData(domain, types, value);

    const submitRes = await apiServer.handleVoucherSubmit({
      channelId,
      payer: payerWallet.address,
      recipient: merchantWallet.address,
      cumulativeAmount,
      nonce: 1,
      validUntil: expiration,
      signature,
    });

    expect(submitRes.success).to.be.true;
    expect(submitRes.data.authorized).to.be.true;
    expect(submitRes.data.deltaAmount).to.equal(cumulativeAmount);
  });

  it("Step 4: Blockchain Event Indexer Ingestion & Transactional Outbox Sync", async function () {
    const txHash = "0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff";
    const settledAmount = ethers.parseEther("0.05").toString();

    const indexed = await indexer.processEventLog(
      "ChannelSettled",
      channelId,
      txHash,
      100,
      0,
      { cumulativeAmount: settledAmount, payoutDelta: settledAmount }
    );

    expect(indexed).to.be.true;

    // Check channel state updated
    const channel = dbStore.getChannel(channelId);
    expect(channel!.settledAmount).to.equal(settledAmount);

    // Check Transactional Outbox record exists
    const outboxRecord = dbStore.notificationOutbox.find(
      (o) => o.payload.channelId === channelId
    );
    expect(outboxRecord).to.not.be.undefined;
    expect(outboxRecord!.event_type).to.equal("settlement.confirmed");
  });

  it("Step 5: Idempotency Protection for duplicate submissions", async function () {
    const idempotencyKey = "idem_test_key_123";
    const payload = {
      channelId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      payerAddress: payerWallet.address,
      recipientAddress: merchantWallet.address,
      tokenAddress: ethers.ZeroAddress,
      depositAmount: ethers.parseEther("1.0").toString(),
      expirationTimestamp: expiration,
      disputePeriodSeconds: 86400,
    };

    // First request
    const firstRes = await apiServer.handleChannelRegister(payload, idempotencyKey);
    // Duplicate request with identical idempotency key
    const duplicateRes = await apiServer.handleChannelRegister(payload, idempotencyKey);

    expect(duplicateRes).to.deep.equal(firstRes);
  });
});
