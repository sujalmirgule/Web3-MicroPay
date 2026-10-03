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
  FileCheck2,
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
    { label: "Dashboard",       path: "/dashboard",              icon: <Layers size={16} /> },
    { label: "Channels",        path: "/dashboard/channels",     icon: <CreditCard size={16} /> },
    { label: "Payments",        path: "/dashboard/payments",     icon: <ArrowRightLeft size={16} /> },
    { label: "Voucher History", path: "/dashboard/history",      icon: <FileCheck2 size={16} /> },
    { label: "Transactions",    path: "/dashboard/transactions", icon: <Activity size={16} /> },
  ];

  return (
    <header
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid var(--border-medium)",
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
                boxShadow: "0 2px 8px rgba(58, 41, 35, 0.2)",
              }}
            >
              <ZapIcon />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--brand-primary)" }}>
                MicroPay
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-2px" }}>
                State Channels
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
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
                    gap: "7px",
                    padding: "7px 13px",
                    borderRadius: "9px",
                    fontSize: "13.5px",
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--brand-primary)" : "var(--text-secondary)",
                    backgroundColor: active ? "var(--bg-tertiary)" : "transparent",
                    transition: "all var(--transition-fast)",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  }}
                >
                  <span style={{ color: active ? "var(--brand-secondary)" : "var(--text-muted)" }}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* AI Advisory Trigger */}
          <button
            onClick={onOpenAiDrawer}
            className="btn btn-outline btn-sm"
            style={{
              gap: "6px",
              color: "var(--brand-secondary)",
              borderColor: "var(--border-medium)",
              backgroundColor: "var(--bg-tertiary)",
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
                padding: "5px 10px",
                borderRadius: "var(--radius-full)",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: isWrongNetwork
                  ? "var(--status-warning-bg)"
                  : "var(--status-success-bg)",
                color: isWrongNetwork ? "var(--status-warning)" : "var(--status-success)",
                border: `1px solid ${isWrongNetwork ? "var(--status-warning-border)" : "var(--status-success-border)"}`,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: isWrongNetwork ? "var(--status-warning)" : "var(--status-success)",
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
                  borderRadius: "9px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
                title="Wallet details"
              >
                <Wallet size={14} color="var(--brand-secondary)" />
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
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "14px",
                    boxShadow: "var(--shadow-lg)",
                    padding: "10px",
                    zIndex: 100,
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px" }}>
                    Connected Wallet
                  </div>
                  <div className="mono" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", padding: "4px 8px" }}>
                    {truncateAddress(address || undefined)}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "4px 8px", marginBottom: "4px" }}>
                    Balance: <strong style={{ color: "var(--text-primary)" }}>{Number(balance).toFixed(4)} ETH</strong>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
                    <button
                      onClick={() => {
                        setWalletDropdownOpen(false);
                        disconnectWallet();
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 8px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "var(--status-error)",
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
                  gap: "7px",
                  padding: "6px 12px",
                  borderRadius: "9px",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
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
                <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
              </button>

              {profileDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "44px",
                    width: "220px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "14px",
                    boxShadow: "var(--shadow-lg)",
                    padding: "8px",
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {user?.fullName || "Account"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                      {user?.email}
                    </div>
                  </div>

                  <button
                    onClick={() => { setProfileDropdownOpen(false); onNavigate("/dashboard/profile"); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "7px",
                      fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center",
                      gap: "8px", cursor: "pointer",
                    }}
                  >
                    <User size={14} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => { setProfileDropdownOpen(false); onNavigate("/dashboard/notifications"); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "7px",
                      fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center",
                      gap: "8px", cursor: "pointer",
                    }}
                  >
                    <Layers size={14} />
                    <span>Notifications</span>
                  </button>
                  <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />
                  <button
                    onClick={() => { setProfileDropdownOpen(false); logout(); onNavigate("/auth/login"); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "7px",
                      fontSize: "13px", color: "var(--status-error)", display: "flex", alignItems: "center",
                      gap: "8px", cursor: "pointer",
                    }}
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
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
