import { ethers } from "hardhat";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  console.log("=== ETHEREUM SEPOLIA LIVE SMOKE TEST ===");

  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  console.log("1. Connected Signer:", signer.address);
  console.log("2. Network Chain ID:", network.chainId.toString());
  const balance = await provider.getBalance(signer.address);
  console.log("3. Signer Balance:", ethers.formatEther(balance), "ETH");

  const vaultAddress = process.env.MICROPAY_VAULT_ADDRESS;
  if (!vaultAddress) {
    throw new Error("MICROPAY_VAULT_ADDRESS is not set in .env");
  }
  console.log("4. Target MicroPayVault:", vaultAddress);

  const vault = await ethers.getContractAt("MicroPayVault", vaultAddress, signer);

  // Merchant address (Recipient) - must be a valid EOA on Sepolia capable of receiving native ETH
  const recipient = "0x31306722b7Eb79Ce612333460FadE9E923CBb3aF";
  const depositWei = ethers.parseEther("0.001");
  const disputePeriod = 86400; // 24 hours
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 86400 * 7 + disputePeriod + 3600;

  console.log("\n--- TEST 2: Open Payment Channel on Sepolia ---");
  console.log("Recipient:", recipient);
  console.log("Deposit:", ethers.formatEther(depositWei), "ETH");

  const openTx = await vault.openChannel(
    recipient,
    ethers.ZeroAddress,
    depositWei,
    expiration,
    disputePeriod,
    { value: depositWei }
  );

  console.log("openChannel tx broadcasted:", openTx.hash);
  const openReceipt = await openTx.wait(1);
  if (!openReceipt || openReceipt.status !== 1) {
    throw new Error("openChannel failed or reverted");
  }
  console.log("openChannel CONFIRMED in block:", openReceipt.blockNumber);

  // Extract channelId from ChannelOpened event
  let channelId: string | null = null;
  for (const log of openReceipt.logs) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed && parsed.name === "ChannelOpened") {
        channelId = parsed.args[0];
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!channelId) {
    throw new Error("Could not parse channelId from openChannel receipt logs");
  }
  console.log("Channel ID successfully created:", channelId);

  // Verify on-chain state
  const channelData = await vault.channels(channelId);
  console.log("On-chain Total Deposit:", ethers.formatEther(channelData.totalDeposit), "ETH");
  console.log("On-chain Settled Amount:", ethers.formatEther(channelData.settledAmount), "ETH");
  console.log("On-chain Channel Status:", channelData.status.toString(), "(1 = OPEN)");

  console.log("\n--- TEST 3: Generate and Sign EIP-712 Micro-Voucher ---");
  const cumulativeAmountWei = ethers.parseEther("0.0005");
  const voucherNonce = 1;
  const voucherValidUntil = expiration;

  const domain = {
    name: "Web3MicroPayVault",
    version: "1",
    chainId: network.chainId,
    verifyingContract: vaultAddress,
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
    recipient,
    cumulativeAmount: cumulativeAmountWei,
    nonce: voucherNonce,
    validUntil: voucherValidUntil,
  };

  const signature = await signer.signTypedData(domain, types, value);
  console.log("Voucher signed by payer:", signer.address);
  console.log("Voucher Nonce:", voucherNonce);
  console.log("Cumulative Amount:", ethers.formatEther(cumulativeAmountWei), "ETH");
  console.log("EIP-712 Signature:", signature);

  console.log("\n--- TEST 4 & 5: Settle Claim Directly on Ethereum Sepolia ---");
  const settleTx = await vault.settleClaim(
    channelId,
    cumulativeAmountWei,
    voucherNonce,
    voucherValidUntil,
    signature
  );

  console.log("settleClaim tx broadcasted:", settleTx.hash);
  const settleReceipt = await settleTx.wait(1);
  if (!settleReceipt || settleReceipt.status !== 1) {
    throw new Error("settleClaim failed or reverted");
  }
  console.log("settleClaim CONFIRMED in block:", settleReceipt.blockNumber);

  console.log("\n--- TEST 6: Verify Final On-Chain Channel State ---");
  const updatedChannel = await vault.channels(channelId);
  console.log("Updated Settled Amount:", ethers.formatEther(updatedChannel.settledAmount), "ETH");

  if (updatedChannel.settledAmount.toString() !== cumulativeAmountWei.toString()) {
    throw new Error("Settled amount mismatch on-chain!");
  }

  console.log("\n=== ALL REAL SEPOLIA SMOKE TESTS PASSED WITH 100% SUCCESS! ===");
  console.log("Etherscan Channel Creation Link: https://sepolia.etherscan.io/tx/" + openTx.hash);
  console.log("Etherscan Settlement Link:       https://sepolia.etherscan.io/tx/" + settleTx.hash);
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
