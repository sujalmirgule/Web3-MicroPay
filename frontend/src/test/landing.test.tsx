import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LandingPage } from "../pages/LandingPage";

describe("LandingPage", () => {
  it("renders main hero headline and supporting text", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("Move Money.")).toBeDefined();
    expect(screen.getByText("Without Borders.")).toBeDefined();
    expect(
      screen.getByText(
        "Send, receive, and manage digital payments securely on the blockchain with fast settlement, transparent transactions, and complete control over your funds."
      )
    ).toBeDefined();
  });

  it("renders Get Started CTA and navigates to signup", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    const getStartedButtons = screen.getAllByText("Get Started");
    expect(getStartedButtons.length).toBeGreaterThan(0);
    fireEvent.click(getStartedButtons[0]);
    expect(onNavigate).toHaveBeenCalledWith("/auth/signup");
  });

  it("renders all 4 steps of How It Works", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("A simpler way to move value")).toBeDefined();
    expect(screen.getAllByText("Connect Wallet").length).toBeGreaterThan(0);
    expect(screen.getByText("Make a Payment")).toBeDefined();
    expect(screen.getByText("Confirm on Blockchain")).toBeDefined();
    expect(screen.getByText("Track in Real-Time")).toBeDefined();
  });

  it("renders 4 core feature cards", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("Secure by Design")).toBeDefined();
    expect(screen.getByText("Low Transaction Fees")).toBeDefined();
    expect(screen.getByText("Instant Settlements")).toBeDefined();
    expect(screen.getByText("AI Powered Insights")).toBeDefined();
  });

  it("renders security section and verifiable security cards", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("You Can Trust")).toBeDefined();
    expect(screen.getByText("Smart Contracts")).toBeDefined();
    expect(screen.getByText("Wallet Security")).toBeDefined();
    expect(screen.getByText("Transparent Records")).toBeDefined();
    expect(screen.getByText("Decentralized")).toBeDefined();

    // Verify "Learn More" expands verified invariants
    const learnMoreBtn = screen.getByText("Learn More");
    fireEvent.click(learnMoreBtn);
    expect(screen.getByText("Verified Invariants:")).toBeDefined();
  });
});
