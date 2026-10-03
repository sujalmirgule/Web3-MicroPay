import React from "react";

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="lp-feature-card">
      <div className="lp-feature-icon-wrapper">
        {icon}
      </div>
      <h3 className="lp-feature-card-title">{title}</h3>
      <p className="lp-feature-card-desc">{description}</p>
    </div>
  );
};
export default FeatureCard;
