import React, { useState } from "react";
import { X, Play, CheckCircle2, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToApp?: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateToApp,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedVoucher, setSimulatedVoucher] = useState({
    nonce: 1,
    cumulativeAmount: "0.005",
    sig: "0x78f2c...4a9e",
  });

  if (!isOpen) return null;

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimulatedVoucher((prev) => ({
        nonce: prev.nonce + 1,
        cumulativeAmount: (parseFloat(prev.cumulativeAmount) + 0.005).toFixed(3),
        sig: `0x${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 6)}`,
      }));
      setIsSimulating(false);
    }, 400);
  };

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div
        className="lp-demo-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="lp-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(230, 106, 35, 0.15)",
                color: "var(--lp-accent-orange)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={18} fill="currentColor" />
            </div>
            <div>
              <h3 className="lp-modal-title">Micro Pay Interactive Architecture</h3>
              <p style={{ fontSize: "12px", color: "#8E8279", margin: 0 }}>
                EIP-712 State Channels Demo Simulation
              </p>
            </div>
          </div>

          <button
            type="button"
            className="lp-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Selector Pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: activeStep === 1 ? "1px solid var(--lp-accent-orange)" : "1px solid rgba(255, 255, 255, 0.08)",
              background: activeStep === 1 ? "rgba(230, 106, 35, 0.12)" : "rgba(255, 255, 255, 0.03)",
              color: activeStep === 1 ? "#FFA066" : "#A99E95",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            1. Channel Lock
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: activeStep === 2 ? "1px solid var(--lp-accent-orange)" : "1px solid rgba(255, 255, 255, 0.08)",
              background: activeStep === 2 ? "rgba(230, 106, 35, 0.12)" : "rgba(255, 255, 255, 0.03)",
              color: activeStep === 2 ? "#FFA066" : "#A99E95",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            2. Stream Vouchers
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: activeStep === 3 ? "1px solid var(--lp-accent-orange)" : "1px solid rgba(255, 255, 255, 0.08)",
              background: activeStep === 3 ? "rgba(230, 106, 35, 0.12)" : "rgba(255, 255, 255, 0.03)",
              color: activeStep === 3 ? "#FFA066" : "#A99E95",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            3. Final Settlement
          </button>
        </div>

        {/* Step Body */}
        {activeStep === 1 && (
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#F59E0B" }}>
              <Lock size={18} />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#FFFFFF" }}>Single On-Chain Deposit</h4>
            </div>
            <p style={{ fontSize: "13px", color: "#B5ABA2", lineHeight: 1.5, margin: "0 0 14px 0" }}>
              The payer deposits funds into the MicroPayVault smart contract on Sepolia. Gas is paid only once to establish an unlimited payment corridor.
            </p>
            <div style={{ background: "#110D0B", padding: "12px", borderRadius: "8px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "#4CAF50" }}>
              {`> MicroPayVault.createChannel(recipient: 0x7099...79C8)`}
              <br />
              {`> Value: 0.1000 ETH (Locked in Escrow)`}
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--lp-accent-orange)" }}>
                <Zap size={18} />
                <h4 style={{ margin: 0, fontSize: "15px", color: "#FFFFFF" }}>Zero-Gas Off-Chain Micro-Vouchers</h4>
              </div>
              <button
                type="button"
                className="lp-btn-primary"
                style={{ padding: "4px 10px", fontSize: "11px" }}
                onClick={runSimulation}
                disabled={isSimulating}
              >
                {isSimulating ? "Signing..." : "+ Stream 0.005 ETH"}
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "#B5ABA2", lineHeight: 1.5, margin: "0 0 14px 0" }}>
              Each micropayment generates an EIP-712 cryptographic signature off-chain. Monotonically increasing amounts prevent replay attacks with zero gas fees!
            </p>
            <div style={{ background: "#110D0B", padding: "12px", borderRadius: "8px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "#FFA066" }}>
              <div>{`Voucher Nonce: #${simulatedVoucher.nonce}`}</div>
              <div>{`Cumulative Amount: ${simulatedVoucher.cumulativeAmount} ETH`}</div>
              <div>{`Signature: ${simulatedVoucher.sig}`}</div>
              <div style={{ color: "#4CAF50", marginTop: "4px" }}>✓ Gas Spent: $0.00 (Pure Cryptography)</div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#4CAF50" }}>
              <ShieldCheck size={18} />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#FFFFFF" }}>One-Click On-Chain Finality</h4>
            </div>
            <p style={{ fontSize: "13px", color: "#B5ABA2", lineHeight: 1.5, margin: "0 0 14px 0" }}>
              The recipient submits only the latest voucher to claim accumulated ETH. Unused deposit remains protected and refundable.
            </p>
            <div style={{ background: "#110D0B", padding: "12px", borderRadius: "8px", fontFamily: "var(--font-mono, monospace)", fontSize: "12px", color: "#81C784" }}>
              {`> settleClaim(channelId, cumulativeAmount, signature)`}
              <br />
              {`> Status: Confirmed in Sepolia Block`}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            type="button"
            className="lp-btn-secondary dark"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="lp-btn-primary"
            onClick={() => {
              onClose();
              if (onNavigateToApp) onNavigateToApp();
            }}
          >
            <span>Launch Live App</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
