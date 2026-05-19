"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

interface CodeBlockProps extends React.ComponentProps<"pre"> {
  /** Language hint for the data attribute (informational). */
  language?: string;
  /** Show a copy-to-clipboard button (defaults to true when children is a string). */
  copyable?: boolean;
  /** Override the copy payload. Falls back to the rendered text. */
  copyValue?: string;
}

function CodeBlock({
  className,
  children,
  language,
  copyable,
  copyValue,
  ...props
}: CodeBlockProps) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);
  const showCopy = copyable ?? typeof children === "string";

  const onCopy = async () => {
    const text = copyValue ?? ref.current?.innerText ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="relative">
      <pre
        ref={ref}
        data-slot="code-block"
        data-language={language}
        className={cn(
          "se-json overflow-x-auto rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)] px-4 py-3 font-mono text-[12px] leading-relaxed text-[var(--se-fg-2)]",
          className,
        )}
        {...props}
      >
        {children}
      </pre>
      {showCopy ? (
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={onCopy}
          className="absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded border border-[var(--se-line-2)] bg-[var(--se-bg-3)] text-[var(--se-fg-3)] opacity-0 transition-opacity hover:text-[var(--se-fg)] focus-visible:opacity-100 group-hover:opacity-100 [pre:hover+&]:opacity-100"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      ) : null}
    </div>
  );
}

export type CodeLanguage =
  | "typescript"
  | "python"
  | "ruby"
  | "go"
  | "java"
  | "curl"
  | (string & {});

interface CodeTab {
  language: CodeLanguage;
  label?: string;
  code: string;
}

interface CodeBlockTabsProps extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  tabs: CodeTab[];
  defaultValue?: CodeLanguage;
}

const DEFAULT_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  python: "Python",
  ruby: "Ruby",
  go: "Go",
  java: "Java",
  curl: "cURL",
};

function CodeBlockTabs({ tabs, defaultValue, className, ...props }: CodeBlockTabsProps) {
  const [active, setActive] = React.useState<CodeLanguage>(
    defaultValue ?? tabs[0]?.language ?? "typescript",
  );
  const current = tabs.find((t) => t.language === active) ?? tabs[0];

  return (
    <div
      data-slot="code-block-tabs"
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-2)]",
        className,
      )}
      {...props}
    >
      <div
        role="tablist"
        className="flex items-center gap-1 border-b border-[var(--se-line)] bg-[var(--se-bg-1)] px-2 py-1.5"
      >
        {tabs.map((t) => {
          const selected = t.language === active;
          return (
            <button
              key={t.language}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.language)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors",
                selected
                  ? "bg-[var(--se-bg-3)] text-[var(--se-fg)]"
                  : "text-[var(--se-fg-3)] hover:text-[var(--se-fg-2)]",
              )}
            >
              {t.label ?? DEFAULT_LABELS[t.language] ?? t.language}
            </button>
          );
        })}
      </div>
      {current ? (
        <CodeBlock
          language={current.language}
          copyValue={current.code}
          className="rounded-none border-0"
        >
          {current.code}
        </CodeBlock>
      ) : null}
    </div>
  );
}

export { CodeBlock, CodeBlockTabs };
