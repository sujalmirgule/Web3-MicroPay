# ADR-001: Adoption of Modular Monorepo Architecture

> **Status:** Accepted  
> **Date:** 2026-10-01  
> **Deciders:** Lead Software Architect, Engineering Team

---

## Context
Web3 MicroPay requires synchronized development across three tightly coupled technical layers:
1. Solidity smart contracts (compilation artifacts, ABIs, TypeChain TypeScript typings).
2. Backend API gateway, event indexer, and settlement relayer.
3. Frontend Web3 client and merchant portal.

Managing separate repositories would create schema/ABI drift, multi-repo synchronization friction, and dependency publishing overhead.

## Decision
Adopt a **Modular Monorepo** managed via npm/pnpm workspaces with the following directory structure:
- `/contracts`: Smart contract codebase, tests, deployments, Hardhat/Foundry config.
- `/backend`: Node.js / TypeScript API, event indexer, relayer worker.
- `/frontend`: React / Vite Web3 application.
- `/shared`: Shared TypeScript types, contract ABIs, and EIP-712 definitions.
- `/docs`: Centralized architecture, security specifications, and ADRs.

## Alternatives Considered
1. **Multi-Repo:** Independent repositories for contracts, backend, and frontend.
   - *Rejected:* High synchronization overhead, ABI mismatches, complex local development orchestration.
2. **Polyglot Microservices:** Separating indexer, relayer, and API into distinct language stacks (Go/Rust/Python).
   - *Rejected:* Premature optimization. Unnecessary operational burden at initial launch.

## Advantages
- Atomic commits across smart contract changes, backend indexer handlers, and frontend hooks.
- Direct TypeScript type generation from Solidity contracts via TypeChain into `/shared`.
- Single repository for CI/CD, issue tracking, and security auditing.

## Disadvantages & Risks
- Larger repository size over time.
- Requires disciplined CI/CD path-filtering to avoid unnecessary builds.

## Future Impact
Facilitates seamless transition to Phase 2 (Detailed System Design) and unified end-to-end integration testing.
