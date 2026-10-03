import React from "react";

export const SecurityVisual: React.FC = () => {
  return (
    <div className="lp-security-visual-wrapper">
      <div className="lp-security-image-container">
        <img
          src="/images/security_3d_visual.jpg"
          alt="3D Golden Shield with Ethereum Symbol on Stepped Stone Pedestal"
          className="lp-security-3d-img"
          loading="lazy"
        />
      </div>
    </div>
  );
};
export default SecurityVisual;
