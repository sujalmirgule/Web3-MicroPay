# Actor & Role Model Specification

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Definition of Human & System Actors, Access Matrices, and Behavioral Boundaries

---

## 1. Human Actors

### 1.1 User / Payer (Sender)
- **Role:** End-user or consumer consuming digital services (articles, streaming, API tokens, tips).
- **Responsibilities:** Deposits collateral into smart contract; signs off-chain micropayment vouchers (EIP-712); requests channel closure when finished.
- **Permissions & Access:**
  - *Can Access:* Own account profile, own channel balances, own emitted vouchers, own transaction history.
  - *Can Perform:* Deposit funds (on-chain), sign micro-vouchers (local wallet), initiate channel close (on-chain), view balance.
  - *Cannot Perform:* Access merchant secret keys, spend beyond deposited channel capacity, forge signatures, alter smart contract logic.
- **Authentication:** SIWE (Sign-In with Ethereum, EIP-4361) cryptographic session.
- **Blockchain Interaction:** Yes (Deposit, Channel Close/Withdrawal via personal Web3 wallet).

### 1.2 Merchant / Receiver (Service Provider)
- **Role:** Content publisher, API provider, or creator accepting high-frequency micropayments.
- **Responsibilities:** Validates incoming vouchers; fulfills service/content upon valid voucher receipt; submits cumulative voucher claims for on-chain settlement.
- **Permissions & Access:**
  - *Can Access:* Own incoming voucher streams, cumulative balances, webhook configurations, API keys, payout history.
  - *Can Perform:* Validate voucher signatures, configure webhooks, trigger batch settlement, query earnings.
  - *Cannot Perform:* Claim more funds than signed by the payer; forge payer signatures; alter payer escrow balances.
- **Authentication:** API Key (machine-to-machine) or SIWE (web portal).
- **Blockchain Interaction:** Optional direct claim (can claim directly on-chain or delegate to the Relayer service).

### 1.3 Platform Administrator
- **Role:** Operations and security governance team.
- **Responsibilities:** Monitors system health, reviews AI anomaly alerts, configures supported networks/tokens, inspects audit logs.
- **Permissions & Access:**
  - *Can Access:* System metrics, aggregated transaction volume, error logs, AI risk flags, contract paused states.
  - *Can Perform:* Pause contracts in emergency (via multi-sig), adjust fee parameters, update relayer gas policies.
  - *Cannot Perform:* Seize user escrow funds, forge vouchers, sign transactions on behalf of users or merchants.
- **Authentication:** Multi-factor authentication (MFA) + hardware security key.
- **Blockchain Interaction:** Yes (Admin multi-sig governance operations).

---

## 2. System Actors

| System Actor | Role & Responsibilities | Auth Required? | Blockchain Interaction? | Scope of Authority |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Client** | Serves user interface; requests wallet signatures; transmits signed vouchers. | SIWE Session Token | Yes (via User's EIP-1193 Provider) | User sandbox; no private keys held. |
| **Backend API Gateway** | Verifies voucher math & signatures; tracks nonces; manages off-chain ledgers. | Internal Service / JWT | No (delegates to Relayer/RPC) | Validates business rules deterministically. |
| **Relayer / Settlement Worker** | Batches claims; submits aggregated settlements to blockchain; monitors gas prices. | Machine Secret / KMS | Yes (Operator wallet via RPC) | Can only submit valid counter-signed claims. |
| **Event Indexer** | Listens to smart contract events via WebSocket RPC; updates database state. | RPC Provider Key | Read-only (RPC event listener) | Read-only sync of on-chain state to DB. |
| **AI Advisory Engine** | Analyzes voucher patterns for velocity fraud, predicts optimal settlement gas windows. | Internal Service Token | None | Advisory only. Zero write permissions to state. |
| **Notification Engine** | Sends webhooks to merchants and WebSocket messages to clients. | Internal Service Token | None | Read-only access to event queue. |
| **Smart Contract Vault** | Custodies funds in escrow; verifies ECDSA/EIP-712 signatures; pays claims; manages timeouts. | On-Chain EVM State | Native EVM Contract | Deterministic execution of contract code. |

---

## 3. Permissions & Access Control Matrix (RBAC)

| Resource / Action | Payer (Sender) | Merchant (Receiver) | Administrator | Relayer Service | AI Engine |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Open Escrow Channel (Deposit) | **ALLOW** | DENY | DENY | DENY | DENY |
| Sign EIP-712 Voucher | **ALLOW** | DENY | DENY | DENY | DENY |
| Validate Voucher | ALLOW | **ALLOW** | ALLOW | **ALLOW** | READ |
| Submit Cumulative Settlement Claim | DENY | **ALLOW** | DENY | **ALLOW** | DENY |
| Initiate Unilateral Close / Dispute | **ALLOW** | **ALLOW** | DENY | DENY | DENY |
| Withdraw Expired Channel Funds | **ALLOW** | DENY | DENY | DENY | DENY |
| Configure Webhooks & API Keys | DENY | **ALLOW** | ALLOW | DENY | DENY |
| Emergency Contract Pause (Multi-sig) | DENY | DENY | **ALLOW** | DENY | DENY |
| Access Raw Database | DENY | DENY | RESTRICTED | INTERNAL | DENY |
