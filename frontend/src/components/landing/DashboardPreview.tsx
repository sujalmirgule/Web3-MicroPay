import React from "react";
import { LayoutDashboard, Send, ArrowRightLeft, FileText, Bot, Settings } from "lucide-react";

export const DashboardPreview: React.FC = () => {
  return (
    <div className="lp-desktop-window">
      {/* Window Chrome */}
      <div className="lp-window-topbar">
        <div className="lp-window-dots">
          <div className="lp-window-dot lp-dot-red" />
          <div className="lp-window-dot lp-dot-yellow" />
          <div className="lp-window-dot lp-dot-green" />
        </div>
        <div className="lp-window-urlbar">app.micropay.io/dashboard</div>
      </div>

      {/* Window Body: Sidebar + Main Content */}
      <div className="lp-desktop-body">
        {/* Sidebar */}
        <div className="lp-desktop-sidebar">
          <div className="lp-sidebar-nav-item active">
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </div>
          <div className="lp-sidebar-nav-item">
            <Send size={14} />
            <span>Channels</span>
          </div>
          <div className="lp-sidebar-nav-item">
            <ArrowRightLeft size={14} />
            <span>Transactions</span>
          </div>
          <div className="lp-sidebar-nav-item">
            <FileText size={14} />
            <span>Documents</span>
          </div>
          <div className="lp-sidebar-nav-item">
            <Bot size={14} />
            <span>AI Assistant</span>
          </div>
          <div className="lp-sidebar-nav-item" style={{ marginTop: "auto" }}>
            <Settings size={14} />
            <span>Settings</span>
          </div>
        </div>

        {/* Dashboard Main View */}
        <div className="lp-desktop-main">
          {/* Header */}
          <div className="lp-dash-top">
            <div className="lp-dash-greeting">
              <h4>Good morning, Sujal! 👋</h4>
              <p>Welcome back to your Web3 payment hub</p>
            </div>
            <button
              type="button"
              className="lp-btn-primary"
              style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "8px" }}
            >
              <span>+ Send Payment</span>
            </button>
          </div>

          {/* 3 Summary Stat Cards */}
          <div className="lp-dash-stat-row">
            <div className="lp-dash-stat-box">
              <p>Total Balance</p>
              <h5>0.4825 ETH</h5>
            </div>
            <div className="lp-dash-stat-box">
              <p>Total Sent</p>
              <h5 style={{ color: "var(--lp-accent-orange)" }}>1.124 ETH</h5>
            </div>
            <div className="lp-dash-stat-box">
              <p>Total Received</p>
              <h5 style={{ color: "#3F7D5A" }}>4.824 ETH</h5>
            </div>
          </div>

          {/* Payment Activity SVG Chart */}
          <div className="lp-dash-chart-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h6>Payment Activity</h6>
              <span style={{ fontSize: "10px", color: "var(--lp-accent-orange)", fontWeight: 600 }}>
                Weekly Volume (ETH)
              </span>
            </div>
            <svg width="100%" height="80" viewBox="0 0 360 80" fill="none">
              <defs>
                <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E66A23" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E66A23" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0 65 Q 40 50, 80 58 T 160 32 T 240 38 T 320 12 T 360 20 L 360 80 L 0 80 Z"
                fill="url(#chartGradient2)"
              />
              <path
                d="M0 65 Q 40 50, 80 58 T 160 32 T 240 38 T 320 12 T 360 20"
                stroke="#E66A23"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="320" cy="12" r="4" fill="#FFFFFF" stroke="#E66A23" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPreview;
