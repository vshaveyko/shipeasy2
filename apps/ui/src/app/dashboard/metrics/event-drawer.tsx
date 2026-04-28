"use client";

import { useState } from "react";
import { Activity, Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CustomEvent } from "./mock-data";

type PropDef = { name: string; type: "string" | "number" | "boolean"; required: boolean };

function CodeSnippet({ name, props }: { name: string; props: PropDef[] }) {
  const valid = props.filter((p) => p.name);
  return (
    <div className="met-code-block">
      <span className="cmt">{"// In your client or server SDK"}</span>
      {"\n"}
      <span className="kw">import</span>
      {" { log } "}
      <span className="kw">from</span> <span className="str">{"'@shipeasy/sdk'"}</span>;{"\n\n"}
      <span className="fn">log</span>(<span className="str">{`'${name}'`}</span>
      {valid.length > 0 && (
        <>
          ,{" {"}
          {valid.map((p, i) => (
            <span key={p.name + i}>
              {i > 0 && ", "}
              <span style={{ color: "var(--se-fg)" }}>{p.name}</span>
              {": "}
              {p.type === "number" ? (
                <span className="num">129.00</span>
              ) : p.type === "boolean" ? (
                <span className="num">true</span>
              ) : (
                <span className="str">{"'…'"}</span>
              )}
            </span>
          ))}
          {"}"}
        </>
      )}
      );
    </div>
  );
}

const TYPE_OPTIONS: { id: CustomEvent["kind"]; label: string; hint: string }[] = [
  { id: "event", label: "Event", hint: "any countable action" },
  { id: "conversion", label: "Conversion", hint: "tracked in funnels & experiments" },
  { id: "funnel", label: "Funnel step", hint: "intermediate step in a flow" },
  { id: "error", label: "Error", hint: "surfaces in error rate" },
];

export function EventDrawer({
  event,
  onClose,
  onSave,
}: {
  event: CustomEvent | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !event;
  const [name, setName] = useState(event?.name ?? "user_checkout");
  const [kind, setKind] = useState<CustomEvent["kind"]>(event?.kind ?? "event");
  const [props, setProps] = useState<PropDef[]>(
    event?.props.map((p) => ({ name: p, type: "string", required: false })) ?? [
      { name: "userId", type: "string", required: true },
      { name: "amount", type: "number", required: false },
    ],
  );
  const [pinned, setPinned] = useState(event?.pinned ?? true);

  const addProp = () =>
    setProps((p) => [...p, { name: "new_prop", type: "string", required: false }]);
  const rmProp = (i: number) => setProps((p) => p.filter((_, k) => k !== i));
  const setProp = <K extends keyof PropDef>(i: number, k: K, v: PropDef[K]) =>
    setProps((ps) => ps.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));

  return (
    <>
      <div className="met-drawer-bg" onClick={onClose} />
      <aside
        className="met-drawer"
        role="dialog"
        aria-label={isNew ? "Register event" : `Edit ${event?.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="head">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--se-accent-soft)",
              color: "var(--se-accent)",
              display: "grid",
              placeItems: "center",
              border: "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)",
            }}
          >
            <Activity className="size-3.5" />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {isNew ? "Register event" : event?.name}
            </div>
            <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
              {isNew
                ? "Define the event you'll send from your app"
                : `first seen ${event?.firstSeen} · ${event?.volume} this period`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-3" />
          </Button>
        </header>

        <div className="body">
          <div className="met-field">
            <label htmlFor="met-event-name">Event name</label>
            <div className="met-input mono">
              <span className="prefix">log(</span>
              <input
                id="met-event-name"
                value={`'${name}'`}
                onChange={(e) => setName(e.target.value.replace(/'/g, ""))}
              />
              <span className="suffix">, props)</span>
            </div>
            <div className="hint">
              snake_case · used as-is in your SDK call. Once seen, alias it from Settings if you
              need to rename.
            </div>
          </div>

          <div className="met-field">
            <label>Type</label>
            <div className="met-seg">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`opt ${kind === t.id ? "on" : ""}`}
                  onClick={() => setKind(t.id)}
                  title={t.hint}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="met-field">
            <label>Properties · the second arg of log()</label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 12px",
                background: "var(--se-bg-2)",
                border: "1px solid var(--se-line)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 70px 24px",
                  gap: 8,
                  fontFamily: "var(--se-mono)",
                  fontSize: 9.5,
                  color: "var(--se-fg-4)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 0 6px",
                }}
              >
                <span>Name</span>
                <span>Type</span>
                <span>Required</span>
                <span />
              </div>
              {props.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 70px 24px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div className="met-input mono" style={{ minHeight: 28 }}>
                    <input
                      value={p.name}
                      onChange={(e) => setProp(i, "name", e.target.value)}
                      aria-label={`Property ${i + 1} name`}
                    />
                  </div>
                  <div className="met-select" style={{ minHeight: 28 }}>
                    <select
                      value={p.type}
                      onChange={(e) => setProp(i, "type", e.target.value as PropDef["type"])}
                      aria-label={`Property ${i + 1} type`}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProp(i, "required", !p.required)}
                    style={{
                      justifySelf: "center",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                    }}
                    aria-label={`Property ${i + 1} required`}
                    aria-pressed={p.required}
                  >
                    <span className={`met-toggle ${p.required ? "on" : ""}`} />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => rmProp(i)}
                    aria-label={`Remove property ${i + 1}`}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={addProp}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                <Plus className="size-3" /> Add property
              </Button>
            </div>
            <div className="hint">
              Properties are inferred automatically too — but declaring them gives you autocomplete,
              type checks in the SDK, and validation on the server.
            </div>
          </div>

          <div className="met-field">
            <label>SDK call</label>
            <CodeSnippet name={name} props={props} />
            <div className="hint">
              Drop into any client or server. Calls are batched and flushed every 10s — no extra
              setup.
            </div>
          </div>

          <div className="met-field">
            <label>Dashboard</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--se-bg-2)",
                  border: "1px solid var(--se-line)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div className="t-caps dim-2">Aggregate</div>
                <div className="met-select">
                  <select defaultValue="count" aria-label="Aggregate">
                    <option value="count">count</option>
                    <option value="sum">sum</option>
                    <option value="avg">avg</option>
                    <option value="p50">p50</option>
                    <option value="p95">p95</option>
                    <option value="unique">unique users</option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--se-bg-2)",
                  border: "1px solid var(--se-line)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div className="t-caps dim-2">Pin to overview</div>
                <div className="flex items-center gap-2" style={{ height: 32 }}>
                  <button
                    type="button"
                    onClick={() => setPinned((v) => !v)}
                    aria-pressed={pinned}
                    aria-label="Pin to overview"
                    style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
                  >
                    <span className={`met-toggle ${pinned ? "on" : ""}`} />
                  </button>
                  <span className="t-sm dim">Show as a tile up top</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="foot">
          {!isNew && (
            <Button
              variant="ghost"
              size="sm"
              style={{ marginRight: "auto", color: "var(--se-danger)" }}
            >
              Archive event
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Check className="size-3" /> {isNew ? "Register event" : "Save changes"}
          </Button>
        </footer>
      </aside>
    </>
  );
}
