"use client";

import { useEffect } from "react";

/**
 * Adds `lp-in` to elements with `lp-reveal` as they scroll into view, so
 * sections animate up. The hero already ships with `lp-in` baked into the
 * markup so first paint is fully visible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal:not(.lp-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("lp-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("lp-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
