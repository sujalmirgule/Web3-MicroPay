# ADR-004: Database & Persistence Strategy

> **Status:** Accepted  
> **Date:** 2026-10-01  
> **Deciders:** Lead Software Architect, Backend Lead

---

## Context
Web3 MicroPay requires high-concurrency ingestion of micro-vouchers, atomic updates of channel states, guaranteed indexing of blockchain events, and persistent financial audit logging.

## Decision
Adopt a **Dual-Store Architecture**:
1. **Primary Transactional Store: PostgreSQL (v15+)**
   - Stores users, merchant profiles, channel metadata, finalized settlement receipts, audit logs, and notification outbox tables.
   - Leverages strict relational integrity, ACID transactions, and JSONB fields for EVM event logs and AI metadata.
   - Version-controlled schema migrations via Prisma or Drizzle ORM.
2. **Ephemeral / High-Speed Cache: Redis (v7+)**
   - Tracks real-time channel sequence nonces, active rate limits, and ephemeral pub/sub event broadcasting.

## Alternatives Considered
1. **MongoDB / NoSQL Only:**
   - *Rejected:* Lacks strict relational constraints and ACID guarantees required for financial accounting and outbox patterns.
2. **Pure Blockchain Storage (No Off-chain DB):**
   - *Rejected:* Cannot query off-chain vouchers, merchant analytics, or notification histories without prohibitive indexing latency.

## Advantages
- Relational guarantees prevent double-crediting or ledger corruption.
- Transactional Outbox pattern guarantees at-least-once webhook delivery.
- Redis caching delivers sub-10ms voucher verification latency.

## Disadvantages & Risks
- Operational overhead of running two datastores in production (mitigated by managed cloud services like AWS RDS and ElastiCache).

## Future Impact
Forms the baseline for the Detailed Database Schema and ERD to be designed in Phase 2.
