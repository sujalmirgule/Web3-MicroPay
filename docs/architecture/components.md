# Component Architecture & Subsystem Specification

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Decomposition of System Components, Interfaces, and Responsibilities

---

## 1. High-Level Component Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        FE_APP["Web3 Client Application (React / Vite)"]
        WALLET["Browser Web3 Wallet (MetaMask/Rabby)"]
        FE_APP <--> WALLET
    end

    subgraph "API & Ingestion Gateway"
        GW["API Gateway & Reverse Proxy"]
        AUTH["Auth Service (SIWE & JWT)"]
        GW --> AUTH
    end

    subgraph "Core Backend Services"
        VOUCHER_SRV["Voucher Verification & Ledger Service"]
        SETTLE_WORKER["Settlement & Relayer Worker"]
        INDEXER["Blockchain Event Indexer"]
        NOTIF_SRV["Notification & Webhook Engine"]
    end

    subgraph "Data & State Storage"
        DB[("PostgreSQL (Transactional Store)")]
        CACHE[("Redis (Channel Nonces & Ephemeral States)")]
    end

    subgraph "AI & Intelligence Layer"
        AI_GATEWAY["AI Advisory Gateway"]
        FRAUD_ENGINE["Anomaly & Velocity Detection"]
        GAS_OPTIMIZER["Gas Price Prediction & Batch Scheduler"]
        AI_GATEWAY --> FRAUD_ENGINE
        AI_GATEWAY --> GAS_OPTIMIZER
    end

    subgraph "On-Chain Layer"
        RPC_NODE["EVM RPC Provider Pool (Primary / Fallback)"]
        CONTRACT["MicroPay Channel Vault Contract"]
        RPC_NODE <--> CONTRACT
    end

    FE_APP -->|"HTTP / WS (Signed Vouchers)"| GW
    GW --> VOUCHER_SRV
    VOUCHER_SRV <--> DB
    VOUCHER_SRV <--> CACHE
    VOUCHER_SRV -.->|"Risk Score Query"| AI_GATEWAY

    SETTLE_WORKER <--> DB
    SETTLE_WORKER -.->|"Optimal Window Query"| GAS_OPTIMIZER
    SETTLE_WORKER -->|"Submit Claim Tx"| RPC_NODE

    INDEXER <--|"Subscribe to Events"| RPC_NODE
    INDEXER -->|"Update Channel Status"| DB
    INDEXER -->|"Trigger Payout Notification"| NOTIF_SRV

    NOTIF_SRV -->|"Webhooks / WebSockets"| FE_APP
```

---

## 2. Component Specifications

### 2.1 Web3 Client Application (`/frontend`)
- **Technology Candidates:** React 18 / Vite, Viem / Wagmi, Tailwind / Vanilla CSS.
- **Responsibilities:**
  - Facilitates non-custodial wallet connection (EIP-1193).
  - Guides user through initial on-chain deposit transaction to fund channel.
  - Generates and signs EIP-712 typed micropayment vouchers client-side (zero gas).
  - Streams signed vouchers over HTTP/WebSocket to backend/merchant service.
  - Displays real-time spending balance, active channels, and merchant payout analytics.
- **Security Boundary:** Never stores user private keys; all cryptographic signing occurs exclusively within user's wallet extension or hardware device.

### 2.2 API Gateway & Voucher Ledger Service (`/backend`)
- **Technology Candidates:** Node.js (v24), Fastify or Express, TypeScript.
- **Responsibilities:**
  - Authenticates users via SIWE (EIP-4361).
  - Verifies EIP-712 ECDSA signature of incoming vouchers against deposited channel balance.
  - Maintains monotonically increasing voucher sequence/amount to prevent double-spending and out-of-order claims.
  - Updates off-chain channel balances in sub-50ms latency.
  - Invokes AI advisory engine asynchronously for risk scoring.
- **Failure Containment:** If database or cache fails, reject voucher ingestion to prevent unbacked service delivery.

### 2.3 Settlement & Relayer Worker (`/backend/relayer`)
- **Technology Candidates:** Node.js, Viem / Ethers, BullMQ / Redis or DB task queue.
- **Responsibilities:**
  - Evaluates pending merchant voucher claims against gas costs.
  - Batches multiple claims into a single on-chain transaction or executes cumulative channel settlement.
  - Submits signed transactions to the blockchain via relayer key stored in HSM/KMS.
  - Monitors transaction mempool status, bumps gas (EIP-1559 `maxPriorityFeePerGas`) if stalled.

### 2.4 Blockchain Event Indexer (`/backend/indexer`)
- **Technology Candidates:** Viem WebSocket subscription / Polling worker, PostgreSQL.
- **Responsibilities:**
  - Subscribes to contract events (`ChannelOpened`, `ChannelToppedUp`, `ChannelSettled`, `ChannelClosed`, `DisputeInitiated`).
  - Handles chain reorganizations (reorgs) with block confirmation depth (e.g., 6–12 confirmations depending on L2).
  - Synchronizes on-chain state to the transactional database to guarantee ultimate consistency.

### 2.5 Smart Contract Channel Vault (`/contracts`)
- **Technology Candidates:** Solidity 0.8.24+, OpenZeppelin Contracts (EIP712, ECDSA, ReentrancyGuard).
- **Responsibilities:**
  - Holds collateral tokens/ETH in escrow.
  - Enforces `settleClaim(channelId, cumulativeAmount, signature, recipient)` with cryptographic verification.
  - Supports cooperative closure (instant payout when both parties sign) and uncooperative closure (time-locked dispute period, e.g., 24h).
  - Emits canonical on-chain audit events.

### 2.6 AI Advisory Subsystem (`/backend/ai`)
- **Technology Candidates:** Google Gemini API / Sandboxed local heuristics.
- **Responsibilities:**
  - **Velocity / Anomaly Detection:** Flags accounts generating anomalous voucher bursts or irregular counterparty patterns.
  - **Gas Timing Optimization:** Forecasts low-fee block windows for scheduling non-urgent batch settlements.
  - **Natural Language Audit:** Generates readable reconciliation reports for merchants.
- **Strict Boundary:** The AI subsystem has **read-only access** to anonymized transaction metadata. It cannot sign transactions, approve payouts, or modify database states.
