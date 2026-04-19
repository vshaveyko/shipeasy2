import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { listGates } from "@/lib/handlers/gates";
import { listAttributes } from "@/lib/handlers/attributes";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { RulesBuilder } from "./rules-builder";

export default async function GateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const projectId = session?.user?.project_id;

  if (!projectId) notFound();

  const identity = {
    projectId,
    actorEmail: session?.user?.email ?? "unknown",
    source: "jwt" as const,
  };

  let gate: Awaited<ReturnType<typeof listGates>>[0] | null = null;
  let attributes: Awaited<ReturnType<typeof listAttributes>> = [];

  try {
    const gates = await listGates(identity);
    gate = gates.find((g) => g.id === id) ?? null;
    attributes = await listAttributes(identity);
  } catch {
    // DB not available in dev without wrangler
  }

  if (!gate) notFound();

  const initialRules = (gate.rules ?? []).map((r) => ({
    attr: r.attr,
    op: r.op,
    value: String(r.value ?? ""),
  }));

  return (
    <div className="space-y-6">
      <LinkButton variant="ghost" size="sm" className="-ml-2" href="/dashboard/configs/gates">
        <ArrowLeft className="size-3.5" />
        Gates
      </LinkButton>

      <PageHeader
        title={gate.name}
        description="Manage targeting rules for this gate."
        actions={
          <Badge variant={gate.enabled ? "default" : "secondary"}>
            {gate.enabled ? "enabled" : "disabled"}
          </Badge>
        }
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Targeting rules</CardTitle>
          <CardDescription>Rules are evaluated in order. First matching rule wins.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <RulesBuilder
            gateId={gate.id}
            initialRules={initialRules}
            attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
