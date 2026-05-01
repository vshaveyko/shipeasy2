import type { ReactNode } from "react";

export function TestimonialsGate({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <>{children}</>;
}
