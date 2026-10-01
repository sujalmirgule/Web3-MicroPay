# Blockchain Architecture & Smart Contract Specification

> **Document Version:** 1.0.0  
> **Status:** Architecture Approved  
> **Scope:** On-Chain vs. Off-Chain Allocation, Smart Contract Architecture, EIP-712 Specification, Upgradeability

---

## 1. On-Chain vs. Off-Chain Boundary Allocation

A critical architectural failure in blockchain engineering is storing high-frequency or sensitive data on-chain. Web3 MicroPay applies a strict criterion:

| Data / Operation | Location | Justification |
| :--- | :---: | :--- |
| **Escrow Collateral (ETH / ERC-20)** | **ON-CHAIN** | Non-custodial security. Funds must be locked in a smart contract that neither party nor the platform can arbitrarily seize. |
| **Channel State (Opened, Balance, Expiry)** | **ON-CHAIN** | Authoritative source of truth for solvency and dispute settlement. |
| **Final Settlement / Claim Execution** | **ON-CHAIN** | Permanent, legally binding transfer of assets from escrow to merchant. |
| **Dispute Resolution & Expiry Refunds** | **ON-CHAIN** | Trustless fallback. If counterparty vanishes, smart contract releases funds after dispute timelock. |
| **Canonical Audit Events** | **ON-CHAIN** | Immutable event logs (`ChannelOpened`, `ChannelSettled`, etc.) for decentralized verification. |
| **Micro-Transaction Vouchers ($0.001 - $1)** | **OFF-CHAIN** | Gas costs and latency make on-chain micropayments impossible. Vouchers are signed cryptographically via EIP-712 and held off-chain. |
| **User Profiles, KYC, Contact Info** | **OFF-CHAIN** | Privacy laws (GDPR), non-reversibility, and zero business need for blockchain storage. |
| **Webhook Delivery & Notification History** | **OFF-CHAIN** | Ephemeral messaging and delivery retry logs. |
| **AI Analysis & Fraud Scores** | **OFF-CHAIN** | Non-deterministic, high compute cost, advisory in nature. |
| **API Keys & Webhook Secrets** | **OFF-CHAIN** | Confidential security credentials must never be exposed on a public ledger. |

---

## 2. Smart Contract Architecture (`MicroPayVault.sol`)

### 2.1 Design Pattern: Payment Channel with Cumulative Vouchers
Instead of settling every 5-cent transaction, the contract maintains payment channels where the payer signs **cumulative total vouchers**.
For example:
- Initial Deposit: Payer deposits $10.00 into Channel #42.
- Payment 1: Payer signs voucher for cumulative `$0.05`.
- Payment 2: Payer signs voucher for cumulative `$0.10`.
- Payment N: Payer signs voucher for cumulative `$4.50`.
- **Settlement:** The merchant submits **only the highest valid cumulative voucher** (`$4.50`) with the payer's ECDSA signature. The contract pays $4.50 to the merchant and returns remaining $5.50 to the payer (or leaves it open for further payments).

### 2.2 Smart Contract Specification

#### State Variables
- `mapping(bytes32 => Channel) public channels`: Stores channel metadata:
  ```solidity
  struct Channel {
      address payer;              // User funding the channel
      address recipient;          // Merchant receiving payments
      address token;              // address(0) for native ETH/MATIC, or ERC-20 address
      uint256 totalDeposit;       // Total funds deposited
      uint256 settledAmount;      // Cumulative amount already paid out
      uint48 expiration;          // Expiration timestamp
      uint48 disputePeriod;       // Dispute timelock window in seconds (e.g., 86400 = 24h)
      ChannelStatus status;       // OPEN, DISPUTED, CLOSED
  }
  ```
- `mapping(bytes32 => uint256) public channelNonces`: Highest processed nonce or cumulative amount to prevent replay attacks.
- `bytes32 public DOMAIN_SEPARATOR`: EIP-712 domain separator (includes `chainId` and contract address).

#### Key Functions
1. `openChannel(address recipient, address token, uint256 amount, uint48 expiration, uint48 disputePeriod) external payable returns (bytes32 channelId)`:
   - Locks native currency or transfers ERC-20 into escrow.
   - Emits `ChannelOpened(channelId, payer, recipient, token, amount, expiration)`.
2. `topUpChannel(bytes32 channelId, uint256 additionalAmount) external payable`:
   - Increases channel deposit capacity without recreating the channel.
   - Emits `ChannelToppedUp(channelId, newTotalDeposit)`.
3. `settleClaim(bytes32 channelId, uint256 cumulativeAmount, uint256 nonce, uint48 expiry, bytes calldata signature) external`:
   - Verifies channel is active and not expired.
   - Verifies `cumulativeAmount <= channel.totalDeposit`.
   - Reconstructs EIP-712 hash and recovers signer via `ECDSA.recover`.
   - Validates recovered signer matches `channel.payer`.
   - Calculates delta: `payoutDelta = cumulativeAmount - channel.settledAmount`.
   - Updates `channel.settledAmount = cumulativeAmount`.
   - Transfers `payoutDelta` to `channel.recipient`.
   - Emits `ChannelSettled(channelId, cumulativeAmount, payoutDelta)`.
4. `closeChannelCooperative(bytes32 channelId, uint256 finalAmount, bytes calldata payerSig, bytes calldata recipientSig) external`:
   - Both parties agree on final balance; contract distributes funds instantly and marks channel `CLOSED`.
5. `initiateChannelClose(bytes32 channelId) external`:
   - Either party can initiate unilateral closure.
   - Starts dispute countdown timer (`block.timestamp + channel.disputePeriod`).
   - Counterparty can submit a newer valid voucher during this dispute window.
6. `finalizeChannelClose(bytes32 channelId) external`:
   - Callable only after dispute window elapses. Remaining funds refund to payer; channel closes.

#### Key Events
- `event ChannelOpened(bytes32 indexed channelId, address indexed payer, address indexed recipient, address token, uint256 deposit, uint48 expiration)`
- `event ChannelToppedUp(bytes32 indexed channelId, uint256 newTotalDeposit)`
- `event ChannelSettled(bytes32 indexed channelId, uint256 cumulativeAmount, uint256 payoutDelta)`
- `event ChannelDisputeInitiated(bytes32 indexed channelId, uint48 disputeExpiresAt)`
- `event ChannelClosed(bytes32 indexed channelId, uint256 refundedToPayer, uint256 paidToRecipient)`

---

## 3. Cryptographic Voucher Specification (EIP-712)

Every off-chain micropayment voucher adheres strictly to the **EIP-712 Typed Structured Data** standard:

```text
EIP712Domain:
  name: "Web3MicroPayVault"
  version: "1"
  chainId: <CHAIN_ID>
  verifyingContract: <CONTRACT_ADDRESS>

MicroVoucher:
  channelId: bytes32
  payer: address
  recipient: address
  cumulativeAmount: uint256
  nonce: uint256
  validUntil: uint256
```

### Signature Verification Properties:
1. **Chain Bound:** Includes `chainId`, preventing signatures from being replayed on another EVM network (e.g., testnet vs mainnet).
2. **Contract Bound:** Includes `verifyingContract`, preventing cross-contract replays.
3. **Monotonic Nonce & Cumulative Math:** The smart contract checks `cumulativeAmount > channel.settledAmount`, preventing earlier vouchers from rolling back balance claims.

---

## 4. Smart Contract Upgradeability & Proxy Strategy

### Evaluation:
- **Option A: Immutable Factory & Direct Contracts:** Simplest, highest trust, zero proxy overhead, no storage collision risk. Upgrades occur by deploying a v2 vault and migrating/closing channels.
- **Option B: UUPS (Universal Upgradeable Proxy Standard) with Multi-Sig & Timelock:** Enables bug fixes and protocol improvements without breaking existing frontend integration addresses.

### Decision:
- For initial deployment and maximum trust, **Immutable Core Vault** is preferred for holding funds, combined with a thin **Upgradeable Relayer/Router Contract** if fee logic or batch aggregation needs future evolution.
- *Full trade-off documented in ADR-002.*
