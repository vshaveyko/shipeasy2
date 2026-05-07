import type { Metadata } from "next";

import { GatesContent } from "./gates-content";

export const metadata: Metadata = { title: "Gates" };

export default function GatesPage() {
  return <GatesContent />;
}
