import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useWallet } from "../../context/WalletContext";
import { useNotifications } from "../../context/NotificationContext";
import { ChannelItem } from "../../api/client";
import { formatEth } from "../../utils/formatters";
import { isValidPositiveAmount } from "../../utils/validators";
import { ethers } from "ethers";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TopUpModalProps {
  channel: ChannelItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ channel, isOpen, onClose, onSuccess }) => {
  const { client } = useWallet();
  const { showToast, addNotification } = useNotifications();

  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!channel) return null;

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      setErrorMessage("Wallet client not ready.");
      return;
    }
    if (!isValidPositiveAmount(amount)) {
      setErrorMessage("Please enter a valid positive amount.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const topUpWei = ethers.parseEther(amount);
      const tokenAddress = channel.tokenAddress || ethers.ZeroAddress;

      const tx = await client.topUpChannel(channel.channelId, tokenAddress, topUpWei);
      showToast("Top-up transaction broadcasted", "info");

      const receipt = await tx.wait(1);
      if (!receipt || receipt.status !== 1) {
        throw new Error("Top-up transaction reverted on-chain.");
      }

      setIsSuccess(true);
      showToast(`Successfully deposited +${amount} ETH to channel`, "success");
      addNotification({
        type: "channel",
        title: "Channel Collateral Topped Up",
        message: `Deposited +${amount} ETH to channel ${channel.channelId.slice(0, 10)}...`,
        txHash: receipt.hash,
      });
      onSuccess();
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        setErrorMessage("Transaction rejected by wallet.");
      } else {
        setErrorMessage(err.message || "Failed to top up channel collateral.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Top Up Channel Collateral"
      subtitle={`Channel: ${channel.channelId.slice(0, 14)}...`}
    >
      {errorMessage && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSuccess ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <CheckCircle2 size={40} style={{ color: "var(--status-success)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            Collateral Added Successfully
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Your channel capacity has been increased on Ethereum Sepolia.
          </p>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleTopUp}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                backgroundColor: "var(--bg-tertiary)",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Current Deposit:</span>
              <span style={{ fontWeight: 600 }}>{formatEth(channel.totalDeposit)} ETH</span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Additional Deposit Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.05"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Confirm Top-Up
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
