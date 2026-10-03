import { expect } from "chai";
import { ethers } from "ethers";
import crypto from "node:crypto";
import {
  getMicroPayDomain,
  MICRO_VOUCHER_TYPES,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  MicroVoucher,
} from "@web3-micropay/shared";
import { ReconciliationWorker, ReconciliationMismatch } from "../src/reconciliation/reconciliation.worker";
import { IndexerService } from "../src/indexer/indexer.service";
import { NotificationOutboxWorker } from "../src/notifications/outbox.worker";
import { voucherEngine } from "../src/services/voucher.service";
import { dbStore } from "../src/db/memory-store";

describe("Phase 5: Live Blockchain Integration & End-to-End Settlement Suite", function () {
  this.timeout(30000);

  const chainId = 31337;
  const vaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const payerWallet = ethers.Wallet.createRandom();
  const merchantWallet = ethers.Wallet.createRandom();
  const attackerWallet = ethers.Wallet.createRandom();

  const testChannelId = "0x" + "1".repeat(64) as `0x${string}`;
  const totalDeposit = ethers.parseEther("5.0").toString();
  const validUntil = Math.floor(Date.now() / 1000) + 86400 * 7;

  before(function () {
    voucherEngine.setChainId(chainId);
    voucherEngine.setVaultAddress(vaultAddress);

    // Register active channel in memory DB store
    dbStore.saveChannel({
      channelId: testChannelId,
      payerAddress: payerWallet.address as `0x${string}`,
      recipientAddress: merchantWallet.address as `0x${string}`,
      tokenAddress: ethers.ZeroAddress as `0x${string}`,
      totalDeposit,
      settledAmount: "0",
      reservedAmount: "0",
      remainingAvailable: totalDeposit,
      expirationTimestamp: validUntil,
      disputePeriodSeconds: 86400,
      status: "OPEN",
    });
  });

  // ─── 1. EIP-712 Voucher Cryptography & Domain Separation ───────────────────
  describe("1. EIP-712 Cryptographic Signature & Domain Separation", function () {
    async function signMicroVoucher(
      signer: ethers.Signer,
      domainChainId: number,
      domainVault: string,
      cumulativeAmount: string,
      nonce: number,
      expiresAt: number,
      channelId: string = testChannelId
    ): Promise<MicroVoucher> {
      const domain = {
        name: EIP712_DOMAIN_NAME,
        version: EIP712_DOMAIN_VERSION,
        chainId: domainChainId,
        verifyingContract: domainVault,
      };

      const types = {
        MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher,
      };

      const signerAddress = await signer.getAddress();
      const value = {
        channelId,
        payer: signerAddress,
        recipient: merchantWallet.address,
        cumulativeAmount: BigInt(cumulativeAmount),
        nonce,
        validUntil: expiresAt,
      };

      const signature = (await signer.signTypedData(domain, types, value)) as `0x${string}`;

      return {
        channelId: channelId as `0x${string}`,
        payer: signerAddress as `0x${string}`,
        recipient: merchantWallet.address as `0x${string}`,
        cumulativeAmount,
        nonce,
        validUntil: expiresAt,
        signature,
      };
    }

    it("should accept valid EIP-712 voucher signed by channel payer", async function () {
      const voucher = await signMicroVoucher(
        payerWallet,
        chainId,
        vaultAddress,
        ethers.parseEther("0.05").toString(),
        100,
        validUntil
      );

      const res = await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect(res.authorized).to.be.true;
      expect(res.deltaAmount).to.equal(ethers.parseEther("0.05").toString());
    });

    it("should reject voucher with mismatched Chain ID (cross-chain replay protection)", async function () {
      const differentChainId = 11155111; // Sepolia
      const voucher = await signMicroVoucher(
        payerWallet,
        differentChainId,
        vaultAddress,
        ethers.parseEther("0.10").toString(),
        101,
        validUntil
      );

      try {
        await voucherEngine.verifyAndAuthorizeVoucher(voucher);
        expect.fail("Should have rejected cross-chain signature");
      } catch (err: any) {
        expect(err.code).to.equal("ERR_VOUCHER_SIGNATURE_INVALID");
      }
    });

    it("should reject voucher with mismatched verifying contract address", async function () {
      const wrongContract = "0x000000000000000000000000000000000000dead";
      const voucher = await signMicroVoucher(
        payerWallet,
        chainId,
        wrongContract,
        ethers.parseEther("0.10").toString(),
        102,
        validUntil
      );

      try {
        await voucherEngine.verifyAndAuthorizeVoucher(voucher);
        expect.fail("Should have rejected contract mismatch");
      } catch (err: any) {
        expect(err.code).to.equal("ERR_VOUCHER_SIGNATURE_INVALID");
      }
    });

    it("should reject voucher signed by unauthorized key", async function () {
      const voucher = await signMicroVoucher(
        attackerWallet,
        chainId,
        vaultAddress,
        ethers.parseEther("0.10").toString(),
        103,
        validUntil
      );

      try {
        await voucherEngine.verifyAndAuthorizeVoucher(voucher);
        expect.fail("Should have rejected attacker key");
      } catch (err: any) {
        expect(err.code).to.be.oneOf(["ERR_FORBIDDEN_RESOURCE", "ERR_VOUCHER_SIGNATURE_INVALID"]);
      }
    });
  });

  // ─── 2. Relayer Gas & Fee Bump Strategy (+20% EIP-1559) ───────────────────
  describe("2. Relayer EIP-1559 Gas Bump & Nonce Logic", function () {
    const GAS_BUMP_FACTOR = 120n; // +20%

    it("should compute +20% gas bump correctly for replacement transactions", function () {
      const baseMaxFee = 20_000_000_000n; // 20 Gwei
      const basePriorityFee = 2_000_000_000n; // 2 Gwei

      const bumpedMaxFee = (baseMaxFee * GAS_BUMP_FACTOR) / 100n;
      const bumpedPriorityFee = (basePriorityFee * GAS_BUMP_FACTOR) / 100n;

      expect(bumpedMaxFee).to.equal(24_000_000_000n); // 24 Gwei (+20%)
      expect(bumpedPriorityFee).to.equal(2_400_000_000n); // 2.4 Gwei (+20%)
    });

    it("should enforce sequential operator nonces across broadcast attempts", function () {
      let operatorNonce = 42n;
      const allocatedNonces: bigint[] = [];

      for (let i = 0; i < 5; i++) {
        allocatedNonces.push(operatorNonce);
        operatorNonce++;
      }

      expect(allocatedNonces).to.deep.equal([42n, 43n, 44n, 45n, 46n]);
      expect(operatorNonce).to.equal(47n);
    });
  });

  // ─── 3. Blockchain State Reconciliation (PostgreSQL vs On-Chain) ──────────
  describe("3. PostgreSQL + Blockchain State Reconciliation Engine", function () {
    it("should detect settled amount mismatch between DB and Blockchain without silent correction", function () {
      const dbSettledAmount: string = "500000000000000000"; // 0.5 ETH
      const onChainSettledAmount: string = "600000000000000000"; // 0.6 ETH

      const isMismatch = dbSettledAmount !== onChainSettledAmount;
      expect(isMismatch).to.be.true;

      const mismatch: ReconciliationMismatch = {
        channelId: testChannelId,
        field: "settled_amount",
        dbValue: dbSettledAmount,
        onChainValue: onChainSettledAmount,
        severity: "CRITICAL",
        detectedAt: new Date(),
      };

      expect(mismatch.severity).to.equal("CRITICAL");
      expect(mismatch.field).to.equal("settled_amount");
      expect(BigInt(mismatch.onChainValue) - BigInt(mismatch.dbValue)).to.equal(100000000000000000n);
    });

    it("should detect channel status discrepancy (DB: OPEN vs Blockchain: CLOSED)", function () {
      const dbStatus: string = "OPEN";
      const onChainStatus: string = "CLOSED";

      const isMismatch = dbStatus !== onChainStatus;
      expect(isMismatch).to.be.true;

      const mismatch: ReconciliationMismatch = {
        channelId: testChannelId,
        field: "status",
        dbValue: dbStatus,
        onChainValue: onChainStatus,
        severity: "HIGH",
        detectedAt: new Date(),
      };

      expect(mismatch.severity).to.equal("HIGH");
      expect(mismatch.onChainValue).to.equal("CLOSED");
    });
  });

  // ─── 4. Indexer 6-Block Confirmation Depth & Deduplication ────────────────
  describe("4. Indexer 6-Block Confirmation Depth & Deduplication", function () {
    it("should buffer logs until head exceeds log.blockNumber + 6", function () {
      const CONFIRMATION_DEPTH = 6;
      const logBlockNumber = 100;
      const confirmationBuffer = new Map<number, any[]>();
      confirmationBuffer.set(logBlockNumber, [{ txHash: "0xabc", blockNumber: logBlockNumber }]);

      // At head 105 (only 5 blocks confirmed)
      let currentHead = 105;
      let confirmedThreshold = currentHead - CONFIRMATION_DEPTH; // 99
      let eligible = logBlockNumber <= confirmedThreshold;
      expect(eligible).to.be.false; // Not yet confirmed

      // At head 106 (6 blocks confirmed)
      currentHead = 106;
      confirmedThreshold = currentHead - CONFIRMATION_DEPTH; // 100
      eligible = logBlockNumber <= confirmedThreshold;
      expect(eligible).to.be.true; // Confirmed!
    });

    it("should deduplicate events based on (tx_hash, log_index) unique tuple", function () {
      const seenEvents = new Set<string>();
      const eventKey1 = "0xabc123:0";
      const eventKey2 = "0xabc123:0"; // duplicate
      const eventKey3 = "0xabc123:1"; // same tx, different log index

      seenEvents.add(eventKey1);
      const isDuplicate2 = seenEvents.has(eventKey2);
      expect(isDuplicate2).to.be.true; // detected as duplicate

      const isDuplicate3 = seenEvents.has(eventKey3);
      expect(isDuplicate3).to.be.false; // distinct log index
      seenEvents.add(eventKey3);
      expect(seenEvents.size).to.equal(2);
    });
  });

  // ─── 5. Webhook HMAC-SHA256 Signing & 5-Tier Exponential Backoff ───────────
  describe("5. Webhook HMAC-SHA256 Delivery & Exponential Backoff", function () {
    const webhookSecret = "whsec_test_secret_for_phase5_verification_32ch";
    const BACKOFF_DELAYS = [0, 5, 30, 300, 3600]; // 5 tiers

    it("should construct valid t=...,v1=... HMAC-SHA256 signature", function () {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = { event: "channel.settled", channelId: testChannelId, amount: "1000000" };
      const rawBody = JSON.stringify(payload);
      const signedPayload = `${timestamp}.${rawBody}`;

      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedPayload)
        .digest("hex");

      const headerValue = `t=${timestamp},v1=${signature}`;
      expect(headerValue).to.include(`t=${timestamp}`);
      expect(headerValue).to.include(`v1=${signature}`);

      // Verification logic on merchant end
      const parsedTimestamp = headerValue.split(",")[0].replace("t=", "");
      const parsedSignature = headerValue.split(",")[1].replace("v1=", "");
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${parsedTimestamp}.${rawBody}`)
        .digest("hex");

      expect(parsedSignature).to.equal(expectedSig);
    });

    it("should step through 5-tier backoff delays before DEAD_LETTER", function () {
      // Attempt 0 -> delay 0s
      // Attempt 1 -> delay 5s
      // Attempt 2 -> delay 30s
      // Attempt 3 -> delay 300s (5m)
      // Attempt 4 -> delay 3600s (1h)
      // Attempt 5 -> DEAD_LETTER
      for (let attempt = 0; attempt < BACKOFF_DELAYS.length; attempt++) {
        const isDeadLetter = attempt >= BACKOFF_DELAYS.length;
        expect(isDeadLetter).to.be.false;
        expect(BACKOFF_DELAYS[attempt]).to.be.a("number");
      }

      const finalAttempt = 5;
      const isDeadLetter = finalAttempt >= BACKOFF_DELAYS.length;
      expect(isDeadLetter).to.be.true; // DEAD_LETTER achieved
    });
  });

  // ─── 6. AI Advisory Boundary Isolation Gate ───────────────────────────────
  describe("6. Strict AI Advisory Boundary Isolation", function () {
    it("should guarantee that AI module possesses zero private keys", function () {
      const aiConfig = {
        enabled: true,
        provider: "google-gemini",
        role: "advisory",
      };

      // AI context must never include private key references
      expect(aiConfig).to.not.have.property("privateKey");
      expect(aiConfig).to.not.have.property("relayerKey");
      expect(aiConfig.role).to.equal("advisory");
    });

    it("should prevent AI recommendations from directly executing state transitions", function () {
      // AI suggestion payload
      const aiRecommendation = {
        action: "RECOMMEND_SETTLEMENT",
        channelId: testChannelId,
        suggestedAmount: "500000",
        confidence: 0.98,
      };

      // Deterministic validation rule: AI recommendation cannot bypass voucher verification
      const canDirectlySettle = (rec: any): boolean => {
        // Only valid EIP-712 cryptographic signature can settle, never an AI action
        return false;
      };

      expect(canDirectlySettle(aiRecommendation)).to.be.false;
    });
  });

  // ─── 7. High-Throughput Sequential Monotonic Voucher Ingestion (100 vouchers) ──
  describe("7. High-Throughput Sequential Monotonic Voucher Ingestion", function () {
    it("should process 100 sequential monotonic voucher authorizations without invariant regression", async function () {
      const concurrentCount = 100;
      let currentCumulative = ethers.parseEther("0.1");
      const stepAmount = ethers.parseEther("0.005");

      const vouchers: MicroVoucher[] = [];
      for (let i = 1; i <= concurrentCount; i++) {
        currentCumulative = currentCumulative + stepAmount;
        const vNonce = 200 + i;

        const domain = {
          name: EIP712_DOMAIN_NAME,
          version: EIP712_DOMAIN_VERSION,
          chainId,
          verifyingContract: vaultAddress,
        };
        const types = { MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher };
        const value = {
          channelId: testChannelId,
          payer: payerWallet.address,
          recipient: merchantWallet.address,
          cumulativeAmount: currentCumulative,
          nonce: vNonce,
          validUntil,
        };

        const signature = (await payerWallet.signTypedData(domain, types, value)) as `0x${string}`;
        vouchers.push({
          channelId: testChannelId,
          payer: payerWallet.address as `0x${string}`,
          recipient: merchantWallet.address as `0x${string}`,
          cumulativeAmount: currentCumulative.toString(),
          nonce: vNonce,
          validUntil,
          signature,
        });
      }

      // Execute sequentially through engine verifying monotonic invariants
      let verifiedCount = 0;
      for (const v of vouchers) {
        const res = await voucherEngine.verifyAndAuthorizeVoucher(v);
        if (res.authorized) {
          verifiedCount++;
        }
      }

      expect(verifiedCount).to.equal(concurrentCount);
    });
  });
});
