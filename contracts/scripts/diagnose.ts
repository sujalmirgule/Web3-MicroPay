import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("MicroPayVault", "0x7BD8202051Ed9499489e7b9992b4d7D62a3A3C86", signer);
  const chId = "0x475d0c5bf141bc958bfd3ba7152c3ebcc18509b2e1317f4f0ded3b2661470c14";
  const ch = await vault.channels(chId);
  console.log("Channel details:", {
    payer: ch.payer,
    recipient: ch.recipient,
    token: ch.token,
    totalDeposit: ch.totalDeposit.toString(),
    settledAmount: ch.settledAmount.toString(),
    status: ch.status.toString(),
    expiration: ch.expiration.toString(),
  });

  const onChainDomainSep = await vault.DOMAIN_SEPARATOR();
  console.log("On-chain DOMAIN_SEPARATOR:", onChainDomainSep);

  const network = await ethers.provider.getNetwork();
  const domain = {
    name: "Web3MicroPayVault",
    version: "1",
    chainId: network.chainId,
    verifyingContract: "0x7BD8202051Ed9499489e7b9992b4d7D62a3A3C86",
  };

  const ethersDomainSep = ethers.TypedDataEncoder.hashDomain(domain);
  console.log("Ethers DOMAIN_SEPARATOR:  ", ethersDomainSep);
  console.log("Domain separators match:  ", onChainDomainSep === ethersDomainSep);

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
    channelId: chId,
    payer: ch.payer,
    recipient: ch.recipient,
    cumulativeAmount: ethers.parseEther("0.0005"),
    nonce: 1,
    validUntil: Number(ch.expiration),
  };

  const structHash = ethers.TypedDataEncoder.from(types).hash(value);
  console.log("Ethers structHash:", structHash);

  const sig = await signer.signTypedData(domain, types, value);
  console.log("Recovered address:", ethers.verifyTypedData(domain, types, value, sig));
  console.log("Expected payer:   ", ch.payer);

  try {
    await vault.settleClaim.staticCall(
      chId,
      ethers.parseEther("0.0005"),
      1,
      Number(ch.expiration),
      sig
    );
    console.log("STATIC CALL SUCCEEDED!");
  } catch (err: any) {
    console.error("STATIC CALL FAILED error data:", err.data, err.error?.data);
    if (err.data) {
      try {
        console.log("Decoded custom error:", vault.interface.parseError(err.data));
      } catch (decodeErr) {
        console.log("Could not decode error with vault interface:", decodeErr);
      }
    }
  }
}

main().catch(console.error);
