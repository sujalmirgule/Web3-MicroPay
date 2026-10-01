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


  const deploymentMetadata = {
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    vaultAddress,
    usdcAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
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
