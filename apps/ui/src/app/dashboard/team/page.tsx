import { Clock, Search, Shield } from "lucide-react";
import { auth } from "@/auth";
import { listMembers } from "@/lib/handlers/members";
import { loadProject } from "@/lib/project";
import { HeroEmptyState } from "@/components/dashboard/hero-empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { InviteButton } from "./invite-button";
import { RoleSelect } from "./role-select";
import { RemoveMemberButton } from "./remove-member-button";

type Role = {
  key: "admin" | "editor" | "viewer";
  label: string;
  description: string;
  accent?: boolean;
};

const ROLES: Role[] = [
  {
    key: "admin",
    label: "Admin",
    accent: true,
    description: "Full control. Manage members, billing, API keys. Publish to production.",
  },
  {
    key: "editor",
    label: "Editor",
    description:
      "Create and edit experiments, gates, and configs. Promote to staging. Cannot publish to prod or invite members.",
  },
  {
    key: "viewer",
    label: "Viewer",
    description:
      "Read-only. See dashboards, metrics, and experiment results. Useful for stakeholders.",
  },
];

const COLORS = ["#7c5cff", "#22a06b", "#f5a623", "#3b82f6", "#ec4899", "#06b6d4"];

function colorFor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function initialFor(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

export default async function TeamPage() {
  const session = await auth();
  const sessionEmail = (session?.user?.email ?? "").toLowerCase();
  const sessionName = session?.user?.name ?? sessionEmail ?? null;
  const projectId = session?.user?.project_id;

  if (!projectId || !sessionEmail) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Invite people to collaborate on experiments, gates, configs, and metrics."
        />
        <HeroEmptyState kind="team" ctaLabel="Sign in to manage your team" ctaHref="/auth/signin" />
      </div>
    );
  }

  const identity = { projectId, actorEmail: sessionEmail, source: "jwt" as const };

  let project: Awaited<ReturnType<typeof loadProject>> | null = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  try {
    [project, members] = await Promise.all([loadProject(projectId), listMembers(identity)]);
  } catch {
    // DB unavailable in dev — fall through with empty list
  }

  const ownerEmail = (project?.ownerEmail ?? sessionEmail).toLowerCase();
  const isOwner = ownerEmail === sessionEmail;

  type RowMember = {
    id: string | null;
    email: string;
    name: string;
    role: "admin" | "editor" | "viewer";
    status: "active" | "pending" | "removed" | "owner";
    last: string;
    you: boolean;
    color: string;
  };

  const rows: RowMember[] = [];
  rows.push({
    id: null,
    email: ownerEmail,
    name: ownerEmail === sessionEmail ? (sessionName ?? ownerEmail) : ownerEmail,
    role: "admin",
    status: "owner",
    last: ownerEmail === sessionEmail ? "Just now" : "—",
    you: ownerEmail === sessionEmail,
    color: colorFor(ownerEmail),
  });
  for (const m of members) {
    rows.push({
      id: m.id,
      email: m.email,
      name: m.email,
      role: m.role,
      status: m.status,
      last: timeAgo(m.acceptedAt ?? m.invitedAt),
      you: m.email.toLowerCase() === sessionEmail,
      color: colorFor(m.email),
    });
  }

  const counts = {
    admin: rows.filter((r) => r.role === "admin" && r.status !== "removed").length,
    editor: rows.filter((r) => r.role === "editor" && r.status !== "removed").length,
    viewer: rows.filter((r) => r.role === "viewer" && r.status !== "removed").length,
  };
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const activeCount = rows.filter((r) => r.status === "active" || r.status === "owner").length;

  // First-run hero: just the owner, no members or pending invites yet.
  if (rows.length === 1 && rows[0]!.status === "owner") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Invite people to collaborate on experiments, gates, configs, and metrics. Workspace members can access every project."
          actions={
            <InviteButton
              disabledReason={isOwner ? undefined : "Only the workspace owner can invite members"}
            />
          }
        />
        <HeroEmptyState
          kind="team"
          ctaLabel="Invite your first teammate"
          extraAction={
            <InviteButton
              disabledReason={isOwner ? undefined : "Only the workspace owner can invite members"}
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${activeCount} member${activeCount === 1 ? "" : "s"} · ${pendingCount} pending invite${pendingCount === 1 ? "" : "s"}`}
        title="Team"
        description="Workspace members can access every project. Use roles to control who can publish to production. Per-project roles are coming soon."
        actions={
          <InviteButton
            disabledReason={isOwner ? undefined : "Only the workspace owner can invite members"}
          />
        }
      />

      <div className="flex items-center gap-3">
        <RoleStat label="Admin" v={counts.admin} />
        <Divider />
        <RoleStat label="Editor" v={counts.editor} />
        <Divider />
        <RoleStat label="Viewer" v={counts.viewer} />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
        <div className="flex items-center gap-3 border-b border-[var(--se-line)] px-4 py-3">
          <div className="text-[14px] font-medium">Members</div>
          <div className="ml-auto flex h-8 w-[240px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px]">
            <Search className="size-3 text-[var(--se-fg-3)]" />
            <input
              placeholder="Find by name or email"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--se-fg-4)]"
            />
          </div>
        </div>

        {rows.map((m) => (
          <div
            key={m.id ?? `owner-${m.email}`}
            className="grid items-center gap-3.5 border-b border-[var(--se-line)] px-4 py-3 last:border-0"
            style={{ gridTemplateColumns: "36px minmax(0,1fr) 140px 110px 130px 32px" }}
          >
            {m.status === "pending" ? (
              <div
                className="grid size-[34px] place-items-center rounded-full border border-dashed border-[var(--se-line-2)] bg-[var(--se-bg-3)]"
                aria-hidden
              >
                <Clock className="size-3.5 text-[var(--se-warn)]" />
              </div>
            ) : (
              <div
                className="grid size-[34px] place-items-center rounded-full font-mono text-[13px] font-semibold text-white"
                style={{ background: m.color }}
              >
                {initialFor(m.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <b className="truncate text-[13.5px]">{m.name}</b>
                {m.you ? <Tag tone="accent">you</Tag> : null}
                {m.status === "owner" ? <Tag tone="accent">owner</Tag> : null}
              </div>
              <div className="mt-0.5 t-mono-xs dim-2 truncate">{m.email}</div>
            </div>
            {m.status === "owner" || !m.id || !isOwner ? (
              <div className="text-[12px] capitalize text-[var(--se-fg-2)]">{m.role}</div>
            ) : (
              <RoleSelect id={m.id} role={m.role} />
            )}
            <div className="text-[13px] text-[var(--se-fg-2)]">{m.last}</div>
            {m.status === "pending" ? (
              <span className="se-badge se-badge-paused">
                <span className="dot" />
                PENDING
              </span>
            ) : (
              <span className="se-badge se-badge-live">
                <span className="dot" />
                ACTIVE
              </span>
            )}
            <div className="flex justify-end">
              {m.status === "owner" || m.you || !m.id || !isOwner ? (
                <span aria-hidden />
              ) : (
                <RemoveMemberButton id={m.id} email={m.email} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)] p-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <Shield className="size-3.5 text-[var(--se-accent)]" />
          <b className="text-[14px] font-medium">What each role can do</b>
        </div>
        <div className="grid gap-3.5 md:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.key}>
              <div
                className="t-caps mb-1.5"
                style={{ color: r.accent ? "var(--se-accent)" : "var(--se-fg-3)" }}
              >
                {r.label}
              </div>
              <p className="text-[13px] leading-[1.6] text-[var(--se-fg-2)]">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "accent" }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10.5px]"
      style={{
        fontFamily: "var(--se-mono)",
        background: tone === "accent" ? "var(--se-accent-soft)" : "var(--se-bg-3)",
        color: tone === "accent" ? "var(--se-accent)" : "var(--se-fg-2)",
        border:
          tone === "accent"
            ? "1px solid color-mix(in oklab, var(--se-accent) 30%, transparent)"
            : "1px solid var(--se-line-2)",
      }}
    >
      {children}
    </span>
  );
}

function RoleStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--se-line)] bg-[var(--se-bg-1)] px-3.5 py-2">
      <div className="t-caps dim-3 text-[10px]">{label}</div>
      <div className="font-mono text-[16px] font-medium tabular-nums">{v}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-[var(--se-line)]" aria-hidden />;
}
