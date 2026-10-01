# Authentication & Authorization Technical Specification

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Standard:** EIP-4361 (Sign-In with Ethereum - SIWE) & RFC 7519 (JWT)

---

## 1. End-to-End SIWE Lifecycle

```text
[User Browser]                  [API Gateway]                [Redis Cache]           [PostgreSQL]
      │                               │                           │                       │
      │── 1. POST /auth/nonce ───────►│                           │                       │
      │                               │── 2. SETEX nonce (5m) ───►│                       │
      │◄── 3. Return Nonce ───────────│                           │                       │
      │                               │                           │                       │
      │   (User signs EIP-4361        │                           │                       │
      │    message in wallet)         │                           │                       │
      │                               │                           │                       │
      │── 4. POST /auth/verify-siwe ─►│                           │                       │
      │                               │── 5. GET & DEL nonce ────►│                       │
      │                               │                           │                       │
      │                               │── 6. Recover Signer       │                       │
      │                               │      (verify matches)     │                       │
      │                               │                           │                       │
      │                               │── 7. Upsert User ────────────────────────────────►│
      │                               │                           │                       │
      │                               │── 8. Issue JWT (24h)      │                       │
      │◄── 9. Return Access Token ────│                           │                       │
```

---

## 2. Nonce Generation & Replay Protection
1. **Entropy:** 16-byte cryptographically secure random hexadecimal string (`crypto.randomBytes(16).toString("hex")`).
2. **Storage Key:** `siwe:nonce:{walletAddress}`.
3. **Time-To-Live:** 300 seconds (5 minutes).
4. **Single-Use Enforcement:** The nonce is deleted from Redis immediately upon read during signature verification (`GETDEL` command). Any replayed signature with the same nonce fails.

---

## 3. JWT Token Architecture & Claims

### 3.1 Token Header & Payload
```json
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "0x71C...3a9",
  "userId": "c1f2e3d4-5678-90ab-cdef-1234567890ab",
  "role": "USER",
  "chainId": 42161,
  "iat": 1790877600,
  "exp": 1790964000,
  "iss": "web3micropay.io"
}
```

### 3.2 Secret Management
- Development: Loaded via `JWT_SECRET` in `.env`.
- Production: 256-bit secret stored in AWS Secrets Manager or KMS; rotated every 90 days.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Route Pattern | Public | User (Payer) | Merchant (Recipient) | Administrator | Internal Service (Relayer/Worker) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `POST /auth/*` | **ALLOW** | ALLOW | ALLOW | ALLOW | ALLOW |
| `POST /channels/register` | DENY | **ALLOW** | **ALLOW** | ALLOW | DENY |
| `GET /channels/:id` | DENY | **ALLOW (Own)** | **ALLOW (Own)** | **ALLOW (All)** | **ALLOW (All)** |
| `POST /vouchers/submit` | **ALLOW** | **ALLOW** | **ALLOW** | ALLOW | ALLOW |
| `POST /settlements/claim` | DENY | DENY | **ALLOW (Own)** | ALLOW | **ALLOW (Authorized)** |
| `POST /webhooks/configs` | DENY | DENY | **ALLOW (Own)** | ALLOW | DENY |
| `POST /admin/*` | DENY | DENY | DENY | **ALLOW (MFA)** | DENY |
| `POST /ai/*` | DENY | DENY | DENY | DENY | **ALLOW (Service Token)** |

---

## 5. Machine-to-Machine Merchant Authentication

Merchants integrating via backend API services use standard API Keys:
1. Keys formatted as: `mp_live_32charHex` or `mp_test_32charHex`.
2. Hashed immediately using SHA-256 before storage: `api_key_hash = sha256(rawKey)`.
3. Inbound request validates `X-API-Key` by hashing and querying `merchants.api_key_hash`.
