"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface FullScreenSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 標題列右側額外操作 */
  headerRight?: React.ReactNode;
  className?: string;
}

export function FullScreenSheet({
  open,
  title,
  onClose,
  children,
  headerRight,
  className,
}: FullScreenSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex flex-col bg-bg-app"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] shrink-0 rounded-lg border border-border px-3 text-sm text-text-muted"
        >
          關閉
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base font-bold text-accent-light">
          {title}
        </h2>
        {headerRight}
      </header>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3",
          className,
        )}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
