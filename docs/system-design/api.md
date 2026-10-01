# Comprehensive API Specification & Interface Contracts

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Standard:** OpenAPI 3.1 / RESTful JSON  
> **Base URL:** `https://api.web3micropay.io/v1` (Production) | `http://localhost:4000/v1` (Local)

---

## 1. Global Standards & Envelope Structure

### Standard Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-10-01T18:00:00.000Z",
    "requestId": "req_c4b8-4d5e-9f1a"
  }
}
```

### Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERR_VOUCHER_NONCE_OUT_OF_ORDER",
    "message": "Submitted nonce 4 is not greater than active channel nonce 5.",
    "details": {
      "channelId": "0x98fe...",
      "expectedNonceGte": 6,
      "receivedNonce": 4
    },
    "timestamp": "2026-10-01T18:00:00.000Z"
  }
}
```

---

## 2. API Endpoint Groups

### 2.1 Authentication Module (`/auth`)

#### `POST /auth/nonce`
- **Purpose:** Issues cryptographic SIWE challenge nonce.
- **Auth:** None (Public).
- **Body:** `{ "walletAddress": "0x71C...3a9" }` (EIP-55 address format required).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "nonce": "a8f9c0e2b1d4e7f3",
      "statement": "Sign in to Web3 MicroPay to authenticate your off-chain session.",
      "issuedAt": "2026-10-01T18:00:00.000Z",
      "expiresAt": "2026-10-01T18:05:00.000Z"
    }
  }
  ```
- **Rate Limit:** 10 req/min per IP.

#### `POST /auth/verify-siwe`
- **Purpose:** Validates personal_sign signature; returns 24-hour Bearer JWT.
- **Auth:** None.
- **Body:**
  ```json
  {
    "message": "localhost:3000 wants you to sign in with your Ethereum account:\n0x71C...3a9\n...",
    "signature": "0x3a4b...89ef"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "expiresIn": 86400,
      "user": {
        "walletAddress": "0x71C...3a9",
        "role": "USER"
      }
    }
  }
  ```
- **Errors:** 401 `ERR_AUTH_INVALID_SIGNATURE`, 401 `ERR_AUTH_INVALID_NONCE`.

---

### 2.2 Payment Channels Module (`/channels`)

#### `POST /channels/register`
- **Purpose:** Registers an on-chain `openChannel` transaction for background indexer tracking.
- **Auth:** Bearer JWT (User or Merchant).
- **Headers:** `Idempotency-Key: <UUIDv4>`.
- **Body:**
  ```json
  {
    "channelId": "0x98f7e6d5c4b3a21098f7e6d5c4b3a21098f7e6d5c4b3a21098f7e6d5c4b3a210",
    "payerAddress": "0x71C...3a9",
    "recipientAddress": "0x82D...4b0",
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "depositAmount": "10000000000000000000",
    "expirationTimestamp": 1893456000,
    "disputePeriodSeconds": 86400,
    "openTxHash": "0x1234...abcd"
  }
  ```
- **Validation:** `disputePeriodSeconds >= 86400`, `depositAmount > 0`.
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "data": {
      "channelId": "0x98f...e12",
      "status": "PENDING"
    }
  }
  ```

#### `GET /channels/:channelId`
- **Purpose:** Fetches current channel balance, reserved vouchers, and on-chain status.
- **Auth:** Bearer JWT or API Key (IDOR enforced: caller must be payer or recipient).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "channelId": "0x98f...e12",
      "payerAddress": "0x71C...3a9",
      "recipientAddress": "0x82D...4b0",
      "totalDeposit": "10000000000000000000",
      "settledAmount": "2500000000000000000",
      "reservedAmount": "3000000000000000000",
      "remainingAvailable": "4500000000000000000",
      "highestNonce": 14,
      "status": "OPEN",
      "expirationTimestamp": 1893456000,
      "disputePeriodSeconds": 86400
    }
  }
  ```

---

### 2.3 Micropayment Vouchers Module (`/vouchers`)

#### `POST /vouchers/submit`
- **Purpose:** High-throughput (<50ms) voucher validation and entitlement authorization.
- **Auth:** Public / Bearer JWT.
- **Headers:** `Idempotency-Key: <channelId:nonce>`.
- **Body:**
  ```json
  {
    "channelId": "0x98f...e12",
    "payer": "0x71C...3a9",
    "recipient": "0x82D...4b0",
    "cumulativeAmount": "3050000000000000000",
    "nonce": 15,
    "validUntil": 1893456000,
    "signature": "0x5f6e...1a2b"
  }
  ```
- **Validation:**
  - `nonce > currentChannelNonce`
  - `cumulativeAmount <= totalDeposit`
  - `cumulativeAmount > settledAmount`
  - `validUntil > currentTimestamp`
  - Recovered signer equals `payer`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "voucherId": "d8e9f0a1-2345-6789-abcd-ef0123456789",
      "channelId": "0x98f...e12",
      "authorized": true,
      "deltaAmount": "50000000000000000",
      "newCumulativeAmount": "3050000000000000000",
      "remainingDeposit": "4450000000000000000"
    }
  }
  ```
- **Rate Limit:** 100 req/sec per channel.

---

### 2.4 Settlements & Relayer Module (`/settlements`)

#### `POST /settlements/claim`
- **Purpose:** Triggers on-chain claim settlement via Relayer.
- **Auth:** Merchant API Key or SIWE JWT (Caller must be recipient).
- **Body:** `{ "channelId": "0x98f...e12", "voucherId": "d8e9...6789" }`
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "data": {
      "settlementId": "e9f0a1b2-3456-7890-bcde-f0123456789a",
      "channelId": "0x98f...e12",
      "status": "QUEUED",
      "estimatedGasCostGwei": "0.12"
    }
  }
  ```

---

### 2.5 Webhooks Module (`/webhooks`)

#### `POST /webhooks/configs`
- **Purpose:** Configures merchant webhook URL and secret.
- **Auth:** Merchant API Key.
- **Body:**
  ```json
  {
    "url": "https://merchant.example.com/api/micropay",
    "subscribedEvents": ["payment.authorized", "settlement.confirmed"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "webhookId": "f0a1b2c3-4567-8901-cdef-0123456789ab",
      "hmacSecret": "whsec_98f7e6d5c4b3a210"
    }
  }
  ```

---

### 2.6 AI Advisory Module (`/ai`)

#### `POST /ai/evaluate-risk`
- **Purpose:** Asynchronous voucher velocity evaluation.
- **Auth:** Internal Service Token.
- **Body:**
  ```json
  {
    "channelId": "0x98f...e12",
    "windowMinutes": 10,
    "voucherCount": 150,
    "totalVolumeWei": "500000000000000000"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "riskScore": 12,
      "flag": "LOW_RISK",
      "reasoningTags": ["streaming_interval_uniform"]
    }
  }
  ```
