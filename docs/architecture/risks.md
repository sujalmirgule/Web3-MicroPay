# Architecture Risk Assessment & Mitigation Matrix

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Identification of Architectural Risks, Probabilities, Impacts, and Fallback Strategies

---

## 1. Architectural Risk Matrix

| Risk ID | Risk Description | Probability | Impact | Affected Component | Architectural Mitigation | Fallback Strategy |
| :---: | :--- | :---: | :---: | :--- | :--- | :--- |
| **RSK-01** | **Mempool Gas Spikes Delaying Settlement**<br>L2 network congestion makes batch settlement gas cost exceed acceptable threshold. | High | Medium | Relayer & Smart Contract | Relayer dynamically tracks EIP-1559 base fees; batches claims until gas drops; AI gas optimizer forecasts optimal window. | Direct merchant settlement claim directly on-chain if relayer queue is paused. |
| **RSK-02** | **Dispute Period Timeout Exploit**<br>Payer attempts unilateral close while counterparty is offline or un-indexed. | Low | Critical | Smart Contract & Dispute Engine | Smart contract enforces minimum 24–48 hour dispute period; indexer monitors `DisputeInitiated` events 24/7 with automated alerting. | Automated relayer worker submits latest counter-signed voucher during dispute window. |
| **RSK-03** | **RPC Provider Node Outage / Throttling**<br>Primary RPC provider (e.g., Alchemy) returns HTTP 429 or drops WebSocket connection. | Medium | High | Blockchain Indexer & Relayer | Multi-provider RPC pool (Alchemy + Infura + QuickNode) with automatic round-robin and health-check failover. | Fallback to public archive RPC with degraded rate limits. |
| **RSK-04** | **Chain Reorganization (Reorg)**<br>Temporary fork on L2 causes deposited funds to appear unconfirmed. | Medium | High | Indexer & Escrow Ledger | Indexer enforces strict block confirmation depth (6 blocks on L2, 12 on L1) before marking channels `OPEN`. | Reorg rollback listener reconciles channel status if block is orphaned. |
| **RSK-05** | **AI Inference Latency or Outage**<br>External LLM provider experiences 500ms+ latency spikes or service outage. | Medium | Low | AI Advisory Subsystem | AI evaluation runs strictly asynchronously on non-blocking worker; micropayment API uses fast-path bypass. | Circuit breaker trips; system operates on deterministic heuristic rules. |
| **RSK-06** | **Adversarial Prompt Injection**<br>Malicious merchant or payer submits crafted metadata aimed at manipulating AI fraud scoring. | Medium | Medium | AI Advisory & Reporting | Metadata strings are stripped and strictly schema-validated via Zod; raw strings are never passed as executable instructions. | AI output schema rejects non-conforming responses; falls back to static rule evaluation. |
| **RSK-07** | **Double-Spend Voucher Race**<br>Payer signs two divergent vouchers with same nonce to two different services. | Low | High | API Gateway & Ledger | Channels are strictly 1-to-1 (one payer to one recipient). Cross-channel funds are isolated by distinct `channelId`. | Payer cannot exceed deposited collateral; smart contract guarantees solvency. |
| **RSK-08** | **Relayer Hot Wallet Key Exfiltration**<br>Attacker compromises server hosting relayer execution key. | Very Low | High | Relayer Subsystem | Relayer key holds only small operational gas balance; all contract interactions require user/merchant signatures; key stored in AWS KMS/CloudHSM. | Immediate automated key rotation and balance revocation via multi-sig admin. |
| **RSK-09** | **Merchant Webhook Flooding / Downtime**<br>Merchant endpoint crashes, generating thousands of delivery errors. | High | Low | Notification Engine | Transactional outbox with exponential backoff and Dead-Letter Queue (DLQ) after 5 failed attempts. | Merchant portal provides manual "Replay Webhooks" button for failed deliveries. |
| **RSK-10** | **Database / Ledger Desynchronization**<br>Backend database state drifts from on-chain smart contract state. | Low | High | PostgreSQL & Indexer | Scheduled reconciliation cron compares DB balances against on-chain contract state every 10 minutes. | On-chain state is treated as canonical source of truth; DB is updated to match. |
