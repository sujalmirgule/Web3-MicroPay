# Phase 1 Open Decisions Resolution & Architectural Freeze

> **Document Version:** 1.0.0  
> **Status:** Approved & Frozen for Implementation  
> **Purpose:** Formal resolution and impact analysis of open architectural decisions identified in Phase 1.

---

## 1. Decision 1: Payment Channel Topology

### Options Evaluated
- **Option A (Direct 1-to-1 Channels):** A user establishes an isolated escrow channel with a specific merchant (`Payer -> Merchant`).
- **Option B (Hub-and-Spoke / Pooled Collateral Router):** A user deposits into a general platform pool and emits vouchers redeemable by any registered merchant via platform routing.

### Chosen Option
**Option A: Direct 1-to-1 Cryptographic Payment Channels as the Core Protocol Layer**, designed with an extensible router interface for future multi-merchant routing.

### Rationale
1. **Mathematical Security & Non-Custodial Isolation:** Collateral locked for Merchant A cannot be drained, contested, or cross-encumbered by Merchant B.
2. **Simplified Auditability:** Eliminates platform liquidity-rebalancing complexity, insolvency contagion, and money-transmitter licensing liabilities.
3. **Gas Efficiency:** Settling a direct channel is an $O(1)$ ECDSA verification requiring ~52,000 gas, compared to multi-hop route clearing.

### Impact Analysis
- **Architectural Impact:** The core smart contract vault is completely autonomous and trustless.
- **Database Impact:** `channels` table enforces strict composite pairs `(payer_address, recipient_address)`.
- **API Impact:** Endpoint `POST /channels/register` requires explicit `recipientAddress`.
- **Smart-Contract Impact:** `openChannel()` takes `address recipient` parameter directly; no hub routing logic in vault.
- **Frontend Impact:** UI displays channel balances grouped by merchant service.
- **Security Impact:** Eliminates cross-merchant collateral draining attacks.
- **Testing Impact:** Tests focus on 2-party state transitions without multi-hop routing mocks.

---

## 2. Decision 2: Token Scope at Initial Launch

### Options Evaluated
- **Option A:** Native gas token only (ETH / MATIC / POL).
- **Option B:** Single USD stablecoin only (USDC).
- **Option C:** Multi-token support (Native Currency + arbitrary ERC-20).

### Chosen Option
**Option C: Multi-Token Support (Native ETH + ERC-20 with initial benchmarked support for USDC).**

### Rationale
1. **Commercial Realism:** Micropayments for API calls and digital articles are priced in stable USD terms (e.g., $0.005/query), making USDC essential.
2. **Architectural Simplicity:** Handling `address(0)` for native ETH alongside standard ERC-20 (`IERC20` with OpenZeppelin `SafeERC20`) adds negligible contract overhead (~30 lines of Solidity).
3. **Ecosystem Flexibility:** Works identically on Ethereum L1, Arbitrum, Base, Optimism, and Polygon.

### Impact Analysis
- **Architectural Impact:** Vault supports dual asset transfer branches.
- **Database Impact:** `channels.token_address` stores `0x0000000000000000000000000000000000000000` for native ETH or the ERC-20 token address.
- **API Impact:** Token address parameter is required on channel creation and returned in channel DTOs.
- **Smart-Contract Impact:** Uses `SafeERC20.safeTransfer` / `safeTransferFrom` and native `call{value: ...}("")`.
- **Frontend Impact:** Client prompts ERC-20 `approve()` prior to `openChannel()` when USDC is chosen.
- **Security Impact:** Protects against ERC-20 fee-on-transfer tokens and non-standard return values via `SafeERC20`.
- **Testing Impact:** Test suites run test fixtures for both Native ETH and mock ERC-20.

---

## 3. Decision 3: Relayer Monetization & Settlement Model

### Options Evaluated
- **Option A:** Platform subsidizes all gas fees.
- **Option B:** Merchant pays by deducting relayer gas cost + platform convenience fee from claim.
- **Option C:** Merchant self-settlement only (no relayer).
- **Option D (Hybrid):** Dual-Path Settlement (Merchant Self-Settlement OR Managed Relayer Service with Gas Deductions).

### Chosen Option
**Option D: Hybrid Dual-Path Settlement Model.**

### Rationale
1. **Zero Lock-In:** Smart contract function `settleClaim()` is permissionless. Any merchant can submit their own transaction directly using their own wallet and pay zero platform fee.
2. **Operational Ease:** For merchants who prefer hands-off automation, the backend relayer automatically batches claims, pays on-chain gas, and deducts the exact gas reimbursement + a configurable 0.5% basis-point protocol fee.
3. **Anti-Drain Protection:** Prevents relayer wallet insolvency by recovering gas from payouts.

### Impact Analysis
- **Architectural Impact:** Smart contract supports optional `feeRecipient` and `feeAmount` parameters counter-signed in claim or handled via relayer wrapper.
- **Database Impact:** `settlements` table tracks `relayer_gas_fee`, `claimed_amount`, and `net_payout`.
- **API Impact:** Endpoint `POST /settlements/claim` supports `executionMode: "RELAYER" | "DIRECT_EXPORT"`.
- **Smart-Contract Impact:** `settleClaim` sends `payoutDelta` to recipient.
- **Frontend Impact:** Merchant dashboard displays gross earnings vs. net payout after relayer fees.
- **Security Impact:** Eliminates economic denial-of-service against the platform relayer wallet.
- **Testing Impact:** Integration tests verify both direct wallet settlement and relayer settlement.

---

## 4. Decision 4: Dispute Timelock Duration

### Options Evaluated
- **Option A:** Fixed 24 hours (`86,400 seconds`).
- **Option B:** Fixed 72 hours (`259,200 seconds`).
- **Option C:** Configurable per channel with on-chain minimum and maximum bounds.

### Chosen Option
**Option C: Configurable Per Channel with a Hard Minimum of 24 Hours (`86,400 seconds`) and Maximum of 30 Days (`2,592,000 seconds`).**

### Rationale
1. **Safety Floor:** A hard minimum of 24 hours prevents a malicious payer from setting a 60-second dispute period to perform an exit-scam while the merchant indexer or relayer is briefly offline.
2. **Enterprise Flexibility:** High-value enterprise channels can specify a 72-hour or 7-day dispute window, while high-frequency micro-channels default to 24 hours.

### Impact Analysis
- **Architectural Impact:** Time-locked dispute mechanics are parameter-driven.
- **Database Impact:** `channels.dispute_period_seconds` stores the approved duration per channel.
- **API Impact:** Validation rejects channel registration if `disputePeriodSeconds < 86400`.
- **Smart-Contract Impact:** Reverts with `InvalidDisputePeriod(provided, 86400)` if input is below floor.
- **Frontend Impact:** Channel deposit modal defaults to "24 Hours (Standard)" with an advanced settings dropdown.
- **Security Impact:** Guarantees sufficient window for relayer watchtowers to contest fraudulent unilateral closures.
- **Testing Impact:** Tests simulate block timestamp warping to verify dispute windows before and after 24h.
