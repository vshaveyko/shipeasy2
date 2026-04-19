"use strict";
(() => {
  var Re = Object.defineProperty;
  var Ce = (e, t, n) =>
    t in e ? Re(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var K = (e, t, n) => Ce(e, typeof t != "symbol" ? t + "" : t, n);
  var ie = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host { all: initial; }

/* Toolbar \u2014 position/flex-direction/padding/borderRadius/boxShadow set by JS */
.toolbar {
  position: fixed;
  z-index: 2147483646;
  display: flex;
  gap: 4px;
  background: #1e1e2e;
  border: 1px solid #2d2d44;
}

/* Drag handle */
.drag-handle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  font-size: 15px;
  color: #334155;
  user-select: none;
  flex-shrink: 0;
  touch-action: none;
}
.drag-handle:hover { background: #252538; color: #475569; }
.drag-handle.dragging { cursor: grabbing; color: #7c3aed; }

.btn {
  all: unset;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 17px;
  color: #94a3b8;
  transition: background 0.12s, color 0.12s;
}
.btn:hover { background: #2d2d44; color: #e2e8f0; }
.btn.active { background: #4c1d95; color: #fff; }

/* Panel \u2014 position/size/borderRadius/boxShadow/border-one-side set by JS */
.panel {
  position: fixed;
  z-index: 2147483645;
  display: flex;
  flex-direction: column;
  background: #1e1e2e;
  border: 1px solid #2d2d44;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  color: #e2e8f0;
  /* open/close animation */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s, transform 0.18s cubic-bezier(0.4,0,0.2,1);
}
.panel:not(.open)[data-edge="right"]  { transform: translateX(14px); }
.panel:not(.open)[data-edge="left"]   { transform: translateX(-14px); }
.panel:not(.open)[data-edge="top"]    { transform: translateY(-14px); }
.panel:not(.open)[data-edge="bottom"] { transform: translateY(14px); }
.panel.open { opacity: 1; pointer-events: auto; }

/* Resize handle \u2014 position/size/cursor set by JS.
   A centered pill is always visible so the affordance is discoverable. */
.resize-handle {
  position: absolute;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.resize-handle::before {
  content: "";
  background: #64748b;
  border-radius: 999px;
  opacity: 0.9;
  transition: opacity 0.15s, background 0.15s, transform 0.15s;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
}
.resize-handle[data-dir="ew"]::before { width: 4px;  height: 56px; }
.resize-handle[data-dir="ns"]::before { width: 56px; height: 4px;  }
.resize-handle:hover, .resize-handle.dragging { background: rgba(124,58,237,0.18); }
.resize-handle:hover::before, .resize-handle.dragging::before {
  background: #a78bfa; opacity: 1; transform: scale(1.15);
}

/* Panel inner layout */
.panel-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #2d2d44;
  gap: 8px;
  flex-shrink: 0;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  color: #f1f5f9;
}
.close {
  all: unset;
  cursor: pointer;
  color: #64748b;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 14px;
}
.close:hover { color: #e2e8f0; background: #2d2d44; }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0;
}
.panel-body::-webkit-scrollbar { width: 5px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: #2d2d44; border-radius: 3px; }

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid #2d2d44;
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Per-panel control bar that sits above the global Sign-out / Clear-overrides footer. */
.panel-subfoot {
  padding: 6px 10px;
  border-top: 1px solid #2d2d44;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  background: #181824;
}
.panel-subfoot:empty {
  display: none;
}
.subfoot-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 5px;
  color: #94a3b8;
  border: 1px solid #2d2d44;
  background: #252538;
  white-space: nowrap;
  flex-shrink: 0;
}
.subfoot-btn:hover { background: #2d2d44; color: #e2e8f0; }
.subfoot-btn.on { background: #4c1d95; color: #fff; border-color: transparent; }
.subfoot-btn .dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #475569;
}
.subfoot-btn.on .dot { background: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.18); }
.subfoot-sel {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #252538;
  color: #94a3b8;
  border: 1px solid #2d2d44;
  max-width: 110px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.subfoot-sel:focus { border-color: #7c3aed; }

/* Row list */
.row {
  display: flex;
  align-items: center;
  padding: 7px 8px;
  border-radius: 6px;
  gap: 8px;
  margin-bottom: 2px;
}
.row:hover { background: #252538; }
.row-name {
  flex: 1;
  font-weight: 500;
  color: #cbd5e1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.row-sub {
  font-size: 11px;
  color: #475569;
  margin-top: 1px;
}

/* Badges */
.badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-on  { background: #14532d; color: #4ade80; }
.badge-off { background: #450a0a; color: #f87171; }
.badge-run { background: #1e3a5f; color: #60a5fa; }
.badge-draft { background: #1c1917; color: #a8a29e; }
.badge-stop  { background: #1c1917; color: #78716c; }

/* Toggle group */
.tog {
  display: flex;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid #2d2d44;
  flex-shrink: 0;
}
.tog-btn {
  all: unset;
  cursor: pointer;
  font-size: 10px;
  padding: 3px 7px;
  color: #475569;
  background: transparent;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}
.tog-btn:hover { background: #2d2d44; color: #cbd5e1; }
.tog-btn.sel { background: #4c1d95; color: #fff; }

/* Buttons */
.ibtn {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 5px;
  background: #252538;
  color: #94a3b8;
  border: 1px solid #2d2d44;
  white-space: nowrap;
  flex-shrink: 0;
}
.ibtn:hover { background: #2d2d44; color: #e2e8f0; }
.ibtn.pri { background: #4c1d95; color: #fff; border-color: transparent; }
.ibtn.pri:hover { background: #5b21b6; }
.ibtn.danger { color: #f87171; border-color: #450a0a; background: #1a0606; }
.ibtn.danger:hover { background: #450a0a; }
.ibtn:disabled { opacity: 0.4; cursor: default; }

/* Select */
.sel-input {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 5px;
  background: #252538;
  color: #94a3b8;
  border: 1px solid #2d2d44;
  flex-shrink: 0;
}
.sel-input:focus { border-color: #7c3aed; }

/* Config value editor */
.mono {
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: 11px;
  color: #94a3b8;
}
.val-display {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
textarea.editor {
  all: unset;
  display: block;
  width: 100%;
  padding: 8px;
  background: #252538;
  border: 1px solid #2d2d44;
  border-radius: 5px;
  color: #e2e8f0;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  resize: vertical;
  min-height: 56px;
  line-height: 1.5;
  margin-top: 4px;
}
textarea.editor:focus { border-color: #7c3aed; outline: none; }
.edit-row { display: flex; gap: 4px; margin-top: 4px; }

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
  padding: 0 8px;
  gap: 2px;
}
.tab {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  padding: 7px 10px;
  color: #475569;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.tab:hover { color: #94a3b8; }
.tab.active { color: #a78bfa; border-bottom-color: #7c3aed; }

/* Section */
.sec-head {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #334155;
  padding: 10px 8px 4px;
}

/* Auth \u2014 vertically centered inside panel-body; no footer renders here */
.panel-body.auth-mode {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.auth-box {
  width: 100%;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  text-align: center;
}
.auth-icon {
  width: 36px; height: 36px;
  margin: 0 auto 4px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.auth-title { font-size: 14px; font-weight: 700; color: #f1f5f9; }
.auth-desc  { font-size: 11.5px; color: #64748b; line-height: 1.5; }
.auth-status { font-size: 11px; color: #64748b; min-height: 14px; }
.auth-err    { font-size: 11px; color: #f87171; line-height: 1.4; }

/* States */
.loading { text-align: center; padding: 24px; color: #334155; font-size: 12px; }
.empty   { text-align: center; padding: 24px; color: #334155; font-size: 12px; }
.err     { text-align: center; padding: 24px; color: #f87171; font-size: 12px; }

/* Empty state with call-to-action */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 20px;
  text-align: center;
  min-height: 160px;
}
.empty-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: #252538;
  border: 1px solid #2d2d44;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #475569;
}
.empty-title { font-size: 13px; font-weight: 600; color: #cbd5e1; }
.empty-msg   { font-size: 11.5px; color: #475569; line-height: 1.5; max-width: 240px; }
.empty-cta {
  all: unset;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  background: #4c1d95;
  color: #fff;
  text-decoration: none;
  transition: background 0.12s;
  margin-top: 4px;
}
.empty-cta:hover { background: #5b21b6; }

/* Switch */
.sw { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.sw-track {
  width: 30px; height: 16px; border-radius: 8px;
  background: #2d2d44; position: relative;
  transition: background 0.15s; flex-shrink: 0;
}
.sw-track.on { background: #4c1d95; }
.sw-thumb {
  position: absolute; width: 12px; height: 12px;
  border-radius: 6px; background: #fff;
  top: 2px; left: 2px; transition: transform 0.15s;
}
.sw-track.on .sw-thumb { transform: translateX(14px); }
.sw-label { font-size: 12px; color: #94a3b8; }

/* Horizontally scrollable tab bar (for many chunk tabs) */
.tabs.scroll {
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs.scroll::-webkit-scrollbar { display: none; }

/* i18n tree view */
.tree-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 5px;
  gap: 8px;
  font-size: 11.5px;
  line-height: 1.4;
  min-height: 22px;
}
.tree-row:hover { background: #252538; }
.tree-row.branch > .tree-seg { color: #cbd5e1; font-weight: 600; }
.tree-row.leaf   > .tree-seg { color: #94a3b8; font-family: 'SFMono-Regular', Consolas, monospace; }
.tree-row.leaf   > .tree-val {
  flex: 1;
  text-align: right;
  color: #64748b;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.tree-row.leaf > .tree-val.overridden {
  color: #a78bfa;
  font-style: normal;
}
.tree-row .tree-caret {
  display: inline-block;
  width: 10px;
  color: #475569;
  font-size: 9px;
}

/* Label popper \u2014 floats next to a page [data-label] element */
.label-popper {
  position: fixed;
  z-index: 2147483647;
  width: 300px;
  max-width: calc(100vw - 24px);
  background: #1e1e2e;
  border: 1px solid #2d2d44;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 12px;
  color: #e2e8f0;
  overflow: hidden;
  animation: lp-in 0.12s ease-out;
}
@keyframes lp-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lp-head {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid #2d2d44;
  gap: 8px;
}
.lp-key {
  flex: 1;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  color: #a78bfa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-close {
  all: unset;
  cursor: pointer;
  color: #64748b;
  width: 20px; height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 13px;
}
.lp-close:hover { color: #e2e8f0; background: #2d2d44; }
.lp-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
.lp-field { display: flex; flex-direction: column; gap: 3px; }
.lp-field > label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #475569;
}
.lp-field > span {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}
.lp-field > span.empty { color: #334155; font-style: italic; }
.lp-input {
  all: unset;
  display: block;
  width: 100%;
  padding: 7px 9px;
  background: #252538;
  border: 1px solid #2d2d44;
  border-radius: 5px;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.4;
  min-height: 52px;
  font-family: -apple-system, system-ui, sans-serif;
  box-sizing: border-box;
  resize: vertical;
}
.lp-input:focus { border-color: #7c3aed; outline: none; }
.lp-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: #181824;
  border-top: 1px solid #2d2d44;
  justify-content: flex-end;
}

/* Edit-labels hover highlight on the customer page */
.__se_label_target {
  outline: 2px dashed #7c3aed !important;
  outline-offset: 2px !important;
  cursor: pointer !important;
  transition: outline-color 0.12s;
}
.__se_label_target:hover,
.__se_label_target.__se_label_active {
  outline-style: solid !important;
  outline-color: #a78bfa !important;
}
`;
  var j = "se_dt_session";
  function se() {
    try {
      let e = sessionStorage.getItem(j);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function ze(e) {
    try {
      sessionStorage.setItem(j, JSON.stringify(e));
    } catch {}
  }
  function ae() {
    try {
      sessionStorage.removeItem(j);
    } catch {}
  }
  async function le(e, t) {
    let n = new URL(e.adminUrl).origin,
      o = window.location.origin,
      r = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(o)}`,
        "shipeasy-devtools-auth",
        "width=460,height=640,noopener=no",
      );
    if (!r) throw new Error("Popup blocked. Allow popups for this site and try again.");
    return (
      t(),
      new Promise((a, i) => {
        let d = !1;
        function s(v, m) {
          d ||
            ((d = !0),
            window.removeEventListener("message", p),
            clearInterval(y),
            clearTimeout(x),
            v ? i(v) : a(m));
        }
        function p(v) {
          if (v.origin !== n) return;
          let m = v.data;
          if (!m || m.type !== "se:devtools-auth" || !m.token || !m.projectId) return;
          let g = { token: m.token, projectId: m.projectId };
          (ze(g), s(null, g));
        }
        window.addEventListener("message", p);
        let y = setInterval(() => {
            r.closed && !d && s(new Error("Sign-in window closed before approval."));
          }, 500),
          x = setTimeout(() => {
            s(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var L = "se_l_";
  function $(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        let n = t.getItem(e);
        if (n !== null) return n;
      } catch {}
    return null;
  }
  function P(e, t, n) {
    try {
      (n === "local" ? localStorage : sessionStorage).setItem(e, t);
    } catch {}
  }
  function R(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        t.removeItem(e);
      } catch {}
  }
  function O() {
    window.dispatchEvent(new CustomEvent("se:override:change"));
  }
  function W() {
    if (typeof window > "u") return;
    let e = new URLSearchParams(window.location.search);
    for (let [t, n] of e)
      try {
        t.startsWith("se-gate-")
          ? sessionStorage.setItem(`se_gate_${t.slice(8)}`, n)
          : t.startsWith("se-config-")
            ? sessionStorage.setItem(`se_config_${t.slice(10)}`, n)
            : t.startsWith("se-exp-") && sessionStorage.setItem(`se_exp_${t.slice(7)}`, n);
      } catch {}
  }
  function de() {
    return typeof window > "u"
      ? !1
      : new URLSearchParams(window.location.search).has("se-devtools");
  }
  function F(e) {
    let t = $(`se_gate_${e}`) ?? $(`${L}gate_${e}`);
    return t === null ? null : t === "true";
  }
  function ce(e, t, n = "session") {
    let o = `${n === "local" ? L : "se_"}gate_${e}`;
    (t === null ? R(o) : P(o, String(t), n), O());
  }
  function G(e) {
    let t = $(`se_config_${e}`) ?? $(`${L}config_${e}`);
    if (t !== null)
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
  }
  function Y(e, t, n = "session") {
    let o = `${n === "local" ? L : "se_"}config_${e}`;
    (t == null ? R(o) : P(o, JSON.stringify(t), n), O());
  }
  function pe(e) {
    return $(`se_exp_${e}`) ?? $(`${L}exp_${e}`);
  }
  function ue(e, t, n = "session") {
    let o = `${n === "local" ? L : "se_"}exp_${e}`;
    (t === null ? R(o) : P(o, t, n), O());
  }
  function J() {
    return $("se_i18n_profile") ?? $(`${L}i18n_profile`);
  }
  function fe(e, t = "session") {
    let n = `${t === "local" ? L : "se_"}i18n_profile`;
    (e === null ? R(n) : P(n, e, t), O());
  }
  function ge() {
    return $("se_i18n_draft") ?? $(`${L}i18n_draft`);
  }
  function me(e, t = "session") {
    let n = `${t === "local" ? L : "se_"}i18n_draft`;
    (e === null ? R(n) : P(n, e, t), O());
  }
  function be(e) {
    return $(`se_i18n_label_${e}`) ?? $(`${L}i18n_label_${e}`);
  }
  function X(e, t, n = "session") {
    let o = `${n === "local" ? L : "se_"}i18n_label_${e}`;
    (t === null ? R(o) : P(o, t, n), O());
  }
  function ve() {
    for (let e of [sessionStorage, localStorage])
      try {
        [...Object.keys(e)]
          .filter((t) => t.startsWith("se_") || t.startsWith(L))
          .forEach((t) => e.removeItem(t));
      } catch {}
    O();
  }
  var q = class {
    constructor(t, n) {
      K(this, "adminUrl", t);
      K(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let r = "";
        try {
          let a = await n.json();
          r = a.detail ?? a.error ?? "";
        } catch {
          try {
            r = (await n.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${n.status}${r ? ` \u2014 ${r}` : ""}`);
      }
      let o = await n.json();
      return Array.isArray(o) ? o : (o.data ?? o);
    }
    gates() {
      return this.get("/api/admin/gates");
    }
    configs() {
      return this.get("/api/admin/configs");
    }
    experiments() {
      return this.get("/api/admin/experiments");
    }
    universes() {
      return this.get("/api/admin/universes");
    }
    profiles() {
      return this.get("/api/admin/i18n/profiles");
    }
    drafts() {
      return this.get("/api/admin/i18n/drafts");
    }
    keys(t) {
      let n = t ? `?profile_id=${encodeURIComponent(t)}` : "";
      return this.get(`/api/admin/i18n/keys${n}`);
    }
  };
  function _(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${V(e.title)}</div>
      <div class="empty-msg">${V(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${V(e.ctaLabel)}</a>
    </div>`;
  }
  function V(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ae() {
    return window.__shipeasy ?? null;
  }
  function De(e) {
    let t = F(e.name),
      n = Ae()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Ie(e, t) {
    let n = (o) => (t === (o === "on" ? !0 : o === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function xe(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(a)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = _({
        icon: "\u26F3",
        title: "No gates yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        ctaLabel: "Create new gate",
        ctaHref: `${t.adminUrl}/dashboard/gates/new`,
      });
      return;
    }
    function o() {
      ((e.innerHTML = n
        .map(
          (a) => `
        <div class="row">
          <div>
            <div class="row-name">${a.name}</div>
            <div class="row-sub">${a.rolloutPct}% rollout</div>
          </div>
          ${De(a)}
          ${Ie(a.name, F(a.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let i = a.closest("[data-gate]").dataset.gate,
              l = a.dataset.v;
            (ce(i, l === "default" ? null : l === "on"), o());
          });
        }));
    }
    o();
    let r = () => o();
    window.addEventListener("se:state:update", r);
  }
  function Ne(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function qe(e) {
    return G(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function he(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(a)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = _({
        icon: "\u2699",
        title: "No configs yet",
        message: "Remote config values you can tweak per-session without redeploying.",
        ctaLabel: "Create new config",
        ctaHref: `${t.adminUrl}/dashboard/configs/values/new`,
      });
      return;
    }
    let o = new Set();
    function r() {
      ((e.innerHTML = n
        .map((i) => {
          let l = G(i.name),
            d = l !== void 0 ? l : i.valueJson,
            s = o.has(i.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${i.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${i.name}</div>
              ${qe(i.name)}
              ${s ? `<button class="ibtn cancel-edit" data-name="${i.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${i.name}">edit</button>`}
            </div>
            ${
              s
                ? `
                <textarea class="editor" data-name="${i.name}" rows="3">${JSON.stringify(d, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${i.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${i.name}">Save (local)</button>
                  ${l !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${i.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${Ne(d)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((i) => {
          i.addEventListener("click", () => {
            (o.add(i.dataset.name), r());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((i) => {
          i.addEventListener("click", () => {
            (o.delete(i.dataset.name), r());
          });
        }));
      function a(i, l) {
        let d = i.dataset.name,
          s = e.querySelector(`textarea[data-name="${d}"]`);
        if (s)
          try {
            let p = JSON.parse(s.value);
            (Y(d, p, l), o.delete(d), r());
          } catch {
            s.style.borderColor = "#f87171";
          }
      }
      (e.querySelectorAll(".save-session").forEach((i) => {
        i.addEventListener("click", () => a(i, "session"));
      }),
        e.querySelectorAll(".save-local").forEach((i) => {
          i.addEventListener("click", () => a(i, "local"));
        }),
        e.querySelectorAll(".clear-ov").forEach((i) => {
          i.addEventListener("click", () => {
            (Y(i.dataset.name, null), o.delete(i.dataset.name), r());
          });
        }));
    }
    r();
  }
  function Ue() {
    return window.__shipeasy ?? null;
  }
  function Be(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function Ke(e) {
    let t = pe(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      o = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${o}</select>`;
  }
  function je(e) {
    let t = Ue()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function We(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${Be(e.status)}
      ${e.status === "running" ? je(e.name) : ""}
      ${e.status === "running" ? Ke(e) : ""}
    </div>`;
  }
  function ye(e, t, n, o) {
    let r = n.filter((d) => d.universe === t.name);
    if (r.length === 0) {
      e.innerHTML = _({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${o}/dashboard/experiments/new`,
      });
      return;
    }
    let a = r.filter((d) => d.status === "running"),
      i = r.filter((d) => d.status !== "running"),
      l = (d, s) => (d.length === 0 ? "" : `<div class="sec-head">${s}</div>${d.map(We).join("")}`);
    ((e.innerHTML = l(a, "Running") + l(i, "Other")),
      e.querySelectorAll(".exp-sel").forEach((d) => {
        d.addEventListener("change", () => {
          let s = d.dataset.name;
          ue(s, d.value || null);
        });
      }));
  }
  async function we(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, o;
    try {
      [n, o] = await Promise.all([t.experiments(), t.universes()]);
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load: ${String(i)}</div>`;
      return;
    }
    if (o.length === 0) {
      e.innerHTML = _({
        icon: "\u{1F30C}",
        title: "No universes yet",
        message:
          "Experiments live inside a universe \u2014 a named traffic segment with holdout control. Create one to get started.",
        ctaLabel: "Create a universe",
        ctaHref: `${t.adminUrl}/dashboard/experiments/universes`,
      });
      return;
    }
    let r = { activeUniverse: o[0].name };
    function a() {
      let i = o
        .map(
          (s) => `
          <button class="tab${s.name === r.activeUniverse ? " active" : ""}"
                  data-universe="${s.name}">${s.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${i}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((s) => {
          s.addEventListener("click", () => {
            ((r.activeUniverse = s.dataset.universe), a());
          });
        }));
      let l = e.querySelector(".tab-body"),
        d = o.find((s) => s.name === r.activeUniverse);
      ye(l, d, n, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let i = e.querySelector(".tab-body"),
          l = o.find((d) => d.name === r.activeUniverse);
        i && l && ye(i, l, n, t.adminUrl);
      }));
  }
  function Fe(e) {
    let t = new Map();
    for (let n of e) {
      let o = n.key.split("."),
        r = o.length > 1 ? o[0] : "(root)",
        a = o.length > 1 ? o.slice(1) : o;
      t.has(r) || t.set(r, { segment: r, children: [] });
      let i = t.get(r);
      for (let l = 0; l < a.length; l++) {
        let d = a[l],
          s = i.children.find((p) => p.segment === d);
        (s || ((s = { segment: d, children: [] }), i.children.push(s)), (i = s));
      }
      ((i.value = n.value), (i.fullKey = n.key));
    }
    for (let n of t.values()) Se(n);
    return t;
  }
  function Se(e) {
    e.children.sort((t, n) => {
      let o = t.value !== void 0,
        r = n.value !== void 0;
      return o !== r ? (o ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Se(t);
  }
  function w(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ee(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let r = e.fullKey ? be(e.fullKey) : null,
        a = r ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${w(e.fullKey ?? "")}">
        <span class="tree-seg">${w(e.segment)}</span>
        <span class="tree-val${r !== null ? " overridden" : ""}" title="${w(a)}">${w(a)}</span>
      </div>`;
    }
    let o = e.children.map((r) => Ee(r, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${w(e.segment)}</span>
    </div>
    ${o}`;
  }
  var A = "__se_label_target",
    B = !1,
    Z = null,
    C = null;
  function U() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function H() {
    (C?.remove(),
      (C = null),
      document.querySelectorAll(`.${A}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function Ge(e, t) {
    (H(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      o = e.dataset.labelDesc ?? "",
      a = J() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let i = e.textContent ?? "",
      l = document.createElement("div");
    ((l.className = "label-popper"),
      (l.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${w(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${w(a)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${o ? "" : "empty"}">${o ? w(o) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${w(i)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>`),
      t.appendChild(l));
    let d = e.getBoundingClientRect(),
      s = l.offsetHeight,
      p = l.offsetWidth,
      y = 8,
      x = d.bottom + y;
    x + s > window.innerHeight - 8 && (x = Math.max(8, d.top - s - y));
    let v = d.left;
    (v + p > window.innerWidth - 8 && (v = Math.max(8, window.innerWidth - p - 8)),
      (l.style.top = `${x}px`),
      (l.style.left = `${v}px`));
    let m = l.querySelector(".lp-input");
    (m.focus(),
      m.select(),
      l.querySelector(".lp-close").addEventListener("click", H),
      l.querySelector('[data-action="save"]').addEventListener("click", () => {
        let g = m.value;
        ((e.textContent = g),
          X(n, g),
          window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: n, value: g } })),
          H());
      }),
      l.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let g = e.dataset.__seOriginal ?? "";
        ((e.textContent = g),
          X(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          H());
      }),
      l.addEventListener("click", (g) => g.stopPropagation()),
      l.addEventListener("mousedown", (g) => g.stopPropagation()),
      (C = l));
  }
  function Ye(e, t, n) {
    if (((B = e), Z?.(), (Z = null), !e)) {
      H();
      for (let s of U()) s.classList.remove(A);
      return;
    }
    for (let s of U()) s.classList.add(A);
    function o(s) {
      return C !== null && s.composedPath().includes(C);
    }
    function r(s) {
      for (let p of s.composedPath())
        if (p instanceof HTMLElement && p.hasAttribute("data-label")) return p;
      return null;
    }
    function a(s) {
      if (o(s)) return;
      let p = r(s);
      p && (s.preventDefault(), s.stopPropagation(), Ge(p, t));
    }
    function i(s) {
      C && (o(s) || r(s) || H());
    }
    function l(s) {
      s.key === "Escape" && H();
    }
    let d = new MutationObserver(() => {
      if (B) {
        for (let s of U()) s.classList.add(A);
        n();
      }
    });
    (d.observe(document.body, { childList: !0, subtree: !0 }),
      document.addEventListener("click", a, !0),
      document.addEventListener("mousedown", i, !0),
      document.addEventListener("keydown", l),
      (Z = () => {
        (document.removeEventListener("click", a, !0),
          document.removeEventListener("mousedown", i, !0),
          document.removeEventListener("keydown", l),
          d.disconnect());
        for (let s of U()) s.classList.remove(A);
      }));
  }
  async function Le(e, t, n, o) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'), (n.innerHTML = ""));
    let r, a, i;
    try {
      [r, a, i] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (x) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(x)}</div>`;
      return;
    }
    let l = Fe(i),
      d = Array.from(l.keys()),
      s = { activeChunk: d[0] ?? null };
    function p() {
      if (d.length === 0) {
        e.innerHTML = _({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let x = d
          .map(
            (g) =>
              `<button class="tab${g === s.activeChunk ? " active" : ""}" data-chunk="${w(g)}">${w(g)}</button>`,
          )
          .join(""),
        v = s.activeChunk ? l.get(s.activeChunk) : null,
        m = v ? v.children.map((g) => Ee(g, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${x}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${m}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((g) => {
          g.addEventListener("click", () => {
            ((s.activeChunk = g.dataset.chunk), p());
          });
        }));
    }
    function y() {
      let x = J() ?? "",
        v = ge() ?? "",
        m = [
          '<option value="">Default</option>',
          ...r.map(
            (c) =>
              `<option value="${w(c.id)}" ${x === c.id ? "selected" : ""}>${w(c.name)}</option>`,
          ),
        ].join(""),
        g = [
          '<option value="">No draft</option>',
          ...a.map(
            (c) =>
              `<option value="${w(c.id)}" ${v === c.id ? "selected" : ""}>${w(c.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${B ? " on" : ""}" id="se-edit-toggle" title="Toggle in-page label editing">
        <span class="dot"></span>
        Edit labels
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${m}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${g}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          (Ye(!B, o, () => {}), y());
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (c) => {
          let u = c.target.value || null;
          fe(u);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (c) => {
          let u = c.target.value || null;
          me(u);
        }));
    }
    (p(), y());
  }
  var Q = {
      gates: { icon: "\u26F3", label: "Gates" },
      configs: { icon: "\u2699", label: "Configs" },
      experiments: { icon: "\u{1F9EA}", label: "Experiments" },
      i18n: { icon: "\u{1F310}", label: "i18n" },
    },
    Te = "se_l_overlay",
    ee = 240,
    ke = 580,
    te = 180,
    $e = 700,
    Me = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Je() {
    try {
      let e = localStorage.getItem(Te);
      if (e) return { ...Me, ...JSON.parse(e) };
    } catch {}
    return { ...Me };
  }
  function _e(e) {
    try {
      localStorage.setItem(Te, JSON.stringify(e));
    } catch {}
  }
  function Xe(e, t) {
    let n = window.innerWidth,
      o = window.innerHeight,
      r = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [o - t, "bottom"],
      ];
    r.sort((d, s) => d[0] - s[0]);
    let a = r[0][1],
      l = Math.max(5, Math.min(95, a === "left" || a === "right" ? (t / o) * 100 : (e / n) * 100));
    return { edge: a, offsetPct: l };
  }
  function D(e, t, n, o) {
    let { edge: r, offsetPct: a, panelWidth: i, panelHeight: l } = o,
      d = window.innerWidth,
      s = window.innerHeight,
      p = r === "left" || r === "right",
      y = Math.max(ee, Math.min(i, d - 80)),
      x = Math.max(te, Math.min(l, s - 40)),
      v = (a / 100) * (p ? s : d),
      m = e.getBoundingClientRect(),
      g = p ? m.width || 52 : m.height || 52,
      c = e.style;
    ((c.top = c.bottom = c.left = c.right = c.transform = ""),
      (c.borderTop = c.borderBottom = c.borderLeft = c.borderRight = ""),
      (c.flexDirection = p ? "column" : "row"),
      (c.padding = p ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((c.right = "0"),
          (c.top = `${a}%`),
          (c.transform = "translateY(-50%)"),
          (c.borderRadius = "10px 0 0 10px"),
          (c.borderRight = "none"),
          (c.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((c.left = "0"),
            (c.top = `${a}%`),
            (c.transform = "translateY(-50%)"),
            (c.borderRadius = "0 10px 10px 0"),
            (c.borderLeft = "none"),
            (c.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((c.top = "0"),
              (c.left = `${a}%`),
              (c.transform = "translateX(-50%)"),
              (c.borderRadius = "0 0 10px 10px"),
              (c.borderTop = "none"),
              (c.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((c.bottom = "0"),
              (c.left = `${a}%`),
              (c.transform = "translateX(-50%)"),
              (c.borderRadius = "10px 10px 0 0"),
              (c.borderBottom = "none"),
              (c.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let u = t.style;
    if (
      ((u.top = u.bottom = u.left = u.right = u.transform = ""),
      (u.borderTop = u.borderBottom = u.borderLeft = u.borderRight = ""),
      (u.width = y + "px"),
      (u.height = x + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let f = Math.max(10, Math.min(s - x - 10, v - x / 2));
      ((u.right = g + "px"),
        (u.top = f + "px"),
        (u.borderRadius = "10px 0 0 10px"),
        (u.borderRight = "none"),
        (u.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let f = Math.max(10, Math.min(s - x - 10, v - x / 2));
      ((u.left = g + "px"),
        (u.top = f + "px"),
        (u.borderRadius = "0 10px 10px 0"),
        (u.borderLeft = "none"),
        (u.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let f = Math.max(10, Math.min(d - y - 10, v - y / 2));
      ((u.top = g + "px"),
        (u.left = f + "px"),
        (u.borderRadius = "0 0 10px 10px"),
        (u.borderTop = "none"),
        (u.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let f = Math.max(10, Math.min(d - y - 10, v - y / 2));
      ((u.bottom = g + "px"),
        (u.left = f + "px"),
        (u.borderRadius = "10px 10px 0 0"),
        (u.borderBottom = "none"),
        (u.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let h = n.style;
    ((h.top = h.bottom = h.left = h.right = h.width = h.height = ""),
      (n.dataset.dir = p ? "ew" : "ns"),
      p
        ? ((h.width = "10px"),
          (h.top = "0"),
          (h.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          r === "right" ? (h.left = "0") : (h.right = "0"))
        : ((h.height = "10px"),
          (h.left = "0"),
          (h.right = "0"),
          (n.style.cursor = "ns-resize"),
          r === "top" ? (h.bottom = "0") : (h.top = "0")));
  }
  function Oe(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${ie}</style><div id="toolbar"></div><div id="panel"></div>`;
    let o = n.getElementById("toolbar"),
      r = n.getElementById("panel");
    ((o.className = "toolbar"), (r.className = "panel"));
    let a = document.createElement("div");
    ((a.className = "resize-handle"), r.appendChild(a));
    let i = document.createElement("div");
    ((i.className = "panel-inner"), r.appendChild(i));
    let l = Je(),
      d = null,
      s = se();
    requestAnimationFrame(() => D(o, r, a, l));
    let p = document.createElement("div");
    ((p.className = "drag-handle"),
      (p.title = "Drag to reposition"),
      (p.textContent = "\u283F"),
      o.appendChild(p),
      p.addEventListener("mousedown", (f) => {
        (f.preventDefault(), p.classList.add("dragging"));
        let S = (b) => {
            let { edge: E, offsetPct: M } = Xe(b.clientX, b.clientY);
            ((l = { ...l, edge: E, offsetPct: M }), D(o, r, a, l));
          },
          k = () => {
            (p.classList.remove("dragging"),
              document.removeEventListener("mousemove", S),
              document.removeEventListener("mouseup", k),
              _e(l));
          };
        (document.addEventListener("mousemove", S), document.addEventListener("mouseup", k));
      }));
    let y = new Map();
    for (let [f, { icon: S, label: k }] of Object.entries(Q)) {
      let b = document.createElement("button");
      ((b.className = "btn"),
        (b.title = k),
        (b.textContent = S),
        b.addEventListener("click", () => g(f)),
        o.appendChild(b),
        y.set(f, b));
    }
    a.addEventListener("mousedown", (f) => {
      (f.preventDefault(), f.stopPropagation(), a.classList.add("dragging"));
      let S = f.clientX,
        k = f.clientY,
        b = l.panelWidth,
        E = l.panelHeight,
        { edge: M } = l,
        T = (ne) => {
          let oe = ne.clientX - S,
            re = ne.clientY - k,
            z = { ...l };
          (M === "right" && (z.panelWidth = Math.max(ee, Math.min(ke, b - oe))),
            M === "left" && (z.panelWidth = Math.max(ee, Math.min(ke, b + oe))),
            M === "top" && (z.panelHeight = Math.max(te, Math.min($e, E + re))),
            M === "bottom" && (z.panelHeight = Math.max(te, Math.min($e, E - re))),
            (l = z),
            D(o, r, a, l));
        },
        N = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", T),
            document.removeEventListener("mouseup", N),
            _e(l));
        };
      (document.addEventListener("mousemove", T), document.addEventListener("mouseup", N));
    });
    let x = () => D(o, r, a, l);
    window.addEventListener("resize", x);
    function v(f) {
      ((d = f),
        y.forEach((S, k) => S.classList.toggle("active", k === f)),
        r.classList.add("open"),
        D(o, r, a, l),
        u(f));
    }
    function m() {
      (r.classList.remove("open"), y.forEach((f) => f.classList.remove("active")), (d = null));
    }
    function g(f) {
      d === f ? m() : v(f);
    }
    function c(f, S) {
      return `
      <div class="panel-head">
        <span class="panel-title">${f} ${S}</span>
        <button class="close" id="se-close">\u2715</button>
      </div>`;
    }
    function u(f) {
      let { icon: S, label: k } = Q[f];
      if (!s) {
        h(f);
        return;
      }
      let b = new q(e.adminUrl, s.token);
      ((i.innerHTML = `
      ${c(S, k)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", m),
        i.querySelector("#se-signout").addEventListener("click", () => {
          (ae(), (s = null), h(f));
        }),
        i.querySelector("#se-clearall").addEventListener("click", () => {
          (ve(), u(f));
        }));
      let E = i.querySelector("#se-body"),
        M = i.querySelector("#se-subfoot");
      ({
        gates: () => xe(E, b),
        configs: () => he(E, b),
        experiments: () => we(E, b),
        i18n: () => Le(E, b, M, n),
      })
        [f]()
        .catch((N) => {
          E.innerHTML = `<div class="err">${String(N)}</div>`;
        });
    }
    function h(f) {
      let { icon: S, label: k } = Q[f];
      ((i.innerHTML = `
      ${c(S, k)}
      <div class="panel-body auth-mode">
        <div class="auth-box">
          <div class="auth-icon">\u{1F510}</div>
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in to inspect and override flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect">Connect \u2192</button>
          <div class="auth-status" id="se-auth-status"></div>
          <div class="auth-err" id="se-auth-err"></div>
        </div>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", m),
        i.querySelector("#se-connect").addEventListener("click", async () => {
          let b = i.querySelector("#se-connect"),
            E = i.querySelector("#se-auth-status"),
            M = i.querySelector("#se-auth-err");
          ((b.disabled = !0),
            (b.textContent = "Opening\u2026"),
            (E.textContent = ""),
            (M.textContent = ""));
          try {
            ((s = await le(e, () => {
              ((E.textContent = "Waiting for approval in the opened tab\u2026"),
                (b.textContent = "Waiting\u2026"));
            })),
              u(f));
          } catch (T) {
            ((M.textContent = T instanceof Error ? T.message : String(T)),
              (E.textContent = ""),
              (b.disabled = !1),
              (b.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      {
        destroy() {
          (window.removeEventListener("resize", x), t.remove());
        },
      }
    );
  }
  function Ve() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          return new URL(e.src).origin;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let n of Array.from(t))
        if (n.src.includes("se-devtools.js"))
          try {
            return new URL(n.src).origin;
          } catch {}
    }
    return typeof window < "u" ? window.location.origin : "";
  }
  var I = null;
  function He(e = {}) {
    if (I || typeof window > "u" || typeof document > "u") return;
    W();
    let t = { adminUrl: e.adminUrl ?? Ve() },
      { destroy: n } = Oe(t);
    I = n;
  }
  function Ze() {
    (I?.(), (I = null));
  }
  function Pe(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    (W(), de() && He(e));
    let n = t.split("+"),
      o = n[n.length - 1],
      r = n.includes("Shift"),
      a = n.includes("Alt") || n.includes("Option"),
      i = n.includes("Ctrl") || n.includes("Control"),
      l = n.includes("Meta") || n.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(o) ? `Key${o.toUpperCase()}` : null;
    function s(p) {
      (d ? p.code === d : p.key.toLowerCase() === o.toLowerCase()) &&
        p.shiftKey === r &&
        p.altKey === a &&
        p.ctrlKey === i &&
        p.metaKey === l &&
        (I ? Ze() : He(e));
    }
    return (window.addEventListener("keydown", s), () => window.removeEventListener("keydown", s));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (Pe(e), (window.__se_devtools_ready = !0));
  }
})();
