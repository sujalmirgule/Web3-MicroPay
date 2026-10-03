import React, { useState } from "react";
import { Send, ArrowDownLeft, RefreshCw, CheckCircle2, ExternalLink, Bell, Sparkles } from "lucide-react";

interface HeroVisualProps {
  onActionClick?: (action: string) => void;
}

export const HeroVisual: React.FC<HeroVisualProps> = ({ onActionClick }) => {
  const [balanceEth, setBalanceEth] = useState("0.4825");
  const [activeTab, setActiveTab] = useState<"activity" | "channels">("activity");

  return (
    <div className="lp-hero-visual-wrapper">
      {/* Background Orbital Rings */}
      <div className="lp-hero-ambient-ring lp-ambient-ring-1" />
      <div className="lp-hero-ambient-ring lp-ambient-ring-2" />

      {/* 3D Smartphone Device Mockup */}
      <div className="lp-phone-frame">
        {/* Dynamic Island / Notch */}
        <div className="lp-phone-notch">
          <div className="lp-phone-camera" />
        </div>

        {/* Screen Content */}
        <div className="lp-phone-screen">
          {/* Status Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#8E8279", padding: "0 4px" }}>
            <span>9:41</span>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <span>5G</span>
              <span style={{ fontSize: "9px" }}>100%</span>
            </div>
          </div>

          {/* App Header */}
          <div className="lp-phone-header">
            <div className="lp-phone-brand">
              <div className="lp-phone-avatar">MP</div>
              <span>Micro Pay</span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#A89D94", cursor: "pointer", padding: "2px" }}
                aria-label="Notifications"
              >
                <Bell size={14} />
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div className="lp-phone-balance-card">
            <div className="lp-phone-balance-label">Total Channel Balance</div>
            <div className="lp-phone-balance-amount">{balanceEth} ETH</div>
            <div className="lp-phone-balance-fiat">≈ $1,547.45 USD <span style={{ color: "#4CAF50", marginLeft: "4px" }}>+3.2%</span></div>
          </div>

          {/* Quick Actions */}
          <div className="lp-phone-actions-row">
            <button
              type="button"
              className="lp-phone-action-btn primary"
              onClick={() => onActionClick && onActionClick("send")}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
            <button
              type="button"
              className="lp-phone-action-btn"
              onClick={() => onActionClick && onActionClick("receive")}
            >
              <ArrowDownLeft size={14} />
              <span>Receive</span>
            </button>
            <button
              type="button"
              className="lp-phone-action-btn"
              onClick={() => onActionClick && onActionClick("swap")}
            >
              <RefreshCw size={14} />
              <span>Swap</span>
            </button>
          </div>

          {/* Recent Activity List */}
          <div className="lp-phone-tx-header">
            <span>Recent Micro-Vouchers</span>
            <span style={{ color: "#FFA366", cursor: "pointer" }}>View All</span>
          </div>

          <div className="lp-phone-tx-list">
            <div className="lp-phone-tx-item">
              <div className="lp-phone-tx-left">
                <div className="lp-phone-tx-icon in">
                  <ArrowDownLeft size={12} />
                </div>
                <div className="lp-phone-tx-info">
                  <h5>From Bob (DevRel)</h5>
                  <p>Today, 14:22 • Settled</p>
                </div>
              </div>
              <div className="lp-phone-tx-amount plus">+0.045 ETH</div>
            </div>

            <div className="lp-phone-tx-item">
              <div className="lp-phone-tx-left">
                <div className="lp-phone-tx-icon out">
                  <Send size={12} />
                </div>
                <div className="lp-phone-tx-info">
                  <h5>Alchemy RPC Stream</h5>
                  <p>Today, 11:05 • Channel #3</p>
                </div>
              </div>
              <div className="lp-phone-tx-amount minus">-0.005 ETH</div>
            </div>

            <div className="lp-phone-tx-item">
              <div className="lp-phone-tx-left">
                <div className="lp-phone-tx-icon out">
                  <Send size={12} />
                </div>
                <div className="lp-phone-tx-info">
                  <h5>AI Compute API</h5>
                  <p>Yesterday • EIP-712</p>
                </div>
              </div>
              <div className="lp-phone-tx-amount minus">-0.001 ETH</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Payment Confirmed Card */}
      <div className="lp-floating-confirm-card">
        <div className="lp-confirm-card-badge">
          <CheckCircle2 size={16} />
          <span>Payment Confirmed</span>
        </div>
        <div className="lp-confirm-card-amount">0.025 ETH</div>
        <div className="lp-confirm-card-sub">To: 0x4B2d...E9F7 • Sepolia</div>
        <a
          href="https://sepolia.etherscan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-confirm-card-link"
        >
          <span>View on Explorer</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Floating 3D Golden Ethereum Token */}
      <div className="lp-floating-coin">
        <svg
          className="lp-eth-coin-svg"
          width="84"
          height="84"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="coinGoldBg" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="50%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#B26A00" />
            </radialGradient>
            <linearGradient id="ethFacet1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF4D0" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="ethFacet2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="ethFacet3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          {/* Outer Gold Coin Body */}
          <circle cx="50" cy="50" r="46" fill="url(#coinGoldBg)" stroke="#FFE57F" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="41" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Ethereum 3D Crystal Gem */}
          {/* Top-Left Facet */}
          <polygon points="50,22 34,48 50,42" fill="url(#ethFacet1)" />
          {/* Top-Right Facet */}
          <polygon points="50,22 66,48 50,42" fill="url(#ethFacet2)" />
          {/* Mid-Left Facet */}
          <polygon points="34,48 50,56 50,42" fill="url(#ethFacet3)" />
          {/* Mid-Right Facet */}
          <polygon points="66,48 50,56 50,42" fill="url(#ethFacet1)" />
          {/* Bottom-Left Facet */}
          <polygon points="50,60 34,51 50,78" fill="url(#ethFacet2)" />
          {/* Bottom-Right Facet */}
          <polygon points="50,60 66,51 50,78" fill="url(#ethFacet3)" />
        </svg>
      </div>
    </div>
  );
};
