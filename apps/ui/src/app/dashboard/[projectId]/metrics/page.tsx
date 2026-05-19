import type { Metadata } from "next";

import { MetricsContent } from "./metrics-content";

export const metadata: Metadata = { title: "Metrics" };

type SearchParams = Promise<{
  demo?: string;
  setup?: string;
  view?: string;
  open?: string;
}>;

export default async function MetricsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialView =
    params.view === "dashboard"
      ? "dashboard"
      : params.demo === "1" || params.view === "list"
        ? "list"
        : "empty";
  return <MetricsContent initialView={initialView} />;
}
