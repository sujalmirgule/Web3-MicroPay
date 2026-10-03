import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "var(--brand-primary)",
  label,
}) => {
  const pixelSize = size === "sm" ? 16 : size === "lg" ? 32 : 24;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
      role="status"
      aria-live="polite"
    >
      <svg
        style={{
          width: pixelSize,
          height: pixelSize,
          animation: "spin 0.8s linear infinite",
        }}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
          strokeDasharray="80"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{label}</span>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
