# System Traceability Matrices

> **Document Version:** 1.1.0  
> **Status:** Phase 3 Implemented & Verified  
> **Scope:** Feature Traceability & End-to-End Requirement Verification Mapping

---

## 1. Feature Traceability Matrix (API ↔ DB ↔ Blockchain ↔ Event ↔ Notification)

| Feature Name | API Endpoint | Database Entities | Blockchain Method | Contract Event | Implementation File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SIWE Authentication** | `POST /auth/verify-siwe` | `users` | - | - | `backend/src/api/server.ts` | **Implemented** |
| **Open Escrow Channel** | `POST /channels/register`| `payment_channels` | `openChannel()` | `ChannelOpened` | `contracts/contracts/MicroPayVault.sol` | **Implemented** |
| **Top-Up Channel** | `POST /channels/:id/topup`| `payment_channels` | `topUpChannel()` | `ChannelToppedUp` | `contracts/contracts/MicroPayVault.sol` | **Implemented** |
| **Emit / Ingest Voucher**| `POST /vouchers/submit` | `vouchers`, Redis nonces| - (Off-chain) | - | `backend/src/services/voucher.service.ts` | **Implemented** |
| **Claim Batch Settlement**| `POST /settlements/claim` | `settlements`, `receipts`| `settleClaim()` | `ChannelSettled` | `backend/src/relayer/relayer.service.ts` | **Implemented** |
| **Unilateral Dispute** | `POST /disputes/initiate`| `disputes`, `channels` | `initiateChannelClose()`| `ChannelDisputeInitiated`| `contracts/contracts/MicroPayVault.sol` | **Implemented** |
| **Finalize Channel Close**| `POST /channels/:id/close`| `payment_channels` | `finalizeChannelClose()`| `ChannelClosed` | `contracts/contracts/MicroPayVault.sol` | **Implemented** |
| **Transactional Outbox Sync**| Background Worker | `notification_outbox`| - | `ChannelSettled` / `ChannelOpened` | `backend/src/indexer/indexer.service.ts` | **Implemented** |

---

## 2. End-to-End Requirement Traceability Matrix (RTM)

| Requirement Description | Phase 1 Arch Component | Phase 2 Detailed Design | Implementation Target | Primary Test Case | Phase 3 Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Non-Custodial Collateral Escrow** | `MOD-CONTRACT` | `smart-contracts.md` | `contracts/contracts/MicroPayVault.sol` | `test/MicroPayVault.test.ts` (1.1, 1.2) | **PASSED** (100% verified) |
| **Sub-100ms Micropayment Auth** | `MOD-VOUCHER` | `vouchers.md` | `backend/src/services/voucher.service.ts` | `test/e2e-protocol.test.ts` (Step 3: <50ms) | **PASSED** (100% verified) |
| **EIP-712 Replay Protection** | `MOD-VERIFY` | `vouchers.md` | `shared/src/types/voucher.ts` & `voucher.service.ts` | `test/voucher.service.test.ts` (Nonce replay) | **PASSED** (100% verified) |
| **Batched O(1) On-Chain Settlement** | `MOD-RELAYER` | `settlement.md` | `backend/src/relayer/relayer.service.ts` | `test/MicroPayVault.gas.test.ts` (73k gas claim) | **PASSED** (100% verified) |
| **24-Hour Dispute Timelock Guarantee**| `MOD-CONTRACT` | `channels.md` | `contracts/contracts/MicroPayVault.sol` | `test/MicroPayVault.test.ts` (Dispute countdown) | **PASSED** (100% verified) |
| **Monotonic Invariant Preservation** | `MOD-CONTRACT` | `smart-contracts.md` | `contracts/contracts/MicroPayVault.sol` | `test/MicroPayVault.fuzz.test.ts` (25 fuzz claims) | **PASSED** (100% verified) |
| **Zero Private Key Disk Storage** | `MOD-SECURITY` | `security.md` | Ethers KMS Signer abstraction / Env isolation | Secret scan audit & Key isolation boundary | **PASSED** (100% verified) |
| **Real-Time Blockchain State Sync** | `MOD-INDEXER` | `indexer.md` | `backend/src/indexer/indexer.service.ts` | `test/e2e-protocol.test.ts` (Step 4: 6-block depth) | **PASSED** (100% verified) |
| **IDOR Resource Ownership Filtering**| `MOD-AUTH` | `authentication.md` | `backend/src/services/voucher.service.ts` | `test/voucher.service.test.ts` (Signer ownership check) | **PASSED** (100% verified) |
