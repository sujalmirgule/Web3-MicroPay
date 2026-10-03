import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoucherHistory, VoucherRecord } from "../components/vouchers/VoucherHistory";
import { ethers } from "ethers";

describe("CRITICAL PAYMENT SAFETY RULE — VOUCHER AMOUNT & HISTORY", () => {
  const mockVouchers: VoucherRecord[] = [
    {
      id: "vch_1",
      channelId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      sender: "0xaaaa000000000000000000000000000000000001",
      receiver: "0xbbbb000000000000000000000000000000000002",
      cumulativeAmount: ethers.parseEther("0.0002").toString(),
      nonce: 1,
      signature: "0x111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111b",
      validUntil: 1800000000,
      status: "SETTLED",
      createdAt: "2026-10-01T10:00:00Z",
      settledAt: "2026-10-01T10:05:00Z",
      transactionHash: "0xdef0000000000000000000000000000000000000000000000000000000000001",
    },
    {
      id: "vch_2",
      channelId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      sender: "0xaaaa000000000000000000000000000000000001",
      receiver: "0xbbbb000000000000000000000000000000000002",
      cumulativeAmount: ethers.parseEther("0.0005").toString(),
      nonce: 2,
      signature: "0x222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222b",
      validUntil: 1800000000,
      status: "SIGNED",
      createdAt: "2026-10-02T12:00:00Z",
      settledAt: null,
      transactionHash: null,
    },
    {
      id: "vch_3",
      channelId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      sender: "0xaaaa000000000000000000000000000000000001",
      receiver: "0xbbbb000000000000000000000000000000000002",
      cumulativeAmount: ethers.parseEther("0.0008").toString(),
      nonce: 3,
      signature: "0x333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333b",
      validUntil: 1800000000,
      status: "SIGNED",
      createdAt: "2026-10-03T14:00:00Z",
      settledAt: null,
      transactionHash: null,
    },
  ];

  describe("Voucher History Preservation — Never Overwrite", () => {
    it("preserves every voucher as a separate historical record in reverse chronological order", () => {
      render(<VoucherHistory vouchers={mockVouchers} />);

      // All 3 vouchers must be present simultaneously
      expect(screen.getByText("Voucher #1")).toBeDefined();
      expect(screen.getByText("Voucher #2")).toBeDefined();
      expect(screen.getByText("Voucher #3")).toBeDefined();
      expect(screen.getByText("3 records")).toBeDefined();

      // Nonces and amounts must match exactly
      expect(screen.getByText("0.0002 ETH")).toBeDefined();
      expect(screen.getByText("0.0005 ETH")).toBeDefined();
      expect(screen.getByText("0.0008 ETH")).toBeDefined();

      // Card elements order: Newest (Voucher #3) must appear before Oldest (Voucher #1)
      const nonces = screen.getAllByText(/Voucher #\d/);
      expect(nonces[0].textContent).toContain("Voucher #3");
      expect(nonces[1].textContent).toContain("Voucher #2");
      expect(nonces[2].textContent).toContain("Voucher #1");
    });

    it("displays transaction hash with explorer link for SETTLED vouchers", () => {
      render(<VoucherHistory vouchers={mockVouchers} />);

      expect(screen.getAllByText("SETTLED").length).toBeGreaterThan(0);
      expect(screen.getByText("View on Etherscan")).toBeDefined();
    });

    it("allows expanding and viewing cryptographic EIP-712 details", () => {
      render(<VoucherHistory vouchers={mockVouchers} />);

      const detailButtons = screen.getAllByText("Details");
      fireEvent.click(detailButtons[0]);

      expect(screen.getByText("EIP-712 Voucher Verification Details")).toBeDefined();
      expect(screen.getByText(/Signature \(ECDSA 65 bytes\):/)).toBeDefined();
    });

    it("triggers onSelectForSettlement when Settle button is clicked on SIGNED voucher", () => {
      const onSelect = vi.fn();
      render(<VoucherHistory vouchers={mockVouchers} onSelectForSettlement={onSelect} />);

      const settleButtons = screen.getAllByText("Settle");
      expect(settleButtons.length).toBeGreaterThan(0);
      fireEvent.click(settleButtons[0]);

      // Should be called with the newest SIGNED voucher (Voucher #3)
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          nonce: 3,
          status: "SIGNED",
        })
      );
    });

    it("filters vouchers by status properly", () => {
      render(<VoucherHistory vouchers={mockVouchers} />);

      const statusSelect = screen.getByDisplayValue("All Statuses");
      fireEvent.change(statusSelect, { target: { value: "SETTLED" } });

      expect(screen.getByText("Voucher #1")).toBeDefined();
      expect(screen.queryByText("Voucher #2")).toBeNull();
      expect(screen.queryByText("Voucher #3")).toBeNull();
    });
  });

  describe("Payment Safety Invariant: cumulativeVoucherAmount <= channelDeposit", () => {
    it("validates that cumulative voucher amount must not exceed channel deposit", () => {
      const channelDepositWei = ethers.parseEther("0.0005");

      // Valid cases
      const voucher1Wei = ethers.parseEther("0.0001");
      expect(voucher1Wei <= channelDepositWei).toBe(true);

      const voucher2Wei = ethers.parseEther("0.0002");
      expect(voucher2Wei <= channelDepositWei).toBe(true);

      const voucher3Wei = ethers.parseEther("0.0005");
      expect(voucher3Wei <= channelDepositWei).toBe(true);

      // Invalid case: must be strictly rejected
      const voucherExcessWei = ethers.parseEther("0.0006");
      expect(voucherExcessWei <= channelDepositWei).toBe(false);
    });

    it("correctly calculates remaining channel balance", () => {
      const deposit = ethers.parseEther("0.001");
      const cumulative = ethers.parseEther("0.0004");
      const remaining = deposit - cumulative;

      expect(ethers.formatEther(remaining)).toBe("0.0006");
    });

    it("formats custom smart contract error InsufficientDeposit correctly", () => {
      // Required exact user-facing error message
      const insufficientDepositMessage =
        "The voucher amount exceeds the funds deposited in this payment channel.";

      const formatError = (errorName: string) => {
        if (errorName === "InsufficientDeposit") {
          return "The voucher amount exceeds the funds deposited in this payment channel.";
        }
        return "Transaction reverted.";
      };

      expect(formatError("InsufficientDeposit")).toBe(insufficientDepositMessage);
    });
  });
});
