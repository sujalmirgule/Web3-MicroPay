import React from "react";

export const MobilePreview: React.FC = () => {
  return (
    <div className="lp-showcase-phone">
      <div className="lp-sc-phone-header">
        <span>Send Payment</span>
        <span style={{ fontSize: "9px", color: "#4CAF50" }}>● Ready</span>
      </div>

      <div style={{ fontSize: "11px", color: "#8E8279", marginBottom: "4px" }}>
        Recipient Address
      </div>
      <div className="lp-sc-phone-input-box">
        0x7099...79C8
      </div>

      <div style={{ fontSize: "11px", color: "#8E8279", marginBottom: "4px" }}>
        Payment Amount
      </div>
      <div className="lp-sc-phone-input-box" style={{ fontWeight: 700, fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
        <span>0.050 ETH</span>
        <span style={{ fontSize: "10px", color: "var(--lp-accent-orange)" }}>Max</span>
      </div>

      <div style={{ fontSize: "11px", color: "#8E8279", marginBottom: "4px" }}>
        Network
      </div>
      <div className="lp-sc-phone-input-box" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Sepolia Testnet</span>
        <span style={{ color: "#4CAF50" }}>Low Fee</span>
      </div>

      <button
        type="button"
        className="lp-sc-phone-btn"
      >
        Review Payment
      </button>
    </div>
  );
};
export default MobilePreview;
