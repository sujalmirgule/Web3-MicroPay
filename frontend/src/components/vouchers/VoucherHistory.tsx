import React, { useState } from "react";
import {
  FileCheck2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatEth, truncateHash, truncateAddress } from "../../utils/formatters";
import { ethers } from "ethers";

export type VoucherStatus = "SIGNED" | "SETTLEMENT_SUBMITTED" | "SETTLED" | "FAILED";

export interface VoucherRecord {
  id: string;
  channelId: string;
  sender: string;
  receiver: string;
  cumulativeAmount: string; // in Wei
  nonce: number;
  signature: string;
  validUntil: number;
  status: VoucherStatus;
  createdAt: string;
  settledAt?: string | null;
  transactionHash?: string | null;
}

interface VoucherHistoryProps {
  vouchers: VoucherRecord[];
  onSelectForSettlement?: (voucher: VoucherRecord) => void;
  selectedChannelId?: string;
}

export const VoucherHistory: React.FC<VoucherHistoryProps> = ({
  vouchers,
  onSelectForSettlement,
  selectedChannelId,
}) => {
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available unique channel IDs from voucher history
  const uniqueChannels = Array.from(new Set(vouchers.map((v) => v.channelId)));

  // Filter vouchers
  const filteredVouchers = vouchers
    .filter((v) => {
      if (filterChannel !== "ALL" && v.channelId.toLowerCase() !== filterChannel.toLowerCase()) {
        return false;
      }
      if (filterStatus !== "ALL" && v.status !== filterStatus) {
        return false;
      }
      return true;
    })
    // Ensure reverse chronological order: newest first
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCopyJson = (voucher: VoucherRecord) => {
    navigator.clipboard.writeText(JSON.stringify(voucher, null, 2));
    setCopiedId(voucher.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: VoucherStatus) => {
    switch (status) {
      case "SIGNED":
        return <span className="badge badge-warning">SIGNED</span>;
      case "SETTLEMENT_SUBMITTED":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "rgba(14, 165, 233, 0.15)",
              color: "#38bdf8",
              border: "1px solid rgba(14, 165, 233, 0.3)",
            }}
          >
            SETTLEMENT_SUBMITTED
          </span>
        );
      case "SETTLED":
        return <span className="badge badge-success">SETTLED</span>;
      case "FAILED":
        return <span className="badge badge-danger">FAILED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div style={{ marginTop: "24px" }}>
      {/* Header and Filter Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Voucher History
          </h3>
          <span
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              borderRadius: "9999px",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              fontWeight: 600,
            }}
          >
            {filteredVouchers.length} {filteredVouchers.length === 1 ? "record" : "records"}
          </span>
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Channel Filter */}
          {uniqueChannels.length > 1 && (
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "6px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              <option value="ALL">All Channels ({vouchers.length})</option>
              {uniqueChannels.map((ch) => (
                <option key={ch} value={ch}>
                  Channel {truncateHash(ch)}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SIGNED">SIGNED</option>
            <option value="SETTLEMENT_SUBMITTED">SETTLEMENT_SUBMITTED</option>
            <option value="SETTLED">SETTLED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Vouchers List */}
      {filteredVouchers.length === 0 ? (
        <div
          style={{
            padding: "36px 16px",
            textAlign: "center",
            backgroundColor: "var(--bg-secondary)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "12px",
            color: "var(--text-muted)",
          }}
        >
          <FileCheck2 size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
            No vouchers signed yet.
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            Every signed EIP-712 payment voucher will be permanently recorded here in historical sequence.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredVouchers.map((voucher) => {
            const isExpanded = expandedId === voucher.id;
            const amountEth = ethers.formatEther(voucher.cumulativeAmount);

            return (
              <div
                key={voucher.id}
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: `1px solid ${voucher.status === "SETTLED" ? "rgba(16, 185, 129, 0.25)" : "var(--border-subtle)"}`,
                  borderRadius: "12px",
                  padding: "16px 18px",
                  transition: "all var(--transition-fast)",
                }}
              >
                {/* Top Card Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-tertiary)",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--brand-primary)",
                      }}
                    >
                      Voucher #{voucher.nonce}
                    </div>

                    {getStatusBadge(voucher.status)}

                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(voucher.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => handleCopyJson(voucher)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Copy Voucher JSON"
                    >
                      {copiedId === voucher.id ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                      <span>{copiedId === voucher.id ? "Copied" : "JSON"}</span>
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : voucher.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{isExpanded ? "Hide" : "Details"}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Settle Action Button if signed and eligible */}
                    {voucher.status === "SIGNED" && onSelectForSettlement && (
                      <button
                        onClick={() => onSelectForSettlement(voucher)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: "5px 12px", fontSize: "12px", gap: "4px" }}
                        title="Stage this voucher for on-chain settlement"
                      >
                        <ShieldCheck size={13} />
                        <span>Settle</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount and Main Stats Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "12px",
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Cumulative Amount
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      {amountEth} ETH
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Nonce
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      #{voucher.nonce}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Channel ID
                    </div>
                    <div className="mono" style={{ fontSize: "13px", fontWeight: 600, color: "var(--brand-secondary)", marginTop: "2px" }}>
                      {truncateHash(voucher.channelId)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Recipient
                    </div>
                    <div className="mono" style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {truncateAddress(voucher.receiver)}
                    </div>
                  </div>
                </div>

                {/* Transaction Hash Banner if Settled / Submitted */}
                {voucher.transactionHash && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--status-success)" }}>
                      <CheckCircle2 size={13} />
                      <span>Settlement Transaction:</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{truncateHash(voucher.transactionHash)}</span>
                    </div>

                    <a
                      href={`https://sepolia.etherscan.io/tx/${voucher.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--brand-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        fontWeight: 600,
                      }}
                    >
                      <span>View on Etherscan</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "14px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                      EIP-712 Voucher Verification Details
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Signer (Payer): </span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>{voucher.sender}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Recipient: </span>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>{voucher.receiver}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Valid Until: </span>
                        <span>{new Date(voucher.validUntil * 1000).toLocaleString()} (Timestamp: {voucher.validUntil})</span>
                      </div>
                      {voucher.settledAt && (
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Settled At: </span>
                          <span>{new Date(voucher.settledAt).toLocaleString()}</span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Signature (ECDSA 65 bytes): </span>
                        <div
                          className="mono"
                          style={{
                            padding: "6px 8px",
                            backgroundColor: "var(--bg-secondary)",
                            borderRadius: "4px",
                            wordBreak: "break-all",
                            color: "var(--text-muted)",
                            marginTop: "4px",
                          }}
                        >
                          {voucher.signature}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
