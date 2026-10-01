// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMicroPayVault} from "./interfaces/IMicroPayVault.sol";

/**
 * @title MicroPayVault
 * @notice High-throughput, gas-efficient, non-custodial micropayment channel vault.
 * @dev Enforces EIP-712 cryptographic voucher validation, monotonic cumulative claims,
 *      and time-locked dispute resolution for native ETH and ERC-20 tokens.
 */
contract MicroPayVault is IMicroPayVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Minimum dispute timelock duration (24 hours)
    uint48 public constant MIN_DISPUTE_PERIOD = 86400;

    // EIP-712 Type Hashes
    bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant MICRO_VOUCHER_TYPEHASH = keccak256(
        "MicroVoucher(bytes32 channelId,address payer,address recipient,uint256 cumulativeAmount,uint256 nonce,uint48 validUntil)"
    );

    bytes32 public constant COOPERATIVE_CLOSE_TYPEHASH = keccak256(
        "CooperativeClose(bytes32 channelId,uint256 finalAmount)"
    );

    // EIP-712 Domain Separator
    bytes32 public immutable override DOMAIN_SEPARATOR;

    // Internal channel nonce counter for unique ID generation
    uint256 private _channelNonce;

    // Channel storage mapping
    mapping(bytes32 => Channel) public channels;

    /**
     * @notice Initializes the immutable EIP-712 domain separator.
     */
    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("Web3MicroPayVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Opens and funds a new direct payment channel.
     * @param recipient The merchant address receiving payments.
     * @param token Address of ERC-20 token, or address(0) for native ETH.
     * @param amount Total amount to deposit.
     * @param expiration Timestamp after which payer can unilaterally reclaim unsettled funds.
     * @param disputePeriod Timelock window in seconds for dispute resolution (min 86400).
     * @return channelId The unique 32-byte identifier for the channel.
     */
    function openChannel(
        address recipient,
        address token,
        uint256 amount,
        uint48 expiration,
        uint48 disputePeriod
    ) external payable override nonReentrant returns (bytes32 channelId) {
        if (recipient == address(0)) revert InvalidZeroAddress();
        if (amount == 0) revert InsufficientDeposit(0, 0);
        if (disputePeriod < MIN_DISPUTE_PERIOD) {
            revert InvalidDisputePeriod(disputePeriod, MIN_DISPUTE_PERIOD);
        }
        if (expiration <= block.timestamp + disputePeriod) {
            revert ChannelExpired(bytes32(0), expiration);
        }

        if (token == address(0)) {
            if (msg.value != amount) revert InsufficientDeposit(amount, msg.value);
        } else {
            if (msg.value != 0) revert NativeTransferFailed(address(this), msg.value);
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        channelId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                token,
                block.timestamp,
                ++_channelNonce,
                block.chainid
            )
        );

        if (channels[channelId].status != ChannelStatus.NONE) {
            revert ChannelAlreadyExists(channelId);
        }

        channels[channelId] = Channel({
            payer: msg.sender,
            recipient: recipient,
            token: token,
            totalDeposit: amount,
            settledAmount: 0,
            expiration: expiration,
            disputePeriod: disputePeriod,
            disputeExpiresAt: 0,
            status: ChannelStatus.OPEN
        });

        emit ChannelOpened(
            channelId,
            msg.sender,
            recipient,
            token,
            amount,
            expiration,
            disputePeriod
        );
    }

    /**
     * @notice Adds additional funds to an existing active channel.
     * @param channelId The unique channel identifier.
     * @param additionalAmount The additional amount to deposit.
     */
    function topUpChannel(bytes32 channelId, uint256 additionalAmount) external payable override nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.status != ChannelStatus.OPEN) {
            revert ChannelNotActive(channelId, channel.status);
        }
        if (additionalAmount == 0) revert InsufficientDeposit(0, 0);

        if (channel.token == address(0)) {
            if (msg.value != additionalAmount) revert InsufficientDeposit(additionalAmount, msg.value);
        } else {
            if (msg.value != 0) revert NativeTransferFailed(address(this), msg.value);
            IERC20(channel.token).safeTransferFrom(msg.sender, address(this), additionalAmount);
        }

        channel.totalDeposit += additionalAmount;
        emit ChannelToppedUp(channelId, additionalAmount, channel.totalDeposit);
    }

    /**
     * @notice Submits a signed cumulative voucher to settle accumulated micro-payments on-chain.
     * @dev Follows Checks-Effects-Interactions (CEI) to eliminate reentrancy.
     * @param channelId The channel identifier.
     * @param cumulativeAmount The total cumulative amount signed by the payer.
     * @param nonce Monotonically increasing voucher nonce.
     * @param validUntil Expiration timestamp of the voucher.
     * @param signature The EIP-712 cryptographic ECDSA signature from the payer.
     */
    function settleClaim(
        bytes32 channelId,
        uint256 cumulativeAmount,
        uint256 nonce,
        uint48 validUntil,
        bytes calldata signature
    ) external override nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.status != ChannelStatus.OPEN && channel.status != ChannelStatus.DISPUTED) {
            revert ChannelNotActive(channelId, channel.status);
        }
        if (channel.status == ChannelStatus.DISPUTED) {
            if (block.timestamp >= channel.disputeExpiresAt) {
                revert DisputeWindowActive(channel.disputeExpiresAt, block.timestamp);
            }
        }
        if (validUntil < block.timestamp) {
            revert VoucherExpired(validUntil, block.timestamp);
        }
        if (cumulativeAmount <= channel.settledAmount) {
            revert CumulativeAmountTooLow(cumulativeAmount, channel.settledAmount);
        }
        if (cumulativeAmount > channel.totalDeposit) {
            revert InsufficientDeposit(cumulativeAmount, channel.totalDeposit);
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                MICRO_VOUCHER_TYPEHASH,
                channelId,
                channel.payer,
                channel.recipient,
                cumulativeAmount,
                nonce,
                validUntil
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recoveredSigner = ECDSA.recover(digest, signature);
        if (recoveredSigner != channel.payer) {
            revert InvalidSignature(recoveredSigner, channel.payer);
        }

        // CEI Pattern: update state before external transfer
        uint256 payoutDelta = cumulativeAmount - channel.settledAmount;
        channel.settledAmount = cumulativeAmount;

        emit ChannelSettled(channelId, cumulativeAmount, payoutDelta);

        _transferFunds(channel.token, channel.recipient, payoutDelta);
    }

    /**
     * @notice Closes a channel cooperatively with mutual signatures from both payer and recipient.
     * @param channelId The channel identifier.
     * @param finalAmount Agreed total cumulative payment to recipient.
     * @param payerSignature Payer's signature over CooperativeClose.
     * @param recipientSignature Recipient's signature over CooperativeClose.
     */
    function closeChannelCooperative(
        bytes32 channelId,
        uint256 finalAmount,
        bytes calldata payerSignature,
        bytes calldata recipientSignature
    ) external override nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.status != ChannelStatus.OPEN && channel.status != ChannelStatus.DISPUTED) {
            revert ChannelNotActive(channelId, channel.status);
        }
        if (finalAmount < channel.settledAmount || finalAmount > channel.totalDeposit) {
            revert InsufficientDeposit(finalAmount, channel.totalDeposit);
        }

        bytes32 structHash = keccak256(
            abi.encode(COOPERATIVE_CLOSE_TYPEHASH, channelId, finalAmount)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recoveredPayer = ECDSA.recover(digest, payerSignature);
        if (recoveredPayer != channel.payer) {
            revert InvalidSignature(recoveredPayer, channel.payer);
        }

        address recoveredRecipient = ECDSA.recover(digest, recipientSignature);
        if (recoveredRecipient != channel.recipient) {
            revert InvalidSignature(recoveredRecipient, channel.recipient);
        }

        uint256 payoutDelta = finalAmount - channel.settledAmount;
        uint256 refundPayer = channel.totalDeposit - finalAmount;

        channel.status = ChannelStatus.CLOSED;
        channel.settledAmount = finalAmount;

        emit ChannelClosed(channelId, refundPayer, finalAmount);

        if (payoutDelta > 0) {
            _transferFunds(channel.token, channel.recipient, payoutDelta);
        }
        if (refundPayer > 0) {
            _transferFunds(channel.token, channel.payer, refundPayer);
        }
    }

    /**
     * @notice Initiates unilateral channel closure, starting the time-locked dispute window.
     * @param channelId The channel identifier.
     */
    function initiateChannelClose(bytes32 channelId) external override nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.status != ChannelStatus.OPEN) {
            revert ChannelNotActive(channelId, channel.status);
        }
        if (msg.sender != channel.payer && msg.sender != channel.recipient) {
            revert InvalidSignature(msg.sender, channel.payer);
        }

        channel.status = ChannelStatus.DISPUTED;
        channel.disputeExpiresAt = uint48(block.timestamp + channel.disputePeriod);

        emit ChannelDisputeInitiated(channelId, channel.disputeExpiresAt);
    }

    /**
     * @notice Finalizes channel closure after dispute period or expiration elapses.
     * @param channelId The channel identifier.
     */
    function finalizeChannelClose(bytes32 channelId) external override nonReentrant {
        Channel storage channel = channels[channelId];
        
        if (channel.status == ChannelStatus.DISPUTED) {
            if (block.timestamp < channel.disputeExpiresAt) {
                revert DisputeWindowNotElapsed(channel.disputeExpiresAt, block.timestamp);
            }
        } else if (channel.status == ChannelStatus.OPEN) {
            if (block.timestamp < channel.expiration) {
                revert ChannelNotActive(channelId, channel.status);
            }
        } else {
            revert ChannelNotActive(channelId, channel.status);
        }

        uint256 refundPayer = channel.totalDeposit - channel.settledAmount;
        channel.status = ChannelStatus.CLOSED;

        emit ChannelClosed(channelId, refundPayer, channel.settledAmount);

        if (refundPayer > 0) {
            _transferFunds(channel.token, channel.payer, refundPayer);
        }
    }

    /**
     * @notice Returns the full channel record.
     * @param channelId The unique channel identifier.
     */
    function getChannel(bytes32 channelId) external view override returns (Channel memory) {
        return channels[channelId];
    }

    /**
     * @dev Internal helper for secure native currency and ERC-20 transfers.
     */
    function _transferFunds(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert NativeTransferFailed(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
