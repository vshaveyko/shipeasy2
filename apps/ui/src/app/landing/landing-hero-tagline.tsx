"use client";

import { useEffect, useState } from "react";
import { useFlag } from "@shipeasy/react";

/**
 * Copy under the hero CTA. The gate `landing_mobile_copy` decides which
 * variant to render; we additionally branch on viewport so a forced ON
 * still feels right on a 1440px monitor (showing the mobile-tuned copy
 * is the test, even on desktop).
 */
export function LandingHeroTagline() {
  const gateOn = useFlag("landing_mobile_copy");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  // Gate ON forces mobile copy everywhere; gate OFF respects viewport.
  const showMobileCopy = gateOn || isMobile;

  return (
    <p className="mx-auto mt-6 max-w-[58ch] text-center text-[17px] leading-[1.5] text-[var(--se-fg-2)]">
      {showMobileCopy
        ? "Tap once. Ship a flag, config, experiment, or translation — straight from your editor."
        : "Killswitches, dynamic configs, experiments, and auto-collected metrics — all driven by one-line MCP commands from your Claude editor."}
    </p>
  );
}
