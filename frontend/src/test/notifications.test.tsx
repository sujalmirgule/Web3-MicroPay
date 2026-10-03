import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "../context/NotificationContext";

describe("NotificationContext", () => {
  it("creates sender notifications for channel and vouchers", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: "CHANNEL_CREATED",
        title: "Channel Created",
        message: "Payment channel created successfully.",
        amount: "0.05 ETH",
        channelId: "0x123",
      });
    });

    expect(result.current.notifications.length).toBeGreaterThan(0);
    const notif = result.current.notifications[0];
    expect(notif.type).toBe("CHANNEL_CREATED");
    expect(notif.status).toBe("UNREAD");
    expect(notif.read).toBe(false);
    expect(result.current.unreadCount).toBeGreaterThan(0);
  });

  it("marks notifications as read", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: "PAYMENT_RECEIVED",
        title: "Payment Received",
        message: "0.001 ETH received from sender",
        amount: "0.001 ETH",
      });
    });

    const notifId = result.current.notifications[0].id;
    expect(result.current.notifications[0].read).toBe(false);

    act(() => {
      result.current.markAsRead(notifId);
    });

    const updated = result.current.notifications.find((n) => n.id === notifId);
    expect(updated?.read).toBe(true);
    expect(updated?.status).toBe("READ");
  });

  it("distinguishes voucher signing from confirmed settlement payment received", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Step 1: Voucher signed
    act(() => {
      result.current.addNotification({
        type: "VOUCHER_SIGNED",
        title: "Voucher Signed",
        message: "Voucher #1 signed",
        amount: "0.001 ETH",
      });
    });

    expect(result.current.notifications[0].type).toBe("VOUCHER_SIGNED");
    // Verify PAYMENT_RECEIVED is NOT triggered by signing
    expect(result.current.notifications.some((n) => n.type === "PAYMENT_RECEIVED")).toBe(false);

    // Step 2: Settlement confirmed on-chain
    act(() => {
      result.current.addNotification({
        type: "PAYMENT_RECEIVED",
        title: "Payment Received",
        message: "0.001 ETH received from 0xSender",
        amount: "0.001 ETH",
        sender: "0xSender",
        receiver: "0xReceiver",
        channelId: "0xChannel",
        transactionHash: "0xTxHash",
      });
    });

    const paymentReceived = result.current.notifications.find((n) => n.type === "PAYMENT_RECEIVED");
    expect(paymentReceived).toBeDefined();
    expect(paymentReceived?.amount).toBe("0.001 ETH");
    expect(paymentReceived?.transactionHash).toBe("0xTxHash");
  });
});
