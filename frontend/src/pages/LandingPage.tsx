/**
 * Micro Pay — Production Landing Page
 * Exact Visual Recreation of Reference Design
 * FinTech x Web3 x Blockchain Payments
 */

import React, { useState } from "react";
import "../styles/landing.css";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { TrustSection } from "../components/landing/TrustSection";
import { FeatureSection } from "../components/landing/FeatureSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { SecuritySection } from "../components/landing/SecuritySection";
import { ProductShowcase } from "../components/landing/ProductShowcase";
import { FinalCTA } from "../components/landing/FinalCTA";
import { LandingFooter } from "../components/landing/LandingFooter";
import { DemoModal } from "../components/landing/DemoModal";

interface LandingPageProps {
  onNavigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleOpenDemo = () => {
    setIsDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setIsDemoModalOpen(false);
  };

  const handleLaunchApp = () => {
    setIsDemoModalOpen(false);
    if (onNavigate) {
      onNavigate("/dashboard/channels");
    }
  };

  return (
    <div className="lp-page-wrapper">
      {/* 1. Navigation */}
      <LandingNavbar
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* 2. Hero (Headline, Copy, CTAs, HeroProductVisual, StatsStrip, Curved Transition) */}
      <HeroSection
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* 3. Trust / ecosystem strip ("Trusted by Web3 innovators" + 6 partner logos) */}
      <TrustSection />

      {/* 4. Feature cards (4 cards: Secure by Design, Low Fees, Instant Settlements, AI Insights) */}
      <FeatureSection />

      {/* 5. How It Works (A simpler way to move value - 4 connected steps) */}
      <HowItWorksSection />

      {/* 6. Security section (Security You Can Trust - 3D Shield, Pedestal, 4 Cards) */}
      <SecuritySection
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* 7. Product showcase (Everything You Need in One Place - Desktop Dashboard & Mobile) */}
      <ProductShowcase
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* 8. Final CTA (Ready to Move Money Without Borders? - Dark Espresso Banner) */}
      <FinalCTA
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* 9. Footer (Micro Pay, Product, Resources, Company, Copyright) */}
      <LandingFooter
        onNavigate={onNavigate}
        onOpenDemo={handleOpenDemo}
      />

      {/* Interactive State Channels & Cryptographic Voucher Simulation Modal */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={handleCloseDemo}
        onNavigateToApp={handleLaunchApp}
      />
    </div>
  );
};
export default LandingPage;
