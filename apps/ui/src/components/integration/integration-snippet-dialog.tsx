"use client";

import { useMemo, useState } from "react";
import { Code, Copy, Check, Lock } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ALL_LANGS,
  KIND_META,
  snippetFor,
  type IntegrationKind,
  type IntegrationLang,
} from "./snippets";

function tokenize(line: string) {
  const parts: { t: string; v: string }[] = [];
  let i = 0;
  const re =
    /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`|\/\/[^\n]*|#[^\n]*|\b(import|from|require|use|var|val|const|let|if|fn|func|def|class|public|return|await|async|new|export)\b|\b\d+(\.\d+)?\b)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > i) parts.push({ t: "p", v: line.slice(i, m.index) });
    const v = m[0];
    if (v.startsWith("//") || v.startsWith("#")) parts.push({ t: "com", v });
    else if (v.startsWith('"') || v.startsWith("'") || v.startsWith("`"))
      parts.push({ t: "str", v });
    else if (/^\d/.test(v)) parts.push({ t: "num", v });
    else parts.push({ t: "kw", v });
    i = re.lastIndex;
  }
  if (i < line.length) parts.push({ t: "p", v: line.slice(i) });
  return parts;
}

export interface IntegrationSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: IntegrationKind;
  name: string;
  /** Override default lang on open. */
  defaultLang?: IntegrationLang;
}

export function IntegrationSnippetDialog({
  open,
  onOpenChange,
  kind,
  name,
  defaultLang = "ts",
}: IntegrationSnippetDialogProps) {
  const [lang, setLang] = useState<IntegrationLang>(defaultLang);
  const [copied, setCopied] = useState(false);
  const meta = KIND_META[kind];
  const code = useMemo(() => snippetFor(kind, lang, name), [kind, lang, name]);
  const lines = code.split("\n");

  async function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[920px] gap-0 p-0" data-integration-dialog={kind}>
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-4">
          <div className="grid size-9 place-items-center rounded-[9px] border border-[var(--se-line-2)] bg-[var(--se-accent-soft)] text-[var(--se-accent)]">
            <Code className="size-4" />
          </div>
          <div className="min-w-0">
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] uppercase">
              {meta.nameLabel} · {name}
            </DialogDescription>
          </div>
        </div>

        <div className="flex max-h-[70vh] flex-col overflow-hidden p-5">
          <div className="overflow-hidden rounded-md border border-[var(--se-line-2)] bg-[var(--se-bg-1)]">
            <div className="flex gap-0 overflow-x-auto border-b border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-3">
              {ALL_LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={cn(
                    "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 font-mono text-[11.5px] tracking-[0.02em]",
                    lang === l.id
                      ? "border-[var(--se-accent)] text-foreground"
                      : "border-transparent text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
                  )}
                  data-lang={l.id}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="relative bg-[var(--se-bg-1)]">
              <button
                type="button"
                onClick={copy}
                className="absolute top-2.5 right-3 flex items-center gap-1.5 rounded-[4px] border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2.5 py-1 font-mono text-[11px] text-[var(--se-fg-2)] hover:bg-[var(--se-bg-4)] hover:text-foreground"
                aria-label="Copy snippet"
              >
                {copied ? (
                  <>
                    <Check className="size-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy
                  </>
                )}
              </button>
              <pre className="m-0 overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-[var(--se-fg-2)]">
                {lines.map((ln, idx) => (
                  <div key={idx}>
                    <span className="mr-3 inline-block w-6 text-right text-[var(--se-fg-4)] select-none">
                      {idx + 1}
                    </span>
                    {tokenize(ln).map((p, i) =>
                      p.t === "p" ? (
                        <span key={i}>{p.v}</span>
                      ) : p.t === "kw" ? (
                        <span key={i} className="text-[#a78bfa]">
                          {p.v}
                        </span>
                      ) : p.t === "str" ? (
                        <span key={i} className="text-[var(--se-accent)]">
                          {p.v}
                        </span>
                      ) : p.t === "num" ? (
                        <span key={i} className="text-[#f0c674]">
                          {p.v}
                        </span>
                      ) : (
                        <span key={i} className="text-[var(--se-fg-4)] italic">
                          {p.v}
                        </span>
                      ),
                    )}
                  </div>
                ))}
              </pre>
            </div>
          </div>

          <p className="mt-2.5 text-[12px] text-[var(--se-fg-3)]">{meta.subtitle}</p>

          <div className="mt-4 flex items-center gap-3 rounded-md border border-[color-mix(in_oklab,var(--se-accent)_22%,var(--se-line-2))] bg-[color-mix(in_oklab,var(--se-accent)_5%,var(--se-bg-1))] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-[var(--se-fg-2)]">
            <Lock className="size-3.5 shrink-0 text-[var(--se-accent)]" />
            <span>
              <b className="font-medium text-foreground">
                Set <span className="font-mono">SHIPEASY_SERVER_KEY</span>
              </b>{" "}
              (or <span className="font-mono">SHIPEASY_CLIENT_KEY</span> for browser SDKs) in your
              environment. Generate one from API keys.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
