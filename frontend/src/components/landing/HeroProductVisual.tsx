import React from "react";

interface HeroProductVisualProps {
  onActionClick?: (action: string) => void;
}

export const HeroProductVisual: React.FC<HeroProductVisualProps> = ({ onActionClick }) => {
  return (
    <div className="lp-hero-visual-wrapper">
      <div className="lp-hero-image-stage">
        {/* High-fidelity 3D Web3 Mobile & Ecosystem Visual directly matching reference image */}
        <img
          src="/images/hero_phone_perfect.jpg"
          alt="Micro Pay Web3 Mobile Wallet with Ethereum Coin and Confirmation Badge"
          className="lp-hero-3d-image"
          loading="eager"
        />

        {/* Ambient Warm Golden Glow behind the 3D visual */}
        <div className="lp-hero-ambient-glow" />
      </div>
    </div>
  );
};
export default HeroProductVisual;
