"use strict";
(() => {
  var $e = Object.defineProperty;
  var ke = (e, t, n) =>
    t in e ? $e(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var A = (e, t, n) => ke(e, typeof t != "symbol" ? t + "" : t, n);
  var Z = `
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

/* Auth */
.auth-box {
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  text-align: center;
}
.auth-title { font-size: 15px; font-weight: 700; color: #f1f5f9; }
.auth-desc  { font-size: 12px; color: #475569; line-height: 1.6; }
.auth-status { font-size: 11px; color: #64748b; }

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
  var q = "se_dt_session";
  function Q(e) {
    let t = "";
    for (let n of e) t += String.fromCharCode(n);
    return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function Te(e) {
    let t = new TextEncoder().encode(e),
      n = await crypto.subtle.digest("SHA-256", t);
    return Q(new Uint8Array(n));
  }
  function Oe() {
    return Q(crypto.getRandomValues(new Uint8Array(32)));
  }
  function ee() {
    try {
      let e = sessionStorage.getItem(q);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Me(e) {
    try {
      sessionStorage.setItem(q, JSON.stringify(e));
    } catch {}
  }
  function te() {
    try {
      sessionStorage.removeItem(q);
    } catch {}
  }
  async function ne(e, t) {
    let n = Oe(),
      s = await Te(n),
      o = await fetch(`${e.edgeUrl}/auth/device/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_challenge: s }),
      });
    if (!o.ok) throw new Error("Failed to start device auth");
    let { state: r } = await o.json();
    return (
      window.open(
        `${e.adminUrl}/cli-auth?state=${encodeURIComponent(r)}`,
        "_blank",
        "width=620,height=700,noopener",
      ),
      t(),
      Pe(e, r, n)
    );
  }
  async function Pe(e, t, n) {
    let s = Date.now() + 6e5;
    for (; Date.now() < s; ) {
      await Re(2e3);
      let o = await fetch(`${e.edgeUrl}/auth/device/poll?state=${encodeURIComponent(t)}`, {
        headers: { "X-Code-Verifier": n },
      });
      if (o.status !== 202) {
        if (o.status === 200) {
          let r = await o.json(),
            i = { token: r.token, projectId: r.project_id };
          return (Me(i), i);
        }
        throw new Error(`Device auth failed with status ${o.status}`);
      }
    }
    throw new Error("Device auth timed out after 10 minutes");
  }
  function Re(e) {
    return new Promise((t) => setTimeout(t, e));
  }
  var E = "se_l_";
  function $(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        let n = t.getItem(e);
        if (n !== null) return n;
      } catch {}
    return null;
  }
  function C(e, t, n) {
    try {
      (n === "local" ? localStorage : sessionStorage).setItem(e, t);
    } catch {}
  }
  function D(e) {
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
  function oe() {
    return typeof window > "u"
      ? !1
      : new URLSearchParams(window.location.search).has("se-devtools");
  }
  function I(e) {
    let t = $(`se_gate_${e}`) ?? $(`${E}gate_${e}`);
    return t === null ? null : t === "true";
  }
  function re(e, t, n = "session") {
    let s = `${n === "local" ? E : "se_"}gate_${e}`;
    (t === null ? D(s) : C(s, String(t), n), O());
  }
  function N(e) {
    let t = $(`se_config_${e}`) ?? $(`${E}config_${e}`);
    if (t !== null)
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
  }
  function K(e, t, n = "session") {
    let s = `${n === "local" ? E : "se_"}config_${e}`;
    (t == null ? D(s) : C(s, JSON.stringify(t), n), O());
  }
  function ie(e) {
    return $(`se_exp_${e}`) ?? $(`${E}exp_${e}`);
  }
  function se(e, t, n = "session") {
    let s = `${n === "local" ? E : "se_"}exp_${e}`;
    (t === null ? D(s) : C(s, t, n), O());
  }
  function ae() {
    return $("se_i18n_profile") ?? $(`${E}i18n_profile`);
  }
  function le(e, t = "session") {
    let n = `${t === "local" ? E : "se_"}i18n_profile`;
    (e === null ? D(n) : C(n, e, t), O());
  }
  function de() {
    for (let e of [sessionStorage, localStorage])
      try {
        [...Object.keys(e)]
          .filter((t) => t.startsWith("se_") || t.startsWith(E))
          .forEach((t) => e.removeItem(t));
      } catch {}
    O();
  }
  var z = class {
    constructor(t, n) {
      A(this, "adminUrl", t);
      A(this, "token", n);
      A(this, "sameOrigin");
      this.sameOrigin = j(t);
    }
    async get(t) {
      let n = this.sameOrigin
          ? { credentials: "include" }
          : { headers: { Authorization: `Bearer ${this.token}` } },
        s = await fetch(`${this.adminUrl}${t}`, n);
      if (!s.ok) throw new Error(`${t} \u2192 HTTP ${s.status}`);
      let o = await s.json();
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
  function j(e) {
    if (typeof window > "u") return !1;
    try {
      return new URL(e, window.location.href).origin === window.location.origin;
    } catch {
      return !1;
    }
  }
  function _e() {
    return window.__shipeasy ?? null;
  }
  function He(e) {
    let t = I(e.name),
      n = _e()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Ae(e, t) {
    let n = (s) => (t === (s === "on" ? !0 : s === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function ce(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (r) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(r)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = '<div class="empty">No gates found for this project.</div>';
      return;
    }
    function s() {
      ((e.innerHTML = n
        .map(
          (r) => `
        <div class="row">
          <div>
            <div class="row-name">${r.name}</div>
            <div class="row-sub">${r.rolloutPct}% rollout</div>
          </div>
          ${He(r)}
          ${Ae(r.name, I(r.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((r) => {
          r.addEventListener("click", () => {
            let i = r.closest("[data-gate]").dataset.gate,
              a = r.dataset.v;
            (re(i, a === "default" ? null : a === "on"), s());
          });
        }));
    }
    s();
    let o = () => s();
    window.addEventListener("se:state:update", o);
  }
  function Ce(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function De(e) {
    return N(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function pe(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (r) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(r)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = '<div class="empty">No configs found for this project.</div>';
      return;
    }
    let s = new Set();
    function o() {
      ((e.innerHTML = n
        .map((i) => {
          let a = N(i.name),
            c = a !== void 0 ? a : i.valueJson,
            f = s.has(i.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${i.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${i.name}</div>
              ${De(i.name)}
              ${f ? `<button class="ibtn cancel-edit" data-name="${i.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${i.name}">edit</button>`}
            </div>
            ${
              f
                ? `
                <textarea class="editor" data-name="${i.name}" rows="3">${JSON.stringify(c, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${i.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${i.name}">Save (local)</button>
                  ${a !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${i.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${Ce(c)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((i) => {
          i.addEventListener("click", () => {
            (s.add(i.dataset.name), o());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((i) => {
          i.addEventListener("click", () => {
            (s.delete(i.dataset.name), o());
          });
        }));
      function r(i, a) {
        let c = i.dataset.name,
          f = e.querySelector(`textarea[data-name="${c}"]`);
        if (f)
          try {
            let g = JSON.parse(f.value);
            (K(c, g, a), s.delete(c), o());
          } catch {
            f.style.borderColor = "#f87171";
          }
      }
      (e.querySelectorAll(".save-session").forEach((i) => {
        i.addEventListener("click", () => r(i, "session"));
      }),
        e.querySelectorAll(".save-local").forEach((i) => {
          i.addEventListener("click", () => r(i, "local"));
        }),
        e.querySelectorAll(".clear-ov").forEach((i) => {
          i.addEventListener("click", () => {
            (K(i.dataset.name, null), s.delete(i.dataset.name), o());
          });
        }));
    }
    o();
  }
  function ze() {
    return window.__shipeasy ?? null;
  }
  function Ue(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function qe(e) {
    let t = ie(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      s = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${s}</select>`;
  }
  function Be(e) {
    let t = ze()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function ue(e, t) {
    if (t.length === 0) {
      e.innerHTML = '<div class="empty">No experiments found.</div>';
      return;
    }
    let n = t.filter((r) => r.status === "running"),
      s = t.filter((r) => r.status !== "running");
    function o(r, i) {
      return r.length === 0
        ? ""
        : `
      <div class="sec-head">${i}</div>
      ${r
        .map(
          (a) => `
          <div class="row">
            <div>
              <div class="row-name">${a.name}</div>
            </div>
            ${Ue(a.status)}
            ${a.status === "running" ? Be(a.name) : ""}
            ${a.status === "running" ? qe(a) : ""}
          </div>`,
        )
        .join("")}`;
    }
    ((e.innerHTML = o(n, "Running") + o(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((r) => {
        r.addEventListener("change", () => {
          let i = r.dataset.name;
          se(i, r.value || null);
        });
      }));
  }
  function Ie(e, t) {
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
  async function fe(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, s;
    try {
      [n, s] = await Promise.all([t.experiments(), t.universes()]);
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load: ${String(i)}</div>`;
      return;
    }
    let o = { activeTab: "experiments" };
    function r() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((c) => {
          c.classList.toggle("active", c.dataset.tab === o.activeTab);
        });
      let a = e.querySelector(".tab-body");
      o.activeTab === "experiments" ? ue(a, n) : Ie(a, s);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="experiments">Experiments</button>
      <button class="tab" data-tab="universes">Universes</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((i) => {
        i.addEventListener("click", () => {
          ((o.activeTab = i.dataset.tab), r());
        });
      }),
      r(),
      window.addEventListener("se:state:update", () => {
        let i = e.querySelector(".tab-body");
        i && o.activeTab === "experiments" && ue(i, n);
      }));
  }
  var M = !1,
    U = null;
  function Ne(e) {
    if (((M = e), U && (U(), (U = null)), !e)) return;
    let t = document.createElement("style");
    ((t.id = "__se_inplace_style"),
      (t.textContent =
        "[data-label] { outline: 2px dashed #7c3aed !important; outline-offset: 2px !important; cursor: pointer !important; }"),
      document.head.appendChild(t));
    function n(s) {
      let o = s.target.closest("[data-label]");
      if (!o) return;
      (s.preventDefault(), s.stopPropagation());
      let r = o.dataset.label ?? "",
        i = o.dataset.labelDesc ?? "",
        a = o.textContent ?? "",
        c = prompt(
          `Edit label "${r}"${
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
        ((o.textContent = c),
        window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: r, value: c } })));
    }
    (document.addEventListener("click", n, !0),
      (U = () => {
        (document.removeEventListener("click", n, !0),
          document.getElementById("__se_inplace_style")?.remove(),
          (M = !1));
      }));
  }
  function ge(e, t, n) {
    let s = ae(),
      o = [
        '<option value="">Default</option>',
        ...t.map(
          (r) => `<option value="${r.id}" ${s === r.id ? "selected" : ""}>${r.name}</option>`,
        ),
      ].join("");
    ((e.innerHTML = `
    <div class="sec-head">In-place editing</div>
    <div class="row">
      <div class="row-name">Edit labels in page</div>
      <div class="sw" id="se-inplace-sw">
        <div class="sw-track${M ? " on" : ""}">
          <div class="sw-thumb"></div>
        </div>
        <span class="sw-label">${M ? "On" : "Off"}</span>
      </div>
    </div>

    <div class="sec-head">Profile</div>
    <div class="row">
      <div class="row-name">Active profile</div>
      <select class="sel-input" id="se-profile-sel">${o}</select>
    </div>

    <div class="sec-head">Drafts</div>
    ${
      n.length === 0
        ? '<div class="empty" style="padding:12px">No drafts</div>'
        : n
            .map(
              (r) => `
              <div class="row">
                <div>
                  <div class="row-name">${r.name}</div>
                  <div class="row-sub">${r.status}</div>
                </div>
              </div>`,
            )
            .join("")
    }
  `),
      e.querySelector("#se-inplace-sw")?.addEventListener("click", () => {
        (Ne(!M), ge(e, t, n));
      }),
      e.querySelector("#se-profile-sel")?.addEventListener("change", (r) => {
        let i = r.target.value || null;
        le(i);
      }));
  }
  function Ke(e, t) {
    if (t.length === 0) {
      e.innerHTML = '<div class="empty">No translation keys found.</div>';
      return;
    }
    let n = new Map();
    for (let s of t) {
      let o = s.key.includes(".") ? s.key.split(".")[0] : "(root)";
      (n.has(o) || n.set(o, []), n.get(o).push(s));
    }
    e.innerHTML = Array.from(n.entries())
      .map(
        ([s, o]) => `
      <div class="sec-head">${s} <span style="color:#334155;font-weight:400">(${o.length})</span></div>
      ${o
        .map(
          (r) => `
        <div class="row">
          <div style="flex:1;min-width:0">
            <div class="row-name mono">${r.key}</div>
            <div class="row-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${String(r.value)}</div>
          </div>
        </div>`,
        )
        .join("")}`,
      )
      .join("");
  }
  async function me(e, t) {
    e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>';
    let n, s, o;
    try {
      [n, s, o] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(a)}</div>`;
      return;
    }
    let r = { activeTab: "labels" };
    function i() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((f) => {
          f.classList.toggle("active", f.dataset.tab === r.activeTab);
        });
      let c = e.querySelector(".tab-body");
      r.activeTab === "labels" ? ge(c, n, s) : Ke(c, o);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab active" data-tab="labels">Labels</button>
      <button class="tab" data-tab="chunks">Chunks</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((a) => {
        a.addEventListener("click", () => {
          ((r.activeTab = a.dataset.tab), i());
        });
      }),
      i());
  }
  var W = {
      gates: { icon: "\u26F3", label: "Gates" },
      configs: { icon: "\u2699", label: "Configs" },
      experiments: { icon: "\u{1F9EA}", label: "Experiments" },
      i18n: { icon: "\u{1F310}", label: "i18n" },
    },
    ye = "se_l_overlay",
    F = 240,
    ve = 580,
    G = 180,
    be = 700,
    he = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function je() {
    try {
      let e = localStorage.getItem(ye);
      if (e) return { ...he, ...JSON.parse(e) };
    } catch {}
    return { ...he };
  }
  function xe(e) {
    try {
      localStorage.setItem(ye, JSON.stringify(e));
    } catch {}
  }
  function We(e, t) {
    let n = window.innerWidth,
      s = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [s - t, "bottom"],
      ];
    o.sort((c, f) => c[0] - f[0]);
    let r = o[0][1],
      a = Math.max(5, Math.min(95, r === "left" || r === "right" ? (t / s) * 100 : (e / n) * 100));
    return { edge: r, offsetPct: a };
  }
  function P(e, t, n, s) {
    let { edge: o, offsetPct: r, panelWidth: i, panelHeight: a } = s,
      c = window.innerWidth,
      f = window.innerHeight,
      g = o === "left" || o === "right",
      v = Math.max(F, Math.min(i, c - 80)),
      w = Math.max(G, Math.min(a, f - 40)),
      k = (r / 100) * (g ? f : c),
      _ = e.getBoundingClientRect(),
      L = g ? _.width || 52 : _.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = g ? "column" : "row"),
      (l.padding = g ? "8px 6px" : "6px 8px"),
      o === "right"
        ? ((l.right = "0"),
          (l.top = `${r}%`),
          (l.transform = "translateY(-50%)"),
          (l.borderRadius = "10px 0 0 10px"),
          (l.borderRight = "none"),
          (l.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : o === "left"
          ? ((l.left = "0"),
            (l.top = `${r}%`),
            (l.transform = "translateY(-50%)"),
            (l.borderRadius = "0 10px 10px 0"),
            (l.borderLeft = "none"),
            (l.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : o === "top"
            ? ((l.top = "0"),
              (l.left = `${r}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "0 0 10px 10px"),
              (l.borderTop = "none"),
              (l.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((l.bottom = "0"),
              (l.left = `${r}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "10px 10px 0 0"),
              (l.borderBottom = "none"),
              (l.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let d = t.style;
    if (
      ((d.top = d.bottom = d.left = d.right = d.transform = ""),
      (d.borderTop = d.borderBottom = d.borderLeft = d.borderRight = ""),
      (d.width = v + "px"),
      (d.height = w + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let y = Math.max(10, Math.min(f - w - 10, k - w / 2));
      ((d.right = L + "px"),
        (d.top = y + "px"),
        (d.borderRadius = "10px 0 0 10px"),
        (d.borderRight = "none"),
        (d.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let y = Math.max(10, Math.min(f - w - 10, k - w / 2));
      ((d.left = L + "px"),
        (d.top = y + "px"),
        (d.borderRadius = "0 10px 10px 0"),
        (d.borderLeft = "none"),
        (d.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let y = Math.max(10, Math.min(c - v - 10, k - v / 2));
      ((d.top = L + "px"),
        (d.left = y + "px"),
        (d.borderRadius = "0 0 10px 10px"),
        (d.borderTop = "none"),
        (d.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let y = Math.max(10, Math.min(c - v - 10, k - v / 2));
      ((d.bottom = L + "px"),
        (d.left = y + "px"),
        (d.borderRadius = "10px 10px 0 0"),
        (d.borderBottom = "none"),
        (d.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let m = n.style;
    ((m.top = m.bottom = m.left = m.right = m.width = m.height = ""),
      (n.dataset.dir = g ? "ew" : "ns"),
      g
        ? ((m.width = "10px"),
          (m.top = "0"),
          (m.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          o === "right" ? (m.left = "0") : (m.right = "0"))
        : ((m.height = "10px"),
          (m.left = "0"),
          (m.right = "0"),
          (n.style.cursor = "ns-resize"),
          o === "top" ? (m.bottom = "0") : (m.top = "0")));
  }
  function we(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${Z}</style><div id="toolbar"></div><div id="panel"></div>`;
    let s = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((s.className = "toolbar"), (o.className = "panel"));
    let r = document.createElement("div");
    ((r.className = "resize-handle"), o.appendChild(r));
    let i = document.createElement("div");
    ((i.className = "panel-inner"), o.appendChild(i));
    let a = je(),
      c = null,
      g = j(e.adminUrl) ? { token: "", projectId: "same-origin" } : ee();
    requestAnimationFrame(() => P(s, o, r, a));
    let v = document.createElement("div");
    ((v.className = "drag-handle"),
      (v.title = "Drag to reposition"),
      (v.textContent = "\u283F"),
      s.appendChild(v),
      v.addEventListener("mousedown", (p) => {
        (p.preventDefault(), v.classList.add("dragging"));
        let b = (u) => {
            let { edge: h, offsetPct: S } = We(u.clientX, u.clientY);
            ((a = { ...a, edge: h, offsetPct: S }), P(s, o, r, a));
          },
          x = () => {
            (v.classList.remove("dragging"),
              document.removeEventListener("mousemove", b),
              document.removeEventListener("mouseup", x),
              xe(a));
          };
        (document.addEventListener("mousemove", b), document.addEventListener("mouseup", x));
      }));
    let w = new Map();
    for (let [p, { icon: b, label: x }] of Object.entries(W)) {
      let u = document.createElement("button");
      ((u.className = "btn"),
        (u.title = x),
        (u.textContent = b),
        u.addEventListener("click", () => l(p)),
        s.appendChild(u),
        w.set(p, u));
    }
    r.addEventListener("mousedown", (p) => {
      (p.preventDefault(), p.stopPropagation(), r.classList.add("dragging"));
      let b = p.clientX,
        x = p.clientY,
        u = a.panelWidth,
        h = a.panelHeight,
        { edge: S } = a,
        H = (Y) => {
          let X = Y.clientX - b,
            V = Y.clientY - x,
            T = { ...a };
          (S === "right" && (T.panelWidth = Math.max(F, Math.min(ve, u - X))),
            S === "left" && (T.panelWidth = Math.max(F, Math.min(ve, u + X))),
            S === "top" && (T.panelHeight = Math.max(G, Math.min(be, h + V))),
            S === "bottom" && (T.panelHeight = Math.max(G, Math.min(be, h - V))),
            (a = T),
            P(s, o, r, a));
        },
        J = () => {
          (r.classList.remove("dragging"),
            document.removeEventListener("mousemove", H),
            document.removeEventListener("mouseup", J),
            xe(a));
        };
      (document.addEventListener("mousemove", H), document.addEventListener("mouseup", J));
    });
    let k = () => P(s, o, r, a);
    window.addEventListener("resize", k);
    function _(p) {
      ((c = p),
        w.forEach((b, x) => b.classList.toggle("active", x === p)),
        o.classList.add("open"),
        P(s, o, r, a),
        m(p));
    }
    function L() {
      (o.classList.remove("open"), w.forEach((p) => p.classList.remove("active")), (c = null));
    }
    function l(p) {
      c === p ? L() : _(p);
    }
    function d(p, b) {
      return `
      <div class="panel-head">
        <span class="panel-title">${p} ${b}</span>
        <button class="close" id="se-close">\u2715</button>
      </div>`;
    }
    function m(p) {
      let { icon: b, label: x } = W[p];
      if (!g) {
        y(p);
        return;
      }
      let u = new z(e.adminUrl, g.token);
      ((i.innerHTML = `
      ${d(b, x)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-footer">
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", L),
        i.querySelector("#se-signout").addEventListener("click", () => {
          (te(), (g = null), y(p));
        }),
        i.querySelector("#se-clearall").addEventListener("click", () => {
          (de(), m(p));
        }));
      let h = i.querySelector("#se-body");
      ({
        gates: () => ce(h, u),
        configs: () => pe(h, u),
        experiments: () => fe(h, u),
        i18n: () => me(h, u),
      })
        [p]()
        .catch((H) => {
          h.innerHTML = `<div class="err">${String(H)}</div>`;
        });
    }
    function y(p) {
      let { icon: b, label: x } = W[p];
      ((i.innerHTML = `
      ${d(b, x)}
      <div class="panel-body">
        <div class="auth-box">
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in with your ShipEasy account to inspect and override feature flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect" style="width:100%">Connect \u2192</button>
          <div class="auth-status" id="se-auth-status"></div>
        </div>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", L),
        i.querySelector("#se-connect").addEventListener("click", async () => {
          let u = i.querySelector("#se-connect"),
            h = i.querySelector("#se-auth-status");
          ((u.disabled = !0), (u.textContent = "Opening browser\u2026"));
          try {
            ((g = await ne(e, () => {
              ((h.textContent = "Waiting for approval in the opened tab\u2026"),
                (u.textContent = "Waiting\u2026"));
            })),
              m(p));
          } catch (S) {
            ((h.textContent = `Auth failed: ${String(S)}`),
              (u.disabled = !1),
              (u.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      {
        destroy() {
          (window.removeEventListener("resize", k), t.remove());
        },
      }
    );
  }
  var Se = { adminUrl: "https://app.shipeasy.dev", edgeUrl: "https://edge.shipeasy.dev" },
    R = null;
  function Ee(e = {}) {
    if (R || typeof window > "u" || typeof document > "u") return;
    B();
    let t = { adminUrl: e.adminUrl ?? Se.adminUrl, edgeUrl: e.edgeUrl ?? Se.edgeUrl },
      { destroy: n } = we(t);
    R = n;
  }
  function Fe() {
    (R?.(), (R = null));
  }
  function Le(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    (B(), oe() && Ee(e));
    let n = t.split("+"),
      s = n[n.length - 1],
      o = n.includes("Shift"),
      r = n.includes("Alt") || n.includes("Option"),
      i = n.includes("Ctrl") || n.includes("Control"),
      a = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(s) ? `Key${s.toUpperCase()}` : null;
    function f(g) {
      (c ? g.code === c : g.key.toLowerCase() === s.toLowerCase()) &&
        g.shiftKey === o &&
        g.altKey === r &&
        g.ctrlKey === i &&
        g.metaKey === a &&
        (R ? Fe() : Ee(e));
    }
    return (window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (Le({
      adminUrl: e.adminUrl ?? window.location.origin,
      edgeUrl: e.edgeUrl ?? window.location.origin,
    }),
      (window.__se_devtools_ready = !0));
  }
})();
