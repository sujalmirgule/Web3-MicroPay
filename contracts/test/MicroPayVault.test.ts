import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MicroPayVault, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MicroPayVault", function () {
  let vault: MicroPayVault;
  let mockUSDC: MockUSDC;
  let owner: HardhatEthersSigner;
  let payer: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const DISPUTE_PERIOD = 86400; // 24 hours
  let defaultExpiration: number;
  let chainId: bigint;

  beforeEach(async function () {
    [owner, payer, merchant, stranger] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy MicroPayVault
    const MicroPayVaultFactory = await ethers.getContractFactory("MicroPayVault");
    vault = await MicroPayVaultFactory.deploy();
    await vault.waitForDeployment();

    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;

    const latestBlock = await ethers.provider.getBlock("latest");
    defaultExpiration = latestBlock!.timestamp + DISPUTE_PERIOD * 30; // 30 days
  });

  describe("1. Channel Opening & Collateral Escrow", function () {
    it("should open and fund a channel with Native ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");

      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        ethers.ZeroAddress,
        depositAmount,
        defaultExpiration,
        DISPUTE_PERIOD,
        { value: depositAmount }
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Filter event
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      expect(event).to.not.be.undefined;
      const channelId = event.args[0];

      const channel = await vault.getChannel(channelId);
      expect(channel.payer).to.equal(payer.address);
      expect(channel.recipient).to.equal(merchant.address);
      expect(channel.token).to.equal(ethers.ZeroAddress);
      expect(channel.totalDeposit).to.equal(depositAmount);
      expect(channel.settledAmount).to.equal(0);
      expect(channel.status).to.equal(1); // ChannelStatus.OPEN
    });

    it("should open and fund a channel with ERC-20 (MockUSDC)", async function () {
      const depositAmount = ethers.parseUnits("50", 6); // 50 USDC

      // Mint to payer and approve vault
      await mockUSDC.mint(payer.address, depositAmount);
      await mockUSDC.connect(payer).approve(await vault.getAddress(), depositAmount);

      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        await mockUSDC.getAddress(),
        depositAmount,
        defaultExpiration,
        DISPUTE_PERIOD
      );

      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      const channelId = event.args[0];

      const channel = await vault.getChannel(channelId);
      expect(channel.totalDeposit).to.equal(depositAmount);
      expect(await mockUSDC.balanceOf(await vault.getAddress())).to.equal(depositAmount);
    });

    it("should reject channel creation with disputePeriod below minimum", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const invalidDispute = 3600; // 1 hour (less than 24h)

      await expect(
        vault.connect(payer).openChannel(
          merchant.address,
          ethers.ZeroAddress,
          depositAmount,
          defaultExpiration,
          invalidDispute,
          { value: depositAmount }
        )
      ).to.be.revertedWithCustomError(vault, "InvalidDisputePeriod");
    });
  });

  describe("2. Top-Up Channel", function () {
    it("should allow payer to add funds to an open channel", async function () {
      const initialDeposit = ethers.parseEther("1.0");
      const topUpAmount = ethers.parseEther("0.5");

      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        ethers.ZeroAddress,
        initialDeposit,
        defaultExpiration,
        DISPUTE_PERIOD,
        { value: initialDeposit }
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      const channelId = event.args[0];

      await vault.connect(payer).topUpChannel(channelId, topUpAmount, { value: topUpAmount });

      const channel = await vault.getChannel(channelId);
      expect(channel.totalDeposit).to.equal(initialDeposit + topUpAmount);
    });
  });

  describe("3. EIP-712 Voucher Settlement", function () {
    let channelId: string;
    const depositAmount = ethers.parseEther("5.0");

    beforeEach(async function () {
      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        ethers.ZeroAddress,
        depositAmount,
        defaultExpiration,
        DISPUTE_PERIOD,
        { value: depositAmount }
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      channelId = event.args[0];
    });

    async function createVoucherSignature(
      signer: HardhatEthersSigner,
      cumulativeAmount: bigint,
      nonce: number,
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
        payer: payer.address,
        recipient: merchant.address,
        cumulativeAmount,
        nonce,
        validUntil,
      };

      return signer.signTypedData(domain, types, value);
    }

    it("should verify valid voucher and transfer net delta to merchant", async function () {
      const cumulativeAmount = ethers.parseEther("0.25");
      const nonce = 1;
      const validUntil = defaultExpiration;

      const signature = await createVoucherSignature(payer, cumulativeAmount, nonce, validUntil);

      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);

      await vault.connect(merchant).settleClaim(
        channelId,
        cumulativeAmount,
        nonce,
        validUntil,
        signature
      );

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const channel = await vault.getChannel(channelId);

      expect(channel.settledAmount).to.equal(cumulativeAmount);
      // Merchant received delta (approx accounting for gas if merchant was sender, or exact if caller was relayer)
      expect(merchantBalanceAfter).to.be.gt(merchantBalanceBefore);
    });

    it("should reject tampered or forged voucher signature", async function () {
      const cumulativeAmount = ethers.parseEther("0.25");
      const nonce = 1;
      const validUntil = defaultExpiration;

      // Signed by stranger instead of payer
      const signature = await createVoucherSignature(stranger, cumulativeAmount, nonce, validUntil);

      await expect(
        vault.connect(merchant).settleClaim(
          channelId,
          cumulativeAmount,
          nonce,
          validUntil,
          signature
        )
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("should reject non-monotonic cumulative amount", async function () {
      const cumulativeAmount1 = ethers.parseEther("1.0");
      const sig1 = await createVoucherSignature(payer, cumulativeAmount1, 1, defaultExpiration);
      await vault.connect(merchant).settleClaim(channelId, cumulativeAmount1, 1, defaultExpiration, sig1);

      // Attempt to submit smaller or equal amount
      const cumulativeAmount2 = ethers.parseEther("0.8");
      const sig2 = await createVoucherSignature(payer, cumulativeAmount2, 2, defaultExpiration);

      await expect(
        vault.connect(merchant).settleClaim(channelId, cumulativeAmount2, 2, defaultExpiration, sig2)
      ).to.be.revertedWithCustomError(vault, "CumulativeAmountTooLow");
    });
  });

  describe("4. Cooperative Close", function () {
    it("should close channel and distribute funds with mutual signatures", async function () {
      const depositAmount = ethers.parseEther("2.0");
      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        ethers.ZeroAddress,
        depositAmount,
        defaultExpiration,
        DISPUTE_PERIOD,
        { value: depositAmount }
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      const channelId = event.args[0];

      const finalAmount = ethers.parseEther("0.75");

      const domain = {
        name: "Web3MicroPayVault",
        version: "1",
        chainId: chainId,
        verifyingContract: await vault.getAddress(),
      };

      const types = {
        CooperativeClose: [
          { name: "channelId", type: "bytes32" },
          { name: "finalAmount", type: "uint256" },
        ],
      };

      const value = { channelId, finalAmount };

      const payerSig = await payer.signTypedData(domain, types, value);
      const recipientSig = await merchant.signTypedData(domain, types, value);

      await vault.connect(payer).closeChannelCooperative(
        channelId,
        finalAmount,
        payerSig,
        recipientSig
      );

      const channel = await vault.getChannel(channelId);
      expect(channel.status).to.equal(3); // ChannelStatus.CLOSED
      expect(channel.settledAmount).to.equal(finalAmount);
    });
  });

  describe("5. Unilateral Dispute & Finalization", function () {
    it("should initiate dispute window and finalize after 24h countdown", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const tx = await vault.connect(payer).openChannel(
        merchant.address,
        ethers.ZeroAddress,
        depositAmount,
        defaultExpiration,
        DISPUTE_PERIOD,
        { value: depositAmount }
      );
      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ChannelOpened"
      ) as any;
      const channelId = event.args[0];

      // Payer initiates dispute
      await vault.connect(payer).initiateChannelClose(channelId);
      let channel = await vault.getChannel(channelId);
      expect(channel.status).to.equal(2); // ChannelStatus.DISPUTED

      // Attempt to finalize immediately should revert
      await expect(
        vault.connect(payer).finalizeChannelClose(channelId)
      ).to.be.revertedWithCustomError(vault, "DisputeWindowNotElapsed");

      // Advance time past 24 hours
      await time.increase(DISPUTE_PERIOD + 1);

      // Finalize should now succeed and refund payer
      await vault.connect(payer).finalizeChannelClose(channelId);
      channel = await vault.getChannel(channelId);
      expect(channel.status).to.equal(3); // ChannelStatus.CLOSED
    });
  });
});
