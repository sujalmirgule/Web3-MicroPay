import React from "react";
import { ShieldCheck, Coins, Zap, Sparkles } from "lucide-react";

export const FeatureStrip: React.FC = () => {
  const benefits = [
    {
      icon: <ShieldCheck size={20} />,
      title: "Secure Payments",
      description: "Protected by smart contracts",
    },
    {
      icon: <Coins size={20} />,
      title: "Low Network Fees",
      description: "Efficient blockchain transactions",
    },
    {
      icon: <Zap size={20} />,
      title: "Instant Settlements",
      description: "Fast global transfers",
    },
    {
      icon: <Sparkles size={20} />,
      title: "AI-Powered Insights",
      description: "Understand your payments smarter",
    },
  ];

  return (
    <div className="lp-feature-strip-section">
      <div className="lp-container">
        <div className="lp-feature-strip-grid">
          {benefits.map((item, index) => (
            <div key={index} className="lp-strip-item">
              <div className="lp-strip-icon-box">{item.icon}</div>
              <div className="lp-strip-text">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
