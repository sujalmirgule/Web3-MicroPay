import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LandingPage } from "../pages/LandingPage";

describe("LandingPage", () => {
  it("renders main hero headline and supporting text", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("Micropayments, Simplified on Ethereum")).toBeDefined();
    expect(
      screen.getByText(
        "Send and settle small payments through secure blockchain payment channels without putting every individual payment directly on-chain."
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

    expect(screen.getByText("Connect Wallet")).toBeDefined();
    expect(screen.getByText("Open Payment Channel")).toBeDefined();
    expect(screen.getByText("Create Payment Vouchers")).toBeDefined();
    expect(screen.getByText("Settle Claim")).toBeDefined();
    expect(screen.getByText("Important: Signing a voucher does not transfer funds.")).toBeDefined();
    expect(screen.getByText("Funds are transferred only after blockchain settlement.")).toBeDefined();
  });

  it("renders Why Payment Channels section", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("Why Payment Channels?")).toBeDefined();
    expect(screen.getByText("Efficient Micropayments")).toBeDefined();
    expect(screen.getByText("Reduced On-Chain Transactions")).toBeDefined();
    expect(screen.getByText("Non-Custodial Architecture")).toBeDefined();
  });

  it("renders 6 features and security section", () => {
    const onNavigate = vi.fn();
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText("1. Payment Channels")).toBeDefined();
    expect(screen.getByText("2. EIP-712 Vouchers")).toBeDefined();
    expect(screen.getByText("3. Smart Contract Escrow")).toBeDefined();
    expect(screen.getByText("4. Direct Settlement")).toBeDefined();
    expect(screen.getByText("5. Non-Custodial Payments")).toBeDefined();
    expect(screen.getByText("6. Ethereum Sepolia Support")).toBeDefined();
    expect(screen.getByText("Built with Verified Web3 Security")).toBeDefined();
  });
});
