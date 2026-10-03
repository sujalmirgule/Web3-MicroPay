import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color={variant === "primary" ? "#ffffff" : "currentColor"} />
      ) : (
        icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
