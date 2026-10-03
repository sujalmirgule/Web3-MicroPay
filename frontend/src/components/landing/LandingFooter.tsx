import React from "react";
import { Zap } from "lucide-react";
import { LandingNavProps } from "./types";

export const LandingFooter: React.FC<LandingNavProps> = ({ onNavigate, onOpenDemo }) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          {/* Brand Column */}
          <div className="lp-footer-brand">
            <div className="lp-logo-link" style={{ marginBottom: "14px" }} onClick={() => scrollTo("hero")}>
              <div className="lp-logo-icon" style={{ width: "30px", height: "30px" }}>
                <Zap size={16} />
              </div>
              <span className="lp-logo-text" style={{ color: "#FFFFFF" }}>Micro Pay</span>
            </div>
            <p className="lp-footer-desc">
              Simple, secure and transparent blockchain payments.
            </p>
          </div>

          {/* Product Column */}
          <div className="lp-footer-col">
            <h5>Product</h5>
            <ul className="lp-footer-links">
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("features")}>
                  Features
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("how-it-works")}>
                  How It Works
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("trust")}>
                  Pricing
                </span>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="lp-footer-col">
            <h5>Resources</h5>
            <ul className="lp-footer-links">
              <li>
                <span className="lp-footer-link" onClick={() => onOpenDemo && onOpenDemo()}>
                  Docs
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("showcase")}>
                  Developers
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("security")}>
                  Security
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => onOpenDemo && onOpenDemo()}>
                  Support
                </span>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lp-footer-col">
            <h5>Company</h5>
            <ul className="lp-footer-links">
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("hero")}>
                  About
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => onOpenDemo && onOpenDemo()}>
                  Contact
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("security")}>
                  Privacy
                </span>
              </li>
              <li>
                <span className="lp-footer-link" onClick={() => scrollTo("security")}>
                  Terms
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="lp-footer-bottom">
          <div>© 2026 Micro Pay. All rights reserved.</div>
          <div>Sepolia Testnet Compatible • EIP-712 State Channels</div>
        </div>
      </div>
    </footer>
  );
};
export const Footer = LandingFooter;
export default LandingFooter;
