# Non-Functional Requirements & Comprehensive Testing Strategy

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** Measurable SLA/NFR Metrics and Multi-Tier Quality Assurance Strategy

---

## 1. Non-Functional Requirements (NFRs) & Measurable SLAs

| Category | Metric / Objective | Target SLA | Measurement Method |
| :--- | :--- | :---: | :--- |
| **Latency** | Voucher Verification & Authorization | **< 50 ms** (p95) | API Gateway stopwatch timer to 200 OK |
| **Latency** | SIWE Authentication & Session Issuance | **< 150 ms** (p95) | End-to-end HTTP response duration |
| **Throughput** | Voucher Ingestion Capacity | **> 2,500 req/sec** | Distributed k6 load testing cluster |
| **Availability** | Backend API & Voucher Ingestion Gateway | **99.95%** uptime | Datadog synthetic monitors |
| **Scalability** | Horizontal Worker Scaling | Auto-scale at **70% CPU** | Kubernetes HPA (Horizontal Pod Autoscaler) |
| **Blockchain Sync**| Indexer Block Ingestion Lag | **< 3 blocks** | Gauge: `currentHead - lastIndexedBlock` |
| **Recovery** | RTO (Recovery Time Objective) | **< 15 minutes** | Automated container redeployment via CI/CD |
| **Recovery** | RPO (Recovery Point Objective) | **< 1 minute** | Continuous WAL archiving on PostgreSQL RDS |
| **Data Retention** | Transaction Receipts & Audit Logs | **7 Years** | S3 immutable Glacier archival storage |

---

## 2. Multi-Tier Testing Strategy

```text
┌────────────────────────────────────────────────────────┐
│ 1. Frontend: React Testing Library, Mock Wallets, E2E  │
├────────────────────────────────────────────────────────┤
│ 2. Backend API: Supertest, Fastify Inject, Auth Suites │
├────────────────────────────────────────────────────────┤
│ 3. Database: Testcontainers PostgreSQL, Constraint Tests│
├────────────────────────────────────────────────────────┤
│ 4. Blockchain: Hardhat, Foundry Fuzz, Slither Analysis │
├────────────────────────────────────────────────────────┤
│ 5. Voucher Protocol: Matrix of Cryptographic Edge Cases│
├────────────────────────────────────────────────────────┤
│ 6. End-to-End: Full Lifecycle Pipeline Integration    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Cryptographic Voucher Edge-Case Test Matrix

Every voucher verification implementation must pass this automated test suite:

| Test Case ID | Test Description | Injected Condition | Expected Behavior |
| :---: | :--- | :--- | :--- |
| **TC-V01** | Valid Happy Path | Correct EIP-712 signature, valid nonce | 200 OK; voucher authorized |
| **TC-V02** | Signature Tampering | Payload altered by 1 bit after signing | 401 `ERR_AUTH_INVALID_SIGNATURE` |
| **TC-V03** | Replayed Nonce | Nonce identical to previously processed | 400 `ERR_VOUCHER_NONCE_OUT_OF_ORDER` |
| **TC-V04** | Decreasing Nonce | Nonce smaller than highest cached nonce | 400 `ERR_VOUCHER_NONCE_OUT_OF_ORDER` |
| **TC-V05** | Over-Capacity Amount | Cumulative amount > channel deposit | 400 `ERR_VOUCHER_CAPACITY_EXCEEDED` |
| **TC-V06** | Non-Monotonic Amount | Amount <= current settled amount | 400 `ERR_VOUCHER_CAPACITY_EXCEEDED` |
| **TC-V07** | Expired Voucher | `validUntil < block.timestamp` | 400 `ERR_VOUCHER_EXPIRED` |
| **TC-V08** | Cross-Chain Replay | Valid voucher signed for chain 1 sent to 42161 | 401 `ERR_AUTH_INVALID_SIGNATURE` |
| **TC-V09** | Cross-Contract Replay| Signed for Vault A, submitted to Vault B | 401 `ERR_AUTH_INVALID_SIGNATURE` |
| **TC-V10** | Cross-Recipient Theft| Signed for Merchant A, submitted to Merchant B | 401 `ERR_AUTH_INVALID_SIGNATURE` |

---

## 4. Smart Contract Security & Fuzz Testing Strategy
1. **Unit Tests (Hardhat / Viem):** 100% line, branch, and function coverage of `MicroPayVault.sol`.
2. **Invariant & Fuzz Testing (Foundry `forge test`):**
   - Invariant: `vault.balance >= sum(channels.totalDeposit - channels.settledAmount)`.
   - Invariant: A channel can never pay out more than its initial deposit + top-ups.
3. **Static Security Analysis:** Automated scan via **Slither** and **Mythril**; zero high/medium severity findings allowed in CI/CD pipeline.
4. **Timestamp Warping:** Tests simulate miner manipulation of `block.timestamp` within +/- 15 seconds to prove dispute timelocks cannot be prematurely bypassed.

---

## 5. End-to-End Lifecycle Integration Test
An automated integration test verifies the complete pipeline:
$$\text{Wallet} \xrightarrow{\text{Deposit}} \text{Vault} \xrightarrow{\text{Log}} \text{Indexer} \xrightarrow{\text{DB}} \text{Voucher} \xrightarrow{\text{Sign}} \text{API} \xrightarrow{\text{Batch}} \text{Relayer} \xrightarrow{\text{Settle}} \text{Webhook}$$
Test executes against a local Hardhat node and Dockerized PostgreSQL instance in under 15 seconds.
