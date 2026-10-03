import React from "react";
import { ArrowRight, Play } from "lucide-react";
import { HeroProductVisual } from "./HeroProductVisual";
import { StatsStrip } from "./StatsStrip";
import { LandingNavProps } from "./types";

export const HeroSection: React.FC<LandingNavProps> = ({ onNavigate, onOpenDemo }) => {
  return (
    <section id="hero" className="lp-hero-section">
      <div className="lp-hero-bg-glow" />

      <div className="lp-container">
        <div className="lp-hero-grid">
          {/* Left Column: Badge, Headlines, CTAs, Statistics */}
          <div className="lp-hero-content">
            {/* Badge */}
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              <span>Powered by Solidity</span>
            </div>

            {/* Headline */}
            <h1 className="lp-hero-title">
              Move Money.
              <br />
              <span className="lp-hero-accent">Without Borders.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="lp-hero-subtitle">
              Send, receive, and manage digital payments securely on the blockchain with fast settlement, transparent transactions, and complete control over your funds.
            </p>

            {/* CTAs */}
            <div className="lp-hero-actions">
              <button
                type="button"
                className="lp-btn-primary"
                onClick={() => onNavigate && onNavigate("/auth/signup")}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="lp-btn-secondary dark"
                onClick={() => onOpenDemo && onOpenDemo()}
              >
                <div className="lp-play-icon-wrap">
                  <Play size={12} fill="currentColor" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Statistics Row Component */}
            <StatsStrip />
          </div>

          {/* Right Column: Hero Visual Component */}
          <HeroProductVisual
            onActionClick={(action) => {
              if (action === "send" && onNavigate) {
                onNavigate("/dashboard/channels");
              } else if (onOpenDemo) {
                onOpenDemo();
              }
            }}
          />
        </div>
      </div>

      {/* Organic Curved Transition into Light Cream Section */}
      <div className="lp-hero-curved-divider">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
          <path
            d="M0,0 C360,60 1080,60 1440,0 L1440,80 L0,80 Z"
            fill="var(--lp-bg-cream)"
          />
        </svg>
      </div>
    </section>
  );
};
export default HeroSection;
