import React from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet, SEPOLIA_CHAIN_ID } from "../context/WalletContext";
import { Card } from "../components/ui/Card";
import { User, Mail, Wallet, ShieldCheck, LogOut, PowerOff } from "lucide-react";
import { truncateAddress } from "../utils/formatters";

interface ProfilePageProps {
  onNavigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { address, chainId, balance, isConnected, disconnectWallet, connectWallet } = useWallet();

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", paddingBottom: "40px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
          Account & Profile
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
          Manage your application account credentials and Web3 wallet connection.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Account Details Card */}
        <Card title="User Account">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Full Name
              </div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                {user?.fullName || "Not provided"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Email Address
              </div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                {user?.email || "Not signed in"}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
              <button
                onClick={() => {
                  logout();
                  onNavigate("/auth/login");
                }}
                className="btn btn-outline btn-sm"
                style={{ color: "var(--status-error)", borderColor: "rgba(239, 68, 68, 0.3)", gap: "6px" }}
              >
                <LogOut size={14} />
                <span>Logout from Account</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Web3 Wallet Card */}
        <Card title="Web3 Wallet Connection">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Wallet Status
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isConnected ? "var(--status-success)" : "var(--status-warning)",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {isConnected && address ? (
              <>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Wallet Address
                  </div>
                  <div className="mono" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                    {address}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Network & Balance
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {chainId === SEPOLIA_CHAIN_ID ? "Ethereum Sepolia" : `Chain ID: ${chainId}`} —{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{Number(balance).toFixed(4)} ETH</strong>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                  <button
                    onClick={disconnectWallet}
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--status-warning)", borderColor: "rgba(245, 158, 11, 0.3)", gap: "6px" }}
                  >
                    <PowerOff size={14} />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              </>
            ) : (
              <div>
                <button onClick={connectWallet} className="btn btn-primary btn-sm">
                  Connect MetaMask
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
