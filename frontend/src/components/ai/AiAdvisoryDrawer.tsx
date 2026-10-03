import React, { useState } from "react";
import { X, Sparkles, AlertCircle, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface AiAdvisoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const PRESET_TOPICS = [
  "How do state channels eliminate per-transaction gas fees?",
  "How does EIP-712 voucher signing work?",
  "Explain the 24-hour dispute timelock and how funds are protected",
  "What is the difference between Signed, Submitted, and Settled states?",
  "Why is cumulative amount monotonically increasing?",
];

const ADVISORY_RESPONSES: Record<string, string> = {
  "How do state channels eliminate per-transaction gas fees?":
    "Web3 MicroPay uses 2-transaction state channels:\n1. On-chain funding: You escrow funds into the MicroPayVault smart contract once.\n2. Off-chain micro-payments: You exchange cryptographic EIP-712 vouchers off-chain directly with the merchant at zero gas cost and millisecond latency.\n3. Monotonic settlement: At any time, the merchant submits only the final, highest-valued voucher to settle all accumulated payments in a single on-chain transaction.",

  "How does EIP-712 voucher signing work?":
    "EIP-712 provides typed structured data hashing. When you sign a voucher, MetaMask displays the exact channel ID, payer, recipient, cumulative amount, and validUntil timestamp. The hash includes domain separation (Web3MicroPayVault, Chain ID 11155111, contract address), ensuring a voucher cannot be replayed on any other contract or blockchain.",

  "Explain the 24-hour dispute timelock and how funds are protected":
    "If a merchant is unresponsive or disputes a balance, either party can call initiateChannelClose(). This starts a strictly enforced 24-hour (86,400 seconds) dispute countdown on-chain. During this window, the merchant can submit the latest valid voucher to claim legitimate owed funds. Once the window expires, finalizeChannelClose() refunds all remaining collateral directly to the payer.",

  "What is the difference between Signed, Submitted, and Settled states?":
    "The 3-stage lifecycle guarantees strict financial transparency:\n• SIGNED: The payer has signed an EIP-712 voucher in their wallet, verified by backend and reserved in Redis. Funds remain in escrow.\n• SUBMITTED: The merchant/relayer has broadcasted an on-chain settleClaim transaction. Mined in mempool.\n• CONFIRMED & SETTLED: The transaction has achieved 6 block confirmations on Ethereum Sepolia, processed by indexer and reconciliation workers.",

  "Why is cumulative amount monotonically increasing?":
    "Each voucher represents the TOTAL aggregated debt owed to the merchant since channel opening, NOT incremental vouchers. For example, if you make two $0.05 payments, Voucher #1 has cumulativeAmount 0.05, and Voucher #2 has 0.10. This guarantees that only the single highest voucher needs on-chain execution, saving huge gas costs and mathematically preventing double-spend replay attacks.",
};

export const AiAdvisoryDrawer: React.FC<AiAdvisoryDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am the Web3 MicroPay Advisory Assistant. I can help explain state channels, EIP-712 voucher validation, gas economics, dispute timelocks, and reconciliation. (Note: I have ZERO transaction authority and cannot sign or move funds).",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsThinking(true);

    setTimeout(() => {
      let reply =
        ADVISORY_RESPONSES[query] ||
        `Based on the Web3 MicroPay protocol specification:\n\n` +
          `• All transactions are secured by the immutable MicroPayVault smart contract on Ethereum Sepolia.\n` +
          `• Payments are off-chain signed vouchers with EIP-712 typed signatures.\n` +
          `• Security invariants guarantee settledAmount <= totalDeposit and non-monotonic claims are rejected.\n\n` +
          `If you have specific questions about channel opening, gas limits, or cooperative closes, choose from the topics below.`;

      // Check if user is asking about actions
      if (
        query.toLowerCase().includes("send eth") ||
        query.toLowerCase().includes("transfer") ||
        query.toLowerCase().includes("sign for me") ||
        query.toLowerCase().includes("withdraw")
      ) {
        reply =
          "⚠️ SECURITY POLICY ENFORCED: The AI Advisory Layer does NOT possess private keys, cannot authorize payments, and cannot initiate blockchain transactions. All transactions must be reviewed and signed directly in your connected Web3 wallet.";
      }

      const aiMsg: Message = {
        id: `msg_${Date.now()}_a`,
        sender: "ai",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100%",
          backgroundColor: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-medium)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                AI Advisory Assistant
              </h3>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Informational Layer • Zero Authority
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Advisory Guardrail Notice */}
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "#fbbf24",
          }}
        >
          <ShieldAlert size={14} style={{ flexShrink: 0 }} />
          <span>Advisory only: Cannot sign transactions or modify balances.</span>
        </div>

        {/* Chat Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  backgroundColor:
                    m.sender === "user" ? "var(--brand-primary)" : "var(--bg-tertiary)",
                  color: m.sender === "user" ? "#ffffff" : "var(--text-primary)",
                  border: m.sender === "user" ? "none" : "1px solid var(--border-subtle)",
                }}
              >
                {m.text}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                  padding: "0 4px",
                }}
              >
                {m.timestamp}
              </span>
            </div>
          ))}

          {isThinking && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px" }}>
              <LoadingSpinner size="sm" color="#38bdf8" />
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Generating advisory insight...
              </span>
            </div>
          )}
        </div>

        {/* Topic Suggestions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-primary)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            Suggested Topics
          </div>
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {PRESET_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleSend(topic)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-medium)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {topic.length > 32 ? topic.slice(0, 32) + "..." : topic}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "10px",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <input
            type="text"
            placeholder="Ask about state channels, vouchers, disputes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isThinking}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="btn btn-primary"
            style={{ padding: "0 16px" }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
