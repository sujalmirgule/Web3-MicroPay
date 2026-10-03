import React, { useState } from "react";
import { ChevronRight, FileText, Lock, Eye, Cpu } from "lucide-react";
import { SecurityVisual } from "./SecurityVisual";
import { SecurityCard } from "./SecurityCard";
import { LandingNavProps } from "./types";

export const SecuritySection: React.FC<LandingNavProps> = () => {
  const [showAuditInfo, setShowAuditInfo] = useState(false);

  const securityCards = [
    {
      icon: <FileText size={18} />,
      title: "Smart Contracts",
      description: "Audited open-source payment infrastructure.",
    },
    {
      icon: <Lock size={18} />,
      title: "Wallet Security",
      description: "We never store your private keys.",
    },
    {
      icon: <Eye size={18} />,
      title: "Transparent Records",
      description: "Every transaction is publicly verifiable.",
    },
    {
      icon: <Cpu size={18} />,
      title: "Decentralized",
      description: "Built on robust blockchain networks.",
    },
  ];

  return (
    <section id="security" className="lp-security-section">
      <div className="lp-container">
        <div className="lp-security-exact-grid">
          {/* Left Column: Heading, Subtitle, Learn More CTA */}
          <div className="lp-security-left-col">
            <div className="lp-pill-badge light">YOUR FUNDS, YOUR CONTROL</div>
            <h2 className="lp-section-title">
              Security <span className="accent">You Can Trust</span>
            </h2>
            <p className="lp-section-subtitle">
              Your assets are protected by industry-standard security practices and audited smart contracts.
            </p>

            <button
              type="button"
              className="lp-btn-secondary light"
              style={{ marginTop: "24px", alignSelf: "flex-start" }}
              onClick={() => setShowAuditInfo((prev) => !prev)}
            >
              <span>Learn More</span>
              <ChevronRight size={16} />
            </button>

            {showAuditInfo && (
              <div className="lp-security-audit-callout">
                <div style={{ fontWeight: 700, color: "var(--lp-text-heading)", marginBottom: "6px" }}>
                  Verified Invariants:
                </div>
                <ul style={{ paddingLeft: "18px", margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>Strict monotonic voucher sequence validation (EIP-712).</li>
                  <li>Hard safety rule: Cumulative claim &le; Channel deposit.</li>
                  <li>Non-custodial peer-to-peer Sepolia settlement vault.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Center Column: 3D Golden Shield & Pedestal */}
          <div className="lp-security-center-col">
            <SecurityVisual />
          </div>

          {/* Right Column: 4 Security Cards */}
          <div className="lp-security-right-col">
            <div className="lp-security-cards-stack">
              {securityCards.map((card, idx) => (
                <SecurityCard
                  key={idx}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default SecuritySection;
