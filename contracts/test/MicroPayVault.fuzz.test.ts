import { expect } from "chai";
import { ethers } from "hardhat";
import { MicroPayVault } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MicroPayVault - Fuzz & Property Invariant Tests", function () {
  let vault: MicroPayVault;
  let payer: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let chainId: bigint;
  let channelId: string;

  const DISPUTE_PERIOD = 86400;
  let defaultExpiration: number;
  const initialDeposit = ethers.parseEther("100.0"); // 100 ETH deposit pool

  beforeEach(async function () {
    const [, _payer, _merchant, _attacker] = await ethers.getSigners();
    payer = _payer;
    merchant = _merchant;
    attacker = _attacker;

    const MicroPayVaultFactory = await ethers.getContractFactory("MicroPayVault");
    vault = await MicroPayVaultFactory.deploy();
    await vault.waitForDeployment();

    chainId = (await ethers.provider.getNetwork()).chainId;
    const latestBlock = await ethers.provider.getBlock("latest");
    defaultExpiration = latestBlock!.timestamp + DISPUTE_PERIOD * 30;

    // Open high-capacity test channel
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
    channelId = event.args[0];
  });

  async function signVoucher(
    signer: HardhatEthersSigner,
    cumulativeAmount: bigint,
    nonce: number,
    validUntil: number,
    customContractAddress?: string,
    customChainId?: bigint
  ) {
    const domain = {
      name: "Web3MicroPayVault",
      version: "1",
      chainId: customChainId ?? chainId,
      verifyingContract: customContractAddress ?? (await vault.getAddress()),
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

  describe("Invariant 1: settledAmount <= totalDeposit under randomized micro-claims", function () {
    it("should process 25 monotonically increasing randomized claims and never exceed deposit", async function () {
      let currentSettled = 0n;
      let nonce = 1;

      // 25 randomized iterations
      for (let i = 0; i < 25; i++) {
        // Random micro-increment between 0.1 and 1.5 ETH
        const randomWeiIncrement = ethers.parseEther((0.1 + Math.random() * 1.4).toFixed(4));
        const newCumulative = currentSettled + randomWeiIncrement;

        if (newCumulative > initialDeposit) break;

        const sig = await signVoucher(payer, newCumulative, nonce, defaultExpiration);
        await vault.connect(merchant).settleClaim(
          channelId,
          newCumulative,
          nonce,
          defaultExpiration,
          sig
        );

        const channel = await vault.getChannel(channelId);
        expect(channel.settledAmount).to.equal(newCumulative);
        expect(channel.settledAmount).to.be.lte(channel.totalDeposit);

        currentSettled = newCumulative;
        nonce++;
      }
    });
  });

  describe("Invariant 2: Cumulative settlement is strictly monotonic", function () {
    it("should reject any randomized non-monotonic claim (replays or regressive amounts)", async function () {
      const validAmount = ethers.parseEther("5.0");
      const sig1 = await signVoucher(payer, validAmount, 1, defaultExpiration);
      await vault.connect(merchant).settleClaim(channelId, validAmount, 1, defaultExpiration, sig1);

      // Fuzz 15 randomized attempts with amounts <= currentSettled
      for (let i = 0; i < 15; i++) {
        const lowerAmount = ethers.parseEther((Math.random() * 5.0).toFixed(4));
        const fakeSig = await signVoucher(payer, lowerAmount, i + 2, defaultExpiration);

        await expect(
          vault.connect(merchant).settleClaim(channelId, lowerAmount, i + 2, defaultExpiration, fakeSig)
        ).to.be.revertedWithCustomError(vault, "CumulativeAmountTooLow");
      }
    });
  });

  describe("Invariant 3: Invalid or forged signatures never mutate state", function () {
    it("should reject 20 forged signatures from non-payer keys with zero state changes", async function () {
      const channelBefore = await vault.getChannel(channelId);

      for (let i = 0; i < 20; i++) {
        const amount = ethers.parseEther((10.0 + i).toString());
        // Signed by attacker
        const forgedSig = await signVoucher(attacker, amount, i + 1, defaultExpiration);

        await expect(
          vault.connect(merchant).settleClaim(channelId, amount, i + 1, defaultExpiration, forgedSig)
        ).to.be.revertedWithCustomError(vault, "InvalidSignature");
      }

      const channelAfter = await vault.getChannel(channelId);
      expect(channelAfter.settledAmount).to.equal(channelBefore.settledAmount);
    });
  });

  describe("Invariant 4: Cross-chain and Cross-contract domain separation", function () {
    it("should reject vouchers signed for a different chain ID", async function () {
      const amount = ethers.parseEther("1.0");
      const wrongChainId = chainId + 999n;
      const crossChainSig = await signVoucher(payer, amount, 1, defaultExpiration, undefined, wrongChainId);

      await expect(
        vault.connect(merchant).settleClaim(channelId, amount, 1, defaultExpiration, crossChainSig)
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("should reject vouchers signed for a different verifying contract address", async function () {
      const amount = ethers.parseEther("1.0");
      const fakeContract = "0x000000000000000000000000000000000000dEaD";
      const crossContractSig = await signVoucher(payer, amount, 1, defaultExpiration, fakeContract);

      await expect(
        vault.connect(merchant).settleClaim(channelId, amount, 1, defaultExpiration, crossContractSig)
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });
  });
});
