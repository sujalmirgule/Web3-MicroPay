# Security Architecture & Baselines

> **Core Objective:** Zero financial loss, non-custodial asset protection, replay protection, and AI containment.

---

## 1. Threat Modeling Overview

Web3 MicroPay sits at the intersection of Web2 API infrastructure, cryptographic off-chain signatures, on-chain smart contracts, and external AI services. The threat surface includes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        THREAT VECTOR MATRIX                            │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│ Domain              │ Potential Attack Vector  │ Defense Architecture  │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ Smart Contracts     │ Reentrancy, Double Claim │ CEI Pattern, Nonces   │
│ Off-chain Vouchers  │ Signature Replay, Forgery│ EIP-712 Domain Separator│
│ Backend API         │ Sybil, Flooding, IDOR    │ Rate limiting, RBAC   │
│ AI Subsystem        │ Prompt Injection, Poison │ Sandboxed, Advisory   │
│ Key Management      │ Private Key Exfiltration │ HSM / KMS, No disk keys│
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. Non-Negotiable Security Controls

### 2.1 Smart Contract Security
- **Checks-Effects-Interactions (CEI):** In all state-changing functions, validate input/conditions first, update contract internal state second, and interact with external contracts/transfers last.
- **Reentrancy Protection:** Use OpenZeppelin's `ReentrancyGuard` on all deposit, claim, and withdrawal functions.
- **Strict Cryptographic Signature Verification:** Use `ECDSA.recover` with EIP-712 typed structured data. All vouchers MUST include:
  - `channelId` (Unique channel identifier)
  - `nonce` or cumulative `amount` (Monotonically increasing)
  - `expiryTimestamp` (Time-bound validity)
  - `contractAddress` and `chainId` in domain separator (Cross-chain and cross-contract replay protection)
- **Time-Locked Dispute Channels:** If channels allow unilateral user closure, provide a dispute window (e.g., 24-48 hours) where the counterparty can submit a newer signed cumulative voucher.

### 2.2 Application & API Security
- **Off-Chain Session Security:** EIP-4361 (Sign-In with Ethereum) for authentication. Wallets prove address ownership via signature; server issues short-lived JWTs (24h max) with cryptographically random refresh tokens.
- **IDOR Protection:** Every voucher query or merchant claim must verify that the authenticated wallet address matches either the sender or recipient of the channel.
- **Input Sanitization & Schema Validation:** Strict schema parsing (Zod/Joi) on all inbound API payloads.

### 2.3 AI Safety & Sandboxing
- **Deterministic Supremacy:** The backend business logic and smart contract rules are strictly deterministic. An LLM cannot approve a claim, alter a payment balance, or trigger a fund release.
- **Data Redaction:** No user seed phrases, private keys, database passwords, or PII are ever fed into AI prompts.
- **Strict Output Schema:** AI outputs (e.g., risk scores, gas advice) must conform to strict JSON schemas; malformed or out-of-bound outputs trigger automatic fallback to static rule engines.
