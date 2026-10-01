# Security Implementation Specification & Defense Controls

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** Granular Implementation Controls for Application, Blockchain, AI, and Infrastructure Tiers

---

## 1. Authentication & Session Defense
1. **Cryptographic Proof of Key Ownership:** All sessions authenticate via EIP-4361 (SIWE). The server generates a unique challenge nonce with 5-minute TTL, stored in Redis.
2. **Replay Elimination:** The challenge nonce is consumed atomically on first use via `GETDEL`. Even if an attacker intercepts an issued signature, it cannot be submitted again.
3. **Session Tokens:** HMAC-SHA256 JWTs with a maximum lifespan of 24 hours. No persistent session tokens are written to disk.

---

## 2. API Gateway & Ingestion Security Controls
1. **Strict Payload Caps:** Max JSON request body capped at 1MB to prevent memory exhaustion attacks.
2. **Input Sanitization & Schema Enforcement:** Inbound requests pass through strict Zod schemas with `.strict()` enabled, rejecting unknown or mutated properties.
3. **Insecure Direct Object Reference (IDOR) Filter:**
   ```typescript
   export function verifyChannelParticipant(wallet: string, channel: ChannelDTO): void {
     const normalized = wallet.toLowerCase();
     if (normalized !== channel.payerAddress.toLowerCase() && 
         normalized !== channel.recipientAddress.toLowerCase()) {
       throw new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Caller is not a channel participant.");
     }
   }
   ```
4. **Rate Limiting Policy:** Redis-backed sliding window token bucket:
   - Auth APIs: 10 req/min per IP.
   - Voucher Ingestion: 100 req/sec per Channel ID.
   - Settlement APIs: 10 req/min per Merchant.

---

## 3. Cryptographic Voucher Integrity Controls
1. **Domain Separator Binding:** Every voucher is signed against an EIP-712 domain containing `chainId` (cross-chain replay protection) and `verifyingContract` (cross-contract replay protection).
2. **Channel & Counterparty Binding:** The hashed struct includes `channelId`, `payer`, and `recipient`. A voucher signed for Merchant A cannot be diverted to Merchant B.
3. **Monotonic Accumulation Check:**
   $$\text{cumulativeAmount}_{\text{new}} > \text{settledAmount}_{\text{on-chain}}$$
   $$\text{cumulativeAmount}_{\text{new}} \le \text{totalDeposit}_{\text{on-chain}}$$

---

## 4. Smart Contract Security Controls
1. **Checks-Effects-Interactions (CEI):** In all state-changing functions, condition checks execute first, internal storage updates execute second, and token transfers execute last.
2. **Reentrancy Protection:** All external functions transferring funds (`openChannel`, `settleClaim`, `closeChannelCooperative`, `finalizeChannelClose`) utilize OpenZeppelin's `ReentrancyGuard` (`nonReentrant`).
3. **Integer Safety:** Built-in Solidity `0.8.24` overflow/underflow checks.
4. **Token Transfer Security:** Uses OpenZeppelin `SafeERC20` to handle tokens that do not return boolean values or have custom transfer implementations.
5. **Dispute Timelock Guarantee:** Enforces a non-negotiable minimum of 24 hours (`86,400 seconds`) before an uncooperative channel close can be finalized.

---

## 5. Infrastructure & Secret Management Controls
1. **Hardware Security Module (HSM / KMS):** Relayer execution keys are hosted in AWS CloudHSM or Google Cloud KMS. Raw private keys never exist in plaintext memory, container environments, or configuration files.
2. **Database Credential Segregation:** Backend services connect via least-privilege database users (no `SUPERUSER` permissions).
3. **Automated Log Redaction:** Pino logger scrubs `privateKey`, `seedPhrase`, `password`, `authorization`, and `apiKey` before writing to standard output.
