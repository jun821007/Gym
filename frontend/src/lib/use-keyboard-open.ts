"use client";

import { useEffect, useState } from "react";

/** PWA / iOS：鍵盤彈出時 visualViewport 會縮小 */
export function useKeyboardOpen(thresholdPx = 120) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const delta = window.innerHeight - viewport.height;
      const next = delta > thresholdPx || viewport.offsetTop > 0;
      setOpen(next);
      document.documentElement.classList.toggle("keyboard-open", next);
    }

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      document.documentElement.classList.remove("keyboard-open");
    };
  }, [thresholdPx]);

  return open;
}
