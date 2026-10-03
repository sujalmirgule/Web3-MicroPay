import React from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { truncateAddress } from "../../utils/formatters";
import { LandingNavProps } from "./types";

export const FinalCTA: React.FC<LandingNavProps> = ({ onNavigate }) => {
  const { isConnected, address, connectWallet } = useWallet();

  return (
    <section className="lp-final-cta-section">
      <div className="lp-container">
        <div className="lp-final-cta-card">
          <div className="lp-final-cta-glow" />

          {/* Left Text */}
          <div className="lp-final-cta-text">
            <h2>
              Ready to Move Money
              <br />
              Without Borders?
            </h2>
            <p>
              Experience fast, secure, and transparent blockchain payments with Micro Pay.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="lp-final-cta-buttons">
            <button
              type="button"
              className="lp-btn-primary"
              onClick={() => onNavigate && onNavigate("/auth/signup")}
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="lp-btn-secondary dark"
              onClick={isConnected ? () => onNavigate && onNavigate("/dashboard/channels") : connectWallet}
            >
              <Wallet size={16} />
              <span>
                {isConnected && address ? truncateAddress(address) : "Connect Wallet"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
export default FinalCTA;
