# Developer Setup & Toolchain Specification

> **Status:** Baseline Established  
> **Host Environment:** Windows 11 (NT 10.0.26300.0) | PowerShell | Node.js v24.14.0 | npm 11.9.0 | Git 2.52.0

---

## 1. Verified Host Prerequisites

The following host tools were inspected and verified on the local system during Phase 0:

| Tool | Host Version | Status | Scope |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v24.14.0` | Verified | Host runtime |
| **npm** | `11.9.0` | Verified | Package manager |
| **Git** | `2.52.0.windows.1` | Verified | Version control |
| **Python** | `3.14.6` | Verified | Host utility |
| **Docker** | `29.5.3` (CLI) | Installed (Daemon idle) | Containerization (Optional for local dev) |
| **MySQL** | `8.0.44` | Available locally | Local database option |

---

## 2. Minimum Toolchain Plan (By Workspace Component)

Following the **Minimal Installation Rule** (Section 0.11), tools are installed project-locally within sub-workspaces as their respective implementation phases commence:

### A. Smart Contracts (`/contracts`) - *Scheduled Phase 2/3*
- **Hardhat / Viem / Foundry:** Project-local installation.
- **Solidity Compiler (`solc`):** Managed automatically via Hardhat configuration (`0.8.24+`).
- **OpenZeppelin Contracts:** Project-local dependency for battle-tested cryptographic verification (`ECDSA`, `EIP712`, `ReentrancyGuard`).

### B. Backend API & Relayer (`/backend`) - *Scheduled Phase 2/4*
- **Runtime:** Node.js v24 + TypeScript.
- **Framework:** Fastify or Express for high-throughput HTTP/REST and WebSocket.
- **ORM / Query Builder:** Prisma or Drizzle ORM for type-safe database queries.
- **Web3 Engine:** `viem` / `ethers.js` for RPC interaction, event listening, and contract execution.

### C. Frontend Web3 Client (`/frontend`) - *Scheduled Phase 2/5*
- **Framework:** React 18+ with Vite (lightweight, rapid HMR on Windows).
- **Web3 Integration:** Wagmi + Viem for wallet connection (MetaMask, Coinbase, WalletConnect) and EIP-712 typed signing.
- **Styling:** Modern Vanilla CSS / CSS Modules with rich dark theme aesthetics.

---

## 3. Installation Safety Procedure

Before installing any package:
1. Confirm the dependency is documented in an ADR or requirements matrix.
2. Confirm compatibility with Node v24.
3. Install within the target sub-workspace directory (`cd contracts && npm install ...` or `npm install --workspace=contracts ...`).
4. Verify package builds and lockfile is generated cleanly.
