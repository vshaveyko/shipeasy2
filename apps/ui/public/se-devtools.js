"use strict";
(() => {
  var we = Object.defineProperty;
  var Se = (e, t, n) =>
    t in e ? we(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var z = (e, t, n) => Se(e, typeof t != "symbol" ? t + "" : t, n);
  var X = `
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
`;
  var I = "se_dt_session";
  function V() {
    try {
      let e = sessionStorage.getItem(I);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Ee(e) {
    try {
      sessionStorage.setItem(I, JSON.stringify(e));
    } catch {}
  }
  function Z() {
    try {
      sessionStorage.removeItem(I);
    } catch {}
  }
  async function Q(e, t) {
    let n = new URL(e.adminUrl).origin,
      s = window.location.origin,
      r = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(s)}`,
        "shipeasy-devtools-auth",
        "width=460,height=640,noopener=no",
      );
    if (!r) throw new Error("Popup blocked. Allow popups for this site and try again.");
    return (
      t(),
      new Promise((o, i) => {
        let c = !1;
        function u(y, v) {
          c ||
            ((c = !0),
            window.removeEventListener("message", f),
            clearInterval(x),
            clearTimeout(S),
            y ? i(y) : o(v));
        }
        function f(y) {
          if (y.origin !== n) return;
          let v = y.data;
          if (!v || v.type !== "se:devtools-auth" || !v.token || !v.projectId) return;
          let L = { token: v.token, projectId: v.projectId };
          (Ee(L), u(null, L));
        }
        window.addEventListener("message", f);
        let x = setInterval(() => {
            r.closed && !c && u(new Error("Sign-in window closed before approval."));
          }, 500),
          S = setTimeout(() => {
            u(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var $ = "se_l_";
  function T(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        let n = t.getItem(e);
        if (n !== null) return n;
      } catch {}
    return null;
  }
  function _(e, t, n) {
    try {
      (n === "local" ? localStorage : sessionStorage).setItem(e, t);
    } catch {}
  }
  function A(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        t.removeItem(e);
      } catch {}
  }
  function O() {
    window.dispatchEvent(new CustomEvent("se:override:change"));
  }
  function B() {
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
  function ee() {
    return typeof window > "u"
      ? !1
      : new URLSearchParams(window.location.search).has("se-devtools");
  }
  function q(e) {
    let t = T(`se_gate_${e}`) ?? T(`${$}gate_${e}`);
    return t === null ? null : t === "true";
  }
  function te(e, t, n = "session") {
    let s = `${n === "local" ? $ : "se_"}gate_${e}`;
    (t === null ? A(s) : _(s, String(t), n), O());
  }
  function N(e) {
    let t = T(`se_config_${e}`) ?? T(`${$}config_${e}`);
    if (t !== null)
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
  }
  function U(e, t, n = "session") {
    let s = `${n === "local" ? $ : "se_"}config_${e}`;
    (t == null ? A(s) : _(s, JSON.stringify(t), n), O());
  }
  function ne(e) {
    return T(`se_exp_${e}`) ?? T(`${$}exp_${e}`);
  }
  function oe(e, t, n = "session") {
    let s = `${n === "local" ? $ : "se_"}exp_${e}`;
    (t === null ? A(s) : _(s, t, n), O());
  }
  function re() {
    return T("se_i18n_profile") ?? T(`${$}i18n_profile`);
  }
  function ie(e, t = "session") {
    let n = `${t === "local" ? $ : "se_"}i18n_profile`;
    (e === null ? A(n) : _(n, e, t), O());
  }
  function se() {
    for (let e of [sessionStorage, localStorage])
      try {
        [...Object.keys(e)]
          .filter((t) => t.startsWith("se_") || t.startsWith($))
          .forEach((t) => e.removeItem(t));
      } catch {}
    O();
  }
  var C = class {
    constructor(t, n) {
      z(this, "adminUrl", t);
      z(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let r = "";
        try {
          let o = await n.json();
          r = o.detail ?? o.error ?? "";
        } catch {
          try {
            r = (await n.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${n.status}${r ? ` \u2014 ${r}` : ""}`);
      }
      let s = await n.json();
      return Array.isArray(s) ? s : (s.data ?? s);
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
  function Le() {
    return window.__shipeasy ?? null;
  }
  function $e(e) {
    let t = q(e.name),
      n = Le()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function ke(e, t) {
    let n = (s) => (t === (s === "on" ? !0 : s === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function ae(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (o) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(o)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = '<div class="empty">No gates found for this project.</div>';
      return;
    }
    function s() {
      ((e.innerHTML = n
        .map(
          (o) => `
        <div class="row">
          <div>
            <div class="row-name">${o.name}</div>
            <div class="row-sub">${o.rolloutPct}% rollout</div>
          </div>
          ${$e(o)}
          ${ke(o.name, q(o.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((o) => {
          o.addEventListener("click", () => {
            let i = o.closest("[data-gate]").dataset.gate,
              a = o.dataset.v;
            (te(i, a === "default" ? null : a === "on"), s());
          });
        }));
    }
    s();
    let r = () => s();
    window.addEventListener("se:state:update", r);
  }
  function Te(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function Me(e) {
    return N(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function le(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (o) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(o)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = '<div class="empty">No configs found for this project.</div>';
      return;
    }
    let s = new Set();
    function r() {
      ((e.innerHTML = n
        .map((i) => {
          let a = N(i.name),
            c = a !== void 0 ? a : i.valueJson,
            u = s.has(i.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${i.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${i.name}</div>
              ${Me(i.name)}
              ${u ? `<button class="ibtn cancel-edit" data-name="${i.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${i.name}">edit</button>`}
            </div>
            ${
              u
                ? `
                <textarea class="editor" data-name="${i.name}" rows="3">${JSON.stringify(c, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${i.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${i.name}">Save (local)</button>
                  ${a !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${i.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${Te(c)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((i) => {
          i.addEventListener("click", () => {
            (s.add(i.dataset.name), r());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((i) => {
          i.addEventListener("click", () => {
            (s.delete(i.dataset.name), r());
          });
        }));
      function o(i, a) {
        let c = i.dataset.name,
          u = e.querySelector(`textarea[data-name="${c}"]`);
        if (u)
          try {
            let f = JSON.parse(u.value);
            (U(c, f, a), s.delete(c), r());
          } catch {
            u.style.borderColor = "#f87171";
          }
      }
      (e.querySelectorAll(".save-session").forEach((i) => {
        i.addEventListener("click", () => o(i, "session"));
      }),
        e.querySelectorAll(".save-local").forEach((i) => {
          i.addEventListener("click", () => o(i, "local"));
        }),
        e.querySelectorAll(".clear-ov").forEach((i) => {
          i.addEventListener("click", () => {
            (U(i.dataset.name, null), s.delete(i.dataset.name), r());
          });
        }));
    }
    r();
  }
  function Oe() {
    return window.__shipeasy ?? null;
  }
  function Pe(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function Re(e) {
    let t = ne(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      s = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${s}</select>`;
  }
  function He(e) {
    let t = Oe()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function de(e, t) {
    if (t.length === 0) {
      e.innerHTML = '<div class="empty">No experiments found.</div>';
      return;
    }
    let n = t.filter((o) => o.status === "running"),
      s = t.filter((o) => o.status !== "running");
    function r(o, i) {
      return o.length === 0
        ? ""
        : `
      <div class="sec-head">${i}</div>
      ${o
        .map(
          (a) => `
          <div class="row">
            <div>
              <div class="row-name">${a.name}</div>
            </div>
            ${Pe(a.status)}
            ${a.status === "running" ? He(a.name) : ""}
            ${a.status === "running" ? Re(a) : ""}
          </div>`,
        )
        .join("")}`;
    }
    ((e.innerHTML = r(n, "Running") + r(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((o) => {
        o.addEventListener("change", () => {
          let i = o.dataset.name;
          oe(i, o.value || null);
        });
      }));
  }
  function _e(e, t) {
    if (t.length === 0) {
      e.innerHTML = '<div class="empty">No universes found.</div>';
      return;
    }
    e.innerHTML = t
      .map(
        (n) => `
      <div class="row">
        <div style="flex:1;min-width:0">
          <div class="row-name">${n.name}</div>
          <div class="row-sub">${n.unitType}${n.holdoutRange ? ` \xB7 holdout ${n.holdoutRange[0]}\u2013${n.holdoutRange[1]}%` : ""}</div>
        </div>
      </div>`,
      )
      .join("");
  }
  async function ce(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, s;
    try {
      [n, s] = await Promise.all([t.experiments(), t.universes()]);
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load: ${String(i)}</div>`;
      return;
    }
    let r = { activeTab: "experiments" };
    function o() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((c) => {
          c.classList.toggle("active", c.dataset.tab === r.activeTab);
        });
      let a = e.querySelector(".tab-body");
      r.activeTab === "experiments" ? de(a, n) : _e(a, s);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="experiments">Experiments</button>
      <button class="tab" data-tab="universes">Universes</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((i) => {
        i.addEventListener("click", () => {
          ((r.activeTab = i.dataset.tab), o());
        });
      }),
      o(),
      window.addEventListener("se:state:update", () => {
        let i = e.querySelector(".tab-body");
        i && r.activeTab === "experiments" && de(i, n);
      }));
  }
  var P = !1,
    D = null;
  function Ae(e) {
    if (((P = e), D && (D(), (D = null)), !e)) return;
    let t = document.createElement("style");
    ((t.id = "__se_inplace_style"),
      (t.textContent =
        "[data-label] { outline: 2px dashed #7c3aed !important; outline-offset: 2px !important; cursor: pointer !important; }"),
      document.head.appendChild(t));
    function n(s) {
      let r = s.target.closest("[data-label]");
      if (!r) return;
      (s.preventDefault(), s.stopPropagation());
      let o = r.dataset.label ?? "",
        i = r.dataset.labelDesc ?? "",
        a = r.textContent ?? "",
        c = prompt(
          `Edit label "${o}"${
            i
              ? `
${i}`
              : ""
          }
Current: ${a}

New value:`,
          a,
        );
      c !== null &&
        c !== a &&
        ((r.textContent = c),
        window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: o, value: c } })));
    }
    (document.addEventListener("click", n, !0),
      (D = () => {
        (document.removeEventListener("click", n, !0),
          document.getElementById("__se_inplace_style")?.remove(),
          (P = !1));
      }));
  }
  function pe(e, t, n) {
    let s = re(),
      r = [
        '<option value="">Default</option>',
        ...t.map(
          (o) => `<option value="${o.id}" ${s === o.id ? "selected" : ""}>${o.name}</option>`,
        ),
      ].join("");
    ((e.innerHTML = `
    <div class="sec-head">In-place editing</div>
    <div class="row">
      <div class="row-name">Edit labels in page</div>
      <div class="sw" id="se-inplace-sw">
        <div class="sw-track${P ? " on" : ""}">
          <div class="sw-thumb"></div>
        </div>
        <span class="sw-label">${P ? "On" : "Off"}</span>
      </div>
    </div>

    <div class="sec-head">Profile</div>
    <div class="row">
      <div class="row-name">Active profile</div>
      <select class="sel-input" id="se-profile-sel">${r}</select>
    </div>

    <div class="sec-head">Drafts</div>
    ${
      n.length === 0
        ? '<div class="empty" style="padding:12px">No drafts</div>'
        : n
            .map(
              (o) => `
              <div class="row">
                <div>
                  <div class="row-name">${o.name}</div>
                  <div class="row-sub">${o.status}</div>
                </div>
              </div>`,
            )
            .join("")
    }
  `),
      e.querySelector("#se-inplace-sw")?.addEventListener("click", () => {
        (Ae(!P), pe(e, t, n));
      }),
      e.querySelector("#se-profile-sel")?.addEventListener("change", (o) => {
        let i = o.target.value || null;
        ie(i);
      }));
  }
  function Ce(e, t) {
    if (t.length === 0) {
      e.innerHTML = '<div class="empty">No translation keys found.</div>';
      return;
    }
    let n = new Map();
    for (let s of t) {
      let r = s.key.includes(".") ? s.key.split(".")[0] : "(root)";
      (n.has(r) || n.set(r, []), n.get(r).push(s));
    }
    e.innerHTML = Array.from(n.entries())
      .map(
        ([s, r]) => `
      <div class="sec-head">${s} <span style="color:#334155;font-weight:400">(${r.length})</span></div>
      ${r
        .map(
          (o) => `
        <div class="row">
          <div style="flex:1;min-width:0">
            <div class="row-name mono">${o.key}</div>
            <div class="row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${String(o.value)}</div>
          </div>
        </div>`,
        )
        .join("")}`,
      )
      .join("");
  }
  async function ue(e, t) {
    e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>';
    let n, s, r;
    try {
      [n, s, r] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(a)}</div>`;
      return;
    }
    let o = { activeTab: "labels" };
    function i() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((u) => {
          u.classList.toggle("active", u.dataset.tab === o.activeTab);
        });
      let c = e.querySelector(".tab-body");
      o.activeTab === "labels" ? pe(c, n, s) : Ce(c, r);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="labels">Labels</button>
      <button class="tab" data-tab="chunks">Chunks</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((a) => {
        a.addEventListener("click", () => {
          ((o.activeTab = a.dataset.tab), i());
        });
      }),
      i());
  }
  var K = {
      gates: { icon: "\u26F3", label: "Gates" },
      configs: { icon: "\u2699", label: "Configs" },
      experiments: { icon: "\u{1F9EA}", label: "Experiments" },
      i18n: { icon: "\u{1F310}", label: "i18n" },
    },
    be = "se_l_overlay",
    j = 240,
    fe = 580,
    W = 180,
    ge = 700,
    me = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function De() {
    try {
      let e = localStorage.getItem(be);
      if (e) return { ...me, ...JSON.parse(e) };
    } catch {}
    return { ...me };
  }
  function ve(e) {
    try {
      localStorage.setItem(be, JSON.stringify(e));
    } catch {}
  }
  function ze(e, t) {
    let n = window.innerWidth,
      s = window.innerHeight,
      r = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [s - t, "bottom"],
      ];
    r.sort((c, u) => c[0] - u[0]);
    let o = r[0][1],
      a = Math.max(5, Math.min(95, o === "left" || o === "right" ? (t / s) * 100 : (e / n) * 100));
    return { edge: o, offsetPct: a };
  }
  function R(e, t, n, s) {
    let { edge: r, offsetPct: o, panelWidth: i, panelHeight: a } = s,
      c = window.innerWidth,
      u = window.innerHeight,
      f = r === "left" || r === "right",
      x = Math.max(j, Math.min(i, c - 80)),
      S = Math.max(W, Math.min(a, u - 40)),
      y = (o / 100) * (f ? u : c),
      v = e.getBoundingClientRect(),
      L = f ? v.width || 52 : v.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = f ? "column" : "row"),
      (l.padding = f ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((l.right = "0"),
          (l.top = `${o}%`),
          (l.transform = "translateY(-50%)"),
          (l.borderRadius = "10px 0 0 10px"),
          (l.borderRight = "none"),
          (l.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((l.left = "0"),
            (l.top = `${o}%`),
            (l.transform = "translateY(-50%)"),
            (l.borderRadius = "0 10px 10px 0"),
            (l.borderLeft = "none"),
            (l.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((l.top = "0"),
              (l.left = `${o}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "0 0 10px 10px"),
              (l.borderTop = "none"),
              (l.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((l.bottom = "0"),
              (l.left = `${o}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "10px 10px 0 0"),
              (l.borderBottom = "none"),
              (l.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let p = t.style;
    if (
      ((p.top = p.bottom = p.left = p.right = p.transform = ""),
      (p.borderTop = p.borderBottom = p.borderLeft = p.borderRight = ""),
      (p.width = x + "px"),
      (p.height = S + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let d = Math.max(10, Math.min(u - S - 10, y - S / 2));
      ((p.right = L + "px"),
        (p.top = d + "px"),
        (p.borderRadius = "10px 0 0 10px"),
        (p.borderRight = "none"),
        (p.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let d = Math.max(10, Math.min(u - S - 10, y - S / 2));
      ((p.left = L + "px"),
        (p.top = d + "px"),
        (p.borderRadius = "0 10px 10px 0"),
        (p.borderLeft = "none"),
        (p.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let d = Math.max(10, Math.min(c - x - 10, y - x / 2));
      ((p.top = L + "px"),
        (p.left = d + "px"),
        (p.borderRadius = "0 0 10px 10px"),
        (p.borderTop = "none"),
        (p.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let d = Math.max(10, Math.min(c - x - 10, y - x / 2));
      ((p.bottom = L + "px"),
        (p.left = d + "px"),
        (p.borderRadius = "10px 10px 0 0"),
        (p.borderBottom = "none"),
        (p.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let m = n.style;
    ((m.top = m.bottom = m.left = m.right = m.width = m.height = ""),
      (n.dataset.dir = f ? "ew" : "ns"),
      f
        ? ((m.width = "10px"),
          (m.top = "0"),
          (m.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          r === "right" ? (m.left = "0") : (m.right = "0"))
        : ((m.height = "10px"),
          (m.left = "0"),
          (m.right = "0"),
          (n.style.cursor = "ns-resize"),
          r === "top" ? (m.bottom = "0") : (m.top = "0")));
  }
  function he(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${X}</style><div id="toolbar"></div><div id="panel"></div>`;
    let s = n.getElementById("toolbar"),
      r = n.getElementById("panel");
    ((s.className = "toolbar"), (r.className = "panel"));
    let o = document.createElement("div");
    ((o.className = "resize-handle"), r.appendChild(o));
    let i = document.createElement("div");
    ((i.className = "panel-inner"), r.appendChild(i));
    let a = De(),
      c = null,
      u = V();
    requestAnimationFrame(() => R(s, r, o, a));
    let f = document.createElement("div");
    ((f.className = "drag-handle"),
      (f.title = "Drag to reposition"),
      (f.textContent = "\u283F"),
      s.appendChild(f),
      f.addEventListener("mousedown", (d) => {
        (d.preventDefault(), f.classList.add("dragging"));
        let b = (g) => {
            let { edge: h, offsetPct: E } = ze(g.clientX, g.clientY);
            ((a = { ...a, edge: h, offsetPct: E }), R(s, r, o, a));
          },
          w = () => {
            (f.classList.remove("dragging"),
              document.removeEventListener("mousemove", b),
              document.removeEventListener("mouseup", w),
              ve(a));
          };
        (document.addEventListener("mousemove", b), document.addEventListener("mouseup", w));
      }));
    let x = new Map();
    for (let [d, { icon: b, label: w }] of Object.entries(K)) {
      let g = document.createElement("button");
      ((g.className = "btn"),
        (g.title = w),
        (g.textContent = b),
        g.addEventListener("click", () => L(d)),
        s.appendChild(g),
        x.set(d, g));
    }
    o.addEventListener("mousedown", (d) => {
      (d.preventDefault(), d.stopPropagation(), o.classList.add("dragging"));
      let b = d.clientX,
        w = d.clientY,
        g = a.panelWidth,
        h = a.panelHeight,
        { edge: E } = a,
        k = (G) => {
          let J = G.clientX - b,
            Y = G.clientY - w,
            M = { ...a };
          (E === "right" && (M.panelWidth = Math.max(j, Math.min(fe, g - J))),
            E === "left" && (M.panelWidth = Math.max(j, Math.min(fe, g + J))),
            E === "top" && (M.panelHeight = Math.max(W, Math.min(ge, h + Y))),
            E === "bottom" && (M.panelHeight = Math.max(W, Math.min(ge, h - Y))),
            (a = M),
            R(s, r, o, a));
        },
        F = () => {
          (o.classList.remove("dragging"),
            document.removeEventListener("mousemove", k),
            document.removeEventListener("mouseup", F),
            ve(a));
        };
      (document.addEventListener("mousemove", k), document.addEventListener("mouseup", F));
    });
    let S = () => R(s, r, o, a);
    window.addEventListener("resize", S);
    function y(d) {
      ((c = d),
        x.forEach((b, w) => b.classList.toggle("active", w === d)),
        r.classList.add("open"),
        R(s, r, o, a),
        p(d));
    }
    function v() {
      (r.classList.remove("open"), x.forEach((d) => d.classList.remove("active")), (c = null));
    }
    function L(d) {
      c === d ? v() : y(d);
    }
    function l(d, b) {
      return `
      <div class="panel-head">
        <span class="panel-title">${d} ${b}</span>
        <button class="close" id="se-close">\u2715</button>
      </div>`;
    }
    function p(d) {
      let { icon: b, label: w } = K[d];
      if (!u) {
        m(d);
        return;
      }
      let g = new C(e.adminUrl, u.token);
      ((i.innerHTML = `
      ${l(b, w)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-footer">
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", v),
        i.querySelector("#se-signout").addEventListener("click", () => {
          (Z(), (u = null), m(d));
        }),
        i.querySelector("#se-clearall").addEventListener("click", () => {
          (se(), p(d));
        }));
      let h = i.querySelector("#se-body");
      ({
        gates: () => ae(h, g),
        configs: () => le(h, g),
        experiments: () => ce(h, g),
        i18n: () => ue(h, g),
      })
        [d]()
        .catch((k) => {
          h.innerHTML = `<div class="err">${String(k)}</div>`;
        });
    }
    function m(d) {
      let { icon: b, label: w } = K[d];
      ((i.innerHTML = `
      ${l(b, w)}
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
        i.querySelector("#se-close").addEventListener("click", v),
        i.querySelector("#se-connect").addEventListener("click", async () => {
          let g = i.querySelector("#se-connect"),
            h = i.querySelector("#se-auth-status"),
            E = i.querySelector("#se-auth-err");
          ((g.disabled = !0),
            (g.textContent = "Opening\u2026"),
            (h.textContent = ""),
            (E.textContent = ""));
          try {
            ((u = await Q(e, () => {
              ((h.textContent = "Waiting for approval in the opened tab\u2026"),
                (g.textContent = "Waiting\u2026"));
            })),
              p(d));
          } catch (k) {
            ((E.textContent = k instanceof Error ? k.message : String(k)),
              (h.textContent = ""),
              (g.disabled = !1),
              (g.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      {
        destroy() {
          (window.removeEventListener("resize", S), t.remove());
        },
      }
    );
  }
  function Ie() {
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
  var H = null;
  function xe(e = {}) {
    if (H || typeof window > "u" || typeof document > "u") return;
    B();
    let t = { adminUrl: e.adminUrl ?? Ie() },
      { destroy: n } = he(t);
    H = n;
  }
  function Be() {
    (H?.(), (H = null));
  }
  function ye(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    (B(), ee() && xe(e));
    let n = t.split("+"),
      s = n[n.length - 1],
      r = n.includes("Shift"),
      o = n.includes("Alt") || n.includes("Option"),
      i = n.includes("Ctrl") || n.includes("Control"),
      a = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(s) ? `Key${s.toUpperCase()}` : null;
    function u(f) {
      (c ? f.code === c : f.key.toLowerCase() === s.toLowerCase()) &&
        f.shiftKey === r &&
        f.altKey === o &&
        f.ctrlKey === i &&
        f.metaKey === a &&
        (H ? Be() : xe(e));
    }
    return (window.addEventListener("keydown", u), () => window.removeEventListener("keydown", u));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (ye(e), (window.__se_devtools_ready = !0));
  }
})();
