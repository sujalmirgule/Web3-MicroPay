# System Module Decomposition & Repository Architecture

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** Granular Module Specifications & Monorepo Package Governance

---

## 1. Logical Module Decomposition (16 Core Modules)

### Module 1: Frontend Web3 Client (`MOD-FE`)
- **Responsibility:** Web3 wallet connection (MetaMask, Coinbase), channel deposit wizard, local EIP-712 micro-voucher generation, real-time balance dashboard.
- **Inputs:** User clicks, wallet events, REST API queries.
- **Outputs:** Signed EIP-712 vouchers, on-chain deposit transactions, UI state.
- **Dependencies:** `MOD-API`, `MOD-SHARED`, Wagmi / Viem.
- **Owned Data:** Ephemeral client state, active wallet address, local voucher stream cache.
- **External Interfaces:** HTTP REST, WebSocket, EIP-1193 Wallet Provider.
- **Failure Modes:** Wallet rejection, network disconnection.
- **Security Requirements:** Zero storage of private keys; all signatures generated in user's secure wallet context.

### Module 2: Backend API Gateway (`MOD-API`)
- **Responsibility:** Inbound HTTP reverse proxy, routing, payload parsing, rate limiting, and CORS enforcement.
- **Inputs:** Inbound HTTP requests.
- **Outputs:** HTTP responses, routed service calls.
- **Dependencies:** `MOD-AUTH`, `MOD-REDIS`, `MOD-VOUCHER`.
- **Owned Data:** None (stateless).
- **External Interfaces:** Public REST API (`/v1/*`).
- **Failure Modes:** Process crash, overload (handled by horizontal replica auto-scaling).
- **Security Requirements:** Request size caps (max 1MB), strict CORS, security headers (Helmet).

### Module 3: Authentication & Session (`MOD-AUTH`)
- **Responsibility:** Nonce issuance, SIWE (EIP-4361) signature verification, JWT session token generation, API key verification.
- **Inputs:** Wallet addresses, SIWE messages, cryptographic signatures, API keys.
- **Outputs:** JWT access tokens, verified session claims.
- **Dependencies:** `MOD-REDIS`, `MOD-DB`, `MOD-SHARED`.
- **Owned Data:** Ephemeral SIWE nonces, API key hashes.
- **External Interfaces:** `/auth/nonce`, `/auth/verify-siwe`.
- **Failure Modes:** Redis failure (falls back to ephemeral DB nonce check).
- **Security Requirements:** 5-minute nonce TTL, replay prevention, SHA-256 hashed API keys.

### Module 4: User & Wallet Management (`MOD-USER`)
- **Responsibility:** User profiles, wallet address normalization (checksumming), merchant metadata management.
- **Inputs:** Authenticated user requests.
- **Outputs:** User and merchant profile records.
- **Dependencies:** `MOD-DB`.
- **Owned Data:** `users`, `merchants` tables.
- **External Interfaces:** Internal service APIs.
- **Failure Modes:** DB constraint violations.
- **Security Requirements:** Wallet address format validation (`^0x[a-fA-F0-9]{40}$`).

### Module 5: Payment Channel Management (`MOD-CHAN`)
- **Responsibility:** Channel lifecycle state tracking, registration of on-chain opening transactions, balance calculation.
- **Inputs:** Channel registration payloads, on-chain indexer events.
- **Outputs:** Normalized channel state records.
- **Dependencies:** `MOD-DB`, `MOD-REDIS`, `MOD-INDEXER`.
- **Owned Data:** `channels` table.
- **External Interfaces:** `/channels/*`.
- **Failure Modes:** Channel not found, desynchronization with blockchain.
- **Security Requirements:** IDOR protection (caller must be payer or recipient).

### Module 6: Voucher Service (`MOD-VOUCHER`)
- **Responsibility:** Ingests off-chain vouchers, coordinates verification, persists valid vouchers, updates channel reserved amounts.
- **Inputs:** `MicroVoucher` payload.
- **Outputs:** Authorization confirmation, updated balance DTO.
- **Dependencies:** `MOD-VERIFY`, `MOD-DB`, `MOD-REDIS`, `MOD-AI`.
- **Owned Data:** `vouchers` table, `channel:nonce` in Redis.
- **External Interfaces:** `POST /vouchers/submit`.
- **Failure Modes:** High-concurrency lock contention (mitigated by atomic Redis Lua script).
- **Security Requirements:** Strict monotonic cumulative check and nonce validation.

### Module 7: Voucher Verification Engine (`MOD-VERIFY`)
- **Responsibility:** Cryptographic verification of EIP-712 typed signatures against channel parameters.
- **Inputs:** EIP-712 payload and signature string.
- **Outputs:** Boolean validity, recovered signer address.
- **Dependencies:** `MOD-SHARED`, Viem / Ethers cryptographic utils.
- **Owned Data:** None (pure functional deterministic engine).
- **External Interfaces:** Internal service call.
- **Failure Modes:** Invalid signature, corrupted payload.
- **Security Requirements:** Domain separator binding (`chainId`, `verifyingContract`), ECDSA malleability protection.

### Module 8: Relayer Settlement Worker (`MOD-RELAYER`)
- **Responsibility:** Aggregates cumulative vouchers, evaluates gas economics, constructs settlement transactions, submits to RPC.
- **Inputs:** Queued settlement claims.
- **Outputs:** Broadcasted on-chain settlement transactions.
- **Dependencies:** `MOD-DB`, `MOD-AI`, `MOD-CONTRACT`, AWS KMS / Local Relayer Key.
- **Owned Data:** `settlements` table, operator nonce tracker.
- **External Interfaces:** Ethereum JSON-RPC.
- **Failure Modes:** Out of gas, transaction stuck in mempool, RPC node failure.
- **Security Requirements:** Isolated worker environment; operator key holds minimal gas balance; zero export of private keys.

### Module 9: Blockchain Event Indexer (`MOD-INDEXER`)
- **Responsibility:** Subscribes to smart contract WebSocket events, validates block confirmation depth, synchronizes on-chain state to DB.
- **Inputs:** Raw blockchain event logs.
- **Outputs:** Database state mutations, Transactional Outbox records.
- **Dependencies:** `MOD-DB`, `MOD-NOTIF`, Blockchain RPC Node.
- **Owned Data:** `blockchain_sync_state` checkpoint table.
- **External Interfaces:** WebSocket RPC connection.
- **Failure Modes:** RPC disconnect, chain reorganization.
- **Security Requirements:** Enforces 6-block confirmation depth on L2 before marking channels `OPEN` or `SETTLED`.

### Module 10: Database Access Layer (`MOD-DB`)
- **Responsibility:** Relational persistence, transactional atomicity, schema migration management.
- **Inputs:** SQL queries, DTO writes.
- **Outputs:** Query result sets.
- **Dependencies:** PostgreSQL 15+.
- **Owned Data:** All persistent tables.
- **External Interfaces:** Prisma / Drizzle connection pool.
- **Failure Modes:** Connection pool exhaustion.
- **Security Requirements:** SSL encrypted connection, parameterized queries (SQL injection immunity).

### Module 11: Cache & Memory Store (`MOD-REDIS`)
- **Responsibility:** Atomic nonce validation, rate limiting, distributed mutex locks, pub/sub event distribution.
- **Inputs:** Key-value reads/writes, Lua scripts.
- **Outputs:** Cached values, lock acquisition status.
- **Dependencies:** Redis 7+.
- **Owned Data:** Ephemeral counters, nonces, session challenges.
- **External Interfaces:** Redis protocol (RESP).
- **Failure Modes:** Redis node restart.
- **Security Requirements:** Password protected, private VPC isolation.

### Module 12: AI Advisory Service (`MOD-AI`)
- **Responsibility:** Asynchronous risk scoring for voucher bursts, settlement gas window forecasting, natural-language merchant reconciliation.
- **Inputs:** Anonymized velocity metrics, gas price histories.
- **Outputs:** Risk score `[0, 100]`, gas advisory recommendations.
- **Dependencies:** Google Gemini API / Sandboxed local heuristics.
- **Owned Data:** `ai_evaluations` table.
- **External Interfaces:** REST / HTTPS to Gemini API.
- **Failure Modes:** API timeout, rate limits, malformed responses.
- **Security Requirements:** Complete PII redaction; read-only data access; zero transaction-signing capabilities.

### Module 13: Notification & Webhook Engine (`MOD-NOTIF`)
- **Responsibility:** Dispatches real-time WebSocket updates to users and HMAC-SHA256 signed webhooks to merchant servers.
- **Inputs:** Outbox event records.
- **Outputs:** HTTP POST webhook dispatches, WebSocket packets.
- **Dependencies:** `MOD-DB`.
- **Owned Data:** `notification_outbox`, `webhook_configs` tables.
- **External Interfaces:** External merchant webhook URLs.
- **Failure Modes:** Merchant endpoint down (handled via exponential backoff queue and DLQ).
- **Security Requirements:** HMAC-SHA256 signature header (`X-MicroPay-Signature`), timestamp header (`X-MicroPay-Timestamp`).

### Module 14: Smart Contract Vault (`MOD-CONTRACT`)
- **Responsibility:** Custodies deposited collateral on-chain, enforces cryptographic claim settlement, manages 24h dispute window and refunds.
- **Inputs:** On-chain transactions (`openChannel`, `settleClaim`, `closeChannel`).
- **Outputs:** State updates, token transfers, canonical event emissions.
- **Dependencies:** OpenZeppelin Contracts, EVM Layer-2 runtime.
- **Owned Data:** Contract internal storage (`channels`, nonces).
- **External Interfaces:** EVM ABI.
- **Failure Modes:** EVM reverts with custom errors.
- **Security Requirements:** Reentrancy guard, CEI pattern, EIP-712 domain separation.

### Module 15: Administration & Governance (`MOD-ADMIN`)
- **Responsibility:** Multi-sig contract pausing, fee parameter configuration, operational metrics dashboard.
- **Inputs:** Admin transactions, authenticated dashboard requests.
- **Outputs:** System configuration changes.
- **Dependencies:** `MOD-DB`, Gnosis Safe Multi-Sig.
- **Owned Data:** `audit_logs` table.
- **External Interfaces:** `/admin/*`.
- **Failure Modes:** Authorization rejection.
- **Security Requirements:** Multi-sig 3-of-5 requirement for smart contract controls; MFA for dashboard access.

### Module 16: Observability & Telemetry (`MOD-OBS`)
- **Responsibility:** Centralized structured logging (Pino), Prometheus metrics, health checks, error alerting.
- **Inputs:** Service log streams, runtime telemetry.
- **Outputs:** Metric counters, JSON log streams, PagerDuty alerts.
- **Dependencies:** Node.js runtime.
- **Owned Data:** Ephemeral metric counters.
- **External Interfaces:** `/health/liveness`, `/health/readiness`, `/metrics`.
- **Failure Modes:** Telemetry buffer overflow.
- **Security Requirements:** Strict redaction filters for passwords, private keys, and authorization headers.

---

## 2. Monorepo Package Architecture & Import Rules

```text
               ┌───────────────────────┐
               │    @web3-micropay/    │
               │        shared         │
               └───────────┬───────────┘
                           │ (Types, ABIs, Constants)
         ┌─────────────────┼─────────────────┐
         ▼                                   ▼
┌──────────────────┐               ┌──────────────────┐
│ @web3-micropay/  │               │ @web3-micropay/  │
│     backend      │               │     frontend     │
└────────┬─────────┘               └──────────────────┘
         │ (ABI consumer)
         ▼
┌──────────────────┐
│ @web3-micropay/  │
│    contracts     │
└──────────────────┘
```

### Import Governance Matrix
| Package | Allowed Imports | Strictly Forbidden Imports | Configuration Owner |
| :--- | :--- | :--- | :--- |
| **`shared`** | None (pure types, interfaces, constants) | Any dependency on `backend`, `frontend`, or `contracts` | Root `tsconfig.base.json` |
| **`contracts`** | OpenZeppelin, Hardhat, Viem | Node backend packages, frontend packages | `contracts/hardhat.config.ts` |
| **`backend`** | `shared`, Fastify, Prisma, Viem, Redis, Pino | Any direct file from `frontend` or `contracts/contracts/*` | `backend/src/config/` + `.env` |
| **`frontend`** | `shared`, React, Vite, Wagmi, Viem | Any direct file from `backend` or database code | `frontend/vite.config.ts` |

*Rule:* Zero circular dependencies across packages. All contract artifacts must pass through `shared/src/abis` before consumption by backend or frontend.
