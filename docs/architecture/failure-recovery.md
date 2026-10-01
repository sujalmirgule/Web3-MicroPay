# Failure & Recovery Architecture

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Resilience, Fault Tolerance, Blockchain Asynchrony, and Disaster Recovery

---

## 1. Fault Tolerance & Failure Matrix

| Component & Action | Failure State | Root Cause | System Response & Automated Recovery | User / Merchant Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Voucher Submission** | Network Timeout / HTTP 504 | Network packet drop or temporary API spike. | Client retries with identical `(channelId, nonce)`. Backend detects duplicate nonce idempotently and returns existing confirmation. | Zero double-charge. Micro-access granted immediately. |
| **Voucher Submission** | Invalid Signature Rejection | Malformed payload, wrong chain, or signature mismatch. | Request rejected immediately (HTTP 400). Error logged. Off-chain ledger remains untouched. | Client notified to re-sign or check wallet connection. |
| **Settlement Transaction** | Mempool Pending (> 5 min) | Spiking L2 gas base fees (`maxFeePerGas` too low). | Relayer mempool monitor detects stuck tx; issues replacement transaction with same nonce and +20% higher priority fee. | Settlement delay only; funds remain completely safe in escrow. |
| **Settlement Transaction** | Revert / Out of Gas | Inaccurate gas limit estimation or race condition. | Relayer flags transaction in DB, pauses automated retries for this channel, alerts engineering via PagerDuty. | Funds remain locked in contract; claim can be re-submitted. |
| **Blockchain Event Ingestion** | Missed Event Log | WebSocket connection drop during node restart. | Periodic Reconciliation Worker scans blocks from `lastSyncedBlock` every 60 seconds; detects and back-fills missed events. | Eventual consistency guaranteed within 60 seconds. |
| **Blockchain Event Ingestion** | Chain Reorganization (Reorg) | Temporary L2/L1 fork before finality. | Indexer enforces confirmation depth (6 blocks on L2, 12 on L1). State is only marked `FINALIZED` after required depth. | Eliminates phantom payment confirmations. |
| **Webhook Notification** | Merchant Endpoint Unreachable | Merchant server downtime, HTTP 500/503. | Exponential backoff retry queue (1s, 5s, 30s, 5m, 1h). After 5 attempts, moves to Dead-Letter Queue (DLQ). | Merchant can replay missed webhooks from Merchant Dashboard. |
| **AI Advisory Subsystem** | API Outage / Timeout | Third-party LLM rate-limit or downtime. | Circuit breaker trips after 3 consecutive timeouts. Backend falls back to deterministic rule engine; zero settlement delay. | Zero downtime for payment or settlement processing. |
| **Primary RPC Provider** | Provider Failure / 429 | Alchemy outage or rate-limit exhaustion. | RPC Gateway automatically fails over to secondary provider (Infura, QuickNode, or public RPC). | Transparent failover with sub-second switchover. |

---

## 2. Consistency & Recovery Patterns

### 2.1 Transactional Outbox Pattern for Webhooks
To guarantee that merchant notifications are never lost if the server crashes after a database write:
1. When a voucher claim settles, the settlement status and an unread notification record are committed in the **same atomic database transaction**.
2. A background worker polls the outbox table, dispatches the HTTP webhook, and marks it `DELIVERED` only upon receiving HTTP 200/204.

### 2.2 Periodic On-Chain Reconciliation Worker
Every 10 minutes, a background reconciliation job compares the off-chain PostgreSQL channel balances against the smart contract state via direct RPC `getChannel(channelId)` queries:
- If a discrepancy is detected (e.g., manual settlement executed outside the relayer), the database state is synchronized to match the authoritative on-chain contract state.
- An alert is immediately dispatched to the engineering on-call channel.

### 2.3 Idempotency Strategy
All state-modifying API endpoints require an `Idempotency-Key` header (or use `channelId + ":" + nonce`):
- If a request is retried due to network drops, the API returns the cached response rather than executing a second state mutation.
