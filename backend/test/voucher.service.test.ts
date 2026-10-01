import { expect } from "chai";
import { ethers } from "ethers";
import { voucherEngine } from "../src/services/voucher.service";
import { dbStore } from "../src/db/memory-store";
import { redisService } from "../src/redis/redis.service";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION, MICRO_VOUCHER_TYPES, ChannelDTO } from "@web3-micropay/shared";

describe("Backend Protocol: Voucher Verification Engine (11-Step Pipeline)", function () {
  const chainId = 31337;
  const vaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const payerWallet = ethers.Wallet.createRandom();
  const merchantWallet = ethers.Wallet.createRandom();
  const strangerWallet = ethers.Wallet.createRandom();

  const channelId = "0x98f7e6d5c4b3a21098f7e6d5c4b3a21098f7e6d5c4b3a21098f7e6d5c4b3a210" as `0x${string}`;
  const totalDeposit = ethers.parseEther("10.0").toString();
  const expiration = Math.floor(Date.now() / 1000) + 86400 * 30;

  before(function () {
    voucherEngine.setChainId(chainId);
    voucherEngine.setVaultAddress(vaultAddress);

    // Register active channel in DB
    const channel: ChannelDTO = {
      channelId,
      payerAddress: payerWallet.address as `0x${string}`,
      recipientAddress: merchantWallet.address as `0x${string}`,
      tokenAddress: ethers.ZeroAddress as `0x${string}`,
      totalDeposit,
      settledAmount: "0",
      reservedAmount: "0",
      remainingAvailable: totalDeposit,
      expirationTimestamp: expiration,
      disputePeriodSeconds: 86400,
      status: "OPEN",
    };
    dbStore.saveChannel(channel);
  });

  async function createSignedVoucher(
    signer: ethers.Signer,
    cumulativeAmount: string,
    nonce: number,
    validUntil: number,
    targetChannelId: string = channelId
  ) {

    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };

    const types = {
      MicroVoucher: MICRO_VOUCHER_TYPES.MicroVoucher,
    };

    const value = {
      channelId: targetChannelId,
      payer: payerWallet.address,
      recipient: merchantWallet.address,
      cumulativeAmount: BigInt(cumulativeAmount),
      nonce,
      validUntil,
    };

    const signature = (await signer.signTypedData(domain, types, value)) as `0x${string}`;

    return {
      channelId: targetChannelId as `0x${string}`,
      payer: payerWallet.address as `0x${string}`,
      recipient: merchantWallet.address as `0x${string}`,
      cumulativeAmount,
      nonce,
      validUntil,
      signature,
    };
  }

  it("should successfully verify and authorize a valid initial micro-voucher (Nonce 1)", async function () {
    const voucher = await createSignedVoucher(payerWallet, ethers.parseEther("0.1").toString(), 1, expiration);

    const result = await voucherEngine.verifyAndAuthorizeVoucher(voucher);
    expect(result.authorized).to.be.true;
    expect(result.deltaAmount).to.equal(ethers.parseEther("0.1").toString());
    expect(result.voucherId).to.be.a("string");

    // Check Redis state
    const cachedNonce = await redisService.get(`channel:nonce:${channelId}`);
    expect(cachedNonce).to.equal("1");
  });

  it("should successfully authorize subsequent monotonic micro-voucher (Nonce 2)", async function () {
    const voucher = await createSignedVoucher(payerWallet, ethers.parseEther("0.25").toString(), 2, expiration);

    const result = await voucherEngine.verifyAndAuthorizeVoucher(voucher);
    expect(result.authorized).to.be.true;
    expect(result.deltaAmount).to.equal(ethers.parseEther("0.25").toString());

    const cachedNonce = await redisService.get(`channel:nonce:${channelId}`);
    expect(cachedNonce).to.equal("2");
  });

  it("should reject replayed nonce (Nonce 2 again)", async function () {
    const voucher = await createSignedVoucher(payerWallet, ethers.parseEther("0.3").toString(), 2, expiration);

    try {
      await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.code).to.equal("ERR_VOUCHER_NONCE_OUT_OF_ORDER");
    }
  });

  it("should reject signature created by an attacker (unauthorized signer)", async function () {
    const voucher = await createSignedVoucher(strangerWallet, ethers.parseEther("0.5").toString(), 3, expiration);

    try {
      await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.code).to.equal("ERR_VOUCHER_SIGNATURE_INVALID");
    }
  });

  it("should reject voucher exceeding channel total deposit capacity", async function () {
    const overCapacity = ethers.parseEther("15.0").toString();
    const voucher = await createSignedVoucher(payerWallet, overCapacity, 4, expiration);

    try {
      await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.code).to.equal("ERR_VOUCHER_NONCE_OUT_OF_ORDER");
    }
  });

  it("should reject voucher with higher nonce but lower cumulative amount (regressive claim)", async function () {
    // Nonce 5 is higher than active nonce 2, but 0.20 ETH is lower than active reserved 0.25 ETH
    const voucher = await createSignedVoucher(payerWallet, ethers.parseEther("0.20").toString(), 5, expiration);

    try {
      await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.code).to.equal("ERR_VOUCHER_NONCE_OUT_OF_ORDER");
      expect(err.message).to.include("must be strictly greater than active reserved amount");
    }
  });

  it("should reject expired voucher timestamp", async function () {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const voucher = await createSignedVoucher(payerWallet, ethers.parseEther("0.4").toString(), 6, expiredTimestamp);

    try {
      await voucherEngine.verifyAndAuthorizeVoucher(voucher);
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.code).to.equal("ERR_CHANNEL_EXPIRED");
    }
  });
});
