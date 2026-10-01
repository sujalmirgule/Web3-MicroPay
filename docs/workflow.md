# Development Lifecycle & Workflow

> **Framework:** Phase-Gated Engineering Process  
> **Rule:** No phase may begin until the preceding phase checkpoint has been formally approved.

---

## 1. Engineering Lifecycle Overview

```text
Phase 0: Project Initialization & Environment Discovery  [DONE]
   │
   ▼
Phase 1: System Architecture Foundation & Planning       [CURRENT]
   │
   ▼
Phase 2: Detailed System Design (Schemas, APIs, Contracts)
   │
   ▼
Phase 3: Smart Contract & Core Protocol Implementation
   │
   ▼
Phase 4: Backend API, Event Indexer & Relayer Implementation
   │
   ▼
Phase 5: Frontend Web3 Client Implementation
   │
   ▼
Phase 6: Comprehensive Testing (Unit, Integration, Security)
   │
   ▼
Phase 7: Staging & Testnet Deployment (Sepolia/Amoy)
   │
   ▼
Phase 8: Security Audits & Formal Verification
   │
   ▼
Phase 9: Production Deployment & Mainnet Verification
```

---

## 2. Stage Gates & Transition Criteria

| Stage | Inputs Required | Core Deliverables | Exit Criteria |
| :--- | :--- | :--- | :--- |
| **Phase 0: Initialization** | Environment inspection | Git repo, .gitignore, .env.example, toolchain decision, baseline docs | Genuinely clean baseline verified |
| **Phase 1: Architecture** | Requirements matrix | 16 Architectural deliverables, ADRs, risk matrix | Stakeholder architectural sign-off |
| **Phase 2: Detailed Design** | Phase 1 Architecture | ERD, API specs, Solidity interface specs, EIP-712 typed data definitions | Technical specification frozen |
| **Phase 3: Contracts** | Solidity specs | Smart contracts, unit tests, gas benchmarks, Slither analysis | 100% test coverage, 0 high/critical issues |
| **Phase 4: Backend** | API & Event specs | Express/Fastify API, PostgreSQL migrations, ethers/viem indexer | Integration tests pass with local node |
| **Phase 5: Frontend** | UI wireframes & APIs | React/Vite app, Web3 wallet connect, EIP-712 signing modal | End-to-end user journeys pass |
| **Phase 6: Testing** | Working codebase | Integration test suites, failure injection, fuzz tests | Zero test failures, fuzz invariants hold |
| **Phase 7: Staging** | Audited code | Testnet contracts, staging backend, live testnet demo | Full end-to-end flow verified on testnet |
| **Phase 8: Security** | Frozen code | External audit report, penetration test report | Remediation of all identified vulnerabilities |
| **Phase 9: Production** | Audited release | Multi-sig deployment, mainnet verification, monitoring | Production health check 100% green |

---

## 3. Pull Request & Commit Standards

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `security:`.
- **Pre-Merge Requirement:** All unit tests must pass; linter must pass with 0 errors; no secrets detected.
- **Architectural Changes:** Any structural change to contract interfaces, database schemas, or service boundaries requires an approved Architecture Decision Record (ADR).
