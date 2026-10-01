// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IMicroPayVault
 * @notice Interface for the Web3 MicroPay Escrow Vault.
 */
interface IMicroPayVault {
    enum ChannelStatus {
        NONE,
        OPEN,
        DISPUTED,
        CLOSED
    }

    struct Channel {
        address payer;
        address recipient;
        address token;              // address(0) for native ETH
        uint256 totalDeposit;
        uint256 settledAmount;
        uint48 expiration;
        uint48 disputePeriod;       // Minimum 86400 seconds (24h)
        uint48 disputeExpiresAt;
        ChannelStatus status;
    }

    // Events
    event ChannelOpened(
        bytes32 indexed channelId,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 totalDeposit,
        uint48 expiration,
        uint48 disputePeriod
    );

    event ChannelToppedUp(bytes32 indexed channelId, uint256 addedAmount, uint256 newTotalDeposit);
    event ChannelSettled(bytes32 indexed channelId, uint256 cumulativeAmount, uint256 payoutDelta);
    event ChannelDisputeInitiated(bytes32 indexed channelId, uint48 disputeExpiresAt);
    event ChannelClosed(bytes32 indexed channelId, uint256 refundedToPayer, uint256 paidToRecipient);

    // Custom Errors
    error ChannelAlreadyExists(bytes32 channelId);
    error ChannelNotFound(bytes32 channelId);
    error ChannelNotActive(bytes32 channelId, ChannelStatus status);
    error ChannelExpired(bytes32 channelId, uint48 expiration);
    error InvalidDisputePeriod(uint48 provided, uint48 minimumRequired);
    error InvalidZeroAddress();
    error InsufficientDeposit(uint256 requested, uint256 available);
    error CumulativeAmountTooLow(uint256 provided, uint256 currentSettled);
    error InvalidSignature(address recoveredSigner, address expectedPayer);
    error VoucherExpired(uint48 validUntil, uint256 blockTimestamp);
    error DisputeWindowActive(uint48 disputeExpiresAt, uint256 blockTimestamp);
    error DisputeWindowNotElapsed(uint48 disputeExpiresAt, uint256 blockTimestamp);
    error NativeTransferFailed(address recipient, uint256 amount);
    error TokenTransferFailed(address token, address to, uint256 amount);

    // Functions
    function openChannel(
        address recipient,
        address token,
        uint256 amount,
        uint48 expiration,
        uint48 disputePeriod
    ) external payable returns (bytes32 channelId);

    function topUpChannel(bytes32 channelId, uint256 additionalAmount) external payable;

    function settleClaim(
        bytes32 channelId,
        uint256 cumulativeAmount,
        uint256 nonce,
        uint48 validUntil,
        bytes calldata signature
    ) external;

    function closeChannelCooperative(
        bytes32 channelId,
        uint256 finalAmount,
        bytes calldata payerSignature,
        bytes calldata recipientSignature
    ) external;

    function initiateChannelClose(bytes32 channelId) external;

    function finalizeChannelClose(bytes32 channelId) external;

    function getChannel(bytes32 channelId) external view returns (Channel memory);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}
