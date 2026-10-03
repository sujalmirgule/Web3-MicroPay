import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy MockUSDC
  const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // Deploy MicroPayVault
  const MicroPayVaultFactory = await ethers.getContractFactory("MicroPayVault");
  const vault = await MicroPayVaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("MicroPayVault deployed to:", vaultAddress);

  // Export ABIs and Addresses to shared sub-workspace
  const sharedAbisDir = path.resolve(__dirname, "../../shared/src/abis");
  if (!fs.existsSync(sharedAbisDir)) {
    fs.mkdirSync(sharedAbisDir, { recursive: true });
  }

  const vaultArtifact = await artifacts.readArtifact("MicroPayVault");
  fs.writeFileSync(
    path.join(sharedAbisDir, "MicroPayVault.json"),
    JSON.stringify(vaultArtifact, null, 2)
  );


  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  let explorerBase = "";
  if (chainId === "11155111") explorerBase = "https://sepolia.etherscan.io";
  else if (chainId === "84532") explorerBase = "https://sepolia.basescan.org";
  else if (chainId === "421614") explorerBase = "https://sepolia.arbiscan.io";
  else if (chainId === "80002") explorerBase = "https://amoy.polygonscan.com";

  if (explorerBase) {
    console.log(`\n=== BLOCK EXPLORER LINKS ===`);
    console.log(`MicroPayVault: ${explorerBase}/address/${vaultAddress}`);
    console.log(`MockUSDC:      ${explorerBase}/address/${usdcAddress}`);
    console.log(`Deployer:      ${explorerBase}/address/${deployer.address}\n`);
  }

  const deploymentMetadata = {
    chainId,
    vaultAddress,
    usdcAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    explorerUrl: explorerBase ? `${explorerBase}/address/${vaultAddress}` : undefined,
  };

  fs.writeFileSync(
    path.join(sharedAbisDir, "deployment.json"),
    JSON.stringify(deploymentMetadata, null, 2)
  );

  console.log("Contract artifacts and deployment metadata exported to /shared/src/abis/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
