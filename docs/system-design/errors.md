# Unified Error Architecture, Idempotency & Retry Specification

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Scope:** Standardized Application Error Codes, Retry Policies, and Idempotency Guarantees

---

## 1. Unified Application Error Catalog

| Category | Error Code | HTTP Status | User-Facing Message | Internal Log Level | Retryable? |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Validation** | `ERR_VALIDATION_FAILED` | 400 | "Request payload failed schema validation." | WARN | No |
| **Auth** | `ERR_AUTH_INVALID_NONCE` | 401 | "Login challenge expired. Please re-authenticate." | WARN | No |
| **Auth** | `ERR_AUTH_INVALID_SIGNATURE`| 401 | "Wallet signature verification failed." | WARN | No |
| **Auth** | `ERR_AUTH_TOKEN_EXPIRED` | 401 | "Session token expired. Please refresh." | INFO | No |
| **Auth** | `ERR_FORBIDDEN_RESOURCE` | 403 | "You do not have access to this resource." | WARN | No |
| **Channel** | `ERR_CHANNEL_NOT_FOUND` | 404 | "Payment channel does not exist." | WARN | No |
| **Channel** | `ERR_CHANNEL_NOT_ACTIVE` | 400 | "Payment channel is not open for payments." | WARN | No |
| **Channel** | `ERR_CHANNEL_EXPIRED` | 400 | "Payment channel has expired." | WARN | No |
| **Voucher** | `ERR_VOUCHER_NONCE_STALE` | 400 | "Voucher nonce is not greater than active channel nonce." | WARN | No |
| **Voucher** | `ERR_VOUCHER_OVER_CAPACITY` | 400 | "Payment exceeds channel deposit capacity." | WARN | No |
| **Voucher** | `ERR_VOUCHER_SIGNATURE_FAIL`| 400 | "Cryptographic voucher signature is invalid." | WARN | No |
| **Settlement** | `ERR_SETTLEMENT_IN_FLIGHT` | 409 | "A settlement transaction is currently in mempool." | WARN | Yes (after 60s)|
| **Relayer** | `ERR_RELAYER_LOW_BALANCE` | 502 | "Relayer gas reserve low. Operator alerted." | ERROR | Yes (automated)|
| **Blockchain** | `ERR_RPC_TIMEOUT` | 503 | "Blockchain RPC connection timed out." | ERROR | Yes |
| **Blockchain** | `ERR_TX_REVERTED` | 500 | "On-chain transaction execution reverted." | ERROR | No |
| **Database** | `ERR_DATABASE_UNAVAILABLE` | 500 | "Transactional store temporarily unavailable." | ERROR | Yes |
| **AI** | `ERR_AI_INFERENCE_TIMEOUT`| 200 | "AI advisory timed out; falling back to heuristic."| INFO | Yes (advisory) |
| **Rate Limit** | `ERR_RATE_LIMIT_EXCEEDED` | 429 | "Rate limit exceeded. Please back off." | WARN | Yes (after window)|

---

## 2. Idempotency Key Specification & Deduplication Mechanism

All state-mutating operations require an **Idempotency Key**:
1. **Header Format:** `Idempotency-Key: <UUIDv4>` (or `channelId:nonce` for vouchers).
2. **Storage Location:** Redis key `idempotency:{key}` with a **24-hour TTL**.
3. **Execution Semantics:**
   - **First Arrival:** The key is locked with state `IN_PROGRESS`.
   - **Success:** The key is updated with `{ statusCode, responseBody, timestamp }`.
   - **Subsequent Identical Requests:** The API returns the cached response immediately with header `X-Cache-Lookup: HIT` without re-executing business logic or financial mutations.
   - **Concurrent Duplicate Arrival:** If a request arrives while the original is still `IN_PROGRESS`, the gateway returns `409 Conflict` with message "Request currently processing".

---

## 3. Retry Policies Matrix

| Operation | Trigger | Strategy | Max Retries | Backoff Multiplier | Action on Final Failure |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Voucher Submission** | Network timeout / 5xx | Client retries with same nonce | 3 | Exponential (100ms, 300ms, 1s) | User notified to retry |
| **Relayer Settlement** | Mempool pending > 300s | Gas bumping (+20% priority fee) | 3 | Every 5 minutes | Alert on-call engineer |
| **Blockchain Indexer** | WebSocket drop / 429 | Multi-RPC failover & reconnect | Infinite | Linear (2s, 4s, 8s, max 30s) | Switch to secondary RPC |
| **Webhook Delivery** | Merchant 5xx / timeout | Transactional outbox queue | 5 | Exponential (5s, 30s, 5m, 1h) | Move to `DEAD_LETTER` queue |
| **AI Inference** | Timeout (> 3000ms) | Zero retry (Fast fallback) | 0 | Immediate fallback | Static heuristic scoring |
