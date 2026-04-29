"use client";

import type { ReactNode } from "react";
import { flags } from "@shipeasy/sdk/client";
import { useFlags, useMounted } from "./use-mounted";

export function TestimonialsGate({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  useFlags();
  if (!mounted) return null;
  if (!flags.get("landing_show_testimonials")) return null;
  return <>{children}</>;
}
