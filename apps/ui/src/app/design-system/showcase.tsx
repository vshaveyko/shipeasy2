"use client";

import * as React from "react";
import {
  Beaker,
  Flag,
  Gauge,
  Plus,
  Power,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeBlock, CodeBlockTabs } from "@/components/ui/code-block";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Dropzone, FileChip } from "@/components/ui/dropzone";
import { EmptyState, EmptyStat } from "@/components/ui/empty-state";
import { EnvTabs } from "@/components/ui/env-tabs";
import { FieldArray, FieldArrayAdd, FieldArrayRow } from "@/components/ui/field-array";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  FieldRow,
  FieldSuccess,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { NumericDelta } from "@/components/ui/numeric-delta";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoldoutBar, ProgressBar } from "@/components/ui/progress-bar";
import { OptionCard, Radio, RadioGroup } from "@/components/ui/radio-group";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Sparkline } from "@/components/ui/sparkline";
import { Stat, StatTile } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import {
  BigModalWizard,
  type WizardKind,
  type WizardStep,
} from "@/components/shell/big-modal-wizard";
import { UnifiedList, type UnifiedListColumn } from "@/components/shell/unified-list";
import { cn } from "@/lib/utils";

const sections: ReadonlyArray<{ id: string; label: string }> = [
  { id: "tokens", label: "Tokens" },
  { id: "buttons", label: "Buttons" },
  { id: "badges", label: "Badges" },
  { id: "fields", label: "Fields" },
  { id: "inputs", label: "Inputs" },
  { id: "choice", label: "Choice" },
  { id: "segmented", label: "Segmented" },
  { id: "slider", label: "Slider" },
  { id: "tags", label: "Tag input" },
  { id: "upload", label: "Upload" },
  { id: "stats", label: "Stats" },
  { id: "code", label: "Code block" },
  { id: "dialogs", label: "Dialogs" },
  { id: "empty", label: "Empty state" },
  { id: "banner", label: "Banner" },
  { id: "tabs", label: "Tabs" },
  { id: "stepper", label: "Stepper" },
  { id: "combobox", label: "Combobox" },
  { id: "popover", label: "Popover" },
  { id: "skeleton", label: "Skeleton" },
  { id: "progress", label: "Progress" },
  { id: "delta", label: "Numeric delta" },
  { id: "sparkline", label: "Sparkline" },
  { id: "envtabs", label: "Env tabs" },
  { id: "table", label: "Table" },
  { id: "fieldarray", label: "Field array" },
  { id: "drawer", label: "Drawer" },
  { id: "unifiedlist", label: "UnifiedList shell" },
  { id: "bigmodal", label: "BigModalWizard" },
];

export function DesignSystemShowcase() {
  return (
    <div
      className="grid min-h-screen bg-[var(--se-bg)] text-[var(--se-fg)]"
      style={{ gridTemplateColumns: "220px 1fr" }}
    >
      <SideNav />
      <main className="mx-auto w-full max-w-[1180px] px-14 pb-32 pt-12">
        <Hero />
        <TokensSection />
        <ButtonsSection />
        <BadgesSection />
        <FieldsSection />
        <InputsSection />
        <ChoiceSection />
        <SegmentedSection />
        <SliderSection />
        <TagsSection />
        <UploadSection />
        <StatsSection />
        <CodeBlockSection />
        <DialogsSection />
        <EmptyStateSection />
        <BannerSection />
        <TabsSection />
        <StepperSection />
        <ComboboxSection />
        <PopoverSection />
        <SkeletonSection />
        <ProgressSection />
        <NumericDeltaSection />
        <SparklineSection />
        <EnvTabsSection />
        <TableSection />
        <FieldArraySection />
        <DrawerSection />
        <UnifiedListSection />
        <BigModalWizardSection />
      </main>
    </div>
  );
}

function SideNav() {
  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-1 overflow-y-auto border-r border-[var(--se-line)] bg-[var(--se-bg-1)] px-4 py-7">
      <div className="flex items-center gap-2.5">
        <div
          className="relative size-[26px] rounded-[7px] shadow-[0_0_0_1px_var(--se-line-2)]"
          style={{
            background:
              "conic-gradient(from 140deg, var(--se-accent), #0a0a0b 40%, var(--se-accent) 80%)",
          }}
        >
          <div className="absolute inset-[5px] rounded-[3px] bg-[var(--se-bg)] shadow-[inset_0_0_0_1px_var(--se-line-2)]" />
        </div>
        <div className="text-[12.5px] font-medium tracking-[-0.005em]">
          Shipeasy
          <small className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
            Design System v2.0
          </small>
        </div>
      </div>
      <div className="px-1.5 pb-1 pt-4 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--se-fg-4)]">
        Sections
      </div>
      {sections.map((s, i) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-[12.5px] text-[var(--se-fg-3)] transition-colors hover:bg-[var(--se-bg-2)] hover:text-[var(--se-fg)]"
        >
          <span className="w-4 shrink-0 font-mono text-[10px] text-[var(--se-fg-4)]">
            {String(i + 1).padStart(2, "0")}
          </span>
          {s.label}
        </a>
      ))}
    </aside>
  );
}

function Hero() {
  return (
    <header className="pb-14 pt-6">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
        Design System · v2.0 · last updated may 2026
      </div>
      <h1
        className="m-0 text-[64px] font-medium leading-[0.96] tracking-[-0.025em]"
        style={{ fontFamily: "var(--se-sans)" }}
      >
        <em
          className="not-italic"
          style={{
            fontFamily: "var(--se-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 72,
          }}
        >
          Calm surfaces.
        </em>
        <br />
        Loud signal.
      </h1>
      <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-[var(--se-fg-2)]">
        A dark, monospace-flavored dashboard language for operators who read numbers more than
        marketing copy. Every primitive is wired to the tokens in{" "}
        <code className="font-mono text-[var(--se-fg-2)]">globals.css</code>.
      </p>
      <div className="mt-7 grid grid-cols-4 gap-4 border-t border-[var(--se-line)] pt-5">
        {[
          ["Primitives", "27"],
          ["Shells", "2"],
          ["Sections", "30"],
          ["Density", "14 / 32 / 8"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
              {k}
            </span>
            <span className="text-[22px] font-medium tabular-nums tracking-[-0.02em]">{v}</span>
          </div>
        ))}
      </div>
    </header>
  );
}

function Section({
  id,
  num,
  title,
  sub,
  children,
}: {
  id: string;
  num: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 border-t border-[var(--se-line)] py-14"
      data-section={id}
    >
      <div className="mb-7">
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
          {num}
        </div>
        <h2 className="m-0 text-[32px] font-medium leading-tight tracking-[-0.025em]">{title}</h2>
        {sub ? (
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-snug text-[var(--se-fg-3)]">
            {sub}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Demo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-3)]">
        {title}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function TokensSection() {
  const surfaces = [
    ["bg", "#0a0a0b", "surface/0"],
    ["bg-1", "#0f0f10", "surface/1"],
    ["bg-2", "#141416", "surface/2"],
    ["bg-3", "#1a1a1d", "surface/3"],
    ["bg-4", "#222227", "surface/4"],
    ["line-2", "rgba(255,255,255,.14)", "border"],
  ] as const;
  const semantic = [
    ["accent", "live · primary"],
    ["danger", "killed · regressed"],
    ["warn", "paused · ramping"],
    ["info", "completed · neutral"],
    ["purple", "feature flags"],
  ] as const;
  return (
    <Section
      id="tokens"
      num="01 · Foundations"
      title="Color & geometry"
      sub="Surfaces stack from black to chrome. Five semantic hues carry status. Five radius steps."
    >
      <div className="grid grid-cols-6 gap-3.5">
        {surfaces.map(([k, v, role]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <div
              className="h-[72px] rounded-[var(--radius-md)] border border-[var(--se-line)]"
              style={{ background: v }}
            />
            <div className="flex justify-between font-mono text-[10.5px] text-[var(--se-fg-3)]">
              <b className="font-medium text-[var(--se-fg)]">--se-{k}</b>
              <span>{v}</span>
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
              {role}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-5 gap-3.5">
        {semantic.map(([k, role]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <div
              className="h-[72px] rounded-[var(--radius-md)] border border-[var(--se-line)]"
              style={{ background: `var(--se-${k})` }}
            />
            <div className="flex justify-between font-mono text-[10.5px] text-[var(--se-fg-3)]">
              <b className="font-medium text-[var(--se-fg)]">--se-{k}</b>
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
              {role}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-5 gap-3.5">
        {[
          ["xs", 4],
          ["sm", 6],
          ["md", 8],
          ["lg", 10],
          ["xl", 14],
        ].map(([k, v]) => (
          <div key={k as string} className="flex flex-col gap-1.5">
            <div
              className="grid h-[60px] place-items-center border border-[var(--se-line-2)] bg-[var(--se-bg-3)] font-mono text-[11px] text-[var(--se-fg-2)]"
              style={{ borderRadius: v as number }}
            >
              {v}
            </div>
            <div className="font-mono text-[10.5px] text-[var(--se-fg)]">
              <b className="font-medium">--radius-{k}</b>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ButtonsSection() {
  return (
    <Section
      id="buttons"
      num="02 · Components"
      title="Buttons"
      sub="Five variants × four sizes, plus icon-only forms."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Variants">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2 />
              Delete
            </Button>
          </div>
        </Demo>
        <Demo title="Sizes">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">XS</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
          </div>
        </Demo>
      </div>
    </Section>
  );
}

function BadgesSection() {
  return (
    <Section
      id="badges"
      num="03 · Components"
      title="Badges"
      sub="Status badges carry the colour-coded lifecycle. Plain badges sit on metadata."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Status">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="live" pulse>
              Live
            </StatusBadge>
            <StatusBadge tone="paused">Paused</StatusBadge>
            <StatusBadge tone="killed">Killed</StatusBadge>
            <StatusBadge tone="completed">Completed</StatusBadge>
            <StatusBadge tone="draft" showDot={false}>
              Draft
            </StatusBadge>
          </div>
        </Demo>
        <Demo title="Plain">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Demo>
        <Demo title="Intent palette">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" intent="running">
              Running
            </Badge>
            <Badge variant="outline" intent="success">
              Success
            </Badge>
            <Badge variant="outline" intent="info">
              Info
            </Badge>
            <Badge variant="outline" intent="warn">
              Warn
            </Badge>
            <Badge variant="outline" intent="danger">
              Danger
            </Badge>
            <Badge variant="outline" intent="neutral">
              Neutral
            </Badge>
          </div>
        </Demo>
      </div>
    </Section>
  );
}

function FieldsSection() {
  return (
    <Section
      id="fields"
      num="04 · Forms"
      title="Fields, labels & help"
      sub="Stack a label, control, and one of: hint / error / success."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Anatomy">
          <Field>
            <FieldLabel required>Experiment name</FieldLabel>
            <Input defaultValue="checkout_v3" />
            <FieldHint>Lowercase, underscores, ≤ 40 chars.</FieldHint>
          </Field>
        </Demo>
        <Demo title="States">
          <Field>
            <FieldLabel optional>Slug</FieldLabel>
            <Input defaultValue="Checkout V3!" aria-invalid />
            <FieldError>Use lowercase letters and underscores.</FieldError>
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input
              defaultValue="checkout_v3"
              className="border-[color-mix(in_oklab,var(--se-accent)_55%,transparent)]"
            />
            <FieldSuccess>Available.</FieldSuccess>
          </Field>
        </Demo>
      </div>
    </Section>
  );
}

function InputsSection() {
  return (
    <Section
      id="inputs"
      num="05 · Forms"
      title="Text inputs & textarea"
      sub="Defaults plus the most common decorations."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Plain">
          <Input placeholder="Search experiments…" />
          <Input defaultValue="checkout_v3" />
          <Input disabled defaultValue="readonly_value" />
        </Demo>
        <Demo title="Decorations">
          <FieldRow>
            <Field>
              <Input placeholder="Search…" />
            </Field>
            <Kbd>⌘ K</Kbd>
          </FieldRow>
          <FieldRow>
            <Search className="size-4 text-[var(--se-fg-3)]" />
            <Input placeholder="With leading icon" />
          </FieldRow>
          <Textarea placeholder="Multi-line description…" />
        </Demo>
        <Demo title="Mono (identifiers)">
          <Input data-mono defaultValue="checkout_v3" />
          <Textarea data-mono defaultValue='{ "key": "checkout_v3" }' />
        </Demo>
      </div>
    </Section>
  );
}

function ChoiceSection() {
  const [variant, setVariant] = React.useState("control");
  return (
    <Section
      id="choice"
      num="06 · Forms"
      title="Checkbox & radio"
      sub="Square checkboxes for multi-select, circular radios for one-of, option cards for high-stakes choices."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Checkbox">
          <Checkbox label="Email me when this experiment hits significance" />
          <Checkbox
            label="Auto-promote variant after 14 days"
            description="Skips the manual review step."
          />
          <Checkbox label="Disabled" disabled />
        </Demo>
        <Demo title="Radio">
          <RadioGroup defaultValue="bayesian">
            <Radio value="frequentist" label="Frequentist (t-test)" />
            <Radio
              value="bayesian"
              label="Bayesian (default)"
              description="Stops at 95% probability of being best."
            />
            <Radio value="cuped" label="CUPED variance reduction" />
          </RadioGroup>
        </Demo>
        <Demo title="Option cards">
          <RadioGroup
            value={variant}
            onValueChange={(v) => setVariant(String(v))}
            className="flex flex-col gap-2"
          >
            <OptionCard
              value="control"
              title="Control"
              description="Existing checkout flow. No changes."
              tag="A"
            />
            <OptionCard
              value="b"
              title="Variant B — single-page"
              description="Collapses payment + shipping into one form."
              tag="B"
            />
            <OptionCard
              value="c"
              title="Variant C — wallets-first"
              description="Surfaces Apple/Google Pay above email."
              tag="C"
            />
          </RadioGroup>
        </Demo>
        <Demo title="Switch">
          <SwitchExample />
        </Demo>
      </div>
    </Section>
  );
}

function SwitchExample() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Switch checked={a} onCheckedChange={setA} label="Enable kill switch" />
        <span className="text-[13px]">Enable kill switch</span>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={b} onCheckedChange={setB} label="Notify on Slack" />
        <span className="text-[13px]">Notify on Slack</span>
      </div>
    </div>
  );
}

function SegmentedSection() {
  const [v, setV] = React.useState<string[]>(["7d"]);
  return (
    <Section
      id="segmented"
      num="07 · Components"
      title="Segmented control"
      sub="A pill-set for mutually exclusive views — time ranges, environments, density."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Time range">
          <Segmented value={v} onValueChange={(next) => setV(next as string[])}>
            <SegmentedItem value="1d">1d</SegmentedItem>
            <SegmentedItem value="7d">7d</SegmentedItem>
            <SegmentedItem value="30d">30d</SegmentedItem>
            <SegmentedItem value="90d">90d</SegmentedItem>
          </Segmented>
        </Demo>
        <Demo title="Sizes">
          <Segmented size="sm" defaultValue={["dev"]}>
            <SegmentedItem value="dev">dev</SegmentedItem>
            <SegmentedItem value="staging">staging</SegmentedItem>
            <SegmentedItem value="prod">prod</SegmentedItem>
          </Segmented>
          <Segmented size="lg" defaultValue={["chart"]}>
            <SegmentedItem value="chart">Chart</SegmentedItem>
            <SegmentedItem value="table">Table</SegmentedItem>
          </Segmented>
        </Demo>
      </div>
    </Section>
  );
}

function SliderSection() {
  const [pct, setPct] = React.useState<number>(50);
  return (
    <Section
      id="slider"
      num="08 · Forms"
      title="Slider"
      sub="Single-thumb range with optional value tooltip on hover/focus."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Traffic ramp">
          <div className="flex items-center gap-3">
            <Slider
              value={pct}
              onValueChange={(next) => setPct(typeof next === "number" ? next : (next[0] ?? 0))}
              min={0}
              max={100}
              showValue
              formatValue={(v) => `${v}%`}
            />
            <span className="w-12 text-right font-mono text-[12px] text-[var(--se-fg)]">
              {pct}%
            </span>
          </div>
        </Demo>
        <Demo title="Range">
          <Slider
            defaultValue={[20, 80]}
            min={0}
            max={100}
            showValue
            formatValue={(v) => `${v}%`}
          />
        </Demo>
      </div>
    </Section>
  );
}

function TagsSection() {
  const [tags, setTags] = React.useState<string[]>(["checkout", "mobile", "pilot"]);
  return (
    <Section
      id="tags"
      num="09 · Forms"
      title="Tag input"
      sub="Free-form labels — Enter or comma to commit, Backspace to delete."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Multi-tag">
          <TagInput value={tags} onValueChange={setTags} placeholder="Add tag…" />
          <p className="font-mono text-[11px] text-[var(--se-fg-4)]">
            {tags.length} {tags.length === 1 ? "tag" : "tags"}
          </p>
        </Demo>
        <Demo title="Capped at 4">
          <TagInput value={tags} onValueChange={setTags} max={4} />
        </Demo>
      </div>
    </Section>
  );
}

function UploadSection() {
  const [files, setFiles] = React.useState<File[]>([]);
  return (
    <Section
      id="upload"
      num="10 · Forms"
      title="File upload"
      sub="Drop-zone with click-to-browse fallback. Use FileChip to render the queue."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Dropzone">
          <Dropzone multiple onFiles={(f) => setFiles(f)} />
        </Demo>
        <Demo title="File chips">
          {files.length === 0 ? (
            <>
              <FileChip name="metrics_export.csv" size="2.4 MB" onRemove={() => undefined} />
              <FileChip name="cohort_2026_q1.json" size="148 KB" onRemove={() => undefined} />
            </>
          ) : (
            files.map((f, i) => (
              <FileChip
                key={`${f.name}-${i}`}
                name={f.name}
                size={`${(f.size / 1024).toFixed(1)} KB`}
                onRemove={() => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
              />
            ))
          )}
        </Demo>
      </div>
    </Section>
  );
}

function StatsSection() {
  return (
    <Section
      id="stats"
      num="11 · Components"
      title="Stats"
      sub="Small KPI tiles for dashboard headers and detail pages."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Sessions"
          value="124,820"
          trend="up"
          delta="+12.4%"
          kindTag="auto"
          kind="auto"
        />
        <StatTile
          label="Conversion"
          value="4.82"
          unit="%"
          trend="up"
          delta="+0.31pp"
          kindTag="custom"
          kind="custom"
        />
        <StatTile label="Errors" value="318" trend="down" delta="−8.1%" />
        <StatTile label="Latency p95" value="142" unit="ms" trend="flat" delta="±0%" />
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Inline stat row</CardTitle>
            <CardDescription>For card headers when a tile is too heavy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <Stat label="Variant A" value="48.2%" trend="up" delta="+0.8pp" />
              <Stat label="Variant B" value="51.4%" trend="up" delta="+1.4pp" />
              <Stat label="Holdout" value="3.1%" trend="flat" delta="—" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function CodeBlockSection() {
  return (
    <Section
      id="code"
      num="12 · Components"
      title="Code block"
      sub="Syntax-tinted via the .se-json class. Copy button shows on hover/focus."
    >
      <div className="flex flex-col gap-4">
        <CodeBlock language="ts">{`import { shipeasy } from "@shipeasy/sdk/server";

await shipeasy({ apiKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "" });

const variant = await shipeasy.experiment("checkout_v3");
console.log(variant.id, variant.payload);`}</CodeBlock>
        <CodeBlockTabs
          tabs={[
            {
              language: "typescript",
              code: `import { shipeasy } from "@shipeasy/sdk/server";\nconst v = await shipeasy.experiment("checkout_v3");`,
            },
            {
              language: "python",
              code: `from shipeasy import Shipeasy\nv = Shipeasy(api_key=KEY).experiment("checkout_v3")`,
            },
            {
              language: "ruby",
              code: `require "shipeasy"\nv = Shipeasy.new(api_key: KEY).experiment("checkout_v3")`,
            },
            {
              language: "go",
              code: `client := shipeasy.New(KEY)\nv, _ := client.Experiment(ctx, "checkout_v3")`,
            },
            {
              language: "java",
              code: `Shipeasy se = new Shipeasy(KEY);\nVariant v = se.experiment("checkout_v3");`,
            },
            {
              language: "curl",
              code: `curl -H "Authorization: Bearer $KEY" \\\n  https://api.shipeasy.ai/sdk/experiments/checkout_v3`,
            },
          ]}
        />
      </div>
    </Section>
  );
}

function DialogsSection() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [destructiveOpen, setDestructiveOpen] = React.useState(false);
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [promptOpen, setPromptOpen] = React.useState(false);
  const [lastValue, setLastValue] = React.useState<string | null>(null);

  return (
    <Section
      id="dialogs"
      num="13 · Components"
      title="Dialogs"
      sub="Drop-in confirm / alert / prompt that follow the system's modal language."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Confirm">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
              Confirm…
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDestructiveOpen(true)}>
              Delete experiment…
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWarningOpen(true)}>
              Pause rollout…
            </Button>
          </div>
        </Demo>
        <Demo title="Alert · Prompt">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAlertOpen(true)}>
              Show alert
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPromptOpen(true)}>
              Rename…
            </Button>
          </div>
          {lastValue ? (
            <p className="font-mono text-[11px] text-[var(--se-fg-3)]">
              Last value: <span className="text-[var(--se-fg)]">{lastValue}</span>
            </p>
          ) : null}
        </Demo>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Promote variant B to 100%?"
        description="All traffic will move to Variant B at the next poll cycle (~30s)."
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
        }}
        confirmLabel="Promote"
      />
      <ConfirmDialog
        open={destructiveOpen}
        onOpenChange={setDestructiveOpen}
        tone="destructive"
        title="Delete experiment?"
        description="checkout_v3 will be removed permanently. This cannot be undone."
        confirmLabel="Delete forever"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 500));
        }}
      />
      <ConfirmDialog
        open={warningOpen}
        onOpenChange={setWarningOpen}
        tone="warning"
        title="Pause rollout?"
        description="Existing assignments will be honored, but no new users will enter the experiment."
        confirmLabel="Pause"
      />
      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Heads up — experiment underpowered"
        description="The current sample size has < 60% power to detect a 1pp lift. Consider extending the run or relaxing the MDE."
      />
      <PromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        title="Rename experiment"
        description="Used in URLs and as the SDK lookup key."
        label="Slug"
        defaultValue="checkout_v3"
        placeholder="lowercase_underscores"
        hint="Lowercase, underscores, ≤ 40 chars."
        validate={(v) =>
          /^[a-z0-9_]+$/.test(v) ? null : "Use lowercase letters, digits, and underscores."
        }
        onConfirm={(v) => setLastValue(v)}
        required
      />
    </Section>
  );
}

function EmptyStateSection() {
  return (
    <Section
      id="empty"
      num="14 · Patterns"
      title="Empty state"
      sub="The hero you ship before any data exists. Eyebrow, title, optional visual + actions + stats."
    >
      <EmptyState
        eyebrow={<>No experiments yet</>}
        title="Ship your first A/B test in under a minute."
        description="Wrap a flag in shipeasy.experiment() and we'll handle assignment, metrics, and the lift calc."
        actions={
          <>
            <Button>
              <Plus />
              New experiment
            </Button>
            <Button variant="outline">Read the docs</Button>
          </>
        }
        stats={
          <>
            <EmptyStat value="0" label="Running" detail="across 0 universes" />
            <EmptyStat value="3" label="Templates" detail="ready to fork" />
            <EmptyStat value="∞" label="Free trials" detail="while in beta" />
          </>
        }
      />
    </Section>
  );
}

function BannerSection() {
  return (
    <Section
      id="banner"
      num="15 · Components"
      title="Banner"
      sub="Inline notice for run-state callouts, deprecation, billing warnings. Four intents."
    >
      <div className="grid gap-3">
        <Banner intent="info" title="Heads up — daily analysis runs at 03:00 UTC">
          Verdicts refresh after that. Pull-to-refresh re-runs against the last 24h Analytics Engine
          window.
        </Banner>
        <Banner intent="accent" title="New SDK key created">
          Copy it now — it won&apos;t be shown again. Store it in your secret manager.
        </Banner>
        <Banner
          intent="warn"
          title="Underpowered"
          action={
            <Button size="sm" variant="outline">
              Extend run
            </Button>
          }
        >
          Sample size has &lt; 60% power to detect a 1pp lift.
        </Banner>
        <Banner
          intent="danger"
          title="Couldn't create key"
          action={
            <Button size="sm" variant="destructive">
              Retry
            </Button>
          }
        >
          rate limit exceeded — try again in 60s.
        </Banner>
      </div>
    </Section>
  );
}

function TabsSection() {
  return (
    <Section
      id="tabs"
      num="16 · Components"
      title="Tabs"
      sub="Underline tabs (Base UI). Used by experiments status filter, configs envs, settings sub-nav."
    >
      <Tabs defaultValue="snippet">
        <TabsList>
          <TabsTrigger value="snippet">TypeScript</TabsTrigger>
          <TabsTrigger value="py">Python</TabsTrigger>
          <TabsTrigger value="go">Go</TabsTrigger>
          <TabsTrigger value="curl">cURL</TabsTrigger>
        </TabsList>
        <TabsContent value="snippet">
          <CodeBlock language="ts">{`import { shipeasy } from "@shipeasy/sdk/client";\nawait shipeasy.gate("checkout_v3");`}</CodeBlock>
        </TabsContent>
        <TabsContent value="py">
          <CodeBlock language="python">{`from shipeasy import Shipeasy\nshipeasy = Shipeasy(api_key=os.getenv("SHIPEASY_KEY"))\nshipeasy.gate("checkout_v3")`}</CodeBlock>
        </TabsContent>
        <TabsContent value="go">
          <CodeBlock language="go">{`client := shipeasy.New(os.Getenv("SHIPEASY_KEY"))\nclient.Gate(ctx, "checkout_v3")`}</CodeBlock>
        </TabsContent>
        <TabsContent value="curl">
          <CodeBlock language="bash">{`curl https://api.shipeasy.ai/sdk/flags -H "Authorization: Bearer $KEY"`}</CodeBlock>
        </TabsContent>
      </Tabs>
    </Section>
  );
}

function StepperSection() {
  const [current, setCurrent] = React.useState(1);
  const steps = [
    { id: "details", label: "Details" },
    { id: "targeting", label: "Targeting" },
    { id: "preview", label: "Preview" },
    { id: "integrate", label: "Integrate" },
  ];
  return (
    <Section
      id="stepper"
      num="17 · Components"
      title="Stepper"
      sub="Horizontal stepper inside BigModalWizard head. Done / active / todo states + optional jump-back."
    >
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5">
        <Stepper steps={steps} current={current} onSelect={setCurrent} />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          >
            Back
          </Button>
          <Button
            size="sm"
            disabled={current === steps.length - 1}
            onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          >
            Next
          </Button>
          <span className="ml-2 font-mono text-[11px] text-[var(--se-fg-4)]">
            Step {current + 1} of {steps.length}
          </span>
        </div>
      </div>
    </Section>
  );
}

function ComboboxSection() {
  const [universe, setUniverse] = React.useState<string | null>("default");
  return (
    <Section
      id="combobox"
      num="18 · Forms"
      title="Combobox"
      sub="Searchable select (Base UI). Replaces every bare <select>. Generic over value type."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="With icons + descriptions">
          <Combobox
            value={universe}
            onValueChange={setUniverse}
            placeholder="Pick a universe…"
            options={[
              {
                value: "default",
                label: "default",
                icon: <Beaker className="size-3.5" />,
                description: "shared traffic pool",
              },
              {
                value: "checkout",
                label: "checkout",
                icon: <Flag className="size-3.5" />,
                description: "logged-in shoppers only",
              },
              {
                value: "anon",
                label: "anonymous",
                icon: <Shield className="size-3.5" />,
                description: "no auth required",
              },
              { value: "internal", label: "internal", description: "QA staff", disabled: true },
            ]}
          />
          <p className="font-mono text-[11px] text-[var(--se-fg-4)]">Value: {universe ?? "—"}</p>
        </Demo>
        <Demo title="Small">
          <Combobox
            size="sm"
            value="prod"
            onValueChange={() => undefined}
            options={[
              { value: "dev", label: "dev" },
              { value: "staging", label: "staging" },
              { value: "prod", label: "prod" },
            ]}
          />
        </Demo>
      </div>
    </Section>
  );
}

function PopoverSection() {
  return (
    <Section
      id="popover"
      num="19 · Components"
      title="Popover"
      sub="Anchored floating panel. Use for inline help, key-rotation prompts, integration snippets."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger render={<Button size="sm" variant="outline" />}>
            What&apos;s this?
          </PopoverTrigger>
          <PopoverContent align="start">
            <div className="flex w-[280px] flex-col gap-2 p-3">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
                Stack ordering
              </div>
              <p className="text-[12.5px] text-[var(--se-fg-2)]">
                Higher entries override lower ones. Public rollout always sits at the bottom.
              </p>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger render={<Button size="sm" variant="ghost" />}>End align</PopoverTrigger>
          <PopoverContent align="end">
            <div className="p-3 text-[12.5px]">Aligned to the trigger&apos;s right edge.</div>
          </PopoverContent>
        </Popover>
      </div>
    </Section>
  );
}

function SkeletonSection() {
  return (
    <Section
      id="skeleton"
      num="20 · Components"
      title="Skeleton"
      sub="Shimmer block. Used by every UnifiedList loading state and embedded editor while SWR resolves."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Row">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </Demo>
        <Demo title="Card">
          <Skeleton className="h-32 w-full rounded-[var(--radius-md)]" />
        </Demo>
      </div>
    </Section>
  );
}

function ProgressSection() {
  return (
    <Section
      id="progress"
      num="21 · Components"
      title="Progress & holdout bars"
      sub="Thin allocation bar (variant splits) + dual-band overlay (variant + holdout)."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Demo title="Progress (5 intents)">
          <div className="flex flex-col gap-2">
            <ProgressBar value={62} intent="accent" />
            <ProgressBar value={88} intent="info" />
            <ProgressBar value={34} intent="warn" striped />
            <ProgressBar value={12} intent="danger" />
            <ProgressBar value={50} intent="neutral" />
          </div>
        </Demo>
        <Demo title="Holdout bar">
          <HoldoutBar allocation={80} holdout={5} />
          <p className="font-mono text-[11px] text-[var(--se-fg-4)]">80% allocated · 5% holdout</p>
        </Demo>
      </div>
    </Section>
  );
}

function NumericDeltaSection() {
  return (
    <Section
      id="delta"
      num="22 · Components"
      title="Numeric delta"
      sub="▲ / ▼ chip with tabular numerals. Pass invert when down is good (errors, latency)."
    >
      <div className="flex flex-wrap items-center gap-3">
        <NumericDelta value={12.4} suffix="%" />
        <NumericDelta value={-4.1} suffix="%" />
        <NumericDelta value={0} suffix="%" />
        <NumericDelta value={-8.2} suffix="%" invert />
        <NumericDelta value={31} suffix="ms" invert />
        <NumericDelta value={3.1} suffix="pp" />
      </div>
    </Section>
  );
}

function SparklineSection() {
  const up = [4, 5, 6, 5, 7, 8, 7, 9, 10, 12];
  const down = [12, 10, 11, 9, 8, 7, 6, 5, 5, 4];
  const flat = [6, 6, 7, 6, 7, 7, 6, 6, 7, 6];
  return (
    <Section
      id="sparkline"
      num="23 · Components"
      title="Sparkline"
      sub="Inline SVG polyline + area fill. Drives metrics rows + dashboard cards."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Demo title="Up · accent">
          <Sparkline points={up} intent="accent" filled />
        </Demo>
        <Demo title="Down · danger">
          <Sparkline points={down} intent="danger" filled />
        </Demo>
        <Demo title="Flat · neutral, line only">
          <Sparkline points={flat} intent="neutral" />
        </Demo>
      </div>
    </Section>
  );
}

function EnvTabsSection() {
  const [env, setEnv] = React.useState("prod");
  return (
    <Section
      id="envtabs"
      num="24 · Components"
      title="Env tabs"
      sub="prod / staging / dev environment switch on configs + killswitches."
    >
      <EnvTabs value={env} onValueChange={setEnv} />
      <p className="mt-3 font-mono text-[11px] text-[var(--se-fg-4)]">Active env: {env}</p>
    </Section>
  );
}

function TableSection() {
  return (
    <Section
      id="table"
      num="25 · Components"
      title="Table"
      sub="Sticky thead, mono uppercase headers (10.5px caps), 48–52px row, accent left-border on active row."
    >
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Status</TH>
            <TH>Traffic</TH>
            <TH className="text-right">Updated</TH>
          </TR>
        </THead>
        <TBody>
          <TR interactive>
            <TD>checkout_v3</TD>
            <TD>
              <StatusBadge tone="live" pulse>
                Live
              </StatusBadge>
            </TD>
            <TD>50%</TD>
            <TD className="text-right font-mono text-[11px] text-[var(--se-fg-3)]">2m ago</TD>
          </TR>
          <TR interactive active>
            <TD>onboarding_quiz</TD>
            <TD>
              <StatusBadge tone="paused">Paused</StatusBadge>
            </TD>
            <TD>25%</TD>
            <TD className="text-right font-mono text-[11px] text-[var(--se-fg-3)]">1h ago</TD>
          </TR>
          <TR interactive>
            <TD>signup_button_color</TD>
            <TD>
              <StatusBadge tone="completed">Completed</StatusBadge>
            </TD>
            <TD>100%</TD>
            <TD className="text-right font-mono text-[11px] text-[var(--se-fg-3)]">3d ago</TD>
          </TR>
        </TBody>
      </Table>
    </Section>
  );
}

function FieldArraySection() {
  const [rows, setRows] = React.useState([
    { name: "control", weight: 50 },
    { name: "treatment", weight: 50 },
  ]);
  return (
    <Section
      id="fieldarray"
      num="26 · Forms"
      title="Field array"
      sub="Drag handle / content / remove row container. Used by rules / variants / metrics lists in wizards."
    >
      <FieldArray>
        {rows.map((r, i) => (
          <FieldArrayRow
            key={i}
            draggable
            onRemove={
              rows.length > 2
                ? () => setRows((cur) => cur.filter((_, idx) => idx !== i))
                : undefined
            }
          >
            <div className="flex flex-1 items-center gap-3">
              <Input
                value={r.name}
                onChange={(e) =>
                  setRows((cur) =>
                    cur.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)),
                  )
                }
                className="max-w-[200px]"
              />
              <Slider
                value={r.weight}
                onValueChange={(v) =>
                  setRows((cur) =>
                    cur.map((row, idx) =>
                      idx === i ? { ...row, weight: typeof v === "number" ? v : (v[0] ?? 0) } : row,
                    ),
                  )
                }
                min={0}
                max={100}
                className="flex-1"
              />
              <span className="w-12 text-right font-mono text-[12px]">{r.weight}%</span>
            </div>
          </FieldArrayRow>
        ))}
        <FieldArrayAdd
          onClick={() => setRows((cur) => [...cur, { name: `variant_${cur.length}`, weight: 0 }])}
        >
          Add variant
        </FieldArrayAdd>
      </FieldArray>
    </Section>
  );
}

function DrawerSection() {
  const [open, setOpen] = React.useState(false);
  return (
    <Section
      id="drawer"
      num="27 · Components"
      title="Drawer"
      sub="Slide-in panel for record open-state. side=right|left|top|bottom."
    >
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
        <DrawerContent side="right" className="w-[440px]">
          <DrawerHeader>
            <DrawerTitle>Edit experiment</DrawerTitle>
            <DrawerDescription>
              Inline edit surface — same Server Action as the full editor.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input defaultValue="checkout_v3" />
            </Field>
            <Field>
              <FieldLabel>Hypothesis</FieldLabel>
              <Textarea defaultValue="Single-page checkout reduces abandonment." />
            </Field>
          </div>
          <DrawerFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Section>
  );
}

type DemoRow = {
  id: string;
  name: string;
  status: "live" | "paused" | "completed";
  rollout: number;
  updated: string;
};

function UnifiedListSection() {
  const items: DemoRow[] = [
    { id: "g1", name: "checkout_v3", status: "live", rollout: 50, updated: "2m ago" },
    { id: "g2", name: "onboarding_quiz", status: "paused", rollout: 25, updated: "1h ago" },
    { id: "g3", name: "signup_button", status: "completed", rollout: 100, updated: "3d ago" },
    { id: "g4", name: "search_v2", status: "live", rollout: 10, updated: "5m ago" },
  ];
  const [selected, setSelected] = React.useState<string | null>(null);
  const columns: UnifiedListColumn<DemoRow>[] = [
    {
      key: "name",
      label: "Gate",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Shield className="size-3.5 text-[var(--se-fg-3)]" />
          {r.name}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge
          tone={r.status === "live" ? "live" : r.status === "paused" ? "paused" : "completed"}
          pulse={r.status === "live"}
        >
          {r.status}
        </StatusBadge>
      ),
    },
    {
      key: "rollout",
      label: "Rollout",
      render: (r) => (
        <div className="w-32">
          <ProgressBar value={r.rollout} intent="accent" />
        </div>
      ),
    },
    {
      key: "updated",
      label: "Updated",
      render: (r) => (
        <span className="font-mono text-[11px] text-[var(--se-fg-3)]">{r.updated}</span>
      ),
    },
  ];
  return (
    <Section
      id="unifiedlist"
      num="28 · Shells"
      title="UnifiedList"
      sub="Closed table → fold-to-280px-rail + center detail pane. ESC closes. Click a row to expand."
    >
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <UnifiedList<DemoRow>
          items={items}
          getId={(r) => r.id}
          columns={columns}
          selectedId={selected}
          onSelect={setSelected}
          renderRail={(r, active) => (
            <div
              className={cn(
                "flex items-center gap-2 text-[12.5px]",
                active && "text-[var(--se-fg)]",
              )}
            >
              <Shield className="size-3.5" />
              <span className="truncate">{r.name}</span>
            </div>
          )}
          renderDetail={(r) => (
            <div className="flex flex-col gap-4 p-6">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--se-fg-4)]">
                Gate · {r.id}
              </div>
              <h3 className="m-0 text-[24px] font-medium tracking-[-0.02em]">{r.name}</h3>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Rollout" value={`${r.rollout}%`} />
                <Stat label="Status" value={r.status} />
                <Stat label="Updated" value={r.updated} />
              </div>
              <ProgressBar value={r.rollout} intent="accent" />
            </div>
          )}
          minHeight={420}
        />
      </div>
    </Section>
  );
}

function BigModalWizardSection() {
  const kinds: WizardKind[] = ["gates", "configs", "killswitches", "metrics", "experiments"];
  const labels: Record<WizardKind, { icon: React.ReactNode; title: string }> = {
    gates: { icon: <Shield />, title: "New gate" },
    configs: { icon: <SlidersHorizontal />, title: "New config" },
    killswitches: { icon: <Power />, title: "New killswitch" },
    metrics: { icon: <Gauge />, title: "Track an event" },
    experiments: { icon: <Beaker />, title: "New experiment" },
  };
  const [openKind, setOpenKind] = React.useState<WizardKind | null>(null);
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    if (openKind === null) {
      setStep(0);
      setName("");
    }
  }, [openKind]);

  const steps: WizardStep[] = [
    {
      id: "details",
      label: "Details",
      content: (
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel required>Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="lowercase_underscores"
            />
            <FieldHint>≤ 60 chars · lowercase, underscores, hyphens.</FieldHint>
          </Field>
        </div>
      ),
      aside: (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--se-fg-4)]">
            Step preview
          </div>
          <p className="text-[12.5px] text-[var(--se-fg-2)]">
            Name your record. The remaining steps cover targeting, preview, and integration
            snippets.
          </p>
        </div>
      ),
      isValid: () => /^[a-z0-9][a-z0-9_-]{0,59}$/.test(name),
    },
    {
      id: "targeting",
      label: "Targeting",
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--se-fg-2)]">
            Targeting step (rules / audience builders live here).
          </p>
          <ProgressBar value={50} intent="accent" />
        </div>
      ),
    },
    {
      id: "preview",
      label: "Preview",
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--se-fg-2)]">
            Read-back of the record before publish.
          </p>
          <Card>
            <CardContent className="grid grid-cols-3 gap-4 p-5">
              <Stat label="Name" value={name || "—"} />
              <Stat label="Rollout" value="0%" />
              <Stat label="State" value="Paused" />
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "integrate",
      label: "Integrate",
      content: (
        <Tabs defaultValue="ts">
          <TabsList>
            <TabsTrigger value="ts">TypeScript</TabsTrigger>
            <TabsTrigger value="py">Python</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>
          <TabsContent value="ts">
            <CodeBlock language="ts">{`await shipeasy.gate("${name || "your_key"}");`}</CodeBlock>
          </TabsContent>
          <TabsContent value="py">
            <CodeBlock language="python">{`shipeasy.gate("${name || "your_key"}")`}</CodeBlock>
          </TabsContent>
          <TabsContent value="curl">
            <CodeBlock language="bash">{`curl https://api.shipeasy.ai/sdk/gates/${name || "your_key"}`}</CodeBlock>
          </TabsContent>
        </Tabs>
      ),
    },
  ];

  return (
    <Section
      id="bigmodal"
      num="29 · Shells"
      title="BigModalWizard"
      sub="Eyebrow + stepper + 2-col body w/ aside + sticky footer. Five kinds — colored icon badge."
    >
      <div className="flex flex-wrap items-center gap-2">
        {kinds.map((k) => (
          <Button key={k} variant="outline" onClick={() => setOpenKind(k)}>
            {labels[k].icon}
            {labels[k].title}
          </Button>
        ))}
      </div>
      {openKind ? (
        <BigModalWizard
          open
          onOpenChange={(o) => {
            if (!o) setOpenKind(null);
          }}
          kind={openKind}
          title={labels[openKind].title}
          eyebrow={{ project: "shipeasy-demo", area: openKind }}
          steps={steps}
          current={step}
          onStepChange={setStep}
          onSubmit={() => setOpenKind(null)}
          submitLabel="Create"
        />
      ) : null}
    </Section>
  );
}
