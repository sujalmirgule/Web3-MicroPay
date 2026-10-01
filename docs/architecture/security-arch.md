# Comprehensive Security Architecture & Risk Assessment

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** Multi-Layer Defense: Application, Blockchain, AI, and Infrastructure Security

---

## 1. Multi-Layer Defense Model

```text
┌───────────────────────────────────────────────────────────────┐
│ 1. Client / Wallet Security (Non-custodial, EIP-712 Signing)  │
├───────────────────────────────────────────────────────────────┤
│ 2. API Gateway & Application Security (SIWE, RBAC, WAF, Zod) │
├───────────────────────────────────────────────────────────────┤
│ 3. Off-Chain Ledger & Cryptographic Verification (ECDSA)      │
├───────────────────────────────────────────────────────────────┤
│ 4. AI Subsystem Containment (Sandboxed, Read-Only, Redacted)  │
├───────────────────────────────────────────────────────────────┤
│ 5. Smart Contract & Blockchain Layer (CEI, Nonces, Time-Locks)│
├───────────────────────────────────────────────────────────────┤
│ 6. Infrastructure & Secrets Security (HSM / KMS, Zero Leaks)  │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Security Specifications

### 2.1 Application & API Security
- **Authentication:** EIP-4361 Sign-In With Ethereum (SIWE). The client signs a standard message proving wallet ownership; the backend verifies the signature and issues an HMAC-SHA256 JWT.
- **Authorization & Insecure Direct Object References (IDOR):**
  - Any request accessing vouchers or requesting settlements must verify:
    $$\text{authenticatedWallet} \in \{\text{channel.payer}, \text{channel.recipient}\}$$
  - Merchant API requests require an authorized `X-API-Key` hashed via SHA-256 before comparison against the database store.
- **Input Validation:** Every endpoint validates payloads against strict Zod schemas with rejection of extra properties.
- **Rate Limiting & Anti-Sybil:** Redis-backed token bucket algorithm limiting voucher submissions per channel to 100 req/sec to prevent denial-of-service against the ledger.

### 2.2 Blockchain & Smart Contract Security
- **Reentrancy Protection:** All state-changing functions follow Checks-Effects-Interactions and inherit OpenZeppelin's `ReentrancyGuard`. All ERC-20 transfers execute via `SafeERC20`.
- **Signature Replay Prevention:**
  - Vouchers are hashed using EIP-712 with `chainId` and `verifyingContract`.
  - Smart contracts track `channelNonces[channelId]` and reject any submission where `cumulativeAmount <= channel.settledAmount`.
- **Dispute Timelock Guarantee:**
  - If a payer triggers unilateral closure (`initiateChannelClose`), a dispute countdown (`disputePeriod`, minimum 24 hours) starts.
  - The recipient can submit a higher signed voucher at any time before the window closes, completely neutralizing exit fraud.
- **Access Control:** Multi-sig ownership (Gnosis Safe 3-of-5) for administrative pause and emergency functions.

### 2.3 AI Subsystem Containment
- **Zero Execution Power:** AI models are treated as untrusted third-party advisory modules. No automated fund movement is ever triggered directly by an AI output.
- **Prompt Injection Defense:** External user or merchant metadata is never interpolated into prompt instructions. Strict input delimiters and typed JSON schema enforcements (`response_format: { type: "json_object" }`) are enforced.
- **Data Redaction:** Addresses are masked, and numerical values are normalized before dispatch to external LLMs.

### 2.4 Infrastructure & Key Management
- **Relayer Key Protection:** The operator key used to submit batch claims is stored in AWS CloudHSM or Google Cloud KMS. Raw private keys are NEVER written to disk or container environment variables in production.
- **Secret Scanning:** Automated pre-commit hooks and CI/CD secret scanners (TruffleHog / GitGuardian) block any commit containing private keys or credentials.
- **Zero Sensitive Logging:** Database connection strings, API tokens, and private keys are scrubbed by logging formatters (`Pino` redaction).
