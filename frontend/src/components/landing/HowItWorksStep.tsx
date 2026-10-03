import React from "react";
import { ChevronRight } from "lucide-react";

export interface HowItWorksStepProps {
  stepNumber: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}

export const HowItWorksStep: React.FC<HowItWorksStepProps> = ({
  stepNumber,
  icon,
  title,
  description,
  isLast = false,
}) => {
  return (
    <div className="lp-step-card">
      <div className="lp-step-top-row">
        <span className="lp-step-number">{stepNumber}</span>
        <div className="lp-step-icon-wrap">{icon}</div>
      </div>
      <h3 className="lp-step-title">{title}</h3>
      <p className="lp-step-desc">{description}</p>

      {!isLast && (
        <div className="lp-step-connector">
          <ChevronRight size={22} />
        </div>
      )}
    </div>
  );
};
export default HowItWorksStep;
