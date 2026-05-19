import type { Metadata } from "next";
import { AlertTriangle, BookOpen, Code2, KeyRound, RefreshCw, Shield, Zap } from "lucide-react";
import { auth } from "@/auth";
import { listAllKeys } from "@/lib/handlers/keys";

export const metadata: Metadata = { title: "SDK Keys" };
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Label } from "@/components/ui/label";
import { createKeyAction } from "./actions";
import { consumeKeyErrorCookie, consumeNewKeyCookie } from "./new-key-cookie";
import { CopyKeyButton } from "./copy-key-button";
import { RevokeKeyButton } from "./revoke-key-button";

const KEY_TYPES = [
  {
    type: "server",
    label: "Server",
    accent: "var(--se-accent)",
    description:
      "Full read of flags + experiments. Use from trusted backends only; never ship in a browser bundle.",
  },
  {
    type: "client",
    label: "Client",
    accent: "var(--se-info)",
    description:
      "Evaluate-only. Safe to include in web/mobile apps; used by /sdk/evaluate and /collect.",
  },
  {
    type: "admin",
    label: "Admin",
    accent: "var(--se-purple)",
    description:
      "Scoped to admin REST endpoints (CLI). Generated once, shown once; rotate on suspicion.",
  },
];

const GRID_COLS = "20px minmax(0,1fr) 90px 120px 130px 110px 70px";

function shortDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function typeAccent(t: string) {
  return KEY_TYPES.find((k) => k.type === t)?.accent ?? "var(--se-fg-3)";
}

export default async function KeysPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const session = await auth();
  const projectId = session?.user?.project_id;
  const { projectId: routeProjectId } = await params;
  const { show } = await searchParams;
  const new_key = await consumeNewKeyCookie();
  const new_key_error = await consumeKeyErrorCookie();
  const showRevoked = show === "revoked";

  let keys: Awaited<ReturnType<typeof listAllKeys>> = [];
  if (projectId) {
    try {
      keys = await listAllKeys({
        projectId,
        actorEmail: session?.user?.email ?? "unknown",
        source: "jwt",
      });
    } catch {
      // DB not available in dev without wrangler
    }
  }

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);
  const byType = (t: string) => activeKeys.filter((k) => k.type === t).length;

  const visibleKeys = (showRevoked ? [...activeKeys, ...revokedKeys] : activeKeys).sort((a, b) => {
    const aRevoked = a.revoked_at ? 1 : 0;
    const bRevoked = b.revoked_at ? 1 : 0;
    if (aRevoked !== bRevoked) return aRevoked - bRevoked;
    return Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "");
  });

  if (keys.length === 0 && !new_key) {
    return (
      <Page>
        <PageHeader
          title="SDK Keys"
          description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
        />
        <PageBody>
          <HeroEmptyState
            kind="keys"
            extraAction={
              <form action={createKeyAction}>
                <input type="hidden" name="type" value="server" />
                <Button size="lg" type="submit" className="h-10 px-4 text-[14px]">
                  <Zap className="size-3.5" /> Create your first key
                </Button>
              </form>
            }
          />
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        kicker={
          <span>
            {activeKeys.length} active
            {revokedKeys.length ? ` · ${revokedKeys.length} revoked` : ""} · shown once at
            create-time
          </span>
        }
        title="SDK Keys"
        description="Keys authenticate SDKs against your project. We show raw tokens once — store them securely."
        actions={
          <>
            <div className="flex h-9 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3">
              <Stat label="Server" value={byType("server")} />
              <span className="h-4 w-px bg-[var(--se-line)]" />
              <Stat label="Client" value={byType("client")} />
              <span className="h-4 w-px bg-[var(--se-line)]" />
              <Stat label="Admin" value={byType("admin")} accent />
            </div>
            <LinkButton
              href="https://docs.shipeasy.ai/quickstart"
              size="sm"
              variant="secondary"
              className="hidden gap-1.5 md:inline-flex"
            >
              <BookOpen className="size-3" /> SDK docs
            </LinkButton>
          </>
        }
      />
      <PageBody className="space-y-6">
        {new_key_error && (
          <Banner intent="danger" title="Couldn't create key">
            {new_key_error}
          </Banner>
        )}
        {new_key && (
          <Banner intent="accent" title="New key created · copy it now, you won't see it again">
            <div className="mt-1 space-y-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--se-line)] bg-[var(--se-bg)] px-3 py-2">
                <code className="t-mono flex-1 overflow-x-auto text-[13px] text-[var(--se-fg)]">
                  {new_key}
                </code>
                <CopyKeyButton value={new_key} />
              </div>
              <div className="flex items-start gap-2 text-[12px] text-[var(--se-warn)]">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                <span>
                  Store this in a secret manager. Anyone with this key can read flags, experiments,
                  and (for server keys) user props.
                </span>
              </div>
            </div>
          </Banner>
        )}

        <div
          className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]"
          id="create-key"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-medium">All keys</div>
              <span className="t-mono-xs dim-2">
                {activeKeys.length} active
                {revokedKeys.length > 0 ? ` · ${revokedKeys.length} revoked` : ""}
              </span>
            </div>
            {revokedKeys.length > 0 && (
              <a
                href={
                  showRevoked
                    ? `/dashboard/${routeProjectId}/keys`
                    : `/dashboard/${routeProjectId}/keys?show=revoked`
                }
                className="t-mono-xs dim-2 hover:text-[var(--se-fg)] hover:underline"
              >
                {showRevoked ? "Hide revoked" : "Show revoked"}
              </a>
            )}
            <form
              action={createKeyAction}
              className="ml-auto flex items-center gap-2"
              aria-label="Create key"
            >
              <Label
                htmlFor="key-type"
                className="t-caps dim-3 mb-0"
                style={{ letterSpacing: "0.08em" }}
              >
                Type
              </Label>
              <select
                id="key-type"
                name="type"
                className="h-8 rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 font-mono text-[12px] text-[var(--se-fg)] outline-none focus-visible:border-[var(--se-accent)]"
              >
                <option value="server">server</option>
                <option value="client">client</option>
                <option value="admin">admin</option>
              </select>
              <Button size="sm" type="submit" className="gap-1.5">
                <KeyRound className="size-3" /> Create key
              </Button>
            </form>
          </div>

          <div
            className="grid gap-3 border-b border-[var(--se-line)] px-4 py-2"
            style={{
              gridTemplateColumns: GRID_COLS,
              background: "var(--se-bg-2)",
            }}
          >
            <span />
            <span className="t-caps dim-3">Key</span>
            <span className="t-caps dim-3">Type</span>
            <span className="t-caps dim-3">Created</span>
            <span className="t-caps dim-3">Expires</span>
            <span className="t-caps dim-3">Status</span>
            <span />
          </div>

          {visibleKeys.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--se-fg-3)]">
              No active keys. Use the form above
              {revokedKeys.length > 0 ? (
                <>
                  {" "}
                  or{" "}
                  <a className="underline" href={`/dashboard/${routeProjectId}/keys?show=revoked`}>
                    show revoked
                  </a>
                </>
              ) : null}
              .
            </div>
          ) : (
            visibleKeys.map((key) => {
              const revoked = Boolean(key.revoked_at);
              const color = revoked ? "var(--se-fg-4)" : typeAccent(key.type);
              return (
                <div
                  key={key.id}
                  className={`grid items-center gap-3 border-b border-[var(--se-line)] px-4 py-3 transition-colors last:border-none hover:bg-[var(--se-bg-2)] ${revoked ? "opacity-60" : ""}`}
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <KeyRound className="size-3.5" style={{ color }} />
                  <div className="min-w-0">
                    <div
                      className="t-mono truncate text-[12.5px] font-medium"
                      style={{
                        color: revoked ? "var(--se-fg-3)" : "var(--se-fg)",
                        textDecoration: revoked ? "line-through" : "none",
                      }}
                      title={key.id}
                    >
                      {key.id}
                    </div>
                    {key.created_by_email && (
                      <div className="t-mono-xs dim-2 mt-0.5 truncate">
                        by {key.created_by_email}
                      </div>
                    )}
                  </div>
                  <span
                    className="se-badge"
                    style={{
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                      color,
                      borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
                    }}
                  >
                    {key.type}
                  </span>
                  <span className="t-mono-xs dim">{shortDate(key.created_at)}</span>
                  <span className="t-mono-xs dim">
                    {key.expires_at ? `expires ${shortDate(key.expires_at)}` : "never expires"}
                  </span>
                  <div className="flex justify-start">
                    {revoked ? (
                      <span className="se-badge se-badge-killed">
                        <span className="dot" />
                        revoked
                      </span>
                    ) : (
                      <span className="se-badge se-badge-live">
                        <span className="dot" />
                        active
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    {!revoked && <RevokeKeyButton id={key.id} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5 lg:col-span-2">
            <div className="t-caps dim-2 mb-3">Quick install</div>
            <pre className="se-json mb-3 whitespace-pre-wrap">
              <span className="c"># install</span>
              {"\n"}npm install @shipeasy/sdk{"\n\n"}
              <span className="c"># initialize</span>
              {"\n"}
              <span className="k">import</span>
              {" { shipeasy } "}
              <span className="k">from</span> <span className="s">{"'@shipeasy/sdk/server'"}</span>;
              {"\n\n"}
              <span className="k">await</span> <span className="b">shipeasy</span>
              {"({\n  apiKey: process.env."}
              <span className="s">SHIPEASY_SERVER_KEY</span>
              {",\n});"}
            </pre>
            <div className="flex gap-2">
              <LinkButton
                href="https://docs.shipeasy.ai/quickstart"
                size="sm"
                variant="ghost"
                className="gap-1.5"
              >
                <BookOpen className="size-3" /> All SDKs
              </LinkButton>
              <LinkButton
                href="https://docs.shipeasy.ai/keys"
                size="sm"
                variant="ghost"
                className="gap-1.5"
              >
                <Code2 className="size-3" /> Key reference
              </LinkButton>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5">
            <div className="t-caps dim-2 mb-3">Security & rotation</div>
            <div className="flex flex-col gap-3">
              <Hint
                icon={<RefreshCw className="size-3.5" />}
                color="var(--se-accent)"
                title="Rotate on suspicion"
                body="Revoking is instant — caches drop the old key on next poll. Issue a new one, ship, then revoke."
              />
              <Hint
                icon={<AlertTriangle className="size-3.5" />}
                color="var(--se-warn)"
                title="Never commit keys"
                body="Store in your platform's secret manager. We hash keys at rest and show the raw token only once."
              />
              <Hint
                icon={<Shield className="size-3.5" />}
                color="var(--se-info)"
                title="Right key, right surface"
                body="Server keys belong on a backend. Use client keys in browsers and mobile bundles."
              />
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
          <div className="border-b border-[var(--se-line)] px-5 py-3">
            <div className="text-[14px] font-medium">Key types</div>
            <div className="t-mono-xs dim-2 mt-1">Scopes and where each type is safe to use.</div>
          </div>
          <div className="grid gap-px bg-[var(--se-line)] md:grid-cols-3">
            {KEY_TYPES.map((k) => (
              <div key={k.type} className="flex flex-col gap-3 bg-[var(--se-bg-1)] p-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-3.5" style={{ color: k.accent }} />
                  <span
                    className="se-badge"
                    style={{
                      background: `color-mix(in oklab, ${k.accent} 14%, transparent)`,
                      color: k.accent,
                      borderColor: `color-mix(in oklab, ${k.accent} 30%, transparent)`,
                    }}
                  >
                    {k.label}
                  </span>
                </div>
                <div className="text-[13px] leading-relaxed text-[var(--se-fg-2)]">
                  {k.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="t-caps dim-3">{label}</span>
      <span
        className="num text-[14px] font-medium"
        style={{ color: accent ? "var(--se-accent)" : "var(--se-fg)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Hint({
  icon,
  color,
  title,
  body,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span style={{ color }} className="mt-0.5">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--se-fg)]">{title}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-[var(--se-fg-3)]">{body}</div>
      </div>
    </div>
  );
}
