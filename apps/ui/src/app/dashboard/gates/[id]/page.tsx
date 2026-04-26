import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import { listAttributes } from "@/lib/handlers/attributes";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { GateEditorClient } from "./gate-editor-client";

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

  let gate: Awaited<ReturnType<typeof listGates>>[number] | null = null;
  let attributes: Awaited<ReturnType<typeof listAttributes>> = [];

  try {
    const all = await listGates(identity);
    gate = all.find((g) => g.id === id) ?? null;
    attributes = await listAttributes(identity);
  } catch {
    // DB not available in dev without wrangler
  }

  if (!gate) notFound();

  const initialRules = (gate.rules ?? []).map((r) => ({
    attr: r.attr,
    op: r.op,
    value: typeof r.value === "string" ? r.value : String(r.value ?? ""),
  }));

  const rolloutPct = Math.round((gate.rolloutPct ?? 0) / 100);

  return (
    <div className="space-y-5">
      <LinkButton variant="ghost" size="sm" className="-ml-2" href="/dashboard/gates">
        <ArrowLeft className="size-3.5" /> Gates
      </LinkButton>

      {/* Header — matches the GateEditor design */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            {gate.killswitch ? (
              <span className="se-badge se-badge-killed">
                <span className="dot" />
                KILLSWITCH
              </span>
            ) : gate.enabled ? (
              <span className="se-badge se-badge-live">
                <span className="dot" />
                ENABLED
              </span>
            ) : (
              <span className="se-badge">
                <span className="dot" />
                DISABLED
              </span>
            )}
            <span className="t-mono-xs dim-2">gate.{gate.name}</span>
            <span className="se-badge">custom</span>
          </div>
          <h1 className="text-[24px] font-medium tracking-tight">{gate.name}</h1>
          <p className="mt-1 max-w-[60ch] text-[13.5px] text-muted-foreground">
            Rules evaluate top-to-bottom. First match wins. Returns{" "}
            <span className="t-mono">true</span> when any matching rule allows the user; otherwise
            falls back to the rollout percentage.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" type="button">
            <Sparkles className="size-3" /> Ask Claude
          </Button>
        </div>
      </div>

      <GateEditorClient
        gateId={gate.id}
        gateName={gate.name}
        initialRules={initialRules}
        initialRolloutPct={rolloutPct}
        attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
