import type { Metadata } from "next";

import { auth } from "@/auth";
import { Page, PageBody } from "@/components/dashboard/page";
import { HomeCockpit } from "./_home/cockpit";
import { loadHomeState } from "./_home/state";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? undefined;
  const actorEmail = session?.user?.email ?? "unknown";

  let state: Awaited<ReturnType<typeof loadHomeState>>;
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
        profiles: 0,
      },
      decisions: [],
      liveExperiments: [],
      pulse24h: Array.from({ length: 24 }, () => 0),
      activity: [],
      projectName: null,
      planName: "Free",
    };
  }

  return (
    <Page>
      <PageBody className="pt-2">
        <HomeCockpit projectId={projectId} state={state} firstName={firstName} />
      </PageBody>
    </Page>
  );
}
