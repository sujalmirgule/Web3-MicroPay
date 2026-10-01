# System Data-Flow Diagrams & Trust Boundaries

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Notation:** Gane & Sarson / Structured Analysis with Trust Boundaries

---

## 1. Level 0 System Context Data-Flow Diagram

```mermaid
flowchart TD
    subgraph "Untrusted Client Domain"
        PAYER["User / Payer"]
        MERCHANT["Merchant / Service Provider"]
    end

    subgraph "Trust Boundary: Web3 MicroPay Backend VPC"
        GATEWAY["API Gateway & Reverse Proxy"]
        LEDGER_PROC["Voucher Ledger & Channel Processor"]
        RELAYER_PROC["Settlement & Relayer Engine"]
        INDEXER_PROC["Blockchain Event Indexer"]
        NOTIF_PROC["Webhook Outbox Worker"]
        
        DB[("PostgreSQL Transactional Store")]
        REDIS[("Redis In-Memory State")]
    end

    subgraph "External Advisory Trust Boundary"
        AI_SERVICE["Google Gemini AI API"]
    end

    subgraph "Trust Boundary: Decentralized Blockchain Consensus"
        VAULT["Smart Contract Vault (EVM L2)"]
    end

    PAYER -->|"1. EIP-712 Signed Vouchers"| GATEWAY
    MERCHANT -->|"2. Settlement Claim Requests"| GATEWAY
    GATEWAY <--> LEDGER_PROC
    LEDGER_PROC <--> REDIS
    LEDGER_PROC <--> DB

    LEDGER_PROC -.->|"Asynchronous Metrics (Redacted)"| AI_SERVICE
    AI_SERVICE -.->|"Risk Scores & Gas Hints"| LEDGER_PROC

    RELAYER_PROC <--> DB
    RELAYER_PROC -->|"3. On-Chain Settle Claims"| VAULT
    VAULT -->|"4. Raw Event Logs"| INDEXER_PROC
    INDEXER_PROC --> DB

    DB --> NOTIF_PROC
    NOTIF_PROC -->|"5. HMAC Signed Webhooks"| MERCHANT
```

---

## 2. Level 1 Data-Flow Diagrams

### 2.1 Level 1 Payment & Voucher Ingestion Flow
```mermaid
flowchart LR
    P[Payer Client] -->|Voucher Payload| V1[Validate Schema & Types]
    V1 -->|Valid JSON| V2[Atomic Nonce Check - Redis]
    V2 -->|Nonce > Current| V3[ECDSA Signature Recovery]
    V3 -->|Signer == Payer| V4[Check Capacity <= Total Deposit]
    V4 -->|Within Capacity| V5[Commit Voucher to PostgreSQL]
    V5 -->|Success| RESP[Return 200 Authorized to Merchant]
```

### 2.2 Level 1 Settlement Flow
```mermaid
flowchart LR
    M[Merchant Claim] --> S1[Query Highest Unsettled Voucher]
    S1 --> S2[Gas Price Estimator & EIP-1559 Formatter]
    S2 --> S3[Cloud KMS Signer]
    S3 --> S4[Broadcast Tx to EVM RPC]
    S4 --> S5[Mempool Confirmation Monitor]
    S5 -->|Confirmed| S6[Write Settlement Receipt to DB]
```

### 2.3 Level 1 Blockchain Indexing Flow
```mermaid
flowchart LR
    RPC[RPC WebSocket] --> L1[Extract Log Topics & Data]
    L1 --> L2[Check Block Depth >= 6]
    L2 --> L3[Idempotency Check: uq_tx_log_index]
    L3 --> L4[Update Channel & Voucher DB States]
    L4 --> L5[Insert Outbox Webhook Record]
```

### 2.4 Level 1 Notification Flow
```mermaid
flowchart LR
    OUTBOX[(Notification Outbox Table)] --> N1[Poll Pending Outbox Records]
    N1 --> N2[Generate HMAC-SHA256 Signature]
    N2 --> N3[HTTP POST to Merchant Webhook URL]
    N3 -->|200 OK| N4[Mark Status DELIVERED]
    N3 -->|5xx / Timeout| N5[Increment Attempts & Schedule Exponential Backoff]
```

---

## 3. Trust Boundary Definitions
1. **Client Trust Boundary:** The user's browser and wallet are considered untrusted environments. All inputs undergo strict cryptographic recovery and validation on the backend.
2. **Backend VPC Trust Boundary:** Private subnet containing API nodes, PostgreSQL, Redis, and KMS connection agents. Access is strictly governed via IAM and TLS 1.3.
3. **External AI Trust Boundary:** Third-party cloud LLM. Read-only advisory role; receives zero PII; has zero access to private keys or database credentials.
4. **Blockchain Consensus Trust Boundary:** The EVM Layer-2 network is the ultimate arbiter of fund solvency and dispute resolution.
