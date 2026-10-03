import React, { useState, useEffect } from "react";
import { useNotifications, NotificationType, AppNotification } from "../context/NotificationContext";
import { useWallet } from "../context/WalletContext";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  CreditCard,
  FileCheck2,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Coins,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { truncateHash, truncateAddress, formatEth } from "../utils/formatters";
import { ethers } from "ethers";

interface NotificationsPageProps {
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    syncNotifications,
    addNotification,
  } = useNotifications();
  const { address, client } = useWallet();

  const [activeTab, setActiveTab] = useState<"ALL" | "PAYMENTS" | "CHANNELS" | "SYSTEM">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync on mount and when address changes
  useEffect(() => {
    syncNotifications(address || undefined);
  }, [syncNotifications, address]);

  // Handle manual sync, including on-chain event query for receiver verification
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNotifications(address || undefined);

      // On-chain log query if wallet connected
      if (client && address) {
        try {
          const vault = client.getReadContract();
          // Filter ChannelSettled events
          const filter = vault.filters.ChannelSettled();
          // Query last 10,000 blocks
          const currentBlock = await vault.runner?.provider?.getBlockNumber();
          if (currentBlock) {
            const fromBlock = Math.max(0, currentBlock - 5000);
            const events = await vault.queryFilter(filter, fromBlock, currentBlock);

            for (const ev of events) {
              const parsed = vault.interface.parseLog(ev);
              if (parsed && parsed.name === "ChannelSettled") {
                const channelId = parsed.args[0];
                const cumulativeAmount = parsed.args[1];
                const payoutDelta = parsed.args[2];

                // Check channel state to see if connected address is recipient
                try {
                  const ch = await client.getChannelState(channelId);
                  if (ch.recipientAddress?.toLowerCase() === address.toLowerCase()) {
                    // Check if already in notifications
                    const exists = notifications.some(
                      (n) => n.transactionHash?.toLowerCase() === ev.transactionHash.toLowerCase() && n.type === "PAYMENT_RECEIVED"
                    );

                    if (!exists) {
                      addNotification({
                        type: "PAYMENT_RECEIVED",
                        title: "Payment Received",
                        message: `${formatEth(payoutDelta.toString())} ETH received from ${truncateAddress(ch.payerAddress || undefined)}`,
                        amount: `${formatEth(payoutDelta.toString())} ETH`,
                        sender: ch.payerAddress,
                        receiver: ch.recipientAddress,
                        channelId,
                        transactionHash: ev.transactionHash,
                        status: "UNREAD",
                        read: false,
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        } catch (onChainErr: any) {
          console.info("On-chain event sync:", onChainErr?.message);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PAYMENTS") {
      return (
        n.type === "VOUCHER_SIGNED" ||
        n.type === "SETTLEMENT_SUBMITTED" ||
        n.type === "SETTLEMENT_CONFIRMED" ||
        n.type === "SETTLEMENT_FAILED" ||
        n.type === "PAYMENT_RECEIVED" ||
        n.type === "payment" ||
        n.type === "settlement"
      );
    }
    if (activeTab === "CHANNELS") {
      return n.type === "CHANNEL_CREATED" || n.type === "channel";
    }
    if (activeTab === "SYSTEM") {
      return n.type === "system" || n.type === "security";
    }
    return true;
  });

  const getBadgeForType = (type: NotificationType) => {
    switch (type) {
      case "CHANNEL_CREATED":
      case "channel":
        return <span className="badge badge-info">Channel Created</span>;
      case "VOUCHER_SIGNED":
      case "payment":
        return <span className="badge badge-warning">Voucher Signed</span>;
      case "SETTLEMENT_SUBMITTED":
        return <span className="badge badge-neutral">Settlement Submitted</span>;
      case "SETTLEMENT_CONFIRMED":
      case "settlement":
        return <span className="badge badge-success">Settlement Confirmed</span>;
      case "PAYMENT_RECEIVED":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "rgba(63,125,90,0.08)",
              color: "#3F7D5A",
              border: "1px solid rgba(63,125,90,0.2)",
            }}
          >
            Payment Received
          </span>
        );
      case "SETTLEMENT_FAILED":
        return <span className="badge badge-error">Settlement Failed</span>;
      default:
        return <span className="badge badge-neutral">System</span>;
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case "CHANNEL_CREATED":
      case "channel":
        return <CreditCard size={18} color="#6B4F43" />;
      case "VOUCHER_SIGNED":
      case "payment":
        return <FileCheck2 size={18} color="#B98235" />;
      case "SETTLEMENT_SUBMITTED":
        return <ArrowRightLeft size={18} color="#6B4F43" />;
      case "SETTLEMENT_CONFIRMED":
      case "settlement":
        return <CheckCircle2 size={18} color="#3F7D5A" />;
      case "PAYMENT_RECEIVED":
        return <Coins size={18} color="#3F7D5A" />;
      case "SETTLEMENT_FAILED":
        return <AlertCircle size={18} color="#B94A48" />;
      default:
        return <Bell size={18} color="#6F655E" />;
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--status-error)",
                  color: "#ffffff",
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
            Real-time verified notifications for channels, vouchers, and blockchain settlements.
          </p>
        </div>

        {/* Top Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn btn-outline btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            title="Sync latest notifications from server and blockchain"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="btn btn-outline btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "12px",
          marginBottom: "24px",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveTab("ALL")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            color: activeTab === "ALL" ? "var(--text-primary)" : "var(--text-secondary)",
            backgroundColor: activeTab === "ALL" ? "var(--bg-tertiary)" : "transparent",
            cursor: "pointer",
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab("PAYMENTS")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            color: activeTab === "PAYMENTS" ? "var(--text-primary)" : "var(--text-secondary)",
            backgroundColor: activeTab === "PAYMENTS" ? "var(--bg-tertiary)" : "transparent",
            cursor: "pointer",
          }}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab("CHANNELS")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            color: activeTab === "CHANNELS" ? "var(--text-primary)" : "var(--text-secondary)",
            backgroundColor: activeTab === "CHANNELS" ? "var(--bg-tertiary)" : "transparent",
            cursor: "pointer",
          }}
        >
          Channels
        </button>
        <button
          onClick={() => setActiveTab("SYSTEM")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            color: activeTab === "SYSTEM" ? "var(--text-primary)" : "var(--text-secondary)",
            backgroundColor: activeTab === "SYSTEM" ? "var(--bg-tertiary)" : "transparent",
            cursor: "pointer",
          }}
        >
          System
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div
          style={{
            padding: "60px 24px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <Bell size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px", opacity: 0.5 }} />
          <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            No notifications yet.
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
            Notifications for channel creation, voucher signatures, and confirmed blockchain settlements will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.read && notif.status !== "READ";
            const txHash = notif.transactionHash || notif.txHash;

            return (
              <div
                key={notif.id}
                style={{
                  padding: "20px",
                  borderRadius: "16px",
                  backgroundColor: isUnread ? "#FBF7F1" : "#FFFFFF",
                  border: `1px solid ${isUnread ? "rgba(196,154,90,0.3)" : "#E5DED5"}`,
                  boxShadow: "0 2px 8px rgba(58,41,35,0.04)",
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                {/* Type Icon */}
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    backgroundColor: "var(--bg-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {getIconForType(notif.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {getBadgeForType(notif.type)}
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {notif.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                      {isUnread && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          style={{
                            fontSize: "12px",
                            color: "var(--brand-secondary)",
                            fontWeight: 600,
                            background: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "4px 0 12px" }}>
                    {notif.message}
                  </p>

                  {/* Metadata Chips / Details */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      fontSize: "12px",
                    }}
                  >
                    {/* Amount */}
                    {notif.amount && (
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Amount: <strong style={{ color: "var(--brand-secondary)" }}>{notif.amount}</strong>
                      </div>
                    )}

                    {/* Sender */}
                    {notif.sender && (
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>From:</span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>
                          {truncateAddress(notif.sender)}
                        </span>
                        <button
                          onClick={() => handleCopy(notif.sender!, `sender_${notif.id}`)}
                          style={{ background: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                          title="Copy sender address"
                        >
                          {copiedId === `sender_${notif.id}` ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {/* Receiver */}
                    {notif.receiver && (
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>To:</span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>
                          {truncateAddress(notif.receiver)}
                        </span>
                        <button
                          onClick={() => handleCopy(notif.receiver!, `receiver_${notif.id}`)}
                          style={{ background: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                          title="Copy receiver address"
                        >
                          {copiedId === `receiver_${notif.id}` ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {/* Channel ID */}
                    {notif.channelId && (
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>Channel:</span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>
                          {truncateHash(notif.channelId)}
                        </span>
                        <button
                          onClick={() => handleCopy(notif.channelId!, `ch_${notif.id}`)}
                          style={{ background: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                          title="Copy channel ID"
                        >
                          {copiedId === `ch_${notif.id}` ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {/* Transaction Hash */}
                    {txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(107,79,67,0.08)",
                          border: "1px solid rgba(107,79,67,0.2)",
                          color: "#6B4F43",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                        title="View on Sepolia Etherscan"
                      >
                        <span className="mono">Tx: {truncateHash(txHash)}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
