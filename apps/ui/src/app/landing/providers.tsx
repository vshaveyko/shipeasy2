"use client";

import type { ReactNode } from "react";
import { ShipeasyClientProviders } from "@/components/shipeasy-providers";

/**
 * Landing-page wrapper — visitor is anonymous; the SDK still sends
 * `anonymous_id` + auto-collected browser context, which is enough for
 * rollout/holdout hashing and locale/timezone-based gate rules.
 */
export function LandingProviders({ children }: { children: ReactNode }) {
  return <ShipeasyClientProviders>{children}</ShipeasyClientProviders>;
}
