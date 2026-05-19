import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "New gate" };

export default function NewGateLayout({ children }: { children: ReactNode }) {
  return children;
}
