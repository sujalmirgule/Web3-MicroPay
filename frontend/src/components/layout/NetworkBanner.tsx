import React from "react";
import { useWallet } from "../../context/WalletContext";
import { AlertTriangle } from "lucide-react";

export const NetworkBanner: React.FC = () => {
  const { isConnected, isWrongNetwork, chainId, switchToSepolia } = useWallet();

  if (!isConnected || !isWrongNetwork) return null;

  return (
    <div
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
        color: "#fbbf24",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <AlertTriangle size={18} />
        <span>
          Wrong network detected (Chain ID: {chainId}). Please switch to <strong>Ethereum Sepolia</strong>.
        </span>
      </div>
      <button
        onClick={switchToSepolia}
        style={{
          backgroundColor: "#f59e0b",
          color: "#000000",
          fontWeight: 700,
          padding: "6px 14px",
          borderRadius: "6px",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Switch to Sepolia
      </button>
    </div>
  );
};
