"use client";

import type { ReactNode } from "react";
import { flags } from "@shipeasy/sdk/client";

export function TestimonialsGate({ children }: { children: ReactNode }) {
  if (!flags.get("landing_show_testimonials")) return null;
  return <>{children}</>;
}
