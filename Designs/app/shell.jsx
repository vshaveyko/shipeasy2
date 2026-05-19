// Shared AppShell for Shipeasy mockup screens.

const SHIPEASY_PROJECTS = [
  { k: "web", mark: "W", name: "acme-web", env: "prod", color: "#22a06b", exps: 8, evals: "14.3M" },
  {
    k: "ios",
    mark: "iOS",
    name: "acme-ios",
    env: "prod",
    color: "#3b82f6",
    exps: 5,
    evals: "8.1M",
  },
  {
    k: "android",
    mark: "A",
    name: "acme-android",
    env: "prod",
    color: "#a78bfa",
    exps: 4,
    evals: "6.4M",
  },
  {
    k: "api",
    mark: "API",
    name: "acme-api",
    env: "prod",
    color: "#f5a623",
    exps: 3,
    evals: "42.0M",
  },
  {
    k: "sandbox",
    mark: "SB",
    name: "sandbox",
    env: "dev",
    color: "#ec4899",
    exps: 2,
    evals: "12k",
  },
  {
    k: "partner",
    mark: "PT",
    name: "partner-portal",
    env: "prod",
    color: "#06b6d4",
    exps: 1,
    evals: "140k",
  },
];

function getCurrentProject() {
  try {
    const k = localStorage.getItem("shipeasy.currentProject") || "web";
    return SHIPEASY_PROJECTS.find((p) => p.k === k) || SHIPEASY_PROJECTS[0];
  } catch {
    return SHIPEASY_PROJECTS[0];
  }
}
function setCurrentProject(k) {
  try {
    localStorage.setItem("shipeasy.currentProject", k);
  } catch {}
}

function Logo() {
  return (
    <div className="sb-brand">
      <div className="mark" />
      <span>Shipeasy</span>
      <span className="badge" style={{ marginLeft: "auto", fontSize: 9.5, padding: "1px 6px" }}>
        v0.9
      </span>
    </div>
  );
}

function navTo(href) {
  return () => {
    if (href) location.href = href;
  };
}

function ProjectSwitcherPopover({ current, onPick, onCreate, onClose }) {
  const [q, setQ] = React.useState("");
  const filtered = SHIPEASY_PROJECTS.filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 62,
          width: 300,
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 20px 48px -16px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4)",
          overflow: "hidden",
          zIndex: 50,
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
          <div className="input" style={{ height: 30 }}>
            <IconSearch size={11} style={{ color: "var(--fg-3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Switch project…"
              autoFocus
            />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-4)" }}>
              ⌘K
            </span>
          </div>
        </div>
        <div
          style={{
            padding: "8px 12px 4px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--fg-4)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          Your projects
        </div>
        <div style={{ maxHeight: 280, overflow: "auto", padding: "2px 0" }}>
          {filtered.map((p) => {
            const active = current.k === p.k;
            return (
              <div
                key={p.k}
                onClick={() => onPick(p)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 12px",
                  cursor: "default",
                  background: active
                    ? "color-mix(in oklab, var(--accent) 8%, transparent)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-2)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "var(--bg-2)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    border: "1px solid var(--line-2)",
                    color: p.color,
                    flexShrink: 0,
                  }}
                >
                  {p.mark}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    {p.name}
                    <span className="t-mono-xs" style={{ color: "var(--fg-4)" }}>
                      · {p.env}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--fg-3)",
                      fontFamily: "var(--mono)",
                      marginTop: 1,
                    }}
                  >
                    {p.exps} active · {p.evals}/day
                  </div>
                </div>
                {active && <IconCheck size={12} style={{ color: "var(--accent)" }} />}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "14px 12px",
                fontSize: 12,
                color: "var(--fg-4)",
                textAlign: "center",
              }}
            >
              No projects match "{q}"
            </div>
          )}
        </div>
        <div style={{ padding: 6, borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
          <div
            onClick={onCreate}
            style={{
              padding: "7px 9px",
              fontSize: 12,
              color: "var(--fg-2)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              borderRadius: "var(--r-sm)",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-3)";
              e.currentTarget.style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--fg-2)";
            }}
          >
            <IconPlus size={11} /> New project
          </div>
          <a
            href="projects.html"
            style={{
              textDecoration: "none",
              color: "var(--fg-2)",
              padding: "7px 9px",
              fontSize: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
              borderRadius: "var(--r-sm)",
              cursor: "default",
            }}
          >
            <IconLayers size={11} /> Browse all projects
          </a>
        </div>
      </div>
    </>
  );
}

function Sidebar({ active }) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [current, setCurrentState] = React.useState(getCurrentProject());

  const items = [
    {
      section: null,
      children: [
        { k: "home", label: "Home", icon: <IconHome size={14} />, count: null, href: "home.html" },
        {
          k: "experiments",
          label: "Experiments",
          icon: <IconFlask size={14} />,
          count: 24,
          href: "experiments-list.html",
        },
        {
          k: "gates",
          label: "Gates",
          icon: <IconShield size={14} />,
          count: 12,
          href: "gates-list.html",
        },
        {
          k: "killswitches",
          label: "Killswitches",
          icon: <IconPower size={14} />,
          count: 8,
          href: "killswitches.html",
        },
        {
          k: "configs",
          label: "Configs",
          icon: <IconSliders size={14} />,
          count: 41,
          href: "configs.html",
        },
        {
          k: "metrics",
          label: "Metrics",
          icon: <IconChart size={14} />,
          count: null,
          href: "metrics-list.html",
        },
      ],
    },
    {
      section: "Connect",
      children: [
        {
          k: "apikeys",
          label: "API keys",
          icon: <IconKey size={14} />,
          count: null,
          href: "api-keys.html",
        },
        { k: "mcp", label: "MCP & Claude", icon: <IconPlug size={14} />, count: null, href: null },
        { k: "sdk", label: "SDK", icon: <IconCode size={14} />, count: null, href: null },
        { k: "events", label: "Events", icon: <IconDatabase size={14} />, count: null, href: null },
      ],
    },
    {
      section: "Workspace",
      children: [
        { k: "team", label: "Team", icon: <IconUsers size={14} />, count: null, href: "team.html" },
        {
          k: "settings",
          label: "Settings",
          icon: <IconSettings size={14} />,
          count: null,
          href: "settings.html",
        },
      ],
    },
  ];
  return (
    <aside className="sidebar" style={{ position: "relative" }}>
      <Logo />
      {items.map((g, i) => (
        <React.Fragment key={i}>
          {g.section && <div className="sb-group">{g.section}</div>}
          {g.children.map((it) => (
            <a
              key={it.k}
              href={it.href || undefined}
              className={`sb-item ${active === it.k ? "active" : ""}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: it.href ? "pointer" : "default",
              }}
            >
              {it.icon}
              <span>{it.label}</span>
              {it.count != null && <span className="count">{it.count}</span>}
            </a>
          ))}
        </React.Fragment>
      ))}
      <div style={{ flex: 1 }} />

      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "10px 9px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 8,
          cursor: "default",
          background: open ? "var(--bg-2)" : "transparent",
          borderRadius: open ? "var(--r-md) var(--r-md) 0 0" : 0,
        }}
      >
        <div
          className="avatar-sm"
          style={{
            background: current.color,
            color: "#07120d",
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            fontWeight: 700,
          }}
        >
          {current.mark}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{current.name}</div>
          <div className="t-mono-xs dim-2">
            {current.env} · {current.evals}/day
          </div>
        </div>
        <IconChevronDown
          size={13}
          style={{
            color: "var(--fg-3)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </div>

      {open && (
        <ProjectSwitcherPopover
          current={current}
          onPick={(p) => {
            setCurrentProject(p.k);
            setCurrentState(p);
            setOpen(false);
          }}
          onCreate={() => {
            setOpen(false);
            setCreating(true);
          }}
          onClose={() => setOpen(false)}
        />
      )}

      {creating && <window.CreateProjectModal onClose={() => setCreating(false)} />}
    </aside>
  );
}

function Topbar({ crumbs, actions }) {
  const cur = getCurrentProject();
  // Inject the project name as the second crumb if not already present
  const fullCrumbs =
    crumbs && crumbs.length > 0 && crumbs[1] !== cur.name
      ? [crumbs[0], cur.name, ...crumbs.slice(1)]
      : crumbs;
  return (
    <div className="topbar">
      <div className="crumbs" style={{ flexShrink: 0, minWidth: 0, whiteSpace: "nowrap" }}>
        {fullCrumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {i === 1 && c === cur.name ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  borderRadius: "var(--r-sm)",
                  whiteSpace: "nowrap",
                  background: "var(--bg-3)",
                  border: "1px solid var(--line)",
                  color: "var(--fg)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: cur.color }} />
                {c}
              </span>
            ) : (
              <span
                className={i === fullCrumbs.length - 1 ? "cur" : ""}
                style={{ whiteSpace: "nowrap" }}
              >
                {c}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="input" style={{ width: 220, background: "transparent" }}>
          <IconSearch size={12} style={{ color: "var(--fg-3)" }} />
          <input placeholder="Search or ask Claude…" />
          <span className="kbd">⌘ K</span>
        </div>
        {actions}
        <button className="btn btn-ghost btn-icon">
          <IconBell size={14} />
        </button>
      </div>
    </div>
  );
}

function PageNav() {
  return null;
}

Object.assign(window, {
  Logo,
  Sidebar,
  Topbar,
  PageNav,
  navTo,
  SHIPEASY_PROJECTS,
  getCurrentProject,
  setCurrentProject,
});
