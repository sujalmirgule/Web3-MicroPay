import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, AlertCircle } from "lucide-react";

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
      // Immediately clear local password state
      setPassword("");
      // Redirect to main dashboard
      onNavigate("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Invalid credentials. Please verify your email and password.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
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
          }}
        >
          <ZapIcon />
        </div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>
          MicroPay
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Log in to manage your state channels and micropayments.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Error Message */}
          {(formError || authError) && (
            <div
              className="alert alert-error"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                padding: "10px 14px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label
              htmlFor="login-email"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
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
                style={{ paddingLeft: "38px" }}
                autoComplete="email"
              />
              <Mail
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="login-password"
              style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
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
                style={{ paddingLeft: "38px" }}
                autoComplete="current-password"
              />
              <Lock
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "15px",
              fontWeight: 600,
              marginTop: "8px",
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Footer Link to Sign Up */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <button
            onClick={() => onNavigate("/auth/signup")}
            style={{
              color: "var(--brand-secondary)",
              fontWeight: 600,
              background: "none",
              padding: 0,
            }}
          >
            Create one
          </button>
        </div>
      </div>
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
