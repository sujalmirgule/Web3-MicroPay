import React from "react";

export const TrustSection: React.FC = () => {
  return (
    <section id="trust" className="lp-trust-strip">
      <div className="lp-container">
        <h4 className="lp-trust-heading">Trusted by Web3 innovators</h4>

        <div className="lp-trust-logos-row">
          {/* Ethereum */}
          <div className="lp-trust-partner">
            <svg width="20" height="20" viewBox="0 0 784 1277" fill="currentColor">
              <path d="M392.07 0L383.5 29.11V874.74L392.07 883.29L784.13 651.54L392.07 0Z" opacity="0.6"/>
              <path d="M392.07 0L0 651.54L392.07 883.29V472.33V0Z" opacity="0.45"/>
              <path d="M392.07 956.52L387.24 962.41V1263.56L392.07 1277.38L784.37 724.89L392.07 956.52Z" opacity="0.6"/>
              <path d="M392.07 1277.38V956.52L0 724.89L392.07 1277.38Z" opacity="0.45"/>
            </svg>
            <span>Ethereum</span>
          </div>

          {/* MetaMask */}
          <div className="lp-trust-partner">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 10l-4-7-3 3-3-3-4 7 4 4v4l3 3 3-3v-4l4-4z"/>
            </svg>
            <span>MetaMask</span>
          </div>

          {/* WalletConnect */}
          <div className="lp-trust-partner">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9c3.866-3.866 10.134-3.866 14 0" />
              <path d="M8.5 12.5c1.933-1.933 5.067-1.933 7 0" />
              <circle cx="12" cy="16" r="1.5" fill="currentColor" />
            </svg>
            <span>WalletConnect</span>
          </div>

          {/* Chainlink */}
          <div className="lp-trust-partner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />
            </svg>
            <span>Chainlink</span>
          </div>

          {/* Alchemy */}
          <div className="lp-trust-partner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 3 2 21 22 21 12 3" />
              <circle cx="12" cy="14" r="2" fill="currentColor" />
            </svg>
            <span>Alchemy</span>
          </div>

          {/* Infura */}
          <div className="lp-trust-partner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Infura</span>
          </div>
        </div>
      </div>
    </section>
  );
};
export default TrustSection;
