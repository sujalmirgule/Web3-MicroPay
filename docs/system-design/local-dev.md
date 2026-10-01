# Local Development Architecture & Environment Specification

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Host Environment:** Windows 11 | PowerShell | Node.js v24.14.0 | npm 11.9.0 | Local Hardhat & DB

---

## 1. Local Development Topology

```text
[Developer Workstation (Windows 11 / PowerShell)]
   │
   ├── [Local Blockchain Node] ───── Hardhat / Anvil @ http://127.0.0.1:8545 (Chain ID 31337)
   │
   ├── [Local Data Tier] ────────── PostgreSQL @ 127.0.0.1:5432 & Redis @ 127.0.0.1:6379
   │
   ├── [Backend API & Indexer] ──── Node.js v24 @ http://localhost:4000
   │
   └── [Frontend Web3 App] ──────── Vite Dev Server @ http://localhost:3000
```

---

## 2. Step-by-Step Local Setup & Execution Guide

### Step 1: Clone & Install Dependencies (Project-Local)
```powershell
git clone https://github.com/sujalmirgule/Web3-MicroPay.git
cd "Web3 MicroPay"
npm install
```

### Step 2: Environment Configuration
```powershell
cp .env.example .env
```

### Step 3: Start Local Blockchain Node
```powershell
npm run node --workspace=contracts
# Spawns local node at http://127.0.0.1:8545 with 20 pre-funded test accounts (10,000 ETH each)
```

### Step 4: Deploy Contracts & Seed Mock Tokens
```powershell
npm run deploy:local --workspace=contracts
# Deploys MicroPayVault.sol and MockUSDC.sol
# Automatically exports ABI artifacts and addresses to shared/src/abis/
```

### Step 5: Run Database Migrations & Seed
```powershell
npm run db:migrate --workspace=backend
npm run db:seed --workspace=backend
# Creates tables, generates test merchant profile, and inserts mock channel
```

### Step 6: Start Backend API & Indexer
```powershell
npm run dev --workspace=backend
# Starts API server on port 4000 and WebSocket indexer listening to 127.0.0.1:8545
```

### Step 7: Start Frontend Web3 Client
```powershell
npm run dev --workspace=frontend
# Launches React / Vite client on http://localhost:3000
```

---

## 3. Pre-Funded Test Accounts (Local Hardhat Node)

| Account Index | Address | Private Key (LOCAL ONLY - NEVER USE ON MAINNET) | Role |
| :---: | :--- | :--- | :--- |
| **#0** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Platform Relayer / Operator |
| **#1** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Test Payer (User Alice) |
| **#2** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b93308f477e1f5bfa5e2bb033704744379083ac6e0770da1e35` | Test Merchant (Bob Publisher) |

---

## 4. Definitive Environment Specification (`.env.example`)

```bash
# SYSTEM CONFIG
NODE_ENV=development
PORT=4000
HOST=localhost
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000

# AUTHENTICATION
JWT_SECRET=replace_with_secure_random_64_char_dev_secret_key
SIWE_DOMAIN=localhost:3000

# DATABASE & CACHE
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/web3_micropay_dev
REDIS_URL=redis://127.0.0.1:6379

# BLOCKCHAIN & CONTRACTS
CHAIN_ID=31337
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_WS_RPC_URL=ws://127.0.0.1:8545
MICROPAY_VAULT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
TOKEN_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 # Mock USDC
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# AI ADVISORY SUBSYSTEM
AI_SERVICE_ENABLED=true
AI_PROVIDER=google-gemini
AI_API_KEY=your_gemini_api_key_here
AI_MODEL_NAME=gemini-1.5-flash

# NOTIFICATIONS
WEBHOOK_SIGNING_SECRET=whsec_local_dev_test_secret_32char
```
