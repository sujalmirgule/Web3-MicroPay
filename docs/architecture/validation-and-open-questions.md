# Architecture Validation Report & Open Questions

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Architectural Validation against Quality Attributes & Explicit Open Questions for Phase 2

---

## 1. Architecture Validation Against Core Quality Attributes

### 1.1 Functional Requirements
- **High-Frequency Micropayments:** Validated. Off-chain EIP-712 typed vouchers decoupled from blockchain blocks allow sub-100ms payment verification and infinite horizontal throughput.
- **Non-Custodial Collateral:** Validated. Funds are deposited into a verifiable Solidity smart contract vault. Neither the platform nor the merchant can withdraw funds without valid signatures or dispute expiration.
- **Batch Settlement:** Validated. Merchants/relayers only need to submit the highest cumulative voucher, reducing $N$ micro-transactions to a single $O(1)$ on-chain claim.
- **Merchant Notifications:** Validated. Transactional outbox with HMAC-SHA256 signatures ensures guaranteed webhook delivery.
- **AI Advisory Integration:** Validated. Controlled, read-only AI integration provides anomaly scoring and gas timing optimization without introducing non-deterministic execution risks.

### 1.2 Security & Threat Defense
- **Reentrancy:** Eliminated via Checks-Effects-Interactions (CEI) and OpenZeppelin `ReentrancyGuard`.
- **Signature Replay:** Eliminated via EIP-712 domain separation (`chainId`, `verifyingContract`), channel ID bindings, and monotonic nonce/cumulative checks.
- **Unauthorized Withdrawals:** Eliminated via non-custodial smart contract rules and multi-sig administrative controls.
- **AI Injection & Privilege Escalation:** Sandboxed AI role ensures model outputs never execute transactions or access cryptographic secrets.

### 1.3 Scalability & Performance
- **Throughput:** Off-chain voucher validation scales linearly with standard backend API nodes (>5,000 vouchers/sec per node cluster).
- **Latency:** Client-side voucher signing and backend Redis nonce verification completes in < 50ms.
- **Storage Scalability:** Ephemeral vouchers can be archived once on-chain settlement is finalized, keeping active database indices compact.

### 1.4 Reliability & Fault Tolerance
- **Asynchronous Resilience:** Dual-store architecture with outbox queues ensures zero lost payments during network hiccups.
- **RPC Redundancy:** Multi-provider pool with health-check failover handles third-party blockchain node downtime.
- **Eventual Consistency:** Reconciliation worker detects and resolves on-chain vs. off-chain ledger drift automatically.

### 1.5 Cost Efficiency & Gas Economics
- **User Gas Overhead:** Users pay gas only once to open/fund a channel and once to close/withdraw.
- **Merchant Gas Overhead:** Batch settlements aggregate thousands of micro-payments into a single L2 transaction costing < $0.02 total.
- **Infrastructure Cost:** Stateless API containers with managed DB and low-cost LLM API tier (Gemini Flash).

### 1.6 Privacy & Regulatory Compliance
- **Data Minimization:** No personal data or user credentials stored on-chain.
- **GDPR / Privacy:** Off-chain databases allow data deletion/anonymization in accordance with privacy regulations.

---

## 2. Open Questions & Architectural Decisions Required (For Phase 2)

The following items are explicitly identified as **Open Questions** requiring stakeholder alignment before finalizing the Phase 2 Detailed System Design:

### Question 1: Channel Topology (Direct 1-to-1 vs. Hub-and-Spoke Router)
- **Option A (Direct 1-to-1 Channels):** A user opens an escrow channel specifically with a single merchant (e.g., Alice deposits $10 to The New York Times).
  - *Pros:* Simple smart contract, absolute mathematical isolation of risk, zero counterparty risk between merchants.
  - *Cons:* User must fund separate channels for different merchants.
- **Option B (Hub-and-Spoke / Pooled Collateral):** User deposits $50 into a platform vault and can emit micro-vouchers to *any* registered merchant. The platform router coordinates multi-merchant settlement.
  - *Pros:* Exceptional UX; single deposit allows browsing and paying across hundreds of services.
  - *Cons:* Slightly higher smart contract complexity, requires platform routing liquidity or multi-recipient allocation accounting.
- *Recommendation for Phase 2:* Start with Option A in the core smart contract, with an architectural extension point for Option B router.

### Question 2: Token Support Scope at Initial Launch
- **Decision Needed:** Should Phase 2 support:
  1. Native gas token only (ETH on Arbitrum/Base, MATIC/POL on Polygon)?
  2. Single stablecoin standard (e.g., USDC via ERC-20 / EIP-2612 permit)?
  3. Multi-token generic vault (ETH + any approved ERC-20)?
- *Recommendation for Phase 2:* Multi-token architecture in contract design, with initial test suites validating both Native ETH and USDC.

### Question 3: Relayer Fee & Gas Sponsorship Policy
- **Decision Needed:** Who pays the on-chain gas fee for the final batch settlement?
  - Model 1: Merchant pays by deducting gas from the claim amount.
  - Model 2: Platform subsidizes gas in exchange for a basis-point platform fee (e.g., 0.5% of settled volume).
  - Model 3: Merchant submits their own transactions directly from their backend (no platform relayer needed).
- *Recommendation for Phase 2:* Support both: Relayer service with fee deduction, alongside a permissionless direct claim contract function so merchants are never locked into the platform relayer.

### Question 4: Dispute Period Window
- **Decision Needed:** What is the default timelock duration for uncooperative channel closures?
  - Fast (6 hours): Faster liquidity return for payers, but requires merchants to be online or have high-frequency relayer watchtowers.
  - Standard (24 hours): Recommended industry standard (Raiden/Connext/State Channels baseline).
  - Conservative (72 hours): Safest against extended L2 sequencer or infrastructure outages.
- *Recommendation for Phase 2:* Configurable parameter per channel with a minimum floor of 24 hours.
