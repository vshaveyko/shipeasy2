"use client";

import { useEffect, useState } from "react";

/**
 * Returns false during SSR + first client render, true after mount.
 * Used to gate URL-override-aware hooks (useFlag/useConfig/useExperiment)
 * so the first client render matches the static SSR output and React 19
 * doesn't throw a hydration mismatch when devtool params are present.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
