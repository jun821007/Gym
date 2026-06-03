"use client";

import { cn } from "@/lib/utils";

interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

export function PixelButton({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: PixelButtonProps) {
  const variants = {
    primary: "bg-accent-green text-bg-deep hover:brightness-110",
    secondary: "bg-bg-panel-light text-text-primary hover:brightness-110",
    danger: "bg-accent-red text-text-primary hover:brightness-110",
  };

  const sizes = {
    sm: "px-2 py-1 text-[8px]",
    md: "px-3 py-2 text-[8px]",
  };

  return (
    <button
      type={type}
      className={cn(
        "border-4 border-border-pixel font-[family-name:var(--font-press-start)] transition",
        "active:translate-x-[2px] active:translate-y-[2px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
