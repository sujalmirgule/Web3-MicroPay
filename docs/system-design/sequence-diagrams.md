# Complete Sequence Diagrams (12 Core System Flows)

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** End-to-End Sequence Workflows across all 12 operational paths

---

## Flow 1: User Authentication (SIWE)
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant API as API Gateway
    participant Redis as Redis Cache
    participant DB as PostgreSQL

    User->>API: POST /auth/nonce { walletAddress }
    API->>Redis: SETEX siwe:nonce:{addr} 300 {randomNonce}
    API-->>User: 200 OK { nonce, statement }
    User->>User: Signs EIP-4361 string in wallet
    User->>API: POST /auth/verify-siwe { message, signature }
    API->>Redis: GETDEL siwe:nonce:{addr}
    API->>API: ethers.verifyMessage(message, signature)
    API->>DB: Upsert User profile
    API-->>User: 200 OK { accessToken, user }
```

---

## Flow 2: Channel Creation
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Payer
    participant Wallet as Web3 Wallet
    participant Vault as MicroPayVault.sol
    participant RPC as Blockchain RPC Node
    participant Indexer as Event Indexer
    participant DB as PostgreSQL

    User->>Wallet: Confirms openChannel(recipient, token, amount, expiry, disputePeriod)
    Wallet->>RPC: eth_sendRawTransaction
    RPC->>Vault: Executes openChannel()
    Vault-->>Vault: Locks collateral tokens; emits ChannelOpened
    RPC-->>Indexer: WebSocket Log: ChannelOpened
    Indexer->>Indexer: Verifies block confirmation depth >= 6
    Indexer->>DB: INSERT INTO payment_channels (status: 'OPEN')
```

---

## Flow 3: Channel Funding (Top-Up)
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Payer
    participant Wallet as Web3 Wallet
    participant Vault as MicroPayVault.sol
    participant Indexer as Event Indexer
    participant DB as PostgreSQL

    User->>Wallet: Confirms topUpChannel(channelId, additionalAmount)
    Wallet->>Vault: Executes topUpChannel()
    Vault-->>Vault: totalDeposit += additionalAmount; emits ChannelToppedUp
    Indexer-->>Vault: Catches ChannelToppedUp event
    Indexer->>DB: UPDATE payment_channels SET total_deposit = newTotal
```

---

## Flow 4 & Flow 5 & Flow 6: Voucher Creation, Verification & Service Delivery
```mermaid
sequenceDiagram
    autonumber
    actor User as Consumer
    participant Frontend as Web3 Client UI
    participant API as API Gateway
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    actor Merchant as Merchant Service

    User->>Frontend: Accesses paywalled article / API query ($0.05)
    Frontend->>Frontend: Computes new cumulativeAmount & increments nonce
    Frontend->>User: Prompts EIP-712 Signature
    User-->>Frontend: Returns Signature
    Frontend->>API: POST /vouchers/submit { channelId, amount, nonce, sig }
    API->>Redis: Atomic Lua Script (Check nonce > current && amount <= deposit)
    API->>API: ECDSA.recover(digest, sig) == channel.payer
    API->>Redis: Update channel:nonce & channel:reserved
    API->>DB: Insert voucher record
    API-->>Frontend: 200 OK { authorized: true }
    API->>Merchant: Delivers service entitlement notification
    Merchant-->>User: Unlocks digital content / returns API result (<100ms)
```

---

## Flow 7: Relayer Batch Claim Settlement
```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant
    participant API as API Gateway
    participant Relayer as Relayer Worker
    participant KMS as Cloud KMS
    participant Vault as MicroPayVault.sol

    Merchant->>API: POST /settlements/claim { channelId }
    API->>Relayer: Enqueues settlement task with highest voucher
    Relayer->>KMS: Signs settleClaim(channelId, cumulativeAmount, sig)
    Relayer->>Vault: Submits transaction to blockchain
    Vault->>Vault: Verifies ECDSA; transfers net tokens to Merchant
    Vault-->>Vault: Emits ChannelSettled(channelId, cumulativeAmount)
```

---

## Flow 8: Blockchain Event Indexing
```mermaid
sequenceDiagram
    autonumber
    participant RPC as Blockchain RPC Node
    participant Indexer as Event Indexer
    participant DB as PostgreSQL
    participant Outbox as Notification Outbox

    RPC-->>Indexer: Emits ChannelSettled Log
    Indexer->>RPC: eth_blockNumber (Check depth >= 6)
    Indexer->>DB: UPDATE settlements SET status = 'CONFIRMED'
    Indexer->>DB: UPDATE payment_channels SET settled_amount = cumulativeAmount
    Indexer->>Outbox: INSERT INTO notification_outbox ('settlement.confirmed')
```

---

## Flow 9: Dispute (Unilateral Close & Contest)
```mermaid
sequenceDiagram
    autonumber
    actor Payer as Payer
    participant Vault as MicroPayVault.sol
    participant Indexer as Event Indexer
    actor Merchant as Merchant / Relayer

    Payer->>Vault: initiateChannelClose(channelId)
    Vault->>Vault: status = DISPUTED; disputeExpiresAt = now + 24h
    Vault-->>Indexer: Emits ChannelDisputeInitiated
    Indexer->>Merchant: Alerts of dispute initiation
    Merchant->>Vault: settleClaim(channelId, latestCumulativeVoucher, sig)
    Vault->>Vault: Verifies voucher; pays earned funds before expiry
```

---

## Flow 10: Webhook Notification (Transactional Outbox)
```mermaid
sequenceDiagram
    autonumber
    participant Outbox as Outbox Worker
    participant DB as PostgreSQL
    actor Merchant as Merchant Endpoint

    loop Poll every 500ms
        Outbox->>DB: SELECT * FROM notification_outbox WHERE status = 'PENDING'
        Outbox->>Outbox: Computes HMAC-SHA256 signature
        Outbox->>Merchant: POST target_url with X-MicroPay-Signature
        alt HTTP 200/204
            Outbox->>DB: UPDATE notification_outbox SET status = 'DELIVERED'
        else HTTP 5xx / Timeout
            Outbox->>DB: Increment attempt; schedule exponential backoff
        end
    end
```

---

## Flow 11: Failure & Recovery (Gas Bumping Replacement)
```mermaid
sequenceDiagram
    autonumber
    participant Relayer as Relayer Worker
    participant Mempool as EVM Mempool
    participant RPC as Blockchain RPC Node

    Relayer->>Mempool: Broadcasts settleClaim (Nonce: 42, Gas: 0.1 Gwei)
    Note over Relayer,Mempool: Tx remains unmined for > 300 seconds
    Relayer->>RPC: Detects stuck transaction in mempool
    Relayer->>Mempool: Broadcasts replacement tx (Nonce: 42, Gas: 0.12 Gwei [+20%])
    Mempool->>RPC: Replacement mined in next block
```

---

## Flow 12: AI Advisory Analysis (Asynchronous Anomaly Scoring)
```mermaid
sequenceDiagram
    autonumber
    participant VoucherSrv as Voucher Service
    participant AIWorker as AI Worker Queue
    participant Gemini as Google Gemini API
    participant DB as PostgreSQL

    VoucherSrv->>AIWorker: Enqueues anonymized velocity metrics (Non-blocking)
    AIWorker->>AIWorker: Strips PII; masks wallet address
    AIWorker->>Gemini: POST /v1beta/models/gemini-1.5-flash:generateContent
    alt Gemini returns valid JSON within 3000ms
        AIWorker->>AIWorker: Zod schema validation
        AIWorker->>DB: INSERT INTO ai_evaluations (risk_score, reasoning_tags)
    else Timeout > 3000ms
        AIWorker->>AIWorker: Trips circuit breaker; applies static heuristic
        AIWorker->>DB: INSERT INTO ai_evaluations (risk_score: 0, tag: 'fallback')
    end
```
