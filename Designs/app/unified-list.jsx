// ── Unified list-of-records · layout primitives ───────────────────
//
// Drop into any feature list page. Pair with unified-list.css.
// Every feature uses the SAME primitives → identical layout, animation
// timings, focus behavior, URL param wiring. Differences live in the
// feature's data, row markup, and Detail component only.
//
// Usage:
//   const u = useUnifiedList({ records, getId: r => r.id });
//   <UnifiedListShell
//     sidebarActive="experiments"
//     topbarCrumbs={u.crumbs(['Acme Co.','Experiments'])}
//     topbarActions={<>...</>}
//     {...u}
//     closedHead={<ClosedHead/>}    // page-head + tabs + filter-row
//     openHead={<OpenHead/>}        // local hero (back + name + actions)
//     fullTable={<MyTable/>}        // closed-state table
//     railRows={<MyRailRows/>}      // open-state rail rows
//     detail={<MyDetail/>}          // open-state center pane
//     paginate={<Foot/>}            // closed-only
//   />

const _u = { useState: React.useState, useEffect: React.useEffect };

// ── Shared sparkline ─────────────────────────────────────────────
function ULSpark({ data, color = "var(--accent)", neg = false, h = 22, w = 92 }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={neg ? "var(--danger)" : color}
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Big chart for detail-pane cards ───────────────────────────────
function ULBigChart({ data, neg = false, alert = false, h = 200, w = 760 }) {
  if (!data || !data.length) return null;
  const pad = 12;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const stroke = alert ? "var(--danger)" : neg ? "var(--warn)" : "var(--accent)";
  // Unique gradient id per instance so multiple charts on a page don't collide.
  const gid = React.useMemo(() => "ulg" + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={w - pad}
          y1={pad + t * (h - pad * 2)}
          y2={pad + t * (h - pad * 2)}
          stroke="var(--line)"
          strokeWidth="0.5"
        />
      ))}
      <polygon points={fill} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.2 : 0} fill={stroke} />
      ))}
    </svg>
  );
}

// ── Hook: open/close state + URL ?open=<id> + Esc + press-feedback ─
function useUnifiedList({ records, getId = (r) => r.id }) {
  const urlOpen = new URLSearchParams(location.search).get("open");
  const [openId, setOpenId] = _u.useState(urlOpen);
  const [pressing, setPressing] = _u.useState(null);
  const isOpen = openId !== null;
  const activeRow = isOpen ? records.find((r) => getId(r) === openId) : null;

  _u.useEffect(() => {
    document.body.classList.toggle("is-open", isOpen);
  }, [isOpen]);

  _u.useEffect(() => {
    if (!isOpen) return;
    const h = (e) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen]);

  function selectRow(id) {
    setPressing(id);
    setTimeout(() => {
      setOpenId(id);
      setPressing(null);
    }, 60);
  }
  function close() {
    setOpenId(null);
  }

  function crumbs(base) {
    return isOpen ? [...base, openId] : base;
  }

  return { openId, setOpenId, isOpen, activeRow, pressing, selectRow, close, crumbs };
}

// ── The shell: sidebar · topbar · head-cluster · split · paginate ─
function UnifiedListShell({
  sidebarActive,
  topbarCrumbs,
  topbarActions,
  isOpen,
  close,
  closedHead, // node — page-head + tabs + filter-row
  openHead, // node — local hero shown above the split when open
  fullTable, // node — closed-state table (rendered inside .pane-layer.full-table)
  railRows, // node — open-state rail rows (rendered inside .pane-layer.rail .rail-body)
  railTitle = "Records",
  railCount,
  detail, // node — open-state center pane content
  paginate, // node — closed-only footer
}) {
  return (
    <div className="app">
      <Sidebar active={sidebarActive} />
      <div>
        <Topbar crumbs={topbarCrumbs} actions={topbarActions} />
        <div className="page">
          {/* Closed-state head cluster — collapses on open */}
          <div className={`head-cluster ${isOpen ? "collapsed" : ""}`}>
            <div className="inner">{closedHead}</div>
          </div>

          {/* Open-state local hero */}
          {isOpen && openHead}

          {/* The split */}
          <div className={`split ${isOpen ? "open" : "closed"}`}>
            <div className="list-pane">
              {/* Layer A · full table */}
              <div className="pane-layer full-table">{fullTable}</div>

              {/* Layer B · rail */}
              <div className="pane-layer rail">
                <div className="rail-head">
                  <span>{railTitle}</span>
                  {railCount != null && (
                    <span
                      className="ml-auto"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9.5,
                        padding: "1px 5px",
                        background: "var(--bg-3)",
                        color: "var(--fg-3)",
                        borderRadius: 3,
                        border: "1px solid var(--line)",
                      }}
                    >
                      {railCount}
                    </span>
                  )}
                </div>
                <div className="rail-body">{railRows}</div>
              </div>
            </div>

            <div className="detail-pane">
              {isOpen && (
                <button className="pane-close" onClick={close} title="Show full table (Esc)">
                  <IconX size={13} />
                  <span className="kbd-hint">Show full table · Esc</span>
                </button>
              )}
              {detail}
            </div>
          </div>

          {!isOpen && paginate}
        </div>
      </div>
    </div>
  );
}

// ── Open-state local hero · the band above the split ─────────────
function ULOpenHead({ name, badges, meta, actions, onBack, backLabel = "Back" }) {
  return (
    <div className="open-head" style={{ opacity: 1, transform: "none" }}>
      <button className="open-back" onClick={onBack}>
        <IconChevronLeft size={12} /> {backLabel}
      </button>
      <span className="name">{name}</span>
      {badges}
      {meta && <span className="meta">{meta}</span>}
      {actions && <div className="ml-auto flex gap-2 items-center">{actions}</div>}
    </div>
  );
}

// ── Rail row — the collapsed identity-only row ────────────────────
function ULRailRow({ id, active, icon, name, right, onClick }) {
  return (
    <div className={`rail-row ${active ? "active" : ""}`} onClick={onClick}>
      <div className="ico">{icon}</div>
      <div className="nm">{name || id}</div>
      {right}
    </div>
  );
}

// ── Detail building blocks ────────────────────────────────────────
function ULDetailScroll({ children }) {
  return <div className="detail-scroll">{children}</div>;
}

function ULDetailHero({ eyebrow, title, desc, badges, right }) {
  return (
    <div className="det-hero">
      <div>
        {eyebrow && (
          <div className="t-caps dim-2" style={{ marginBottom: 8 }}>
            {eyebrow}
          </div>
        )}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
        {badges && <div className="det-row">{badges}</div>}
      </div>
      {right}
    </div>
  );
}

function ULDetailStats({ stats }) {
  return (
    <div className="det-stats">
      {stats.map((s, i) => (
        <div key={i} className="det-stat">
          <div className="k">{s.k}</div>
          <div className="v" style={s.color ? { color: s.color } : undefined}>
            {s.v}
          </div>
          {s.d && <div className="d">{s.d}</div>}
        </div>
      ))}
    </div>
  );
}

function ULDetailCard({ icon, title, right, children, bodyPad = true }) {
  return (
    <div className="det-card">
      <div className="hd">
        {icon}
        <b>{title}</b>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      <div className="bd" style={bodyPad ? undefined : { padding: 0 }}>
        {children}
      </div>
    </div>
  );
}

function ULTimeline({ rows }) {
  return (
    <div className="timeline">
      {rows.map((r, i) => (
        <div key={i} className="tl-row">
          <div className="ic">{r.icon}</div>
          <div className="when">{r.when}</div>
          <div className="what">{r.what}</div>
        </div>
      ))}
    </div>
  );
}

function ULListFootClosed({ left, right }) {
  return (
    <div className="list-foot-closed">
      <span className="t-mono-xs dim-2">{left}</span>
      <div className="ml-auto flex gap-2">{right}</div>
    </div>
  );
}

Object.assign(window, {
  ULSpark,
  ULBigChart,
  useUnifiedList,
  UnifiedListShell,
  ULOpenHead,
  ULRailRow,
  ULDetailScroll,
  ULDetailHero,
  ULDetailStats,
  ULDetailCard,
  ULTimeline,
  ULListFootClosed,
});
