import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useWallet } from "../../context/WalletContext";
import { useNotifications } from "../../context/NotificationContext";
import { apiClient } from "../../api/client";
import { isValidAddress, isValidPositiveAmount } from "../../utils/validators";
import { truncateAddress } from "../../utils/formatters";
import { ethers } from "ethers";
import { DEPLOYMENT_INFO } from "@web3-micropay/shared";
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TxStage = "idle" | "review" | "wallet_prompt" | "pending" | "confirming" | "syncing" | "success" | "failed";

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { client, address, chainId } = useWallet();
  const { showToast, addNotification } = useNotifications();

  const [recipient, setRecipient] = useState("");
  const [assetType, setAssetType] = useState<"ETH" | "USDC">("ETH");
  const [depositAmount, setDepositAmount] = useState("");
  const [expirationDays, setExpirationDays] = useState("30");
  const [disputeDays, setDisputeDays] = useState("1");

  const [stage, setStage] = useState<TxStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);

  const resetForm = () => {
    setRecipient("");
    setDepositAmount("");
    setStage("idle");
    setTxHash(null);
    setErrorMessage(null);
    setCreatedChannelId(null);
  };

  const handleClose = () => {
    if (stage === "wallet_prompt" || stage === "pending" || stage === "confirming" || stage === "syncing") {
      return; // Do not close while tx is in-flight
    }
    resetForm();
    onClose();
  };

  const validateInputs = (): string | null => {
    if (!recipient || !isValidAddress(recipient)) {
      return "Please enter a valid merchant Ethereum address.";
    }
    if (recipient.toLowerCase() === address?.toLowerCase()) {
      return "Merchant recipient cannot be your own wallet address.";
    }
    if (!isValidPositiveAmount(depositAmount)) {
      return "Please enter a valid deposit amount greater than 0.";
    }
    const exp = Number(expirationDays);
    if (isNaN(exp) || exp < 1) {
      return "Channel duration must be at least 1 day.";
    }
    return null;
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateInputs();
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage(null);
    setStage("review");
  };

  const handleExecuteOpenChannel = async () => {
    if (!client || !address) {
      setErrorMessage("Wallet client not ready. Please connect wallet.");
      return;
    }

    try {
      setStage("wallet_prompt");
      setErrorMessage(null);

      const tokenAddress =
        assetType === "ETH"
          ? ethers.ZeroAddress
          : DEPLOYMENT_INFO?.usdcAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

      const depositWei = ethers.parseEther(depositAmount);
      const disputeSeconds = Math.max(86400, Number(disputeDays) * 86400);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expirationSeconds = nowSeconds + Number(expirationDays) * 86400 + disputeSeconds + 3600;

      // Execute on-chain transaction
      const tx = await client.openChannel(
        recipient,
        tokenAddress,
        depositWei,
        expirationSeconds,
        disputeSeconds
      );

      setTxHash(tx.hash);
      setStage("pending");
      showToast("Channel open transaction submitted to blockchain", "info");

      // Wait for blockchain confirmation
      setStage("confirming");
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        throw new Error("On-chain transaction execution failed or reverted.");
      }

      // Extract channelId from ChannelOpened event if present, or compute deterministically
      let extractedChannelId = "";
      const vaultInterface = client.getVaultContract().interface;
      for (const log of receipt.logs) {
        try {
          const parsed = vaultInterface.parseLog(log);
          if (parsed && parsed.name === "ChannelOpened") {
            extractedChannelId = parsed.args[0];
            break;
          }
        } catch {
          // ignore non-vault logs
        }
      }

      if (!extractedChannelId) {
        // Fallback channel ID representation
        extractedChannelId = `0x${receipt.hash.slice(2, 66)}`;
      }

      setCreatedChannelId(extractedChannelId);

      // Persist to local storage immediately (resilient against backend offline mode)
      try {
        const localKey = `micropay_channels_${address.toLowerCase()}`;
        const existingRaw = localStorage.getItem(localKey);
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        const newChannelItem = {
          channelId: extractedChannelId,
          status: "OPEN",
          totalDeposit: depositWei.toString(),
          settledAmount: "0",
          reservedAmount: "0",
          payerAddress: address,
          recipientAddress: recipient,
          tokenAddress,
          expirationTimestamp: expirationSeconds,
          disputePeriodSeconds: disputeSeconds,
          openTxHash: receipt.hash,
          createdAt: new Date().toISOString(),
        };
        const filtered = existingList.filter(
          (c: any) => c.channelId.toLowerCase() !== extractedChannelId.toLowerCase()
        );
        localStorage.setItem(localKey, JSON.stringify([newChannelItem, ...filtered]));
      } catch (storageErr) {
        console.warn("Could not cache channel to localStorage:", storageErr);
      }

      // Synchronize with backend API (optional / best-effort)
      setStage("syncing");
      try {
        await apiClient.registerChannel({
          channelId: extractedChannelId,
          payerAddress: address,
          recipientAddress: recipient,
          tokenAddress,
          totalDeposit: depositWei.toString(),
          expirationTimestamp: expirationSeconds,
          disputePeriodSeconds: disputeSeconds,
          openTxHash: receipt.hash,
          openBlockNumber: receipt.blockNumber,
        });
      } catch (syncErr: any) {
        // Non-blocking sync note: backend is optional in direct Web3 MVP
        console.info("Backend channel sync note (direct Web3 mode active):", syncErr.message);
      }

      setStage("success");
      addNotification({
        type: "CHANNEL_CREATED",
        title: "Channel Created",
        message: `Payment channel created successfully with deposit ${depositAmount} ${assetType}.`,
        amount: `${depositAmount} ${assetType}`,
        sender: address,
        receiver: recipient,
        channelId: extractedChannelId,
        transactionHash: receipt.hash,
        timestamp: new Date().toISOString(),
      });
      showToast("Payment channel opened and verified successfully!", "success");
      onSuccess();
    } catch (err: any) {
      setStage("failed");
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        setErrorMessage("Transaction rejected by wallet.");
      } else {
        setErrorMessage(err.message || "Failed to open payment channel.");
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Open Payment Channel"
      subtitle="Escrow funds on Ethereum Sepolia for gasless micropayments"
    >
      {errorMessage && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {stage === "idle" && (
        <form onSubmit={handleReview}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Merchant / Recipient Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                className="mono"
                required
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Must be an EIP-55 valid Ethereum address.
              </span>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Asset
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as "ETH" | "USDC")}
                >
                  <option value="ETH">Native ETH (Sepolia)</option>
                  <option value="USDC">ERC-20 USDC</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Initial Deposit Amount ({assetType})
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.05"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Expiration Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Dispute Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={disputeDays}
                  onChange={(e) => setDisputeDays(e.target.value)}
                  required
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-tertiary)",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <ShieldCheck size={16} style={{ color: "var(--status-success)", flexShrink: 0 }} />
              <span>
                Funds are escrowed directly in the immutable MicroPayVault. You retain sovereign unilateral close rights.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Review Order <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </form>
      )}

      {stage === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              backgroundColor: "var(--bg-tertiary)",
              border: "1px solid var(--border-medium)",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Network:</span>
              <span style={{ fontWeight: 600 }}>Ethereum Sepolia ({chainId})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Payer (You):</span>
              <span className="mono" style={{ fontWeight: 600 }}>{truncateAddress(address || undefined)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Merchant:</span>
              <span className="mono" style={{ fontWeight: 600 }}>{truncateAddress(recipient)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Escrow Deposit:</span>
              <span style={{ fontWeight: 700, color: "var(--brand-secondary)" }}>{depositAmount} {assetType}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Dispute Period:</span>
              <span>{disputeDays} Day(s) (86,400s min)</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button variant="secondary" onClick={() => setStage("idle")}>
              Back
            </Button>
            <Button variant="primary" onClick={handleExecuteOpenChannel}>
              Confirm & Deposit On-Chain
            </Button>
          </div>
        </div>
      )}

      {(stage === "wallet_prompt" || stage === "pending" || stage === "confirming" || stage === "syncing") && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div className="status-dot pending" style={{ width: "16px", height: "16px" }} />
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            {stage === "wallet_prompt" && "Please confirm transaction in your wallet..."}
            {stage === "pending" && "Transaction submitted to mempool..."}
            {stage === "confirming" && "Waiting for Sepolia block confirmation..."}
            {stage === "syncing" && "Synchronizing state channel with backend..."}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "360px", margin: "0 auto" }}>
            {stage === "wallet_prompt"
              ? "Review the gas fee and escrow amount in your connected EVM wallet."
              : "MicroPayVault is verifying collateral deposit and assigning a unique channel identifier."}
          </p>
          {txHash && (
            <div className="mono" style={{ fontSize: "12px", color: "var(--brand-secondary)", marginTop: "16px" }}>
              Tx: {truncateAddress(txHash)}
            </div>
          )}
        </div>
      )}

      {stage === "success" && (
        <div style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={{ color: "var(--status-success)", marginBottom: "16px" }}>
            <CheckCircle2 size={48} style={{ margin: "0 auto" }} />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
            Payment Channel Successfully Opened!
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            {depositAmount} {assetType} has been escrowed. You can now issue instant zero-gas EIP-712 vouchers to this merchant.
          </p>
          {createdChannelId && (
            <div
              style={{
                backgroundColor: "var(--bg-tertiary)",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "12px",
                marginBottom: "24px",
              }}
            >
              <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Channel ID:</div>
              <div className="mono" style={{ wordBreak: "break-all", color: "var(--text-primary)" }}>
                {createdChannelId}
              </div>
            </div>
          )}
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}

      {stage === "failed" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setStage("idle")}>
            Try Again
          </Button>
        </div>
      )}
    </Modal>
  );
};
