"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";

import { CodeBlock } from "@/components/ui/code-block";
import { NumericDelta } from "@/components/ui/numeric-delta";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { CustomEvent } from "./mock-data";

const TONE_BY_KIND: Record<CustomEvent["kind"], "live" | "completed" | "killed" | "neutral"> = {
  conversion: "live",
  funnel: "completed",
  error: "killed",
  event: "neutral",
};

export function EmbeddedEventDetail({ event }: { event: CustomEvent }) {
  const tone = TONE_BY_KIND[event.kind];
  const snippets = useMemo(() => buildSnippets(event), [event]);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-5 px-6 py-5">
        <header className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-md border border-[color-mix(in_oklab,var(--se-accent)_30%,transparent)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]"
          >
            <Activity className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="t-mono-xs dim-2">
              first seen {event.firstSeen} · owner {event.owner}
            </div>
            <h2 className="font-mono text-[17px] font-medium text-[var(--se-fg)]">{event.name}</h2>
          </div>
          <StatusBadge tone={tone}>{event.kind.toUpperCase()}</StatusBadge>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Volume · 24h"
            value={event.volume}
            trailing={<NumericDelta value={Number(event.vsPrev.toFixed(1))} />}
          />
          <StatTile label="Per session" value={event.perSession} />
          <StatTile
            label="Trend"
            value={
              <Sparkline
                points={event.spark}
                width={160}
                height={36}
                intent={event.vsPrev >= 0 ? "accent" : "danger"}
              />
            }
          />
        </div>

        <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-4">
          <div className="t-caps dim-2">Properties</div>
          <div className="flex flex-wrap gap-1.5">
            {event.props.length === 0 ? (
              <span className="t-mono-xs dim-3">no declared properties</span>
            ) : (
              event.props.map((p) => (
                <span
                  key={p}
                  className="rounded border border-[var(--se-line)] bg-[var(--se-bg-1)] px-2 py-0.5 font-mono text-[11px] text-[var(--se-fg-2)]"
                >
                  {p}
                </span>
              ))
            )}
          </div>
          <p className="t-sm dim">
            Properties are inferred automatically from the second arg of <code>log()</code>.
            Declaring them gives you SDK autocomplete and per-event validation.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <div className="t-caps dim-2">SDK call</div>
          <Tabs defaultValue="ts">
            <TabsList>
              <TabsTrigger value="ts">TypeScript</TabsTrigger>
              <TabsTrigger value="py">Python</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="ts" className="mt-3">
              <CodeBlock language="ts">{snippets.ts}</CodeBlock>
            </TabsContent>
            <TabsContent value="py" className="mt-3">
              <CodeBlock language="py">{snippets.py}</CodeBlock>
            </TabsContent>
            <TabsContent value="go" className="mt-3">
              <CodeBlock language="go">{snippets.go}</CodeBlock>
            </TabsContent>
            <TabsContent value="curl" className="mt-3">
              <CodeBlock language="bash">{snippets.curl}</CodeBlock>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  trailing,
}: {
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] p-3.5">
      <div className="t-caps dim-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="font-mono text-[18px] font-medium text-[var(--se-fg)]">{value}</div>
        {trailing}
      </div>
    </div>
  );
}

function buildSnippets(event: CustomEvent) {
  const propsArg = buildPropsArg(event.props);
  return {
    ts: `import { log } from '@shipeasy/sdk';

log('${event.name}'${propsArg.ts});`,
    py: `from shipeasy import log

log("${event.name}"${propsArg.py})`,
    go: `shipeasy.Log("${event.name}"${propsArg.go})`,
    curl: `curl -X POST https://ingest.shipeasy.com/v1/events \\
  -H "Authorization: Bearer $SHIPEASY_KEY" \\
  -d '{"event":"${event.name}"${propsArg.curl}}'`,
  };
}

function buildPropsArg(props: string[]): { ts: string; py: string; go: string; curl: string } {
  if (props.length === 0) return { ts: "", py: "", go: "", curl: "" };
  const tsObj = props.map((p) => `${p}: '…'`).join(", ");
  const pyObj = props.map((p) => `${p}="…"`).join(", ");
  const goObj = props.map((p) => `"${p}", "…"`).join(", ");
  const curlObj = props.map((p) => `,"${p}":"…"`).join("");
  return {
    ts: `, { ${tsObj} }`,
    py: `, ${pyObj}`,
    go: `, map[string]any{${goObj}}`,
    curl: curlObj,
  };
}
