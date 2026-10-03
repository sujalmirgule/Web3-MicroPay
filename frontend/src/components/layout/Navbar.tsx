import React, { useState, useRef, useEffect } from "react";
import { useWallet, SEPOLIA_CHAIN_ID } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../notifications/NotificationBell";
import { truncateAddress } from "../../utils/formatters";
import {
  Wallet,
  Sparkles,
  LogOut,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  CreditCard,
  Activity,
  User,
  PowerOff,
} from "lucide-react";

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAiDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, onOpenAiDrawer }) => {
  const { address, chainId, balance, isConnected, isConnecting, isWrongNetwork, connectWallet, disconnectWallet } = useWallet();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: <Layers size={16} /> },
    { label: "Channels", path: "/dashboard/channels", icon: <CreditCard size={16} /> },
    { label: "Payments", path: "/dashboard/payments", icon: <ArrowRightLeft size={16} /> },
    { label: "Transactions", path: "/dashboard/transactions", icon: <Activity size={16} /> },
  ];

  return (
    <header
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 24px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div
            onClick={() => onNavigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
              }}
            >
              <ZapIcon />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                Web3 MicroPay
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-2px" }}>
                State Channels
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            className="desktop-nav"
          >
            {navLinks.map((link) => {
              const active = currentPath === link.path || (link.path !== "/dashboard" && currentPath.startsWith(link.path));
              return (
                <button
                  key={link.path}
                  onClick={() => onNavigate(link.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    backgroundColor: active ? "var(--bg-tertiary)" : "transparent",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Controls & Right Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* AI Advisory Trigger */}
          <button
            onClick={onOpenAiDrawer}
            className="btn btn-outline btn-sm"
            style={{
              gap: "6px",
              color: "#38bdf8",
              borderColor: "rgba(56, 189, 248, 0.3)",
              backgroundColor: "rgba(56, 189, 248, 0.08)",
            }}
            title="Open AI Advisory layer"
          >
            <Sparkles size={14} />
            <span style={{ display: "none" }} className="desktop-text">AI Advisor</span>
          </button>

          {/* Notification Bell */}
          <NotificationBell onNavigate={onNavigate} />

          {/* Network Pill */}
          {isConnected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: isWrongNetwork ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.12)",
                color: isWrongNetwork ? "#fbbf24" : "var(--status-success)",
                border: `1px solid ${isWrongNetwork ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.25)"}`,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: isWrongNetwork ? "#f59e0b" : "#10b981",
                }}
              />
              <span>{chainId === SEPOLIA_CHAIN_ID ? "Sepolia" : chainId === 31337 ? "Localhost" : "Wrong Net"}</span>
            </div>
          )}

          {/* Wallet Dropdown / Connect Button */}
          {!isConnected ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn btn-primary btn-sm"
              style={{ gap: "6px" }}
            >
              <Wallet size={15} />
              <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
            </button>
          ) : (
            <div style={{ position: "relative" }} ref={walletRef}>
              <button
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
                title="Wallet details"
              >
                <Wallet size={14} color="var(--brand-primary)" />
                <span className="mono" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {truncateAddress(address || undefined)}
                </span>
                <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
              </button>

              {walletDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "44px",
                    width: "220px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "12px",
                    boxShadow: "var(--shadow-xl)",
                    padding: "10px",
                    zIndex: 100,
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Connected Wallet
                  </div>
                  <div className="mono" style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>
                    {truncateAddress(address || undefined)}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Balance: <strong style={{ color: "var(--text-primary)" }}>{Number(balance).toFixed(4)} ETH</strong>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "8px", paddingTop: "8px" }}>
                    <button
                      onClick={() => {
                        setWalletDropdownOpen(false);
                        disconnectWallet();
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "var(--status-warning)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <PowerOff size={13} />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account Menu / Login Button */}
          {!isAuthenticated ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => onNavigate("/auth/login")}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                Login
              </button>
              <button
                onClick={() => onNavigate("/auth/signup")}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }} ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "var(--brand-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {(user?.fullName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.fullName || user?.email?.split("@")[0] || "Account"}
                </span>
                <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
              </button>

              {profileDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "44px",
                    width: "220px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "12px",
                    boxShadow: "var(--shadow-xl)",
                    padding: "8px",
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: "8px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {user?.fullName || "Account"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user?.email}
                    </div>
                  </div>

                  <div style={{ padding: "4px 0" }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onNavigate("/dashboard/profile");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <User size={14} />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onNavigate("/dashboard/notifications");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <Layers size={14} />
                      <span>Notifications</span>
                    </button>
                    <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        onNavigate("/auth/login");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--status-error)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <LogOut size={14} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}
