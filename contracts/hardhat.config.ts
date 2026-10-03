import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const accounts = DEPLOYER_KEY && DEPLOYER_KEY.startsWith("0x") ? [DEPLOYER_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
    arbitrum_sepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts,
    },
    polygon_amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

