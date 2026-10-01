import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MicroPayVault, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MicroPayVault - Gas Analysis & Benchmarks", function () {
  let vault: MicroPayVault;
  let mockUSDC: MockUSDC;
  let payer: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let chainId: bigint;

  const DISPUTE_PERIOD = 86400;
  let defaultExpiration: number;

  beforeEach(async function () {
    [, payer, merchant] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    const MicroPayVaultFactory = await ethers.getContractFactory("MicroPayVault");
    vault = await MicroPayVaultFactory.deploy();
    await vault.waitForDeployment();

    chainId = (await ethers.provider.getNetwork()).chainId;
    const latestBlock = await ethers.provider.getBlock("latest");
    defaultExpiration = latestBlock!.timestamp + DISPUTE_PERIOD * 30;
  });

  it("should benchmark gas usage across all major operations", async function () {
    console.log("\n  ===============================================================");
    console.log("  FUNCTION GAS BENCHMARK REPORT (Solidity 0.8.24 / Paris EVM)");
    console.log("  ===============================================================");

    // 1. openChannel (Native ETH)
    const depositETH = ethers.parseEther("1.0");
    const txOpenETH = await vault.connect(payer).openChannel(
      merchant.address,
      ethers.ZeroAddress,
      depositETH,
      defaultExpiration,
      DISPUTE_PERIOD,
      { value: depositETH }
    );
    const receiptOpenETH = await txOpenETH.wait();
    console.log(`  openChannel (Native ETH):       ${receiptOpenETH!.gasUsed} gas`);

    // 2. openChannel (ERC-20 USDC)
    const depositUSDC = ethers.parseUnits("50", 6);
    await mockUSDC.mint(payer.address, depositUSDC);
    await mockUSDC.connect(payer).approve(await vault.getAddress(), depositUSDC);
    const txOpenUSDC = await vault.connect(payer).openChannel(
      merchant.address,
      await mockUSDC.getAddress(),
      depositUSDC,
      defaultExpiration,
      DISPUTE_PERIOD
    );
    const receiptOpenUSDC = await txOpenUSDC.wait();
    console.log(`  openChannel (ERC-20 USDC):      ${receiptOpenUSDC!.gasUsed} gas`);

    const event = receiptOpenETH!.logs.find(
      (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
    ) as any;
    const channelId = event.args[0];

    // 3. topUpChannel
    const topUpAmount = ethers.parseEther("0.5");
    const txTopUp = await vault.connect(payer).topUpChannel(channelId, topUpAmount, { value: topUpAmount });
    const receiptTopUp = await txTopUp.wait();
    console.log(`  topUpChannel (Native ETH):      ${receiptTopUp!.gasUsed} gas`);

    // 4. settleClaim (ECDSA EIP-712 Claim)
    const cumulativeAmount = ethers.parseEther("0.25");
    const domain = {
      name: "Web3MicroPayVault",
      version: "1",
      chainId,
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
      payer: payer.address,
      recipient: merchant.address,
      cumulativeAmount,
      nonce: 1,
      validUntil: defaultExpiration,
    };
    const signature = await payer.signTypedData(domain, types, value);

    const txSettle = await vault.connect(merchant).settleClaim(
      channelId,
      cumulativeAmount,
      1,
      defaultExpiration,
      signature
    );
    const receiptSettle = await txSettle.wait();
    console.log(`  settleClaim (EIP-712 ECDSA):    ${receiptSettle!.gasUsed} gas`);

    // 5. initiateChannelClose (Dispute)
    const txDispute = await vault.connect(payer).initiateChannelClose(channelId);
    const receiptDispute = await txDispute.wait();
    console.log(`  initiateChannelClose (Dispute): ${receiptDispute!.gasUsed} gas`);

    // 6. finalizeChannelClose
    await time.increase(DISPUTE_PERIOD + 1);
    const txFinalize = await vault.connect(payer).finalizeChannelClose(channelId);
    const receiptFinalize = await txFinalize.wait();
    console.log(`  finalizeChannelClose (Refund):  ${receiptFinalize!.gasUsed} gas`);

    console.log("  ===============================================================\n");
  });
});
