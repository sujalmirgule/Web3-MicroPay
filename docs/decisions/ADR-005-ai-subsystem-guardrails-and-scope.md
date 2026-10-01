# ADR-005: AI Subsystem Guardrails, Boundary & Scope

> **Status:** Accepted  
> **Date:** 2026-10-01  
> **Deciders:** Lead Software Architect, AI Lead, Security Lead

---

## Context
AI provides powerful capabilities for fraud analysis, transaction velocity anomaly detection, and gas price prediction. However, integrating AI into a financial Web3 application introduces serious risks: non-deterministic execution, prompt injection, hallucinated outputs, latency spikes, and potential unauthorized balance manipulation if granted execution rights.

## Decision
The AI Subsystem is strictly constrained to an **Off-Chain Advisory Role**:
1. **Zero Execution Authority:** AI models cannot sign transactions, trigger smart contract calls, release funds, or mutate financial state.
2. **Deterministic Pre- and Post-Filters:** All requests must satisfy deterministic cryptographic signature and balance checks before AI scoring; all AI outputs pass through strict JSON schema validation.
3. **Fail-Open / Heuristic Fallback:** If the external AI service times out (>3000ms) or is unreachable, the system fails open to deterministic static rules without interrupting micropayment throughput.
4. **Data Redaction:** No user private keys, wallet seed phrases, passwords, or PII are ever exposed to the AI inference pipeline.

## Alternatives Considered
1. **Autonomous AI Relayer Agent (Agentic Execution):**
   - *Rejected:* High risk of prompt injection or model error causing financial drainage or invalid transaction broadcast.
2. **No AI Subsystem:**
   - *Rejected:* Leaves merchants vulnerable to high-velocity voucher abuse and misses significant gas-saving opportunities for batch settlements.

## Advantages
- Eliminates financial loss risks from AI hallucinations or adversarial prompt injections.
- Maintains sub-100ms micropayment delivery latency via asynchronous scoring.
- Enhances merchant UX with intelligent gas prediction and automated dispute summaries.

## Disadvantages & Risks
- Cloud LLM API costs (mitigated by caching and using cost-efficient models like Gemini 1.5 Flash).

## Future Impact
Phase 2 detailed design will specify the exact JSON schemas for AI risk payloads and relayer gas estimation prompts.
