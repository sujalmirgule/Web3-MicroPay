import React from "react";
import { Wallet, Send, FileCheck2, BarChart3 } from "lucide-react";
import { HowItWorksStep } from "./HowItWorksStep";

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: "1",
      icon: <Wallet size={20} />,
      title: "Connect Wallet",
      description: "Link your MetaMask or any Web3 wallet securely.",
    },
    {
      num: "2",
      icon: <Send size={20} />,
      title: "Make a Payment",
      description: "Enter recipient address, amount and network.",
    },
    {
      num: "3",
      icon: <FileCheck2 size={20} />,
      title: "Confirm on Blockchain",
      description: "Approve the transaction in your wallet.",
    },
    {
      num: "4",
      icon: <BarChart3 size={20} />,
      title: "Track in Real-Time",
      description: "View status and details instantly on the blockchain.",
    },
  ];

  return (
    <section id="how-it-works" className="lp-how-section">
      <div className="lp-container">
        {/* Section Header */}
        <div className="lp-section-header">
          <div className="lp-pill-badge light">HOW IT WORKS</div>
          <h2 className="lp-section-title">A simpler way to move value</h2>
          <p className="lp-section-subtitle">
            From wallet connection to transaction tracking — all in a few simple steps.
          </p>
        </div>

        {/* 4 Connected Step Cards */}
        <div className="lp-steps-pipeline">
          {steps.map((step, idx) => (
            <HowItWorksStep
              key={idx}
              stepNumber={step.num}
              icon={step.icon}
              title={step.title}
              description={step.description}
              isLast={idx === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
export default HowItWorksSection;
