# ADR-003: Off-Chain Micropayment Voucher Protocol (EIP-712)

> **Status:** Accepted  
> **Date:** 2026-10-01  
> **Deciders:** Lead Software Architect, Security Engineer

---

## Context
High-frequency micropayments require sub-millisecond payment authorization without generating an on-chain transaction for each micro-purchase. At the same time, merchants must be 100% guaranteed that the authorization can be legally and reliably redeemed on-chain if necessary.

## Decision
Adopt **EIP-712 Typed Structured Data Signatures** with **Cumulative Monotonic Vouchers**:
1. Users sign an off-chain typed data payload containing `(channelId, payer, recipient, cumulativeAmount, nonce, validUntil)`.
2. Vouchers are cumulative: each payment increases `cumulativeAmount` (e.g., $0.05 -> $0.10 -> $0.15).
3. The merchant or relayer only ever needs to submit the **latest signed voucher** to the smart contract to claim the entire accrued balance.

## Alternatives Considered
1. **Raw `eth_sign`:**
   - *Rejected:* Opaque hex string prompt in wallets; high phishing and user rejection risk; deprecated by major wallets.
2. **State Channels with 2-Way Multi-Sig (Full Lightning/Raiden Style):**
   - *Rejected:* Requires complex state watchtowers and counterparty online availability for every balance update. Overkill for unilateral consumer-to-merchant paywalls.
3. **Pure Web2 Prepaid Credits (Custodial):**
   - *Rejected:* Defeats Web3 value proposition; creates legal money transmitter liabilities and custody risk.

## Advantages
- **Human-Readable Signatures:** Users see clear, domain-separated payment parameters inside MetaMask/Coinbase wallet.
- **Zero Gas Cost:** Voucher creation is completely off-chain.
- **O(1) Settlement Complexity:** Settling 10,000 micropayments requires exactly ONE on-chain transaction.
- **Replay Protection:** EIP-712 domain separator includes `chainId` and `verifyingContract`.

## Disadvantages & Risks
- Offline merchant risk: If a merchant delivers content against an invalid voucher or expired channel, they cannot redeem funds. (Mitigated by backend real-time verification).

## Future Impact
Backend API and Frontend Web3 client will share identical EIP-712 schema definitions from `/shared`.
