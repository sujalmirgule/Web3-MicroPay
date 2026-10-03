import React, { useState, useEffect } from "react";
import { Zap, Wallet, Menu, X, Sun, Moon } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { truncateAddress } from "../../utils/formatters";
import { LandingNavProps } from "./types";

export const LandingNavbar: React.FC<LandingNavProps> = ({ onNavigate, onOpenDemo }) => {
  const { address, isConnected, connectWallet } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (section: string, anchorId: string) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header className={`lp-navbar ${isScrolled ? "scrolled" : "hero-mode"}`}>
        <div className="lp-container">
          <div className="lp-navbar-inner">
            {/* Logo */}
            <div
              className="lp-logo-link"
              onClick={() => handleNavClick("home", "hero")}
              role="button"
              tabIndex={0}
            >
              <div className="lp-logo-icon">
                <Zap size={18} />
              </div>
              <span className="lp-logo-text">Micro Pay</span>
            </div>

            {/* Desktop Navigation Links */}
            <nav>
              <ul className="lp-nav-links">
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "home" ? "active" : ""}`}
                    onClick={() => handleNavClick("home", "hero")}
                    role="button"
                    tabIndex={0}
                  >
                    Home
                    {activeSection === "home" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "features" ? "active" : ""}`}
                    onClick={() => handleNavClick("features", "features")}
                    role="button"
                    tabIndex={0}
                  >
                    Features
                    {activeSection === "features" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "how-it-works" ? "active" : ""}`}
                    onClick={() => handleNavClick("how-it-works", "how-it-works")}
                    role="button"
                    tabIndex={0}
                  >
                    How It Works
                    {activeSection === "how-it-works" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "security" ? "active" : ""}`}
                    onClick={() => handleNavClick("security", "security")}
                    role="button"
                    tabIndex={0}
                  >
                    Security
                    {activeSection === "security" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "developers" ? "active" : ""}`}
                    onClick={() => handleNavClick("developers", "showcase")}
                    role="button"
                    tabIndex={0}
                  >
                    Developers
                    {activeSection === "developers" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className={`lp-nav-link ${activeSection === "pricing" ? "active" : ""}`}
                    onClick={() => handleNavClick("pricing", "trust")}
                    role="button"
                    tabIndex={0}
                  >
                    Pricing
                    {activeSection === "pricing" && <span className="lp-nav-indicator" />}
                  </span>
                </li>
                <li>
                  <span
                    className="lp-nav-link"
                    onClick={() => onOpenDemo && onOpenDemo()}
                    role="button"
                    tabIndex={0}
                  >
                    Docs
                  </span>
                </li>
              </ul>
            </nav>

            {/* Right Action Controls */}
            <div className="lp-nav-actions">
              {/* Theme/Mode Round Pill */}
              <button
                type="button"
                className="lp-theme-circle-btn"
                onClick={() => setIsDarkMode((prev) => !prev)}
                title="Theme"
                aria-label="Toggle Theme"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Connect Wallet: Cream/White Pill Button with Dark Text and Wallet Icon */}
              <button
                type="button"
                className="lp-btn-connect-wallet"
                onClick={isConnected ? () => onNavigate && onNavigate("/dashboard/channels") : connectWallet}
              >
                <Wallet size={15} color="#E66A23" />
                <span>
                  {isConnected && address ? truncateAddress(address) : "Connect Wallet"}
                </span>
              </button>

              {/* Login Button: Dark Pill Button with subtle border */}
              <button
                type="button"
                className="lp-btn-login-dark"
                onClick={() => onNavigate && onNavigate("/auth/login")}
              >
                Login
              </button>

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                className="lp-mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lp-mobile-drawer-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="lp-mobile-drawer">
            <div className="lp-mobile-drawer-header">
              <div className="lp-logo-link" onClick={() => handleNavClick("home", "hero")}>
                <div className="lp-logo-icon">
                  <Zap size={18} />
                </div>
                <span className="lp-logo-text" style={{ color: "#FFFFFF" }}>
                  Micro Pay
                </span>
              </div>
              <button
                type="button"
                className="lp-mobile-menu-btn"
                style={{ color: "#FFFFFF" }}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            <div className="lp-mobile-drawer-links">
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("home", "hero")}>
                Home
              </span>
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("features", "features")}>
                Features
              </span>
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("how-it-works", "how-it-works")}>
                How It Works
              </span>
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("security", "security")}>
                Security
              </span>
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("developers", "showcase")}>
                Developers
              </span>
              <span className="lp-mobile-drawer-link" onClick={() => handleNavClick("pricing", "trust")}>
                Pricing
              </span>
              <span
                className="lp-mobile-drawer-link"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenDemo && onOpenDemo();
                }}
              >
                Docs
              </span>
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="lp-btn-connect-wallet"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (isConnected) {
                    onNavigate && onNavigate("/dashboard/channels");
                  } else {
                    connectWallet();
                  }
                }}
              >
                <Wallet size={15} color="#E66A23" />
                <span>{isConnected && address ? truncateAddress(address) : "Connect Wallet"}</span>
              </button>

              <button
                type="button"
                className="lp-btn-login-dark"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate && onNavigate("/auth/login");
                }}
              >
                Login
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
export const Navbar = LandingNavbar;
export default LandingNavbar;
