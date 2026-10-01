# Payment Channel Lifecycle & Formal State Machine

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** On-Chain & Off-Chain Channel State Transitions, Permissions, and Timelocks

---

## 1. Formal State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING : User broadcasts openChannel() tx
    PENDING --> OPEN : Indexer detects 6 block confirmations
    
    state OPEN {
        [*] --> ACTIVE : Ready for micropayments
        ACTIVE --> ACTIVE : Emit/Ingest Micro-Vouchers (Off-Chain)
        ACTIVE --> ACTIVE : topUpChannel() (On-Chain)
        ACTIVE --> SETTLING : submit settleClaim() (On-Chain)
        SETTLING --> ACTIVE : Claims paid; channel remains open
    }

    OPEN --> CLOSED : closeChannelCooperative() (Mutual signatures)
    OPEN --> DISPUTED : initiateChannelClose() (Unilateral exit)

    state DISPUTED {
        [*] --> COUNTDOWN : 24h dispute window active
        COUNTDOWN --> DISPUTED : settleClaim() (Merchant submits newer voucher)
        COUNTDOWN --> CLOSED : finalizeChannelClose() (Dispute window expired)
    }

    OPEN --> EXPIRED : block.timestamp >= expirationTimestamp
    EXPIRED --> CLOSED : finalizeChannelClose() (Full refund to payer)
    CLOSED --> [*]
```

---

## 2. State Transition Specification Table

| From State | To State | Trigger / Function | Caller | Preconditions | On-Chain State Mutations | Emitted Event |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`NONE`** | **`PENDING`** | `openChannel()` broadcast | Payer | Tokens approved; `deposit > 0`; `disputePeriod >= 86400`. | Tokens locked in vault contract. | `ChannelOpened` |
| **`PENDING`** | **`OPEN`** | 6 Block Confirmations | Indexer | Block depth reached. | Database status updated to `OPEN`. | None |
| **`OPEN`** | **`OPEN`** | `topUpChannel()` | Payer | Additional tokens approved. | `totalDeposit += addedAmount`. | `ChannelToppedUp` |
| **`OPEN`** | **`OPEN`** | `settleClaim()` | Recipient / Relayer | Valid EIP-712 signature; `amount > settledAmount`. | `settledAmount = amount`; net tokens transferred to Recipient. | `ChannelSettled` |
| **`OPEN`** | **`CLOSED`** | `closeChannelCooperative()` | Either | Mutual valid signatures from both Payer and Recipient. | Net tokens to Recipient; remaining refund to Payer; `status = CLOSED`. | `ChannelClosed` |
| **`OPEN`** | **`DISPUTED`**| `initiateChannelClose()` | Payer or Recipient | Channel active; not expired. | `status = DISPUTED`; `disputeExpiresAt = now + disputePeriod`. | `ChannelDisputeInitiated` |
| **`DISPUTED`**| **`DISPUTED`**| `settleClaim()` | Recipient / Relayer | `now < disputeExpiresAt`; valid newer voucher. | `settledAmount = amount`; net tokens to Recipient. | `ChannelSettled` |
| **`DISPUTED`**| **`CLOSED`** | `finalizeChannelClose()` | Anyone | `now >= disputeExpiresAt`. | Remaining balance refunded to Payer; `status = CLOSED`. | `ChannelClosed` |
| **`OPEN`** | **`CLOSED`** | `finalizeChannelClose()` | Payer | `now >= expirationTimestamp`. | Unsettled balance refunded to Payer; `status = CLOSED`. | `ChannelClosed` |

---

## 3. Operational Invariants
1. **Solvency Invariant:** At all times on-chain:
   $$\text{contractTokenBalance} \ge \sum (\text{totalDeposit}_i - \text{settledAmount}_i)$$
2. **Monotonic Settled Amount:** `channel.settledAmount` can only increase or remain unchanged; it can never decrease.
3. **Dispute Safety Guarantee:** A payer can never exit instantly without the recipient having at least 24 hours to contest with a valid signed voucher.
