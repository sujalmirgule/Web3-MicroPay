# System Traceability Matrices

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** Feature Traceability & End-to-End Requirement Verification Mapping

---

## 1. Feature Traceability Matrix (API ↔ DB ↔ Blockchain ↔ Event ↔ Notification)

| Feature Name | API Endpoint | Database Entities | Blockchain Method | Contract Event | Notification Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SIWE Authentication** | `POST /auth/verify-siwe` | `users` | - | - | - |
| **Open Escrow Channel** | `POST /channels/register`| `payment_channels` | `openChannel()` | `ChannelOpened` | WebSocket update |
| **Top-Up Channel** | `POST /channels/:id/topup`| `payment_channels` | `topUpChannel()` | `ChannelToppedUp` | WebSocket update |
| **Emit / Ingest Voucher**| `POST /vouchers/submit` | `vouchers`, Redis nonces| - (Off-chain) | - | WebSocket payment confirm |
| **Claim Batch Settlement**| `POST /settlements/claim` | `settlements`, `receipts`| `settleClaim()` | `ChannelSettled` | HMAC Webhook `settlement.confirmed`|
| **Unilateral Dispute** | `POST /disputes/initiate`| `disputes`, `channels` | `initiateChannelClose()`| `ChannelDisputeInitiated`| High-priority Webhook & Email |
| **Finalize Channel Close**| `POST /channels/:id/close`| `payment_channels` | `finalizeChannelClose()`| `ChannelClosed` | HMAC Webhook `channel.closed` |
| **AI Anomaly Detection** | `POST /ai/evaluate-risk` | `ai_evaluations` | - | - | Internal dashboard alert |
| **Webhook Delivery Replay**| `POST /webhooks/replay`| `notification_outbox`| - | - | Re-dispatched HTTP Webhook |

---

## 2. End-to-End Requirement Traceability Matrix (RTM)

| Requirement Description | Phase 1 Arch Component | Phase 2 Detailed Design | Implementation Target | Primary Test Case |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Custodial Collateral Escrow** | `MOD-CONTRACT` | `smart-contracts.md` | `contracts/contracts/MicroPayVault.sol` | `test/MicroPayVault.test.ts::openChannel` |
| **Sub-100ms Micropayment Auth** | `MOD-VOUCHER` | `vouchers.md` | `backend/src/services/voucher.service.ts` | `test/voucher.test.ts::TC-V01` |
| **EIP-712 Replay Protection** | `MOD-VERIFY` | `vouchers.md` | `shared/src/types/voucher.ts` | `test/voucher.test.ts::TC-V03_TC-V08` |
| **Batched O(1) On-Chain Settlement** | `MOD-RELAYER` | `settlement.md` | `backend/src/relayer/relayer.worker.ts` | `test/settlement.test.ts::batchSettle` |
| **24-Hour Dispute Timelock Guarantee**| `MOD-CONTRACT` | `channels.md` | `contracts/contracts/MicroPayVault.sol` | `test/dispute.test.ts::timelockEnforcement` |
| **Transactional Outbox Guaranteed Delivery**| `MOD-NOTIF` | `notifications.md` | `backend/src/notif/outbox.worker.ts` | `test/outbox.test.ts::atLeastOnceDelivery` |
| **Asynchronous AI Anomaly Scoring** | `MOD-AI` | `ai.md` | `backend/src/ai/gemini.advisor.ts` | `test/ai.test.ts::circuitBreakerFallback` |
| **Zero Private Key Disk Storage** | `MOD-SECURITY` | `security.md` | AWS KMS / KMS Provider Mock | `test/security.test.ts::zeroPlaintextKeyAudit` |
| **Real-Time Blockchain State Sync** | `MOD-INDEXER` | `indexer.md` | `backend/src/indexer/indexer.worker.ts` | `test/indexer.test.ts::reorgHandling` |
| **IDOR Resource Ownership Filtering**| `MOD-AUTH` | `authentication.md` | `backend/src/api/middleware/idor.ts` | `test/api.test.ts::forbiddenResourceTest` |
