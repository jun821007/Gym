"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TabNav } from "@/components/layout/TabNav";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAB_BAR_HEIGHT_VAR = "--tab-bar-height";

interface AppBottomBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  swipeTabsEnabled: boolean;
  onSwipeTabsEnabledChange: (enabled: boolean) => void;
}

export function AppBottomBar({
  active,
  onChange,
  swipeTabsEnabled,
  onSwipeTabsEnabledChange,
}: AppBottomBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    function syncHeight() {
      const node = footerRef.current;
      if (!node) return;
      const h = Math.ceil(node.getBoundingClientRect().height);
      document.documentElement.style.setProperty(TAB_BAR_HEIGHT_VAR, `${h}px`);
    }

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    window.addEventListener("orientationchange", syncHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", syncHeight);
    };
  }, [settingsOpen, mounted]);

  const bar = (
    <footer ref={footerRef} className="app-bottom-bar">
      {settingsOpen && (
        <div className="mb-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2">
          <label className="flex items-center justify-between gap-3 text-sm text-text">
            <span>左右滑動切換頁面</span>
            <button
              type="button"
              role="switch"
              aria-checked={swipeTabsEnabled}
              onClick={() => onSwipeTabsEnabledChange(!swipeTabsEnabled)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full border-2 border-border transition",
                swipeTabsEnabled ? "bg-accent" : "bg-bg-app",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-text transition",
                  swipeTabsEnabled ? "left-[1.35rem]" : "left-0.5",
                )}
              />
            </button>
          </label>
        </div>
      )}

      <div className="app-bottom-bar-row">
        <TabNav active={active} onChange={onChange} variant="bottom" />
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className={cn(
            "app-bottom-bar-gear",
            settingsOpen
              ? "bg-accent/20 text-accent-light"
              : "bg-bg-elevated text-text-muted",
          )}
          aria-label="導覽設定"
          aria-expanded={settingsOpen}
        >
          ⚙
        </button>
      </div>
    </footer>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}
