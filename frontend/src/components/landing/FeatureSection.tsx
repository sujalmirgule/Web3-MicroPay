import React from "react";
import { ShieldCheck, Layers, Zap, Sparkles } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const FeatureSection: React.FC = () => {
  const cards = [
    {
      icon: <ShieldCheck size={24} />,
      title: "Secure by Design",
      description: "Built on audited smart contract infrastructure for transparency.",
    },
    {
      icon: <Layers size={24} />,
      title: "Low Transaction Fees",
      description: "Save more on every blockchain transaction.",
    },
    {
      icon: <Zap size={24} />,
      title: "Instant Settlements",
      description: "Send and receive funds quickly.",
    },
    {
      icon: <Sparkles size={24} />,
      title: "AI Powered Insights",
      description: "Understand and manage your payments smarter.",
    },
  ];

  return (
    <section id="features" className="lp-features-section">
      <div className="lp-container">
        <div className="lp-features-grid">
          {cards.map((item, idx) => (
            <FeatureCard
              key={idx}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
export default FeatureSection;
