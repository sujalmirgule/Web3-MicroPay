# AI Subsystem Detailed Design & Operational Guardrails

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Inference Engine:** Google Gemini 1.5 Flash (via REST API) / Local Heuristic Fallback  
> **Operational Role:** Strictly Asynchronous Off-Chain Advisory

---

## 1. AI Safety & Non-Authoritative Invariants

> **NON-NEGOTIABLE SAFETY INVARIANT:**  
> The AI subsystem has **ZERO EXECUTION PRIVILEGES**.  
> 1. An AI model **CANNOT** sign transactions or access any cryptographic keys.
> 2. An AI model **CANNOT** directly alter balances in PostgreSQL, Redis, or Smart Contracts.
> 3. An AI model **CANNOT** override a failed cryptographic signature check or authorize an over-deposit claim.

---

## 2. Data Sanitization & PII Masking Pipeline

Before any request metadata is dispatched to the Gemini API:
1. **Wallet Address Masking:** Raw 42-character addresses are truncated to `0xXXXX...YYYY` (first 6 and last 4 characters) to prevent address clustering within external model context.
2. **Network Address Stripping:** Client IP addresses, hostnames, and user agent strings are completely stripped.
3. **Value Normalization:** Numerical token amounts are converted to standard decimal float representations rather than raw high-precision hexadecimal integers.

---

## 3. Detailed Prompt Engineering & Zod Schemas

### 3.1 Velocity Risk Assessment

#### System Instruction
```text
You are the Web3 MicroPay Risk Advisory Engine.
Evaluate the provided aggregate micropayment frequency and volume metrics for anomalous or burst behavior.
Respond strictly in JSON matching the requested schema. No markdown formatting.
```

#### User Prompt Template
```json
{
  "task": "EVALUATE_VELOCITY_RISK",
  "channelId": "0x98fe...e12",
  "metrics": {
    "windowMinutes": 10,
    "voucherCount": 150,
    "averageIntervalSeconds": 4.0,
    "totalVolumeWei": "500000000000000000"
  },
  "channelCapacityWei": "10000000000000000000"
}
```

#### Output Zod Validation Schema
```typescript
import { z } from "zod";

export const VelocityRiskSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  flag: z.enum(["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK_ANOMALY"]),
  confidence: z.number().min(0).max(1),
  reasoningTags: z.array(z.string()),
  recommendedAction: z.enum(["ALLOW", "FLAG_FOR_AUDIT", "THROTTLE_BURST"])
});

export type VelocityRiskResult = z.infer<typeof VelocityRiskSchema>;
```

---

## 4. Circuit Breaker & Fallback Architecture
- **Timeout Limit:** 3,000 milliseconds.
- **Circuit Breaker States:**
  - `CLOSED` (Normal): Requests route to Gemini API.
  - `OPEN` (Tripped after 3 consecutive timeouts/5xx errors): All AI requests bypass external API and execute **Static Rule Fallback**:
    - If `voucherCountPerMinute <= 100`, assign `riskScore = 0` (Low Risk).
    - If `voucherCountPerMinute > 100`, assign `riskScore = 75` (Burst Anomaly).
  - `HALF-OPEN` (After 60s cooldown): Allows single trial request to test provider recovery.
