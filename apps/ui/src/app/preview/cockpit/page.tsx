import { HomeCockpit } from "../../dashboard/[projectId]/_home/cockpit";
import { demoHomeState } from "../../dashboard/[projectId]/_home/demo-state";

// Public preview of the home cockpit — bypasses dashboard auth so it can
// be iterated on without a session. NOT for production routing.
export default async function CockpitPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: variant = "busy" } = await searchParams;
  const state = demoHomeState("acme-web");
  if (variant === "quiet") {
    state.kind = "quiet";
    state.decisions = [];
  }
  return (
    <div style={{ minHeight: "100vh", background: "var(--se-bg)", color: "var(--se-fg)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <HomeCockpit projectId="preview" state={state} firstName="Preview" />
      </div>
    </div>
  );
}
