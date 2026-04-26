"use client";

import { useEffect, useRef } from "react";

/** Page-wide accent progress bar fixed at the top, fills as you scroll. */
export function ScrollProgress() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
      el.style.width = pct + "%";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="lp-scroll-progress" aria-hidden>
      <i ref={ref} />
    </div>
  );
}
