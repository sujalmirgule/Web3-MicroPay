import React from "react";

export interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ icon, title, description }) => {
  return (
    <div className="lp-sec-card">
      <div className="lp-sec-card-icon">{icon}</div>
      <h4 className="lp-sec-card-title">{title}</h4>
      <p className="lp-sec-card-desc">{description}</p>
    </div>
  );
};
export default SecurityCard;
