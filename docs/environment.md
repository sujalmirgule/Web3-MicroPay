# Environment Separation & Configuration Strategy

> **Core Principle:** Strict isolation between Development, Testing, Staging, and Production tiers. Zero bleed of credentials or state between environments.

---

## 1. Environment Tiers

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Development   │ ───►  │     Testing     │ ───►  │     Staging     │ ───►  │   Production    │
│ (Local Machine) │       │   (Automated)   │       │ (Testnet/Cloud) │       │ (Mainnet/Cloud) │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 1. Development (Local)
- **Scope:** Developer workstation (Windows 11 / PowerShell).
- **Blockchain:** Local Hardhat / Anvil node running at `http://127.0.0.1:8545` (Chain ID 31337).
- **Database:** Local database instance or SQLite/Postgres dev container.
- **Relayer Key:** Default Hardhat dev private keys (pre-funded test accounts only).
- **AI Service:** Sandboxed development API key with aggressive rate limits.
- **Notifications:** Mock webhook receivers or local console logger.

### 2. Testing (CI / Automated)
- **Scope:** GitHub Actions or local CI runner.
- **Blockchain:** In-memory ephemeral Hardhat / Foundry test runner.
- **Database:** Ephemeral database created and dropped per test run.
- **Secrets:** Mock environment variables injected at test runtime.
- **AI Service:** Mocked deterministic AI responses (no external API calls during unit tests).

### 3. Staging (Testnet)
- **Scope:** Public testnet (e.g., Ethereum Sepolia or Polygon Amoy) and staging server.
- **Blockchain:** Public testnet RPC (Alchemy/Infura or public node).
- **Contracts:** Deployed to testnet with verifiable source code on Etherscan/Polygonscan.
- **Database:** Managed staging cloud database (isolated credentials).
- **Relayer Key:** Dedicated staging relayer wallet funded only with testnet faucet tokens.
- **Authentication:** Testnet SIWE (Sign-In With Ethereum) session verification.

### 4. Production (Mainnet)
- **Scope:** Production Kubernetes / cloud infrastructure and EVM Mainnet.
- **Blockchain:** Highly available, multi-provider redundant RPC endpoints with fallback failover.
- **Contracts:** Production audited smart contracts deployed via Multi-Signature Safe (Gnosis Safe).
- **Database:** High-availability managed PostgreSQL with automated daily snapshots and replication.
- **Relayer Key:** Hardware Security Module (HSM) or cloud KMS-managed relayer wallet.
- **Secrets:** Vault / AWS Secrets Manager injection at runtime. Never stored on disk.

---

## 2. Configuration Matrix

| Variable Type | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| **RPC Endpoint** | Localhost (8545) | Sepolia / Amoy Testnet | Infura / Alchemy Redundant Mainnet |
| **Contract Addresses** | Deployed locally | Deployed testnet address | Audited multi-sig deployed address |
| **Relayer Private Key** | Hardhat default key | Staging faucet key | Cloud KMS / HSM isolated key |
| **Database Host** | `127.0.0.1` | Cloud Staging DB | Cloud Prod VPC DB |
| **Log Level** | `debug` | `info` | `warn` / `error` |
| **AI Fallback** | Mock heuristics | API with rate limit | API with circuit breaker & fallback |
