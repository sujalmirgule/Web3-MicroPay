import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiClient } from "../api/client";

export type NotificationType =
  | "CHANNEL_CREATED"
  | "VOUCHER_SIGNED"
  | "SETTLEMENT_SUBMITTED"
  | "SETTLEMENT_CONFIRMED"
  | "SETTLEMENT_FAILED"
  | "PAYMENT_RECEIVED"
  | "channel"
  | "payment"
  | "settlement"
  | "security"
  | "system";

export interface AppNotification {
  id: string;
  userId?: string;
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  status: "UNREAD" | "READ";
  read: boolean;
  amount?: string;
  sender?: string;
  receiver?: string;
  channelId?: string;
  transactionHash?: string;
  txHash?: string; // backwards compatibility
  timestamp: string;
  link?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  duration?: number;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  toasts: Toast[];
  addNotification: (notif: Partial<AppNotification> & { title: string; message: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  syncNotifications: (address?: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "warning" | "error" | "info", duration?: number) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "micropay_user_notifications";

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch {
        // ignore
      }
    }
  }, [notifications]);

  // Sync notifications from server (to enable cross-device/browser receiver notification delivery)
  const syncNotifications = useCallback(async (address?: string) => {
    try {
      const serverNotifs = await apiClient.listNotifications(address ? { address } : undefined);
      if (serverNotifs && Array.isArray(serverNotifs)) {
        setNotifications((prev) => {
          const map = new Map<string, AppNotification>();
          // Existing
          prev.forEach((n) => map.set(n.id, n));
          // Merge server notifications
          serverNotifs.forEach((sn: any) => {
            const normalized: AppNotification = {
              id: sn.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              userId: sn.userId,
              recipientId: sn.recipientId,
              type: sn.type as NotificationType,
              title: sn.title,
              message: sn.message,
              status: sn.status || (sn.read ? "READ" : "UNREAD"),
              read: Boolean(sn.read),
              amount: sn.amount,
              sender: sn.sender,
              receiver: sn.receiver,
              channelId: sn.channelId,
              transactionHash: sn.transactionHash,
              txHash: sn.transactionHash,
              timestamp: sn.timestamp || new Date().toISOString(),
            };
            // Avoid duplicate by txHash + type
            const existingWithSameTx = Array.from(map.values()).find(
              (x) => x.transactionHash && x.transactionHash.toLowerCase() === (normalized.transactionHash || "").toLowerCase() && x.type === normalized.type
            );
            if (!existingWithSameTx && !map.has(normalized.id)) {
              map.set(normalized.id, normalized);
            }
          });
          return Array.from(map.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 100);
        });
      }
    } catch (err: any) {
      // Graceful offline fallback
      console.info("Server notification sync (direct Web3 mode active):", err?.message);
    }
  }, []);

  const addNotification = useCallback((notif: Partial<AppNotification> & { title: string; message: string }) => {
    // Normalize type if old format used
    let normalizedType: NotificationType = "system";
    if (notif.type) {
      if (notif.type === "channel") normalizedType = "CHANNEL_CREATED";
      else if (notif.type === "payment") normalizedType = "VOUCHER_SIGNED";
      else if (notif.type === "settlement") normalizedType = "SETTLEMENT_CONFIRMED";
      else normalizedType = notif.type;
    }

    const txHash = notif.transactionHash || notif.txHash;
    const newNotif: AppNotification = {
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: notif.userId,
      recipientId: notif.recipientId || notif.receiver,
      type: normalizedType,
      title: notif.title,
      message: notif.message,
      status: notif.status || "UNREAD",
      read: notif.read || false,
      amount: notif.amount,
      sender: notif.sender,
      receiver: notif.receiver,
      channelId: notif.channelId,
      transactionHash: txHash,
      txHash,
      timestamp: notif.timestamp || new Date().toISOString(),
      link: notif.link,
    };

    setNotifications((prev) => [newNotif, ...prev].slice(0, 100));

    // Best-effort post to server for cross-device/browser delivery
    apiClient.postNotification(newNotif).catch(() => {});
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, status: "READ" } : n))
    );
    apiClient.markNotificationRead(id).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, status: "READ" })));
    apiClient.markAllNotificationsRead().catch(() => {});
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "warning" | "error" | "info" = "info", duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const unreadCount = notifications.filter((n) => !n.read && n.status !== "READ").length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        syncNotifications,
        showToast,
        removeToast,
      }}
    >
      {children}
      {/* Toast rendering overlay */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "380px",
          width: "100%",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`alert alert-${toast.type}`}
            style={{
              pointerEvents: "auto",
              boxShadow: "var(--shadow-lg)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                marginLeft: "8px",
                color: "inherit",
                opacity: 0.7,
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
