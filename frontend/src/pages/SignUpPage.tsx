import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface SignUpPageProps {
  onNavigate: (path: string) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const { signup, isLoading, error: authError, clearError } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    // Validation
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFormError("Please enter your name.");
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    try {
      await signup(trimmedName, trimmedEmail, password);
      // Clear password from local component state immediately
      setPassword("");
      setIsSuccess(true);

      // Redirect to login after 1.5s
      setTimeout(() => {
        onNavigate("/auth/login");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "Failed to create account. Please try again.");
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
          maxWidth: "440px",
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
            Create your MicroPay account
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Create an account to manage your payment activity.
          </p>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={40} color="var(--status-success)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--status-success)", marginBottom: "6px" }}>
              Account created successfully!
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Redirecting you to Login...
            </p>
          </div>
        ) : (
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

            {/* Field 1: Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  style={{ paddingLeft: "38px" }}
                  autoComplete="name"
                />
                <User
                  size={16}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                />
              </div>
            </div>

            {/* Field 2: Email */}
            <div>
              <label
                htmlFor="signup-email"
                style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Email
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-email"
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

            {/* Field 3: Password */}
            <div>
              <label
                htmlFor="signup-password"
                style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  style={{ paddingLeft: "38px" }}
                  autoComplete="new-password"
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
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* Footer Link to Login */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <button
            onClick={() => onNavigate("/auth/login")}
            style={{
              color: "var(--brand-secondary)",
              fontWeight: 600,
              background: "none",
              padding: 0,
            }}
          >
            Login
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
