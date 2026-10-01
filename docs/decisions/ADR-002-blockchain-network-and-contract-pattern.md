# ADR-002: Blockchain Target Network & Smart Contract Pattern

> **Status:** Accepted  
> **Date:** 2026-10-01  
> **Deciders:** Lead Software Architect, Blockchain Team

---

## Context
A micropayment infrastructure cannot operate economically on Ethereum L1 mainnet due to $2.00 - $30.00 base gas fees for escrow deposits and settlements. Furthermore, the smart contract pattern chosen determines fund safety, gas overhead, and upgradability trade-offs.

## Decision
1. **Target Blockchain Network:**
   - **Development:** Local Hardhat / Anvil node (Chain ID 31337).
   - **Staging / Testnet:** Polygon Amoy or Arbitrum Sepolia (EVM L2 testnets).
   - **Production:** High-throughput, low-fee EVM Layer-2 networks (Arbitrum One, Optimism, Base, or Polygon PoS).
2. **Smart Contract Architecture Pattern:**
   - **Vault Contract:** **Immutable Core Vault** for escrow deposits and claims.
   - **Rationale:** Storing user collateral in an immutable contract provides non-custodial cryptographic guarantees. Users know their deposited funds cannot be compromised by an upgrade key or malicious proxy pointer switch.
   - **Optional Router/Relayer:** An upgradeable router (UUPS) can optionally sit in front of the immutable vault if dynamic relayer fee splits or protocol integrations require future updates.

## Alternatives Considered
1. **Ethereum L1 Mainnet:**
   - *Rejected:* Gas fees prohibitive for channel funding and batch settlements.
2. **Full UUPS Proxy for Vault:**
   - *Rejected for Core Vault:* Storage collision risks and central point of failure (admin key compromise) weaken non-custodial user trust.

## Advantages
- L2 settlement fees are typically < $0.01 per batch settlement.
- Immutable vault guarantees zero rug-pull risk for locked collateral.
- Compatible with all standard EVM tooling (Ethers, Viem, Hardhat, Foundry).

## Disadvantages & Risks
- L2 sequencers may occasionally face temporary downtime (mitigated by multi-L2 deployment capability and dispute timelocks).
- Bug fixes in the vault require deploying a new vault instance and migrating channels.

## Future Impact
Smart contract design in Phase 2 can focus cleanly on deterministic, audited Solidity logic without proxy storage alignment hazards.
