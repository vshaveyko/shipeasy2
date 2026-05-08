import type { Metadata } from "next";

import { MetricsPageRoot } from "./metrics-page";

export const metadata: Metadata = { title: "Metrics" };

type SearchParams = Promise<{ demo?: string; setup?: string }>;

export default async function MetricsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialView = params.demo === "1" ? "dashboard" : "empty";
  return <MetricsPageRoot initialView={initialView} />;
}
