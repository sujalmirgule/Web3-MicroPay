import React, { useState } from "react";
import {
  Wallet,
  ShieldCheck,
  CreditCard,
  ArrowRightLeft,
  Lock,
  Layers,
  Activity,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  FileCheck2,
  Cpu,
  Coins,
  ArrowRight,
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 24px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo / Branding */}
          <div
            onClick={() => onNavigate("/")}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(37, 99, 235, 0.4)",
              }}
            >
              <ZapIcon />
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                MicroPay
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-2px" }}>
                Ethereum State Channels
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav style={{ display: "none", alignItems: "center", gap: "28px" }} className="desktop-links">
            <button
              onClick={() => scrollToSection("hero")}
              style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none" }}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none" }}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("why-channels")}
              style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none" }}
            >
              Why Channels
            </button>
            <button
              onClick={() => scrollToSection("features")}
              style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none" }}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("security")}
              style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500, background: "none" }}
            >
              Security
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: "none", alignItems: "center", gap: "12px" }} className="desktop-actions">
            <button
              onClick={() => onNavigate("/auth/login")}
              className="btn btn-outline btn-sm"
              style={{ fontWeight: 600, padding: "8px 18px" }}
            >
              Login
            </button>
            <button
              onClick={() => onNavigate("/auth/signup")}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 600, padding: "8px 20px" }}
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: "flex", color: "var(--text-primary)", padding: "6px" }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: "16px 24px",
              backgroundColor: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-medium)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <button
              onClick={() => scrollToSection("hero")}
              style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: "15px", padding: "6px 0" }}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: "15px", padding: "6px 0" }}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("why-channels")}
              style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: "15px", padding: "6px 0" }}
            >
              Why Channels
            </button>
            <button
              onClick={() => scrollToSection("features")}
              style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: "15px", padding: "6px 0" }}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("security")}
              style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: "15px", padding: "6px 0" }}
            >
              Security
            </button>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => onNavigate("/auth/login")}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Login
              </button>
              <button
                onClick={() => onNavigate("/auth/signup")}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          padding: "80px 24px 70px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              color: "var(--brand-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--brand-primary)" }} />
            <span>Ethereum Sepolia State Channel Infrastructure</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(34px, 5.5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: "20px",
            }}
          >
            Micropayments, Simplified on Ethereum
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "720px",
              margin: "0 auto 36px",
            }}
          >
            Send and settle small payments through secure blockchain payment channels without putting every individual payment directly on-chain.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "56px",
            }}
          >
            <button
              onClick={() => onNavigate("/auth/signup")}
              className="btn btn-primary"
              style={{
                fontSize: "16px",
                fontWeight: 600,
                padding: "14px 28px",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={18} style={{ marginLeft: "8px" }} />
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="btn btn-outline"
              style={{
                fontSize: "16px",
                fontWeight: 600,
                padding: "14px 26px",
              }}
            >
              How It Works
            </button>
          </div>
        </div>

        {/* ── Architecture Visual Flow ────────────────────────────────────── */}
        <div
          style={{
            marginTop: "20px",
            padding: "32px 24px",
            borderRadius: "16px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-medium)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand-secondary)", fontWeight: 700 }}>
              Architecture Overview
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
              The MicroPay Payment Flow
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              position: "relative",
            }}
          >
            {/* Step A: Sender */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "var(--brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Wallet size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Sender</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Connects wallet & authorizes payments
              </div>
            </div>

            {/* Step B: Payment Channel */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "var(--status-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Lock size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Payment Channel</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Collateral locked in smart contract escrow
              </div>
            </div>

            {/* Step C: Signed Voucher */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "var(--status-warning)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <FileCheck2 size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Signed Voucher</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Off-chain EIP-712 cryptographic signature
              </div>
            </div>

            {/* Step D: Settlement */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(14, 165, 233, 0.15)",
                  color: "#0ea5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <ArrowRightLeft size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Settlement</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Single on-chain verification transaction
              </div>
            </div>

            {/* Step E: Receiver */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  color: "#a855f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Coins size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Receiver</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Directly receives funds into their wallet
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ──────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: "80px 24px",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="badge badge-primary" style={{ marginBottom: "12px" }}>
              Simple 4-Step Process
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              How It Works
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "16px", maxWidth: "600px", margin: "8px auto 0" }}>
              Experience the power of state channels: zero gas for micro-payments, complete security guaranteed by Ethereum smart contracts.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "var(--brand-primary)",
                  fontWeight: 800,
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                01
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                Connect Wallet
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, flex: 1 }}>
                User connects MetaMask and switches to Ethereum Sepolia. The application reads your account balance and verifies network parameters.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "var(--brand-primary)",
                  fontWeight: 800,
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                02
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                Open Payment Channel
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, flex: 1 }}>
                Sender opens a payment channel and deposits funds into the smart-contract escrow. This on-chain deposit serves as the collateral for all subsequent micropayments.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "var(--brand-primary)",
                  fontWeight: 800,
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                03
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                Create Payment Vouchers
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, flex: 1 }}>
                Sender creates and signs EIP-712 payment vouchers.
              </p>
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  fontSize: "12px",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              >
                Important: Signing a voucher does not transfer funds.
              </div>
            </div>

            {/* Step 4 */}
            <div
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "var(--brand-primary)",
                  fontWeight: 800,
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                04
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
                Settle Claim
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, flex: 1 }}>
                The voucher is submitted for settlement and the smart contract releases the corresponding payment to the receiver.
              </p>
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: "12px",
                  color: "var(--status-success)",
                  fontWeight: 600,
                }}
              >
                Funds are transferred only after blockchain settlement.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Payment Channels Section ─────────────────────────────────── */}
      <section
        id="why-channels"
        style={{
          padding: "80px 24px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Why Payment Channels?
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "16px", maxWidth: "680px", margin: "8px auto 0" }}>
            Payment channels allow two parties to conduct numerous off-chain transactions while maintaining on-chain security.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Efficient Micropayments
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Enable sub-cent transactions that would otherwise be impractical due to Ethereum per-transaction gas costs.
            </p>
          </div>

          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Reduced On-Chain Transactions
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Only two on-chain transactions are required: one to open the channel with deposit, and one to settle the final balance.
            </p>
          </div>

          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Escrow-Based Payment Flow
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Collateral is locked securely in the audited smart contract. Neither party can spend beyond the deposit.
            </p>
          </div>

          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Cryptographic Authorization
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Every micropayment is secured with an EIP-712 typed signature from the sender's wallet, ensuring authenticity.
            </p>
          </div>

          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Direct Blockchain Settlement
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              The receiver can submit the highest cumulative voucher to claim the payout directly from the smart contract.
            </p>
          </div>

          <div style={{ padding: "24px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <CheckCircle2 size={20} color="var(--status-success)" />
              <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Non-Custodial Architecture
              </h4>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              You always retain complete control over your private keys and collateral. No intermediary holds custody of your funds.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: "80px 24px",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <span className="badge badge-primary" style={{ marginBottom: "12px" }}>
              Key Capabilities
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Core Features
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "16px", maxWidth: "600px", margin: "8px auto 0" }}>
              Engineered for reliability, non-custodial security, and high-frequency micropayment streaming.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Card 1 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <CreditCard size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                1. Payment Channels
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Open dedicated state channels between payer and recipient with customizable dispute windows and expiration deadlines.
              </p>
            </div>

            {/* Card 2 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <FileCheck2 size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                2. EIP-712 Vouchers
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Cryptographically secure typed structured data signatures with strict domain separation, monotonically increasing nonces, and cumulative balances.
              </p>
            </div>

            {/* Card 3 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Lock size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                3. Smart Contract Escrow
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Funds are safeguarded in the MicroPayVault smart contract on Sepolia with built-in invariant verification and dispute mechanisms.
              </p>
            </div>

            {/* Card 4 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <ArrowRightLeft size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                4. Direct Settlement
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Recipients can claim their net payout directly on-chain by submitting the signed voucher without requiring permission or custodial gateways.
              </p>
            </div>

            {/* Card 5 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                5. Non-Custodial Payments
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                At no point does the application or server hold user funds or private keys. All transactions and vouchers originate directly from your MetaMask wallet.
              </p>
            </div>

            {/* Card 6 */}
            <div style={{ padding: "26px", borderRadius: "14px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Activity size={20} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                6. Ethereum Sepolia Support
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Fully deployed and verified on Ethereum Sepolia Testnet (Chain ID 11155111) with real on-chain transaction receipts and Etherscan verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security Section ─────────────────────────────────────────────── */}
      <section
        id="security"
        style={{
          padding: "80px 24px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span className="badge badge-success" style={{ marginBottom: "12px" }}>
            Security Architecture
          </span>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Built with Verified Web3 Security
          </h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px", fontSize: "16px", maxWidth: "640px", margin: "8px auto 0" }}>
            Web3 MicroPay relies exclusively on standard cryptographic primitives and verified EVM smart contracts.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Wallet-Controlled Signing
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              All vouchers and transactions require explicit user approval within MetaMask. No automated actions without consent.
            </p>
          </div>

          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              EIP-712 Typed Data
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Standardized domain separator and structured data ensure vouchers cannot be replayed across different chains or contracts.
            </p>
          </div>

          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Smart Contract Verification
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              The MicroPayVault contract validates all ECDSA signatures, cumulative invariants, and balances before releasing funds.
            </p>
          </div>

          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Escrow-Based Funds
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Deposited funds remain in escrow on the blockchain. Double-spending is mathematically impossible under the contract logic.
            </p>
          </div>

          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              No Private Keys Stored
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              The application never requests, sees, or stores your private key or seed phrase.
            </p>
          </div>

          <div style={{ padding: "22px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Blockchain Receipts
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Settlement status is confirmed only when the transaction receipt is mined and verified on Ethereum Sepolia.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final Call to Action ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 24px",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "14px" }}>
            Start using Web3 micropayments.
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "32px" }}>
            Create an account, open your payment channel, and stream off-chain EIP-712 vouchers on Sepolia today.
          </p>
          <button
            onClick={() => onNavigate("/auth/signup")}
            className="btn btn-primary"
            style={{
              fontSize: "16px",
              fontWeight: 600,
              padding: "14px 36px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
            }}
          >
            Get Started
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "48px 24px 36px",
          backgroundColor: "var(--bg-primary)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: "var(--brand-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <ZapIcon />
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "15px" }}>
              Web3 MicroPay
            </span>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <button onClick={() => scrollToSection("hero")} style={{ color: "var(--text-secondary)", fontSize: "13px", background: "none" }}>
              Home
            </button>
            <button onClick={() => scrollToSection("how-it-works")} style={{ color: "var(--text-secondary)", fontSize: "13px", background: "none" }}>
              How It Works
            </button>
            <button onClick={() => scrollToSection("features")} style={{ color: "var(--text-secondary)", fontSize: "13px", background: "none" }}>
              Features
            </button>
            <button onClick={() => scrollToSection("security")} style={{ color: "var(--text-secondary)", fontSize: "13px", background: "none" }}>
              Security
            </button>
            <button onClick={() => onNavigate("/auth/login")} style={{ color: "var(--text-secondary)", fontSize: "13px", background: "none" }}>
              Login
            </button>
            <button onClick={() => onNavigate("/auth/signup")} style={{ color: "var(--brand-secondary)", fontSize: "13px", fontWeight: 600, background: "none" }}>
              Sign Up
            </button>
          </div>
        </div>
        <div style={{ maxWidth: "1280px", margin: "24px auto 0", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} Web3 MicroPay. Ethereum Sepolia State Channel Protocol.
        </div>
      </footer>
    </div>
  );
};

function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}
