import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { LandingNavProps } from "./types";

export const ProductShowcase: React.FC<LandingNavProps> = ({ onNavigate }) => {
  const handleExploreFeatures = () => {
    const el = document.getElementById("features");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (onNavigate) {
      onNavigate("/dashboard/channels");
    }
  };

  return (
    <section id="showcase" className="lp-showcase-section">
      <div className="lp-container">
        <div className="lp-showcase-grid">
          {/* Left: Product Mockup Visual (Laptop + Phone on Sandstone Rock with Monstera Leaves) */}
          <div className="lp-showcase-image-stage">
            <img
              src="/images/showcase_mockup_visual.jpg"
              alt="Micro Pay Desktop Dashboard and Mobile Payment Interface"
              className="lp-showcase-3d-img"
              loading="lazy"
            />
          </div>

          {/* Right: Heading, Subtitle, Checklist, Explore Features CTA */}
          <div className="lp-showcase-content">
            <div className="lp-pill-badge light">ALL IN ONE PLATFORM</div>
            <h2 className="lp-section-title">
              Everything <span className="accent">You Need</span> in One Place
            </h2>
            <p className="lp-section-subtitle">
              One platform to send, receive, track, and manage your blockchain payments with complete control.
            </p>

            <ul className="lp-feature-bullets">
              <li className="lp-bullet-item">
                <div className="lp-bullet-icon">
                  <Check size={14} />
                </div>
                <span>Clean and intuitive dashboard</span>
              </li>
              <li className="lp-bullet-item">
                <div className="lp-bullet-icon">
                  <Check size={14} />
                </div>
                <span>Real-time transaction tracking</span>
              </li>
              <li className="lp-bullet-item">
                <div className="lp-bullet-icon">
                  <Check size={14} />
                </div>
                <span>Manage payments and documents</span>
              </li>
              <li className="lp-bullet-item">
                <div className="lp-bullet-icon">
                  <Check size={14} />
                </div>
                <span>AI assistant for blockchain insights</span>
              </li>
            </ul>

            <button
              type="button"
              className="lp-btn-secondary light"
              onClick={handleExploreFeatures}
            >
              <span>Explore Features</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
export default ProductShowcase;
