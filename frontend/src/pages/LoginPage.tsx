import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, isLoading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError("Please enter your email address.");
      return;
    }
    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    try {
      await login(trimmedEmail, password);
      setPassword("");
      onNavigate("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Invalid credentials. Please verify your email and password.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F7F3EC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Brand Header */}
      <div
        onClick={() => onNavigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "32px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "11px",
            backgroundColor: "#3A2923",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 2px 10px rgba(58,41,35,0.2)",
          }}
        >
          <ZapIcon />
        </div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#3A2923", letterSpacing: "-0.02em" }}>
            MicroPay
          </div>
          <div style={{ fontSize: "11px", color: "#958B83", marginTop: "-2px" }}>
            Ethereum State Channels
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5DED5",
          borderRadius: "18px",
          padding: "36px 32px",
          boxShadow: "0 8px 32px rgba(58,41,35,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(58,41,35,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: "#3A2923",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#211C19",
              marginBottom: "8px",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: "14px", color: "#6F655E" }}>
            Log in to manage your state channels and micropayments.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Error */}
          {(formError || authError) && (
            <div
              className="alert alert-error"
              style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", padding: "10px 14px", marginBottom: 0 }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6F655E", marginBottom: "6px" }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ paddingLeft: "38px", borderRadius: "12px" }}
                autoComplete="email"
              />
              <Mail
                size={15}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#958B83" }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6F655E", marginBottom: "6px" }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ paddingLeft: "38px", borderRadius: "12px" }}
                autoComplete="current-password"
              />
              <Lock
                size={15}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#958B83" }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "15px", fontWeight: 600, marginTop: "6px", borderRadius: "12px" }}
          >
            {isLoading ? "Logging in…" : "Login"}
          </button>
        </form>

        {/* Footer link */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "#6F655E" }}>
          Don't have an account?{" "}
          <button
            onClick={() => onNavigate("/auth/signup")}
            style={{ color: "#6B4F43", fontWeight: 700, background: "none", padding: 0, cursor: "pointer" }}
          >
            Create one
          </button>
        </div>
      </div>

      {/* Trust footer */}
      <p style={{ marginTop: "20px", fontSize: "12px", color: "#958B83", textAlign: "center" }}>
        Non-custodial · Ethereum Sepolia · EIP-712 Secured
      </p>
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
