# Engineering & Development Rules

> **Status:** Active & Enforced  
> **Applicability:** All contributors, automated agents, CI/CD pipelines.

These engineering rules are mandatory across all phases of the Web3 MicroPay project.

---

## 1. Secrets & Credentials
- **Zero Secrets in Git:** Never commit API keys, private keys, wallet seed phrases, database passwords, JWT secrets, AI keys, or RPC secrets under any circumstance.
- **Strict Environment Isolation:** Secrets must be loaded exclusively through validated environment variables (`process.env`) via `.env` files that match `.env.example`.
- **Pre-Commit Checks:** Automated git hooks must reject commits containing high-entropy strings or common secret patterns.

## 2. Minimal & Verified Dependencies
- **No Blanket Installs:** Never execute bulk package installations or install tools that are not justified by an accepted Architecture Decision Record (ADR).
- **Audit & Lockfiles:** Always use lockfiles (`package-lock.json`) and audit new packages for vulnerabilities before introduction.
- **Project-Local Scope:** Avoid global tool dependencies; all compilers, linters, and SDKs must be project-local to ensure deterministic builds.

## 3. Architectural Discipline & Boundaries
- **No Direct Database Access from Frontend:** The frontend client must never possess database connection strings or make direct queries to any datastore. All persistence routes through the validated Backend API.
- **No Uncontrolled Blockchain State Changes:** Smart contract state modifications must route strictly through the designated blockchain service layer with cryptographic signature verification or non-custodial user wallet transactions.
- **No Unexplained Components:** No microservice, message broker, cache, proxy, or library shall be added without an explicit architectural purpose documented in an ADR.

## 4. AI Subsystem Guardrails
- **AI Is Advisory Only:** The AI subsystem operates purely off-chain for analysis, anomaly detection, gas price optimization hints, and natural language query assistance.
- **AI Never Authorizes Transactions:** Critical authorization, financial transfers, payment validation, smart contract execution, and fund disbursements must NEVER depend solely on AI model output.
- **Deterministic Validation:** All AI suggestions must pass strict, deterministic backend validation rules before any action is executed.
- **Zero Sensitive Data Ingest:** Never send raw private keys, wallet seed phrases, passwords, or personally identifiable information (PII) to external AI APIs.

## 5. Smart Contract Engineering Standards
- **Testing Mandatory:** Every smart contract function, modifier, event, and revert condition must have 100% branch and unit test coverage before testnet deployment.
- **Static Analysis & Formal Verification:** Contracts must be analyzed with automated security tools (e.g., Slither, Mythril) and pass reentrancy, integer overflow, and access-control checks.
- **CEI Pattern:** All state-modifying functions must strictly follow the **Checks-Effects-Interactions** pattern to eliminate reentrancy vulnerabilities.
- **Immutable vs Upgradeable Justification:** Contracts must default to immutable logic. Any proxy or upgradeable pattern must be backed by an ADR detailing storage layout guarantees and multi-sig access control.

## 6. API, Database & Data Integrity
- **Contract-First APIs:** All API endpoints must be documented with explicit request/response schemas, validation rules, and error codes.
- **Versioned Database Migrations:** Direct manual modifications to database schemas are strictly prohibited. All schema evolution must be tracked in version-controlled migration files.
- **Explicit Error Handling:** Functions must handle failure states explicitly. Never swallow errors or use empty `catch` blocks.
- **Audit Trails:** All financial actions, voucher claims, settlement attempts, and administrative operations must generate structured, immutable audit log entries.
