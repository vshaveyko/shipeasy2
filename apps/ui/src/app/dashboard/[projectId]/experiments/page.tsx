import type { Metadata } from "next";

import { ExperimentsContent } from "./experiments-content";

export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  return <ExperimentsContent />;
}
