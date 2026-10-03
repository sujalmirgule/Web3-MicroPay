import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { NetworkBanner } from "./components/layout/NetworkBanner";
import { CreateChannelModal } from "./components/channels/CreateChannelModal";
import { TopUpModal } from "./components/channels/TopUpModal";
import { AiAdvisoryDrawer } from "./components/ai/AiAdvisoryDrawer";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { useWallet, SEPOLIA_CHAIN_ID } from "./context/WalletContext";
import { useAuth } from "./context/AuthContext";
import { useNotifications } from "./context/NotificationContext";
import { apiClient, ChannelItem } from "./api/client";
import { formatEth, truncateAddress, truncateHash } from "./utils/formatters";
import { isValidPositiveAmount } from "./utils/validators";
import { DEPLOYMENT_INFO, MicroVoucher } from "@web3-micropay/shared";
import { ethers } from "ethers";

// Voucher History Component and Types
import { VoucherHistory, VoucherRecord } from "./components/vouchers/VoucherHistory";

// Product-facing pages
import { LandingPage } from "./pages/LandingPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";

import {
  Wallet,
  ShieldCheck,
  CreditCard,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Send,
  AlertCircle,
  FileCheck2,
  Lock,
  Layers,
  Activity,
  Coins,
} from "lucide-react";

interface VoucherAmountStatusDisplayProps {
  channelDepositEth: string;
  voucherAmountEth: string;
  remainingBalanceEth: string;
  isAmountExceedingDeposit: boolean;
  voucherAmountError: {
    message: string;
    channelDeposit: string;
    voucherAmount: string;
    maxAllowed: string;
  } | null;
  onChangeAmount: () => void;
}

const VoucherAmountStatusDisplay: React.FC<VoucherAmountStatusDisplayProps> = ({
  channelDepositEth,
  voucherAmountEth,
  remainingBalanceEth,
  isAmountExceedingDeposit,
  voucherAmountError,
  onChangeAmount,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Dynamic Breakdown */}
      <div
        style={{
          padding: "14px",
          backgroundColor: "var(--bg-tertiary)",
          borderRadius: "8px",
          border: isAmountExceedingDeposit ? "1px solid var(--status-error)" : "1px solid var(--border-subtle)",
          fontSize: "13px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>Channel Deposit:</span>
          <strong style={{ color: "var(--text-primary)" }}>{channelDepositEth} ETH</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>Voucher Cumulative Amount:</span>
          <strong style={{ color: isAmountExceedingDeposit ? "var(--status-error)" : "var(--brand-primary)" }}>
            {voucherAmountEth || "0"} ETH
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>Remaining Available:</span>
          <strong style={{ color: isAmountExceedingDeposit ? "var(--status-error)" : "var(--status-success)" }}>
            {remainingBalanceEth} ETH
          </strong>
        </div>

        <div
          style={{
            marginTop: "4px",
            paddingTop: "8px",
            borderTop: "1px solid var(--border-subtle)",
            fontWeight: 600,
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: isAmountExceedingDeposit ? "var(--status-error)" : "var(--status-success)",
          }}
        >
          {isAmountExceedingDeposit ? (
            <span>✕ Amount exceeds available channel balance</span>
          ) : (
            <span>✓ Amount within channel balance</span>
          )}
        </div>
      </div>

      {/* Safety Invariant Rejection Warning Box */}
      {(isAmountExceedingDeposit || voucherAmountError) && (
        <div
          style={{
            padding: "14px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--status-error)", fontWeight: 700, fontSize: "14px" }}>
            <AlertCircle size={16} />
            <span>Voucher amount exceeds the channel deposit.</span>
          </div>

          <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>Channel Deposit: <strong style={{ color: "var(--text-primary)" }}>{voucherAmountError?.channelDeposit || `${channelDepositEth} ETH`}</strong></div>
            <div>Voucher Amount: <strong style={{ color: "var(--status-error)" }}>{voucherAmountError?.voucherAmount || `${voucherAmountEth} ETH`}</strong></div>
            <div>Maximum Allowed: <strong style={{ color: "var(--status-success)" }}>{voucherAmountError?.maxAllowed || `${channelDepositEth} ETH`}</strong></div>
          </div>

          <button
            type="button"
            onClick={onChangeAmount}
            className="btn btn-outline btn-sm"
            style={{
              marginTop: "4px",
              alignSelf: "flex-start",
              color: "var(--status-error)",
              borderColor: "rgba(239, 68, 68, 0.4)",
            }}
          >
            Change Amount
          </button>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const {
    address,
    chainId,
    balance,
    isConnected,
    isWrongNetwork,
    connectWallet,
    client,
    provider,
  } = useWallet();
  const { isAuthenticated, user, logout } = useAuth();
  const { showToast, addNotification } = useNotifications();

  // Navigation & Browser URL synchronization
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path && path !== "") return path;
    }
    return "/";
  });

  const navigate = useCallback((path: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Modal and Drawer state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTopUpChannel, setSelectedTopUpChannel] = useState<ChannelItem | null>(null);

  // Channel & Payment States
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedChannelState, setSelectedChannelState] = useState<any>(null);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Voucher Generator State
  const voucherAmountInputRef = useRef<HTMLInputElement>(null);
  const [voucherAmountEth, setVoucherAmountEth] = useState<string>("0.001");
  const [voucherNonce, setVoucherNonce] = useState<number>(1);
  const [isSigningVoucher, setIsSigningVoucher] = useState(false);
  const [signedVoucher, setSignedVoucher] = useState<MicroVoucher | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmittingToBackend, setIsSubmittingToBackend] = useState(false);
  const [backendSubmissionStatus, setBackendSubmissionStatus] = useState<string | null>(null);

  // Pre-signing Validation Warning State
  const [voucherAmountError, setVoucherAmountError] = useState<{
    message: string;
    channelDeposit: string;
    voucherAmount: string;
    maxAllowed: string;
  } | null>(null);

  // Voucher History Array State (Preserves all historical records, never overwritten)
  const [voucherHistory, setVoucherHistory] = useState<VoucherRecord[]>(() => {
    try {
      const saved = localStorage.getItem("micropay_voucher_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn("Could not load voucher history from localStorage:", err);
    }
    return [];
  });

  // Persist voucher history array across browser refreshes
  useEffect(() => {
    try {
      localStorage.setItem("micropay_voucher_history", JSON.stringify(voucherHistory));
    } catch (err) {
      console.warn("Could not persist voucher history to localStorage:", err);
    }
  }, [voucherHistory]);

  // Settlement State
  const [isSettling, setIsSettling] = useState(false);
  const [settleTxHash, setSettleTxHash] = useState<string | null>(null);
  const [settleStatus, setSettleStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [confirmedSettlementReceipt, setConfirmedSettlementReceipt] = useState<any>(null);

  const vaultAddress =
    (import.meta as any).env?.VITE_MICROPAY_VAULT_ADDRESS ||
    DEPLOYMENT_INFO?.vaultAddress ||
    "0x7BD8202051Ed9499489e7b9992b4d7D62a3A3C86";

  // Selected channel object from channels list
  const selectedChannel = channels.find(
    (c) => c.channelId.toLowerCase() === selectedChannelId.toLowerCase()
  );

  // Read channel deposit accurately (from on-chain state if loaded, else channel item)
  const channelDepositWei: bigint = (() => {
    if (selectedChannelState?.totalDeposit && selectedChannelState.totalDeposit !== "0") {
      try {
        return BigInt(selectedChannelState.totalDeposit);
      } catch {
        // fallback
      }
    }
    if (selectedChannel?.totalDeposit && selectedChannel.totalDeposit !== "0") {
      try {
        return BigInt(selectedChannel.totalDeposit);
      } catch {
        // fallback
      }
    }
    return BigInt(0);
  })();

  const channelDepositEth: string =
    channelDepositWei > BigInt(0) ? ethers.formatEther(channelDepositWei) : "0.0";

  // Parsed cumulative amount entered in input
  const parsedVoucherWei: bigint = (() => {
    try {
      if (voucherAmountEth && isValidPositiveAmount(voucherAmountEth)) {
        return ethers.parseEther(voucherAmountEth);
      }
    } catch {
      // invalid input
    }
    return BigInt(0);
  })();

  // Critical Invariant: cumulativeVoucherAmount <= channelDeposit
  const isAmountExceedingDeposit: boolean =
    channelDepositWei > BigInt(0) && parsedVoucherWei > channelDepositWei;

  // Remaining available channel balance = channelDeposit - cumulativeVoucherAmount
  const remainingBalanceWei: bigint =
    channelDepositWei >= parsedVoucherWei ? channelDepositWei - parsedVoucherWei : BigInt(0);
  const remainingBalanceEth: string = ethers.formatEther(remainingBalanceWei);

  // Sign Voucher button enablement
  const isVoucherAmountValid: boolean =
    Boolean(voucherAmountEth) &&
    isValidPositiveAmount(voucherAmountEth) &&
    parsedVoucherWei > BigInt(0) &&
    !isAmountExceedingDeposit;

  // Handler to stage a voucher from history for settlement
  const handleSelectForSettlement = (record: VoucherRecord) => {
    setSignedVoucher({
      channelId: record.channelId as `0x${string}`,
      payer: record.sender as `0x${string}`,
      recipient: record.receiver as `0x${string}`,
      cumulativeAmount: record.cumulativeAmount,
      nonce: record.nonce,
      validUntil: record.validUntil,
      signature: record.signature as `0x${string}`,
    });
    setSelectedChannelId(record.channelId);
    showToast(`Staged Voucher #${record.nonce} for on-chain settlement.`, "info");
    navigate("/dashboard/transactions");
  };

  // Handler for Change Amount button
  const handleChangeAmount = () => {
    setVoucherAmountEth(channelDepositEth);
    setVoucherAmountError(null);
    voucherAmountInputRef.current?.focus();
  };

  // Load channels from local storage or backend
  const loadChannels = useCallback(async () => {
    if (!address) return;
    setIsLoadingChannels(true);
    try {
      let loaded: ChannelItem[] = [];
      if (isAuthenticated) {
        try {
          loaded = await apiClient.listChannels();
        } catch {
          // ignore backend fallback
        }
      }

      // Supplement with browser local state
      const localChannelsKey = `micropay_channels_${address.toLowerCase()}`;
      const saved = localStorage.getItem(localChannelsKey);
      if (saved) {
        try {
          const parsed: ChannelItem[] = JSON.parse(saved);
          const map = new Map<string, ChannelItem>();
          loaded.forEach((c) => map.set(c.channelId.toLowerCase(), c));
          parsed.forEach((c) => {
            if (!map.has(c.channelId.toLowerCase())) map.set(c.channelId.toLowerCase(), c);
          });
          loaded = Array.from(map.values());
        } catch {
          // ignore
        }
      }

      setChannels(loaded);
      if (loaded.length > 0 && !selectedChannelId) {
        setSelectedChannelId(loaded[0].channelId);
      }
    } finally {
      setIsLoadingChannels(false);
    }
  }, [address, isAuthenticated, selectedChannelId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Fetch on-chain state when selectedChannelId changes
  useEffect(() => {
    if (!selectedChannelId || !client) return;

    const fetchState = async () => {
      try {
        const state = await client.getChannelState(selectedChannelId);
        setSelectedChannelState(state);
      } catch (err: any) {
        console.warn("Could not query on-chain state for channel:", err.message);
      }
    };

    fetchState();
  }, [selectedChannelId, client]);

  // Handle Channel Created callback
  const handleChannelCreated = () => {
    loadChannels();
    showToast("Payment channel created successfully!", "success");
  };

  // Sign EIP-712 Voucher
  const handleSignVoucher = async () => {
    if (!client || !address) {
      showToast("Please connect your wallet first.", "warning");
      return;
    }
    if (!selectedChannelId) {
      showToast("Please select or enter an active Channel ID.", "warning");
      return;
    }
    if (!isValidPositiveAmount(voucherAmountEth)) {
      showToast("Please enter a valid cumulative ETH amount.", "error");
      return;
    }

    // 1. Read the selected channel.
    // 2. Read the original channel deposit.
    // 3. Read the new cumulative voucher amount.
    // 4. Compare: newCumulativeAmount <= channelDeposit
    let onChainDepositWei = channelDepositWei;
    let recipientAddr = "";
    let onChainState = selectedChannelState;
    try {
      const onChain = await client.getChannelState(selectedChannelId);
      onChainState = onChain;
      setSelectedChannelState(onChain);
      recipientAddr = onChain.recipientAddress || "";
      if (onChain?.totalDeposit && onChain.totalDeposit !== "0") {
        onChainDepositWei = BigInt(onChain.totalDeposit);
      }
    } catch {
      recipientAddr = selectedChannel?.recipientAddress || "";
    }

    if (!recipientAddr || recipientAddr === ethers.ZeroAddress) {
      showToast("Payment channel recipient address is required.", "error");
      return;
    }

    const cumulativeAmountWei = ethers.parseEther(voucherAmountEth);

    // CRITICAL INVARIANT: cumulativeVoucherAmount <= channelDeposit
    // If false: DO NOT open MetaMask! Show error and prompt for change
    if (onChainDepositWei > BigInt(0) && cumulativeAmountWei > onChainDepositWei) {
      const maxAllowedStr = `${ethers.formatEther(onChainDepositWei)} ETH`;
      setVoucherAmountError({
        message: "Voucher amount exceeds the channel deposit.",
        channelDeposit: maxAllowedStr,
        voucherAmount: `${voucherAmountEth} ETH`,
        maxAllowed: maxAllowedStr,
      });
      showToast("Voucher amount exceeds the channel deposit.", "error");
      return; // DO NOT OPEN METAMASK
    }

    // Invariant Check 2: Monotonic increase (amount must exceed settled amount)
    if (onChainState?.settledAmount && onChainState.settledAmount !== "0") {
      const settledWei = BigInt(onChainState.settledAmount);
      if (cumulativeAmountWei <= settledWei) {
        showToast(
          `Contract Invariant: Voucher amount (${voucherAmountEth} ETH) must exceed already settled amount (${formatEth(onChainState.settledAmount)} ETH).`,
          "error"
        );
        return;
      }
    }

    try {
      setIsSigningVoucher(true);
      setBackendSubmissionStatus(null);
      setVoucherAmountError(null);

      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days validity

      showToast("Awaiting EIP-712 signature in wallet...", "info");

      const voucher = await client.signVoucher({
        channelId: selectedChannelId as `0x${string}`,
        payer: address as `0x${string}`,
        recipient: recipientAddr as `0x${string}`,
        cumulativeAmount: cumulativeAmountWei.toString(),
        nonce: voucherNonce,
        validUntil,
      });

      setSignedVoucher(voucher);
      showToast(`Payment voucher #${voucherNonce} signed successfully!`, "success");

      if (!voucher.signature) {
        throw new Error("Voucher signature missing from wallet response");
      }

      // VOUCHER HISTORY: NEVER OVERWRITE OLD VOUCHERS. ALWAYS APPEND NEW RECORD!
      const newRecord: VoucherRecord = {
        id: `vch_${Date.now()}_${voucher.nonce}`,
        channelId: voucher.channelId,
        sender: voucher.payer,
        receiver: voucher.recipient,
        cumulativeAmount: voucher.cumulativeAmount,
        nonce: voucher.nonce,
        signature: voucher.signature,
        validUntil: voucher.validUntil,
        status: "SIGNED",
        createdAt: new Date().toISOString(),
        settledAt: null,
        transactionHash: null,
      };

      setVoucherHistory((prev) => [newRecord, ...prev]);

      // SENDER NOTIFICATION: Voucher Signed
      addNotification({
        type: "VOUCHER_SIGNED",
        title: "Voucher Signed",
        message: `Payment voucher #${voucherNonce} signed successfully for ${voucherAmountEth} ETH.`,
        amount: `${voucherAmountEth} ETH`,
        sender: address,
        receiver: recipientAddr,
        channelId: selectedChannelId,
        timestamp: new Date().toISOString(),
      });

      // Increment suggested next nonce
      setVoucherNonce((n) => n + 1);

      // Try submitting to backend API if reachable (optional / best-effort)
      try {
        if (!voucher.signature) throw new Error("Voucher signature missing");
        setIsSubmittingToBackend(true);
        const res = await apiClient.submitVoucher({
          channelId: voucher.channelId,
          nonce: voucher.nonce,
          cumulativeAmount: voucher.cumulativeAmount,
          signature: voucher.signature,
          validUntil: voucher.validUntil,
          payer: voucher.payer,
          recipient: voucher.recipient,
        });
        if (res.authorized) {
          setBackendSubmissionStatus("Authorized & Reserved by API Gateway");
        }
      } catch (apiErr: any) {
        console.info("Backend voucher ingestion status (offline fallback):", apiErr.message);
        setBackendSubmissionStatus("Signed via Web3 (Direct On-Chain Mode)");
      } finally {
        setIsSubmittingToBackend(false);
      }
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        showToast("Signature rejected in wallet.", "warning");
      } else {
        showToast(err.message || "Failed to sign voucher.", "error");
      }
    } finally {
      setIsSigningVoucher(false);
    }
  };

  // Copy signed voucher JSON to clipboard
  const handleCopyVoucher = () => {
    if (!signedVoucher) return;
    navigator.clipboard.writeText(JSON.stringify(signedVoucher, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast("Voucher JSON copied to clipboard!", "info");
  };

  // Settle Voucher On-Chain directly on Sepolia
  const handleSettleClaim = async (targetVoucher?: VoucherRecord | MicroVoucher) => {
    const voucherToSettle = (targetVoucher as any) || signedVoucher;
    if (!client || !voucherToSettle || !voucherToSettle.signature) {
      showToast("No signed voucher available to settle.", "warning");
      return;
    }

    // VALIDATION BEFORE SETTLEMENT:
    // Read channel deposit
    let chDepositWei = BigInt(0);
    try {
      const onChain = await client.getChannelState(voucherToSettle.channelId);
      if (onChain?.totalDeposit && onChain.totalDeposit !== "0") {
        chDepositWei = BigInt(onChain.totalDeposit);
      }
    } catch (err) {
      console.warn("Could not query on-chain channel state before settlement:", err);
    }

    if (chDepositWei === BigInt(0)) {
      const ch = channels.find(
        (c) => c.channelId.toLowerCase() === voucherToSettle.channelId.toLowerCase()
      );
      if (ch?.totalDeposit && ch.totalDeposit !== "0") {
        chDepositWei = BigInt(ch.totalDeposit);
      }
    }

    const claimWei = BigInt(voucherToSettle.cumulativeAmount);

    // Verify invariant: voucher.cumulativeAmount <= channel.deposit
    // If condition fails: do not submit transaction, do not open MetaMask, show clear error
    if (chDepositWei > BigInt(0) && claimWei > chDepositWei) {
      const invMsg = "Settlement rejected: voucher amount exceeds the channel deposit.";
      setSettleError(invMsg);
      showToast(invMsg, "error");
      return; // DO NOT OPEN METAMASK
    }

    const recipientAddr = voucherToSettle.recipient || (voucherToSettle as any).receiver;

    try {
      setIsSettling(true);
      setSettleStatus("pending");
      setSettleError(null);
      setSettleTxHash(null);
      setConfirmedSettlementReceipt(null);

      showToast("Submitting settleClaim on-chain transaction to Sepolia...", "info");

      const tx = await client.settleClaim(
        voucherToSettle.channelId,
        BigInt(voucherToSettle.cumulativeAmount),
        voucherToSettle.nonce,
        voucherToSettle.validUntil,
        voucherToSettle.signature
      );

      setSettleTxHash(tx.hash);
      showToast("Settlement transaction submitted. Waiting for confirmation...", "info");

      // UPDATE VOUCHER HISTORY: SIGNED -> SETTLEMENT_SUBMITTED
      setVoucherHistory((prev) =>
        prev.map((v) =>
          v.channelId.toLowerCase() === voucherToSettle.channelId.toLowerCase() &&
          v.nonce === voucherToSettle.nonce
            ? { ...v, status: "SETTLEMENT_SUBMITTED", transactionHash: tx.hash }
            : v
        )
      );

      // SENDER NOTIFICATION: Settlement Submitted
      addNotification({
        type: "SETTLEMENT_SUBMITTED",
        title: "Settlement Submitted",
        message: "Settlement transaction submitted to Ethereum Sepolia.",
        amount: `${ethers.formatEther(voucherToSettle.cumulativeAmount)} ETH`,
        sender: address || undefined,
        receiver: recipientAddr,
        channelId: voucherToSettle.channelId,
        transactionHash: tx.hash,
        timestamp: new Date().toISOString(),
      });

      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        throw new Error("On-chain settlement transaction reverted.");
      }

      setSettleStatus("confirmed");
      setConfirmedSettlementReceipt(receipt);
      showToast("Payment settlement confirmed on Ethereum Sepolia!", "success");

      // UPDATE VOUCHER HISTORY: SETTLEMENT_SUBMITTED -> SETTLED
      setVoucherHistory((prev) =>
        prev.map((v) =>
          v.channelId.toLowerCase() === voucherToSettle.channelId.toLowerCase() &&
          v.nonce === voucherToSettle.nonce
            ? {
                ...v,
                status: "SETTLED",
                transactionHash: receipt.hash,
                settledAt: new Date().toISOString(),
              }
            : v
        )
      );

      // SENDER NOTIFICATION: Settlement Confirmed
      addNotification({
        type: "SETTLEMENT_CONFIRMED",
        title: "Settlement Confirmed",
        message: "Payment settlement confirmed on Ethereum Sepolia.",
        amount: `${ethers.formatEther(voucherToSettle.cumulativeAmount)} ETH`,
        sender: address || undefined,
        receiver: recipientAddr,
        channelId: voucherToSettle.channelId,
        transactionHash: receipt.hash,
        timestamp: new Date().toISOString(),
      });

      // RECEIVER NOTIFICATION: Payment Received
      addNotification({
        type: "PAYMENT_RECEIVED",
        recipientId: recipientAddr.toLowerCase(),
        title: "Payment Received",
        message: `${ethers.formatEther(voucherToSettle.cumulativeAmount)} ETH received from ${truncateAddress(address || undefined)}.`,
        amount: `${ethers.formatEther(voucherToSettle.cumulativeAmount)} ETH`,
        sender: address || undefined,
        receiver: recipientAddr,
        channelId: voucherToSettle.channelId,
        transactionHash: receipt.hash,
        status: "UNREAD",
        read: false,
        timestamp: new Date().toISOString(),
      });

      // Refresh on-chain channel state
      const updated = await client.getChannelState(voucherToSettle.channelId);
      setSelectedChannelState(updated);
      loadChannels();
    } catch (err: any) {
      setSettleStatus("failed");

      // UPDATE VOUCHER HISTORY: -> FAILED
      setVoucherHistory((prev) =>
        prev.map((v) =>
          v.channelId.toLowerCase() === voucherToSettle.channelId.toLowerCase() &&
          v.nonce === voucherToSettle.nonce
            ? { ...v, status: "FAILED" }
            : v
        )
      );

      let msg = "Settlement failed.";
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        msg = "Transaction rejected by wallet.";
      } else {
        try {
          const vaultIface = client.getVaultContract().interface;
          const errData = err?.data || err?.error?.data || err?.info?.error?.data;
          if (errData && typeof errData === "string") {
            const parsed = vaultIface.parseError(errData);
            if (parsed) {
              // Handle smart contract custom error InsufficientDeposit exactly as specified:
              if (parsed.name === "InsufficientDeposit") {
                msg = "The voucher amount exceeds the funds deposited in this payment channel.";
                console.error("Smart contract InsufficientDeposit args:", parsed.args);
              } else if (parsed.name === "CumulativeAmountTooLow") {
                msg = `Contract Invariant Violated (CumulativeAmountTooLow): Claim (${ethers.formatEther(parsed.args[0])} ETH) must exceed already settled amount (${ethers.formatEther(parsed.args[1])} ETH).`;
              } else if (parsed.name === "InvalidSignature") {
                msg = `Contract Invariant Violated (InvalidSignature): Recovered signer does not match channel payer.`;
              } else if (parsed.name === "ChannelNotActive") {
                msg = `Contract Invariant Violated (ChannelNotActive): Channel is not in an active OPEN status.`;
              } else if (parsed.name === "VoucherExpired") {
                msg = `Contract Invariant Violated (VoucherExpired): Voucher has expired.`;
              } else {
                msg = `Contract Error (${parsed.name}): Transaction reverted.`;
              }
            }
          }
        } catch {
          // fallback
        }
        if (msg === "Settlement failed." && err?.shortMessage) {
          msg = err.shortMessage;
        } else if (msg === "Settlement failed." && err?.message) {
          msg = err.message;
        }
      }
      setSettleError(msg);
      showToast(msg, "error");

      // SENDER NOTIFICATION: Settlement Failed
      addNotification({
        type: "SETTLEMENT_FAILED",
        title: "Settlement Failed",
        message: `Payment settlement failed: ${msg}`,
        transactionHash: settleTxHash || undefined,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSettling(false);
    }
  };

  // ── ROUTE 1: Public Landing Page ───────────────────────────────────────────
  if (currentPath === "/" || currentPath === "") {
    return <LandingPage onNavigate={navigate} />;
  }

  // ── ROUTE 2: Sign Up Page ──────────────────────────────────────────────────
  if (currentPath === "/auth/signup") {
    return <SignUpPage onNavigate={navigate} />;
  }

  // ── ROUTE 3: Login Page ────────────────────────────────────────────────────
  if (currentPath === "/auth/login") {
    return <LoginPage onNavigate={navigate} />;
  }

  // ── APPLICATION AREA LAYOUT (Header, Banner, Main Content, Footer) ─────────
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Network Warning Banner */}
      <NetworkBanner />

      {/* Global Navbar */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
      />

      {/* Main App Container */}
      <main style={{ flex: 1, padding: "32px 24px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        
        {/* ROUTE 4: Notifications Page */}
        {(currentPath === "/dashboard/notifications" || currentPath === "/notifications") && (
          <NotificationsPage onNavigate={navigate} />
        )}

        {/* ROUTE 5: Profile / Account Page */}
        {(currentPath === "/dashboard/profile" || currentPath === "/profile") && (
          <ProfilePage onNavigate={navigate} />
        )}

        {/* ROUTE 6: Payment Channels View */}
        {(currentPath === "/dashboard/channels" || currentPath === "/payment-channels" || currentPath === "/channels") && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Payment Channels
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                  Manage non-custodial smart contract escrow channels on Ethereum Sepolia.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (!isConnected) connectWallet();
                  else setIsCreateModalOpen(true);
                }}
                icon={<Plus size={16} />}
              >
                Open New Channel
              </Button>
            </div>

            {/* Channels Table Card */}
            <Card title="Active Channels" subtitle="Collateral escrowed in the smart contract">
              {channels.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "12px 16px" }}>Channel ID</th>
                        <th style={{ padding: "12px 16px" }}>Recipient (Merchant)</th>
                        <th style={{ padding: "12px 16px" }}>Total Collateral</th>
                        <th style={{ padding: "12px 16px" }}>Status</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((ch) => (
                        <tr key={ch.channelId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--brand-primary)" }}>
                            {truncateHash(ch.channelId)}
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>
                            {truncateAddress(ch.recipientAddress || "0x7099...79C8")}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            {formatEth(ch.totalDeposit)} ETH
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span className={`badge ${ch.status === "OPEN" ? "badge-success" : "badge-warning"}`}>
                              {ch.status || "OPEN"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                setSelectedChannelId(ch.channelId);
                                navigate("/dashboard/payments");
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                backgroundColor: "var(--bg-tertiary)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                marginRight: "8px",
                              }}
                            >
                              Create Voucher
                            </button>
                            <button
                              onClick={() => setSelectedTopUpChannel(ch)}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                borderRadius: "8px",
                                backgroundColor: "#F1E9DF",
                                border: "1px solid #DED6CE",
                                color: "#3A2923",
                                cursor: "pointer",
                              }}
                            >
                              Top Up
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                  <CreditCard size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    No payment channels yet.
                  </div>
                  <div style={{ fontSize: "13px", marginBottom: "20px" }}>
                    Open a payment channel to deposit collateral into escrow and stream micro-payments.
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!isConnected) connectWallet();
                      else setIsCreateModalOpen(true);
                    }}
                    icon={<Plus size={16} />}
                  >
                    Open Payment Channel
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ROUTE 7: Payments / Vouchers View */}
        {(currentPath === "/dashboard/payments" || currentPath === "/payments" || currentPath === "/vouchers") && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ marginBottom: "24px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Payments & Vouchers
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                Generate and sign off-chain EIP-712 payment vouchers with zero gas.
              </p>
            </div>

            <Card title="EIP-712 Voucher Generator" subtitle="Sign gasless payment commitments backed by channel escrow">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Channel ID
                  </label>
                  {channels.length > 0 ? (
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {channels.map((ch) => (
                        <option key={ch.channelId} value={ch.channelId}>
                          {truncateHash(ch.channelId)} (Deposit: {formatEth(ch.totalDeposit)} ETH)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="0x... (Channel ID)"
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                    />
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Cumulative Amount (ETH)
                    </label>
                    <input
                      ref={voucherAmountInputRef}
                      type="text"
                      value={voucherAmountEth}
                      onChange={(e) => {
                        setVoucherAmountEth(e.target.value);
                        if (voucherAmountError) setVoucherAmountError(null);
                      }}
                      placeholder="0.001"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Nonce (Monotonic Counter)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={voucherNonce}
                      onChange={(e) => setVoucherNonce(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Dynamic Deposit, Cumulative Amount, and Remaining Balance Display */}
                <VoucherAmountStatusDisplay
                  channelDepositEth={channelDepositEth}
                  voucherAmountEth={voucherAmountEth}
                  remainingBalanceEth={remainingBalanceEth}
                  isAmountExceedingDeposit={isAmountExceedingDeposit}
                  voucherAmountError={voucherAmountError}
                  onChangeAmount={handleChangeAmount}
                />

                <div style={{ padding: "12px", backgroundColor: "rgba(245, 158, 11, 0.08)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: "13px", color: "#fbbf24" }}>
                  Signing this voucher authorizes the specified cumulative payment. It does not transfer ETH by itself.
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSignVoucher}
                  disabled={isSigningVoucher || !isConnected || !isVoucherAmountValid}
                  isLoading={isSigningVoucher}
                  icon={<Send size={16} />}
                >
                  {isSigningVoucher ? "Requesting Signature in Wallet..." : "Sign Voucher"}
                </Button>

                {signedVoucher ? (
                  <div style={{ marginTop: "12px", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FileCheck2 size={16} color="var(--brand-success)" />
                        <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                          Signed Successfully (Nonce #{signedVoucher.nonce})
                        </strong>
                      </div>
                      <button
                        onClick={handleCopyVoucher}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--brand-primary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? "Copied" : "Copy JSON"}
                      </button>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Voucher Amount: <strong>{formatEth(signedVoucher.cumulativeAmount)} ETH</strong> | Channel: <span className="mono">{truncateHash(signedVoucher.channelId)}</span>
                    </div>
                    <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all", backgroundColor: "var(--bg-primary)", padding: "8px", borderRadius: "6px" }}>
                      {signedVoucher.signature}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-muted)", fontSize: "13px" }}>
                    No payments yet. Sign your first voucher above.
                  </div>
                )}
              </div>
            </Card>

            {/* Permanent Historical Voucher Sequence */}
            <VoucherHistory
              vouchers={voucherHistory}
              onSelectForSettlement={handleSelectForSettlement}
              selectedChannelId={selectedChannelId}
            />
          </div>
        )}

        {/* ROUTE 8: Transactions / Settlement View */}
        {(currentPath === "/dashboard/transactions" || currentPath === "/transactions" || currentPath === "/settle") && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ marginBottom: "24px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Blockchain Transactions & Settlement
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                Execute on-chain settlement on Ethereum Sepolia and inspect verified transaction receipts.
              </p>
            </div>

            <Card title="Settle & Claim" subtitle="Submit signed voucher to release funds directly to the receiver">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {signedVoucher ? (
                  <div style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                      Staged Voucher for Settlement:
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>Channel: <span className="mono">{truncateHash(signedVoucher.channelId)}</span></div>
                      <div>Amount: <strong style={{ color: "var(--brand-primary)" }}>{formatEth(signedVoucher.cumulativeAmount)} ETH</strong></div>
                      <div>Nonce: <strong>#{signedVoucher.nonce}</strong></div>
                      <div>Recipient: <span className="mono">{truncateAddress(signedVoucher.recipient)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "24px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px dashed var(--border-subtle)", color: "var(--text-muted)", fontSize: "14px" }}>
                    No signed voucher ready for settlement. Create a voucher in Payments first.
                  </div>
                )}

                {signedVoucher && channelDepositWei > BigInt(0) && BigInt(signedVoucher.cumulativeAmount) > channelDepositWei && (
                  <div style={{ padding: "12px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--status-error)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} />
                    <span>Settlement rejected: voucher amount exceeds the channel deposit.</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleSettleClaim()}
                  disabled={
                    isSettling ||
                    !signedVoucher ||
                    !isConnected ||
                    (channelDepositWei > BigInt(0) && BigInt(signedVoucher.cumulativeAmount) > channelDepositWei)
                  }
                  isLoading={isSettling}
                  icon={<ShieldCheck size={16} />}
                >
                  {isSettling ? "Submitting Settlement..." : "Settle & Claim"}
                </Button>

                {settleTxHash && (
                  <div style={{ padding: "16px", backgroundColor: "rgba(63,125,90,0.07)", borderRadius: "10px", border: "1px solid rgba(63,125,90,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--status-success)", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                      <Check size={16} />
                      <span>{settleStatus === "confirmed" ? "Settlement Confirmed" : "Settlement submitted"}</span>
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div>
                        Transaction Hash:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${settleTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ color: "var(--brand-secondary)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          {truncateHash(settleTxHash)} <ExternalLink size={12} />
                        </a>
                      </div>
                      <div>Network: <strong>Ethereum Sepolia</strong></div>
                      <div>Status: <strong style={{ color: settleStatus === "confirmed" ? "var(--status-success)" : "var(--status-warning)" }}>{settleStatus.toUpperCase()}</strong></div>
                    </div>
                  </div>
                )}

                {settleError && (
                  <div style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--status-error)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} />
                    <span>{settleError}</span>
                  </div>
                )}

                {!settleTxHash && !signedVoucher && (
                  <div style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)", fontSize: "13px" }}>
                    No blockchain transactions yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Permanent Historical Voucher Sequence */}
            <VoucherHistory
              vouchers={voucherHistory}
              onSelectForSettlement={handleSelectForSettlement}
              selectedChannelId={selectedChannelId}
            />
          </div>
        )}

        {/* ROUTE 8b: Dedicated Voucher History View */}
        {(currentPath === "/dashboard/history" || currentPath === "/history" || currentPath === "/dashboard/voucher-history") && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ marginBottom: "24px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Voucher History
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                Complete verifiable history of all signed and settled EIP-712 micro-payment vouchers.
              </p>
            </div>

            <VoucherHistory
              vouchers={voucherHistory}
              onSelectForSettlement={handleSelectForSettlement}
              selectedChannelId={selectedChannelId}
            />
          </div>
        )}

        {/* ROUTE 9: Main Unified Dashboard Overview */}
        {(currentPath === "/dashboard" || (!["/dashboard/channels", "/payment-channels", "/channels", "/dashboard/payments", "/payments", "/vouchers", "/dashboard/transactions", "/transactions", "/settle", "/dashboard/history", "/history", "/dashboard/voucher-history", "/dashboard/notifications", "/notifications", "/dashboard/profile", "/profile"].includes(currentPath))) && (
          <div>
            {/* Header Section */}
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span className="badge badge-primary">EVM Paris / EIP-712</span>
                  <span className="badge badge-success">Sepolia Testnet</span>
                  <span className="badge badge-neutral">Chain ID: 11155111</span>
                </div>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  High-Throughput Micropayment Channel
                </h1>
                <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "15px" }}>
                  Lock collateral once on-chain, stream unlimited zero-gas off-chain EIP-712 vouchers, and settle net balances on Ethereum Sepolia.
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsAiDrawerOpen(true)}
                  icon={<Sparkles size={16} color="var(--brand-primary)" />}
                >
                  AI Protocol Advisor
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (!isConnected) connectWallet();
                    else setIsCreateModalOpen(true);
                  }}
                  icon={<Plus size={16} />}
                >
                  Open New Channel
                </Button>
              </div>
            </div>

            {/* Section 1: Overview Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              {/* Card 1: Wallet */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Connected Wallet
                  </span>
                  <Wallet size={18} color="var(--brand-primary)" />
                </div>
                {isConnected && address ? (
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                      {truncateAddress(address)}
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Balance: <strong style={{ color: "var(--text-primary)" }}>{Number(balance).toFixed(4)} ETH</strong>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      No EVM wallet connected
                    </div>
                    <Button variant="primary" size="sm" onClick={connectWallet}>
                      Connect MetaMask
                    </Button>
                  </div>
                )}
              </Card>

              {/* Card 2: Vault */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    On-Chain Escrow Vault
                  </span>
                  <Lock size={18} color="var(--status-success)" />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--brand-primary)" }}>
                  {truncateAddress(vaultAddress)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Ethereum Sepolia</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                    title="View on Etherscan"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                  Verified Invariants: Monotonic Settlement, ReentrancyGuard, 24h Dispute Timelock
                </div>
              </Card>

              {/* Card 3: Active Channel Summary */}
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Active State Channels
                  </span>
                  <Layers size={18} color="var(--status-warning)" />
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {channels.length}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {selectedChannelState
                    ? `Total Collateral: ${formatEth(selectedChannelState.totalDeposit)} ETH`
                    : "Select or open a channel to view locked collateral"}
                </div>
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={loadChannels}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <RefreshCw size={12} /> Refresh Channels
                  </button>
                </div>
              </Card>
            </div>

            {/* Section 2: Interactive Voucher & Settlement Workflow */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px", marginBottom: "32px" }}>
              {/* Voucher Signer */}
              <Card title="1. Generate & Sign Micro-Payment Voucher" subtitle="Create gasless, off-chain cryptographic commitments with EIP-712 typed data signatures">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Target Channel ID (bytes32)
                    </label>
                    {channels.length > 0 ? (
                      <select
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {channels.map((ch) => (
                          <option key={ch.channelId} value={ch.channelId}>
                            {truncateHash(ch.channelId)} (Deposit: {formatEth(ch.totalDeposit)} ETH)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="0x... (Channel ID)"
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(e.target.value)}
                      />
                    )}
                  </div>

                  {selectedChannelState && (
                    <div style={{ padding: "12px", backgroundColor: "rgba(58,41,35,0.04)", borderRadius: "10px", border: "1px solid #E5DED5", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Channel Status:</span>
                        <strong style={{ color: selectedChannelState.status === "OPEN" ? "var(--status-success)" : "var(--status-warning)" }}>
                          {selectedChannelState.status || "OPEN"}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Escrow Deposit:</span>
                        <span>{formatEth(selectedChannelState.totalDeposit)} ETH</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Already Settled:</span>
                        <span>{formatEth(selectedChannelState.settledAmount)} ETH</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Cumulative Amount (ETH)
                      </label>
                      <input
                        ref={voucherAmountInputRef}
                        type="text"
                        value={voucherAmountEth}
                        onChange={(e) => {
                          setVoucherAmountEth(e.target.value);
                          if (voucherAmountError) setVoucherAmountError(null);
                        }}
                        placeholder="0.001"
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Nonce (Counter)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={voucherNonce}
                        onChange={(e) => setVoucherNonce(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Dynamic Deposit, Cumulative Amount, and Remaining Balance Display */}
                  <VoucherAmountStatusDisplay
                    channelDepositEth={channelDepositEth}
                    voucherAmountEth={voucherAmountEth}
                    remainingBalanceEth={remainingBalanceEth}
                    isAmountExceedingDeposit={isAmountExceedingDeposit}
                    voucherAmountError={voucherAmountError}
                    onChangeAmount={handleChangeAmount}
                  />

                  <div style={{ padding: "10px 12px", backgroundColor: "rgba(245, 158, 11, 0.08)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: "12px", color: "#fbbf24" }}>
                    Signing this voucher authorizes the specified cumulative payment. It does not transfer ETH by itself.
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSignVoucher}
                    disabled={isSigningVoucher || !isConnected || !isVoucherAmountValid}
                    isLoading={isSigningVoucher}
                    icon={<Send size={16} />}
                  >
                    {isSigningVoucher ? "Requesting Signature in Wallet..." : "Sign EIP-712 Voucher"}
                  </Button>

                  {signedVoucher && (
                    <div style={{ marginTop: "12px", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FileCheck2 size={16} color="var(--status-success)" />
                          <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                            Voucher #{signedVoucher.nonce} Signed
                          </strong>
                        </div>
                        <button
                          onClick={handleCopyVoucher}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--brand-primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          {isCopied ? "Copied" : "Copy JSON"}
                        </button>
                      </div>

                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Cumulative: <strong>{formatEth(signedVoucher.cumulativeAmount)} ETH</strong> | Nonce: <strong>{signedVoucher.nonce}</strong>
                      </div>

                      <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all", backgroundColor: "var(--bg-primary)", padding: "8px", borderRadius: "6px" }}>
                        sig: {signedVoucher.signature}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Settlement Executor */}
              <Card title="2. On-Chain Settlement (Direct & Non-Custodial)" subtitle="Submit highest signed voucher directly to MicroPayVault.sol on Ethereum Sepolia">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Settlement executes directly on Ethereum Sepolia: the smart contract releases funds only upon verifying valid EIP-712 cryptographic signatures.
                  </div>

                  {signedVoucher ? (
                    <div style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                        Pending Voucher for Settlement:
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>Channel: <span className="mono">{truncateHash(signedVoucher.channelId)}</span></div>
                        <div>Claim Amount: <strong style={{ color: "var(--brand-primary)" }}>{formatEth(signedVoucher.cumulativeAmount)} ETH</strong></div>
                        <div>Nonce: <strong>#{signedVoucher.nonce}</strong></div>
                        <div>Recipient: <span className="mono">{truncateAddress(signedVoucher.recipient)}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "24px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px dashed var(--border-subtle)", color: "var(--text-muted)", fontSize: "14px" }}>
                      Sign a micro-voucher above to stage on-chain settlement.
                    </div>
                  )}

                  {signedVoucher && channelDepositWei > BigInt(0) && BigInt(signedVoucher.cumulativeAmount) > channelDepositWei && (
                    <div style={{ padding: "12px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--status-error)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={16} />
                      <span>Settlement rejected: voucher amount exceeds the channel deposit.</span>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleSettleClaim()}
                    disabled={
                      isSettling ||
                      !signedVoucher ||
                      !isConnected ||
                      (channelDepositWei > BigInt(0) && BigInt(signedVoucher.cumulativeAmount) > channelDepositWei)
                    }
                    isLoading={isSettling}
                    icon={<ShieldCheck size={16} />}
                  >
                    {isSettling ? "Broadcasting On-Chain Settlement..." : "Settle Claim on Sepolia"}
                  </Button>

                  {settleTxHash && (
                    <div style={{ padding: "16px", backgroundColor: "rgba(63,125,90,0.07)", borderRadius: "10px", border: "1px solid rgba(63,125,90,0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--status-success)", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>
                        <Check size={16} /> Settlement Transaction Submitted!
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                        Transaction Hash:
                      </div>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${settleTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          color: "var(--brand-primary)",
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
                      >
                        {settleTxHash} <ExternalLink size={14} />
                      </a>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                        Status: <strong style={{ color: settleStatus === "confirmed" ? "var(--status-success)" : "var(--status-warning)" }}>{settleStatus.toUpperCase()}</strong>
                      </div>
                    </div>
                  )}

                  {settleError && (
                    <div style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--status-error)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={16} />
                      <span>{settleError}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Voucher History Section */}
            <div style={{ marginBottom: "32px" }}>
              <VoucherHistory
                vouchers={voucherHistory}
                onSelectForSettlement={handleSelectForSettlement}
                selectedChannelId={selectedChannelId}
              />
            </div>

            {/* Section 3: Live Channels Table */}
            <Card title="Active Payment Channels" subtitle="Collateral deposits locked in the non-custodial smart contract vault">
              {channels.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "12px 16px" }}>Channel ID</th>
                        <th style={{ padding: "12px 16px" }}>Payer</th>
                        <th style={{ padding: "12px 16px" }}>Recipient (Merchant)</th>
                        <th style={{ padding: "12px 16px" }}>Total Collateral</th>
                        <th style={{ padding: "12px 16px" }}>Status</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((ch) => (
                        <tr key={ch.channelId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--brand-primary)" }}>
                            {truncateHash(ch.channelId)}
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>
                            {truncateAddress(ch.payerAddress || address || "")}
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>
                            {truncateAddress(ch.recipientAddress || "0x7099...79C8")}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            {formatEth(ch.totalDeposit)} ETH
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span className={`badge ${ch.status === "OPEN" ? "badge-success" : "badge-warning"}`}>
                              {ch.status || "OPEN"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                setSelectedChannelId(ch.channelId);
                                showToast(`Selected channel ${truncateHash(ch.channelId)}`, "info");
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                backgroundColor: "var(--bg-tertiary)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                marginRight: "8px",
                              }}
                            >
                              Select
                            </button>
                            <button
                              onClick={() => setSelectedTopUpChannel(ch)}
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                borderRadius: "8px",
                                backgroundColor: "#F1E9DF",
                                border: "1px solid #DED6CE",
                                color: "#3A2923",
                                cursor: "pointer",
                              }}
                            >
                              Top Up
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                  <CreditCard size={32} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    No payment channels yet.
                  </div>
                  <div style={{ fontSize: "13px", marginBottom: "16px" }}>
                    Open a payment channel to deposit collateral into the smart contract and start streaming micro-payments.
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!isConnected) connectWallet();
                      else setIsCreateModalOpen(true);
                    }}
                    icon={<Plus size={16} />}
                  >
                    Open Channel with Sepolia ETH
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={navigate} />

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleChannelCreated}
      />

      <TopUpModal
        channel={selectedTopUpChannel}
        isOpen={!!selectedTopUpChannel}
        onClose={() => setSelectedTopUpChannel(null)}
        onSuccess={() => {
          loadChannels();
          setSelectedTopUpChannel(null);
        }}
      />

      {/* AI Advisory Drawer */}
      <AiAdvisoryDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
      />
    </div>
  );
};

export default App;
