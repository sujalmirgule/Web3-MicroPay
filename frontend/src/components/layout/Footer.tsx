import React from "react";
import { DEPLOYMENT_INFO } from "@web3-micropay/shared";
import { truncateAddress } from "../../utils/formatters";
import { ShieldCheck, ExternalLink, Terminal } from "lucide-react";

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const vaultAddress =
    (import.meta as any).env?.VITE_MICROPAY_VAULT_ADDRESS ||
    DEPLOYMENT_INFO?.vaultAddress ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  return (
    <footer
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
        padding: "48px 24px 24px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "40px",
          marginBottom: "40px",
        }}
        className="footer-grid"
      >
        {/* Brand & Mission */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
              Web3 MicroPay
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "340px" }}>
            High-throughput, non-custodial micropayment state channels with monotonic cumulative vouchers,
            EIP-712 cryptographic proofs, and deterministic on-chain settlement.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              fontSize: "12px",
              color: "var(--status-success)",
            }}
          >
            <ShieldCheck size={16} />
            <span>Immutable Smart Contract Architecture (No Upgrade Proxies)</span>
          </div>
        </div>

        {/* Protocol Links */}
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "16px", letterSpacing: "0.05em" }}>
            Protocol
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
            <li>
              <button onClick={() => onNavigate("/payment-channels")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Payment Channels
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/payments")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Voucher Payments
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/transactions")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Settlement History
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/dashboard")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Payer Dashboard
              </button>
            </li>
          </ul>
        </div>

        {/* Merchant Links */}
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "16px", letterSpacing: "0.05em" }}>
            Merchant
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
            <li>
              <button onClick={() => onNavigate("/merchant")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Merchant Portal
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/merchant/payment-requests")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Payment Requests
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/merchant/settlements")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                On-Chain Claims
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("/merchant/webhooks")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                HMAC Webhooks
              </button>
            </li>
          </ul>
        </div>

        {/* Resources & Security */}
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "16px", letterSpacing: "0.05em" }}>
            Documentation
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
            <li>
              <button onClick={() => onNavigate("/help")} style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Architecture & Guides
              </button>
            </li>
            <li>
              <a
                href={`https://sepolia.etherscan.io/address/${vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>Sepolia Contract</span>
                <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                Vault: {truncateAddress(vaultAddress)}
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          paddingTop: "24px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        <div>
          © {new Date().getFullYear()} Web3 MicroPay Protocol. Zero custody. All signatures verified client-side.
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Canonical Network: Ethereum Sepolia (11155111)</span>
          <span>EIP-712 Monotonic Protocol</span>
        </div>
      </div>
    </footer>
  );
};
