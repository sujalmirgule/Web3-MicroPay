# Blockchain Event Indexer Specification

> **Document Version:** 1.0.0  
> **Status:** Detailed Design Complete  
> **Service:** `MOD-INDEXER` (Standalone Node.js / TypeScript Worker)  
> **Provider Interface:** WebSocket & JSON-RPC (Viem / Ethers)

---

## 1. Event Ingestion Pipeline

```text
[Blockchain WebSocket Log]
          │
          ▼
[1. Event Signature Decoding] ──► (ABI Decoder: ChannelOpened, ChannelSettled, etc.)
          │
          ▼
[2. Block Confirmation Check] ──► (headBlock - logBlock >= 6? If not, queue in memory)
          │
          ▼
[3. Idempotency Check (DB)]   ──► (uq_tx_log_index exists? Skip duplicate)
          │
          ▼
[4. Atomic DB State Mutation] ──► (Update payment_channels, vouchers, settlements)
          │
          ▼
[5. Transactional Outbox Insert]► (Insert webhook record into notification_outbox)
          │
          ▼
[6. Checkpoint Commit]        ──► (Update blockchain_sync_state.last_indexed_block)
```

---

## 2. Reorganization (Reorg) & Confirmation Depth Policy
- **Confirmation Depth:** 
  - EVM Layer-2 (Arbitrum / Base / Optimism): **6 blocks** (approx. 12 seconds).
  - EVM Layer-1 (Sepolia / Mainnet): **12 blocks** (approx. 2.5 minutes).
- **Reorg Detection:** The indexer tracks block hashes for the last 50 processed blocks. If the parent hash of block $N$ does not match block $N-1$, a reorg is flagged:
  1. The indexer halts forward ingestion.
  2. Rolls back database states for orphaned blocks.
  3. Re-indexes the canonical chain branch.

---

## 3. Downtime Recovery & Back-Fill Process
- On service initialization, the indexer queries:
  ```sql
  SELECT COALESCE(MAX(block_number), <DEPLOYMENT_BLOCK>) FROM blockchain_events;
  ```
- Uses `eth_getLogs` with chunk sizes of 1,000 blocks to back-fill missed events up to current chain head before establishing real-time WebSocket subscriptions.

---

## 4. Lag Monitoring & Alerting
- A health probe calculates: `indexerLag = currentChainHead - lastIndexedBlock`.
- **Threshold 1 (Warning):** If `indexerLag > 5 blocks`, logs warning to Pino.
- **Threshold 2 (Critical):** If `indexerLag > 15 blocks`, triggers high-priority PagerDuty incident alert.
