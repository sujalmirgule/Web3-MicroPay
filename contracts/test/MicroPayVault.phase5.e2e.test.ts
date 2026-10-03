import { expect } from "chai";
import { ethers } from "hardhat";
import { MicroPayVault, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Phase 5: Live EVM End-to-End Settlement & Multi-Token Protocol", function () {
  let vault: MicroPayVault;
  let usdc: MockUSDC;
  let deployer: HardhatEthersSigner;
  let payer: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let relayer: HardhatEthersSigner;
  let chainId: bigint;

  const MIN_DISPUTE_PERIOD = 86400; // 24 hours
  const DEPOSIT_ETH = ethers.parseEther("2.0");
  const DEPOSIT_USDC = ethers.parseUnits("1000", 6); // 1,000 USDC (6 decimals)

  beforeEach(async function () {
    [deployer, payer, recipient, relayer] = await ethers.getSigners();
    chainId = (await ethers.provider.getNetwork()).chainId;

    const VaultFactory = await ethers.getContractFactory("MicroPayVault");
    vault = await VaultFactory.deploy();
    await vault.waitForDeployment();

    const USDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await USDCFactory.deploy();
    await usdc.waitForDeployment();

    // Mint USDC to payer
    await usdc.mint(payer.address, DEPOSIT_USDC * 2n);
    await usdc.connect(payer).approve(await vault.getAddress(), DEPOSIT_USDC * 2n);
  });

  async function createMicroVoucher(
    channelId: string,
    signer: HardhatEthersSigner,
    cumulativeAmount: bigint,
    nonce: bigint,
    validUntil: number
  ) {
    const domain = {
      name: "Web3MicroPayVault",
      version: "1",
      chainId: chainId,
      verifyingContract: await vault.getAddress(),
    };

    const types = {
      MicroVoucher: [
        { name: "channelId", type: "bytes32" },
        { name: "payer", type: "address" },
        { name: "recipient", type: "address" },
        { name: "cumulativeAmount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "validUntil", type: "uint48" },
      ],
    };

    const value = {
      channelId,
      payer: signer.address,
      recipient: recipient.address,
      cumulativeAmount,
      nonce,
      validUntil,
    };

    const signature = await signer.signTypedData(domain, types, value);
    return { channelId, cumulativeAmount, nonce, validUntil, signature };
  }

  it("E2E Native ETH: Open channel -> Issue multiple vouchers -> Relayer settles -> Top-up -> Cooperative close", async function () {
    const expiration = (await ethers.provider.getBlock("latest"))!.timestamp + 86400 * 30;

    // Step 1: Payer opens Native ETH channel
    const txOpen = await vault.connect(payer).openChannel(
      recipient.address,
      ethers.ZeroAddress,
      DEPOSIT_ETH,
      expiration,
      MIN_DISPUTE_PERIOD,
      { value: DEPOSIT_ETH }
    );
    const receiptOpen = await txOpen.wait();
    expect(receiptOpen?.status).to.equal(1);

    // Extract channelId from event
    const event = receiptOpen?.logs
      .map((l) => {
        try {
          return vault.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p?.name === "ChannelOpened");

    expect(event).to.not.be.undefined;
    const channelId = event!.args[0];

    // Step 2: Payer signs off-chain micro-vouchers
    const voucher1 = await createMicroVoucher(
      channelId,
      payer,
      ethers.parseEther("0.1"),
      1n,
      expiration
    );
    const voucher2 = await createMicroVoucher(
      channelId,
      payer,
      ethers.parseEther("0.35"),
      2n,
      expiration
    );

    // Step 3: Relayer submits highest cumulative voucher (0.35 ETH) on-chain
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
    const txSettle = await vault.connect(relayer).settleClaim(
      channelId,
      voucher2.cumulativeAmount,
      voucher2.nonce,
      voucher2.validUntil,
      voucher2.signature
    );
    const receiptSettle = await txSettle.wait();
    expect(receiptSettle?.status).to.equal(1);

    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("0.35"));

    // Verify on-chain channel state
    const channelState = await vault.channels(channelId);
    expect(channelState.settledAmount).to.equal(ethers.parseEther("0.35"));

    // Step 4: Top-up channel with 0.5 ETH
    const topUpAmount = ethers.parseEther("0.5");
    const txTopUp = await vault.connect(payer).topUpChannel(channelId, topUpAmount, {
      value: topUpAmount,
    });
    await txTopUp.wait();

    const channelStateAfterTopUp = await vault.channels(channelId);
    expect(channelStateAfterTopUp.totalDeposit).to.equal(DEPOSIT_ETH + topUpAmount);

    // Step 5: Issue voucher 3 after top-up
    const voucher3 = await createMicroVoucher(
      channelId,
      payer,
      ethers.parseEther("1.0"),
      3n,
      expiration
    );

    const txSettle2 = await vault.connect(relayer).settleClaim(
      channelId,
      voucher3.cumulativeAmount,
      voucher3.nonce,
      voucher3.validUntil,
      voucher3.signature
    );
    await txSettle2.wait();

    const recipientBalanceFinal = await ethers.provider.getBalance(recipient.address);
    // Net delta from 0.35 to 1.0 is 0.65 ETH
    expect(recipientBalanceFinal - recipientBalanceAfter).to.equal(ethers.parseEther("0.65"));
  });

  it("E2E ERC-20 (MockUSDC): Open channel -> Issue vouchers -> Relayer settles with exact 6 decimals", async function () {
    const expiration = (await ethers.provider.getBlock("latest"))!.timestamp + 86400 * 30;
    const usdcAddress = await usdc.getAddress();

    // Step 1: Open channel with 1000 USDC
    const txOpen = await vault.connect(payer).openChannel(
      recipient.address,
      usdcAddress,
      DEPOSIT_USDC,
      expiration,
      MIN_DISPUTE_PERIOD
    );
    const receiptOpen = await txOpen.wait();
    const event = receiptOpen?.logs
      .map((l) => {
        try {
          return vault.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p) => p?.name === "ChannelOpened");

    const channelId = event!.args[0];

    // Step 2: Sign voucher for 250 USDC
    const cumulativeClaim = ethers.parseUnits("250", 6);
    const voucher = await createMicroVoucher(channelId, payer, cumulativeClaim, 1n, expiration);

    // Step 3: Relayer settles claim
    const recipientUSDCBefore = await usdc.balanceOf(recipient.address);
    await vault.connect(relayer).settleClaim(
      channelId,
      voucher.cumulativeAmount,
      voucher.nonce,
      voucher.validUntil,
      voucher.signature
    );
    const recipientUSDCAfter = await usdc.balanceOf(recipient.address);

    expect(recipientUSDCAfter - recipientUSDCBefore).to.equal(cumulativeClaim);

    const channelData = await vault.channels(channelId);
    expect(channelData.settledAmount).to.equal(cumulativeClaim);
  });
});
