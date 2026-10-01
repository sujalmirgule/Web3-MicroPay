# Web3 MicroPay Documentation Index

Welcome to the architectural and engineering documentation for **Web3 MicroPay**.

---

## Documentation Structure

### 1. Foundation & Governance
- [Engineering Rules](file:///d:/Projects/Web3%20MicroPay/docs/rules.md): Non-negotiable engineering, security, and coding standards.
- [Development Workflow](file:///d:/Projects/Web3%20MicroPay/docs/workflow.md): Phase-gated lifecycle from requirement to mainnet.
- [Environment Configuration](file:///d:/Projects/Web3%20MicroPay/docs/environment.md): Tier separation (Dev, Test, Staging, Prod).
- [Developer Setup](file:///d:/Projects/Web3%20MicroPay/docs/setup.md): Local workstation prerequisites and toolchain plan.
- [Security Architecture](file:///d:/Projects/Web3%20MicroPay/docs/security.md): Threat vectors and defense baselines.

### 2. System Architecture Foundation (Phase 1)
- [System Context & Boundaries](file:///d:/Projects/Web3%20MicroPay/docs/architecture/system-context.md)
- [Component Architecture](file:///d:/Projects/Web3%20MicroPay/docs/architecture/components.md)
- [Blockchain & Smart Contract Specification](file:///d:/Projects/Web3%20MicroPay/docs/architecture/blockchain.md)
- [AI Subsystem Specification & Guardrails](file:///d:/Projects/Web3%20MicroPay/docs/architecture/ai-subsystem.md)
- [Data & End-to-End Flow](file:///d:/Projects/Web3%20MicroPay/docs/architecture/data-flow.md)
- [Security & Risk Assessment](file:///d:/Projects/Web3%20MicroPay/docs/architecture/security-arch.md)
- [Failure & Recovery Strategy](file:///d:/Projects/Web3%20MicroPay/docs/architecture/failure-recovery.md)
- [Deployment & Topology](file:///d:/Projects/Web3%20MicroPay/docs/architecture/deployment.md)

### 3. Architecture Decision Records (ADRs)
- [ADR-001: Monorepo Structure](file:///d:/Projects/Web3%20MicroPay/docs/decisions/ADR-001-monorepo-structure.md)
- [ADR-002: Blockchain Network & Smart Contract Pattern](file:///d:/Projects/Web3%20MicroPay/docs/decisions/ADR-002-blockchain-network-and-contract-pattern.md)
- [ADR-003: Off-Chain Micropayment Voucher Protocol (EIP-712)](file:///d:/Projects/Web3%20MicroPay/docs/decisions/ADR-003-offchain-voucher-protocol-eip712.md)
- [ADR-004: Database & Persistence Strategy](file:///d:/Projects/Web3%20MicroPay/docs/decisions/ADR-004-database-and-persistence-strategy.md)
- [ADR-005: AI Subsystem Guardrails & Scope](file:///d:/Projects/Web3%20MicroPay/docs/decisions/ADR-005-ai-subsystem-guardrails-and-scope.md)

### 4. Detailed System Design & Implementation Specifications (Phase 2)
- [Open Decisions Resolution](file:///d:/Projects/Web3%20MicroPay/docs/system-design/decisions-resolution.md): Formal resolution and impact analysis of Phase 1 decisions.
- [Module Decomposition & Monorepo Governance](file:///d:/Projects/Web3%20MicroPay/docs/system-design/modules.md): 16 core system modules and package boundaries.
- [Database Design & Consistency Model](file:///d:/Projects/Web3%20MicroPay/docs/system-design/database.md): PostgreSQL 15+ DDL, Redis data model, and authoritativeness matrix.
- [REST API Specification](file:///d:/Projects/Web3%20MicroPay/docs/system-design/api.md): OpenAPI 3.1 REST contracts across all functional modules.
- [Authentication & SIWE Specification](file:///d:/Projects/Web3%20MicroPay/docs/system-design/authentication.md): Cryptographic SIWE lifecycle, JWT tokens, and RBAC matrix.
- [Payment Channel Lifecycle & State Machine](file:///d:/Projects/Web3%20MicroPay/docs/system-design/channels.md): Formal channel state transitions and operational invariants.
- [Micropayment Voucher Protocol](file:///d:/Projects/Web3%20MicroPay/docs/system-design/vouchers.md): EIP-712 typed structured data and 11-step verification engine.
- [Relayer & Settlement Engine](file:///d:/Projects/Web3%20MicroPay/docs/system-design/settlement.md): Batch claim processing, EIP-1559 gas bumping, and KMS key isolation.
- [Smart Contract Technical Specification](file:///d:/Projects/Web3%20MicroPay/docs/system-design/smart-contracts.md): Solidity `IMicroPayVault.sol`, events, custom errors, and immutable design rationale.
- [Blockchain Event Indexer](file:///d:/Projects/Web3%20MicroPay/docs/system-design/indexer.md): WebSocket log ingestion, confirmation depth, reorg handling, and lag monitoring.
- [Notification & Webhook Dispatcher](file:///d:/Projects/Web3%20MicroPay/docs/system-design/notifications.md): Transactional Outbox pattern, HMAC-SHA256 signing, and retry policies.
- [AI Subsystem Design](file:///d:/Projects/Web3%20MicroPay/docs/system-design/ai.md): Asynchronous advisory architecture, Gemini prompts, Zod schemas, and circuit breaker.
- [Security Implementation Controls](file:///d:/Projects/Web3%20MicroPay/docs/system-design/security.md): Implementation-level defense across Application, Blockchain, and Infrastructure.
- [Unified Error Model & Idempotency](file:///d:/Projects/Web3%20MicroPay/docs/system-design/errors.md): Machine-readable error catalog, idempotency keys, and retry semantics.
- [Complete Sequence Diagrams (12 Flows)](file:///d:/Projects/Web3%20MicroPay/docs/system-design/sequence-diagrams.md): End-to-end Mermaid execution sequences for all 12 operational flows.
- [Data-Flow Diagrams & Trust Boundaries](file:///d:/Projects/Web3%20MicroPay/docs/system-design/data-flows.md): Level 0 and Level 1 data flows with explicit trust boundary overlays.
- [NFRs & Comprehensive Testing Strategy](file:///d:/Projects/Web3%20MicroPay/docs/system-design/nfr-and-testing.md): Measurable SLA metrics and multi-tier quality assurance strategy.
- [Local Development Architecture](file:///d:/Projects/Web3%20MicroPay/docs/system-design/local-dev.md): Developer workstation setup, pre-funded test accounts, and definitive `.env.example`.
- [System Traceability Matrices](file:///d:/Projects/Web3%20MicroPay/docs/system-design/traceability.md): Feature Traceability Matrix and Requirement Traceability Matrix (RTM).
- [Phase 2 Design Validation Audit](file:///d:/Projects/Web3%20MicroPay/docs/system-design/validation.md): 9-dimension quality attribute and requirements validation report.


