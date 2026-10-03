import React, { useState, useRef, useEffect } from "react";
import { useNotifications, NotificationType } from "../../context/NotificationContext";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  CreditCard,
  FileCheck2,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Coins,
  ChevronRight,
} from "lucide-react";
import { truncateHash, truncateAddress } from "../../utils/formatters";

interface NotificationBellProps {
  onNavigate: (path: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const recentNotifications = notifications.slice(0, 5);

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case "CHANNEL_CREATED":
      case "channel":
        return <CreditCard size={15} color="var(--brand-primary)" />;
      case "VOUCHER_SIGNED":
      case "payment":
        return <FileCheck2 size={15} color="#f59e0b" />;
      case "SETTLEMENT_SUBMITTED":
        return <ArrowRightLeft size={15} color="#0ea5e9" />;
      case "SETTLEMENT_CONFIRMED":
      case "settlement":
        return <CheckCircle2 size={15} color="var(--status-success)" />;
      case "PAYMENT_RECEIVED":
        return <Coins size={15} color="#a855f7" />;
      case "SETTLEMENT_FAILED":
        return <AlertCircle size={15} color="var(--status-error)" />;
      default:
        return <Bell size={15} color="var(--text-secondary)" />;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          padding: "8px 10px",
          borderRadius: "8px",
          backgroundColor: isOpen ? "var(--bg-hover)" : "var(--bg-tertiary)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: "1px solid var(--border-medium)",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
        }}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              padding: "1px 6px",
              borderRadius: "9999px",
              backgroundColor: "var(--status-error)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "46px",
            width: "360px",
            maxWidth: "90vw",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-medium)",
            borderRadius: "14px",
            boxShadow: "var(--shadow-xl)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(37, 99, 235, 0.15)",
                    color: "var(--brand-secondary)",
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "none",
                  cursor: "pointer",
                }}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {recentNotifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                You're all caught up. No notifications.
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const isUnread = !notif.read && notif.status !== "READ";
                const txHash = notif.transactionHash || notif.txHash;

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                    }}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: isUnread ? "rgba(37, 99, 235, 0.05)" : "transparent",
                      cursor: "pointer",
                      transition: "background-color var(--transition-fast)",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {getIconForType(notif.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: isUnread ? 700 : 600,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: "var(--brand-primary)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.message}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>{formatTimeAgo(notif.timestamp)}</span>
                        {txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              color: "var(--brand-secondary)",
                            }}
                          >
                            <span>tx</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--bg-tertiary)",
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate("/dashboard/notifications");
              }}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--brand-secondary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "none",
                cursor: "pointer",
              }}
            >
              <span>View All Notifications</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTimeAgo(isoString: string): string {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return "";
  }
}
