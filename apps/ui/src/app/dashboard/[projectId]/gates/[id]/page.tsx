import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { listAllGates } from "@/lib/handlers/gates";
import { listAttributes } from "@/lib/handlers/attributes";
import { Page, PageBody } from "@/components/dashboard/page";
import { shipeasy } from "@shipeasy/sdk/server";
import { ReadGateView } from "../read-gate-view";
import type { EmbeddedGateRow } from "../embedded-gate-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}): Promise<Metadata> {
  const { projectId, id } = await params;
  try {
    const session = await auth();
    const gates = await listAllGates({
      projectId,
      actorEmail: session?.user?.email ?? "unknown",
      source: "jwt",
    });
    const gate = gates.find((g) => g.id === id);
    return { title: gate?.name ? `Gate · ${gate.name}` : "Gate editor" };
  } catch {
    return { title: "Gate editor" };
  }
}

export default async function GateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;

  if (!projectId) notFound();

  const identity = {
    projectId,
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let gate: Awaited<ReturnType<typeof listAllGates>>[number] | null = null;
  let attributes: Awaited<ReturnType<typeof listAttributes>> = [];

  try {
    const all = await listAllGates(identity);
    gate = all.find((g) => g.id === id) ?? null;
    attributes = await listAttributes(identity);
  } catch {
    // DB not available in dev without wrangler
  }

  if (!gate) notFound();

  type Op = "eq" | "neq" | "in" | "not_in" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
  const rawRules = (gate.rules ?? []) as Array<{ attr: string; op: string; value: unknown }>;
  const initialRules = rawRules.map((r) => ({
    attr: r.attr,
    op: (r.op as Op) ?? "eq",
    value: typeof r.value === "string" ? r.value : String(r.value ?? ""),
  }));

  // 0–10000 basis points → 0–100 UI scale.
  const rolloutPct = Math.round((gate.rolloutPct ?? 0) / 100);

  const initialDetails = {
    title: gate.title ?? gate.name,
    key: gate.name,
    keyLocked: true,
    folder: gate.folder ?? "",
    group: gate.groupName ?? "",
    description: gate.description ?? "",
    owner: gate.ownerEmail ?? identity.actorEmail,
  };

  // Resolve the Ask-Claude visibility from Shipeasy. Both flags must be ON
  // for the button to render — the killswitch is the master cut-off (kind:
  // killswitch shares the configs blob), and the gate is the targeted
  // rollout (e.g., to staff first).
  let askClaudeEnabled = true;
  try {
    const seConfig = await shipeasy({ apiKey: process.env.SHIPEASY_SERVER_KEY });
    const ksRaw = seConfig.configs?.["dashboard.ask_claude"] as { value?: boolean } | undefined;
    const ks = ksRaw?.value ?? true;
    const gt = seConfig.flags?.["dashboard_ask_claude"] ?? true;
    askClaudeEnabled = ks && gt;
  } catch {
    // SDK not configured in dev — leave the button visible.
  }

  const row: EmbeddedGateRow = {
    id: gate.id,
    name: gate.name,
    rolloutPct: gate.rolloutPct ?? 0,
    rules: gate.rules,
    enabled: gate.enabled ?? false,
    title: gate.title ?? null,
    folder: gate.folder ?? null,
    groupName: gate.groupName ?? null,
    ownerEmail: gate.ownerEmail ?? null,
    description: gate.description ?? null,
    stack: gate.stack ?? null,
  };
  // Suppress unused warnings — kept for parity if read view is later extended.
  void initialRules;
  void initialDetails;
  void rolloutPct;
  void attributes;
  void askClaudeEnabled;

  return (
    <Page>
      <PageBody className="space-y-5">
        <ReadGateView gate={row} />
      </PageBody>
    </Page>
  );
}
