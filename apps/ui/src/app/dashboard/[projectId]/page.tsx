import type { Metadata } from "next";

import { auth } from "@/auth";
import { Page, PageBody } from "@/components/dashboard/page";
import { HomeCockpit } from "./_home/cockpit";
import { loadHomeState } from "./_home/state";
import { demoHomeState, demoQuietState } from "./_home/demo-state";

export const metadata: Metadata = { title: "Overview" };

type SearchParams = Promise<{ demo?: string }>;

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: SearchParams;
}) {
  const { projectId } = await params;
  const { demo } = await searchParams;
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? undefined;
  const actorEmail = session?.user?.email ?? "unknown";

  let state: Awaited<ReturnType<typeof loadHomeState>>;
  if (demo === "1" || demo === "busy") {
    state = demoHomeState(firstName ? `${firstName}'s workspace` : "acme-web");
  } else if (demo === "quiet") {
    state = demoQuietState(firstName ? `${firstName}'s workspace` : "acme-web");
  } else {
    try {
      state = await loadHomeState(projectId, actorEmail);
    } catch {
      // DB not available in dev without wrangler — render the empty cockpit.
      state = {
        kind: "first-run",
        counts: {
          gates: 0,
          configs: 0,
          experiments: 0,
          runningExperiments: 0,
          killswitches: 0,
          armedKillswitches: 0,
          profiles: 0,
        },
        decisions: [],
        liveExperiments: [],
        alerts: [],
        pulse24h: Array.from({ length: 24 }, () => 0),
        activity: [],
        projectName: null,
        planName: "Free",
      };
    }
  }

  return (
    <Page className="!pt-0">
      <PageBody className="!pt-0">
        <HomeCockpit projectId={projectId} state={state} firstName={firstName} />
      </PageBody>
    </Page>
  );
}
