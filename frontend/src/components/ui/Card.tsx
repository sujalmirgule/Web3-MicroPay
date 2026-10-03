import React, { ReactNode } from "react";
import { BadgeVariant } from "../../utils/formatters";

// ── Card Component ─────────────────────────────────────────────────────────

export interface CardProps {
  title?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  style,
}) => {
  return (
    <div className={`card ${className}`.trim()} style={style}>
      {(title || action) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// ── Badge Component ────────────────────────────────────────────────────────

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  icon,
  dot = false,
}) => {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && (
        <span
          className={`status-dot ${
            variant === "success" ? "active" : variant === "warning" ? "pending" : variant === "error" ? "error" : ""
          }`}
        />
      )}
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </span>
  );
};

// ── StatCard Component ─────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: string | ReactNode;
  subtext?: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  badge,
}) => {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="stat-label">{label}</span>
        {icon && <div style={{ color: "var(--brand-secondary)", opacity: 0.9 }}>{icon}</div>}
        {badge}
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
};
