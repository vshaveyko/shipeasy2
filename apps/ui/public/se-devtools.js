"use strict";
(() => {
  var Ee = Object.defineProperty;
  var Le = (e, t, n) =>
    t in e ? Ee(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var z = (e, t, n) => Le(e, typeof t != "symbol" ? t + "" : t, n);
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

/* Resize handle \u2014 position/size/cursor set by JS */
.resize-handle {
  position: absolute;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
}
.resize-handle:hover, .resize-handle.dragging { background: rgba(124,58,237,0.25); }

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
  var B = "se_dt_session";
  function V(e) {
    let t = "";
    for (let n of e) t += String.fromCharCode(n);
    return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function $e(e) {
    let t = new TextEncoder().encode(e),
      n = await crypto.subtle.digest("SHA-256", t);
    return V(new Uint8Array(n));
  }
  function ke() {
    return V(crypto.getRandomValues(new Uint8Array(32)));
  }
  function Q() {
    try {
      let e = sessionStorage.getItem(B);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Te(e) {
    try {
      sessionStorage.setItem(B, JSON.stringify(e));
    } catch {}
  }
  function Z() {
    try {
      sessionStorage.removeItem(B);
    } catch {}
  }
  async function ee(e, t) {
    let n = ke(),
      s = await $e(n),
      r = await fetch(`${e.edgeUrl}/auth/device/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_challenge: s }),
      });
    if (!r.ok) throw new Error("Failed to start device auth");
    let { state: o } = await r.json();
    return (
      window.open(
        `${e.adminUrl}/cli-auth?state=${encodeURIComponent(o)}`,
        "_blank",
        "width=620,height=700,noopener",
      ),
      t(),
      Me(e, o, n)
    );
  }
  async function Me(e, t, n) {
    let s = Date.now() + 6e5;
    for (; Date.now() < s; ) {
      await Pe(2e3);
      let r = await fetch(`${e.edgeUrl}/auth/device/poll?state=${encodeURIComponent(t)}`, {
        headers: { "X-Code-Verifier": n },
      });
      if (r.status !== 202) {
        if (r.status === 200) {
          let o = await r.json(),
            i = { token: o.token, projectId: o.project_id };
          return (Te(i), i);
        }
        throw new Error(`Device auth failed with status ${r.status}`);
      }
    }
    throw new Error("Device auth timed out after 10 minutes");
  }
  function Pe(e) {
    return new Promise((t) => setTimeout(t, e));
  }
  var w = "se_l_";
  function E(e) {
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
  function D(e) {
    for (let t of [sessionStorage, localStorage])
      try {
        t.removeItem(e);
      } catch {}
  }
  function M() {
    window.dispatchEvent(new CustomEvent("se:override:change"));
  }
  function q() {
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
  function te() {
    return typeof window > "u"
      ? !1
      : new URLSearchParams(window.location.search).has("se-devtools");
  }
  function N(e) {
    let t = E(`se_gate_${e}`) ?? E(`${w}gate_${e}`);
    return t === null ? null : t === "true";
  }
  function ne(e, t, n = "session") {
    let s = `${n === "local" ? w : "se_"}gate_${e}`;
    (t === null ? D(s) : _(s, String(t), n), M());
  }
  function U(e) {
    let t = E(`se_config_${e}`) ?? E(`${w}config_${e}`);
    if (t !== null)
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
  }
  function I(e, t, n = "session") {
    let s = `${n === "local" ? w : "se_"}config_${e}`;
    (t == null ? D(s) : _(s, JSON.stringify(t), n), M());
  }
  function oe(e) {
    return E(`se_exp_${e}`) ?? E(`${w}exp_${e}`);
  }
  function re(e, t, n = "session") {
    let s = `${n === "local" ? w : "se_"}exp_${e}`;
    (t === null ? D(s) : _(s, t, n), M());
  }
  function ie() {
    return E("se_i18n_profile") ?? E(`${w}i18n_profile`);
  }
  function se(e, t = "session") {
    let n = `${t === "local" ? w : "se_"}i18n_profile`;
    (e === null ? D(n) : _(n, e, t), M());
  }
  function ae() {
    for (let e of [sessionStorage, localStorage])
      try {
        [...Object.keys(e)]
          .filter((t) => t.startsWith("se_") || t.startsWith(w))
          .forEach((t) => e.removeItem(t));
      } catch {}
    M();
  }
  var A = class {
    constructor(t, n) {
      z(this, "adminUrl", t);
      z(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) throw new Error(`${t} \u2192 HTTP ${n.status}`);
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
  function Re() {
    return window.__shipeasy ?? null;
  }
  function Oe(e) {
    let t = N(e.name),
      n = Re()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function He(e, t) {
    let n = (s) => (t === (s === "on" ? !0 : s === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function le(e, t) {
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
          ${Oe(o)}
          ${He(o.name, N(o.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((o) => {
          o.addEventListener("click", () => {
            let i = o.closest("[data-gate]").dataset.gate,
              a = o.dataset.v;
            (ne(i, a === "default" ? null : a === "on"), s());
          });
        }));
    }
    s();
    let r = () => s();
    window.addEventListener("se:state:update", r);
  }
  function _e(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function De(e) {
    return U(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function de(e, t) {
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
          let a = U(i.name),
            p = a !== void 0 ? a : i.valueJson,
            u = s.has(i.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${i.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${i.name}</div>
              ${De(i.name)}
              ${u ? `<button class="ibtn cancel-edit" data-name="${i.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${i.name}">edit</button>`}
            </div>
            ${
              u
                ? `
                <textarea class="editor" data-name="${i.name}" rows="3">${JSON.stringify(p, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${i.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${i.name}">Save (local)</button>
                  ${a !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${i.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${_e(p)}</div>`
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
        let p = i.dataset.name,
          u = e.querySelector(`textarea[data-name="${p}"]`);
        if (u)
          try {
            let m = JSON.parse(u.value);
            (I(p, m, a), s.delete(p), r());
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
            (I(i.dataset.name, null), s.delete(i.dataset.name), r());
          });
        }));
    }
    r();
  }
  function Ae() {
    return window.__shipeasy ?? null;
  }
  function Ce(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function ze(e) {
    let t = oe(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      s = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${s}</select>`;
  }
  function Be(e) {
    let t = Ae()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function ce(e, t) {
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
            ${Ce(a.status)}
            ${a.status === "running" ? Be(a.name) : ""}
            ${a.status === "running" ? ze(a) : ""}
          </div>`,
        )
        .join("")}`;
    }
    ((e.innerHTML = r(n, "Running") + r(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((o) => {
        o.addEventListener("change", () => {
          let i = o.dataset.name;
          re(i, o.value || null);
        });
      }));
  }
  function qe(e, t) {
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
  async function pe(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, s;
    try {
      [n, s] = await Promise.all([t.experiments(), t.universes()]);
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load: ${String(i)}</div>`;
      return;
    }
    let r = "experiments";
    function o() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((p) => {
          p.classList.toggle("active", p.dataset.tab === r);
        });
      let a = e.querySelector(".tab-body");
      r === "experiments" ? ce(a, n) : qe(a, s);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab${r === "experiments" ? " active" : ""}" data-tab="experiments">Experiments</button>
      <button class="tab${r === "universes" ? " active" : ""}" data-tab="universes">Universes</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((i) => {
        i.addEventListener("click", () => {
          ((r = i.dataset.tab), o());
        });
      }),
      o(),
      window.addEventListener("se:state:update", () => {
        r === "experiments" && ce(e.querySelector(".tab-body"), n);
      }));
  }
  var P = !1,
    C = null;
  function Ne(e) {
    if (((P = e), C && (C(), (C = null)), !e)) return;
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
        p = prompt(
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
      p !== null &&
        p !== a &&
        ((r.textContent = p),
        window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: o, value: p } })));
    }
    (document.addEventListener("click", n, !0),
      (C = () => {
        (document.removeEventListener("click", n, !0),
          document.getElementById("__se_inplace_style")?.remove(),
          (P = !1));
      }));
  }
  function ue(e, t, n) {
    let s = ie(),
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
        (Ne(!P), ue(e, t, n));
      }),
      e.querySelector("#se-profile-sel")?.addEventListener("change", (o) => {
        let i = o.target.value || null;
        se(i);
      }));
  }
  function Ue(e, t) {
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
  async function fe(e, t) {
    e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>';
    let n, s, r;
    try {
      [n, s, r] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(a)}</div>`;
      return;
    }
    let o = "labels";
    function i() {
      e.querySelector(".tabs")
        .querySelectorAll(".tab")
        .forEach((u) => {
          u.classList.toggle("active", u.dataset.tab === o);
        });
      let p = e.querySelector(".tab-body");
      o === "labels" ? ue(p, n, s) : Ue(p, r);
    }
    ((e.innerHTML = `
    <div class="tabs">
      <button class="tab${o === "labels" ? " active" : ""}" data-tab="labels">Labels</button>
      <button class="tab${o === "chunks" ? " active" : ""}" data-tab="chunks">Chunks</button>
    </div>
    <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
      e.querySelectorAll(".tab").forEach((a) => {
        a.addEventListener("click", () => {
          ((o = a.dataset.tab), i());
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
    he = "se_l_overlay",
    j = 240,
    ge = 580,
    W = 180,
    me = 700,
    ve = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Ie() {
    try {
      let e = localStorage.getItem(he);
      if (e) return { ...ve, ...JSON.parse(e) };
    } catch {}
    return { ...ve };
  }
  function be(e) {
    try {
      localStorage.setItem(he, JSON.stringify(e));
    } catch {}
  }
  function Ke(e, t) {
    let n = window.innerWidth,
      s = window.innerHeight,
      r = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [s - t, "bottom"],
      ];
    r.sort((p, u) => p[0] - u[0]);
    let o = r[0][1],
      a = Math.max(5, Math.min(95, o === "left" || o === "right" ? (t / s) * 100 : (e / n) * 100));
    return { edge: o, offsetPct: a };
  }
  function R(e, t, n, s) {
    let { edge: r, offsetPct: o, panelWidth: i, panelHeight: a } = s,
      p = window.innerWidth,
      u = window.innerHeight,
      m = r === "left" || r === "right",
      x = Math.max(j, Math.min(i, p - 80)),
      S = Math.max(W, Math.min(a, u - 40)),
      L = (o / 100) * (m ? u : p),
      $ = e.getBoundingClientRect(),
      k = m ? $.width || 52 : $.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = m ? "column" : "row"),
      (l.padding = m ? "8px 6px" : "6px 8px"),
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
    let c = t.style;
    if (
      ((c.top = c.bottom = c.left = c.right = c.transform = ""),
      (c.borderTop = c.borderBottom = c.borderLeft = c.borderRight = ""),
      (c.width = x + "px"),
      (c.height = S + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let d = Math.max(10, Math.min(u - S - 10, L - S / 2));
      ((c.right = k + "px"),
        (c.top = d + "px"),
        (c.borderRadius = "10px 0 0 10px"),
        (c.borderRight = "none"),
        (c.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let d = Math.max(10, Math.min(u - S - 10, L - S / 2));
      ((c.left = k + "px"),
        (c.top = d + "px"),
        (c.borderRadius = "0 10px 10px 0"),
        (c.borderLeft = "none"),
        (c.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let d = Math.max(10, Math.min(p - x - 10, L - x / 2));
      ((c.top = k + "px"),
        (c.left = d + "px"),
        (c.borderRadius = "0 0 10px 10px"),
        (c.borderTop = "none"),
        (c.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let d = Math.max(10, Math.min(p - x - 10, L - x / 2));
      ((c.bottom = k + "px"),
        (c.left = d + "px"),
        (c.borderRadius = "10px 10px 0 0"),
        (c.borderBottom = "none"),
        (c.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let g = n.style;
    ((g.top = g.bottom = g.left = g.right = g.width = g.height = ""),
      m
        ? ((g.width = "6px"),
          (g.top = "0"),
          (g.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          r === "right" ? (g.left = "0") : (g.right = "0"))
        : ((g.height = "6px"),
          (g.left = "0"),
          (g.right = "0"),
          (n.style.cursor = "ns-resize"),
          r === "top" ? (g.bottom = "0") : (g.top = "0")));
  }
  function xe(e) {
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
    let a = Ie(),
      p = null,
      u = Q();
    requestAnimationFrame(() => R(s, r, o, a));
    let m = document.createElement("div");
    ((m.className = "drag-handle"),
      (m.title = "Drag to reposition"),
      (m.textContent = "\u283F"),
      s.appendChild(m),
      m.addEventListener("mousedown", (d) => {
        (d.preventDefault(), m.classList.add("dragging"));
        let v = (f) => {
            let { edge: b, offsetPct: y } = Ke(f.clientX, f.clientY);
            ((a = { ...a, edge: b, offsetPct: y }), R(s, r, o, a));
          },
          h = () => {
            (m.classList.remove("dragging"),
              document.removeEventListener("mousemove", v),
              document.removeEventListener("mouseup", h),
              be(a));
          };
        (document.addEventListener("mousemove", v), document.addEventListener("mouseup", h));
      }));
    let x = new Map();
    for (let [d, { icon: v, label: h }] of Object.entries(K)) {
      let f = document.createElement("button");
      ((f.className = "btn"),
        (f.title = h),
        (f.textContent = v),
        f.addEventListener("click", () => k(d)),
        s.appendChild(f),
        x.set(d, f));
    }
    o.addEventListener("mousedown", (d) => {
      (d.preventDefault(), d.stopPropagation(), o.classList.add("dragging"));
      let v = d.clientX,
        h = d.clientY,
        f = a.panelWidth,
        b = a.panelHeight,
        { edge: y } = a,
        H = (G) => {
          let J = G.clientX - v,
            Y = G.clientY - h,
            T = { ...a };
          (y === "right" && (T.panelWidth = Math.max(j, Math.min(ge, f - J))),
            y === "left" && (T.panelWidth = Math.max(j, Math.min(ge, f + J))),
            y === "top" && (T.panelHeight = Math.max(W, Math.min(me, b + Y))),
            y === "bottom" && (T.panelHeight = Math.max(W, Math.min(me, b - Y))),
            (a = T),
            R(s, r, o, a));
        },
        F = () => {
          (o.classList.remove("dragging"),
            document.removeEventListener("mousemove", H),
            document.removeEventListener("mouseup", F),
            be(a));
        };
      (document.addEventListener("mousemove", H), document.addEventListener("mouseup", F));
    });
    let S = () => R(s, r, o, a);
    window.addEventListener("resize", S);
    function L(d) {
      ((p = d),
        x.forEach((v, h) => v.classList.toggle("active", h === d)),
        r.classList.add("open"),
        R(s, r, o, a),
        c(d));
    }
    function $() {
      (r.classList.remove("open"), x.forEach((d) => d.classList.remove("active")), (p = null));
    }
    function k(d) {
      p === d ? $() : L(d);
    }
    function l(d, v) {
      return `
      <div class="panel-head">
        <span class="panel-title">${d} ${v}</span>
        <button class="close" id="se-close">\u2715</button>
      </div>`;
    }
    function c(d) {
      let { icon: v, label: h } = K[d];
      if (!u) {
        g(d);
        return;
      }
      let f = new A(e.adminUrl, u.token);
      ((i.innerHTML = `
      ${l(v, h)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-footer">
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", $),
        i.querySelector("#se-signout").addEventListener("click", () => {
          (Z(), (u = null), g(d));
        }),
        i.querySelector("#se-clearall").addEventListener("click", () => {
          (ae(), c(d));
        }));
      let b = i.querySelector("#se-body");
      ({
        gates: () => le(b, f),
        configs: () => de(b, f),
        experiments: () => pe(b, f),
        i18n: () => fe(b, f),
      })
        [d]()
        .catch((H) => {
          b.innerHTML = `<div class="err">${String(H)}</div>`;
        });
    }
    function g(d) {
      let { icon: v, label: h } = K[d];
      ((i.innerHTML = `
      ${l(v, h)}
      <div class="panel-body">
        <div class="auth-box">
          <div class="auth-title">Connect to ShipEasy</div>
          <div class="auth-desc">Sign in with your ShipEasy account to inspect and override feature flags, configs, experiments, and translations.</div>
          <button class="ibtn pri" id="se-connect" style="width:100%">Connect \u2192</button>
          <div class="auth-status" id="se-auth-status"></div>
        </div>
      </div>`),
        i.querySelector("#se-close").addEventListener("click", $),
        i.querySelector("#se-connect").addEventListener("click", async () => {
          let f = i.querySelector("#se-connect"),
            b = i.querySelector("#se-auth-status");
          ((f.disabled = !0), (f.textContent = "Opening browser\u2026"));
          try {
            ((u = await ee(e, () => {
              ((b.textContent = "Waiting for approval in the opened tab\u2026"),
                (f.textContent = "Waiting\u2026"));
            })),
              c(d));
          } catch (y) {
            ((b.textContent = `Auth failed: ${String(y)}`),
              (f.disabled = !1),
              (f.textContent = "Retry"));
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
  var ye = { adminUrl: "https://app.shipeasy.dev", edgeUrl: "https://edge.shipeasy.dev" },
    O = null;
  function we(e = {}) {
    if (O || typeof window > "u" || typeof document > "u") return;
    q();
    let t = { adminUrl: e.adminUrl ?? ye.adminUrl, edgeUrl: e.edgeUrl ?? ye.edgeUrl },
      { destroy: n } = xe(t);
    O = n;
  }
  function je() {
    (O?.(), (O = null));
  }
  function Se(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    (q(), te() && we(e));
    let n = t.split("+"),
      s = n[n.length - 1],
      r = n.includes("Shift"),
      o = n.includes("Alt"),
      i = n.includes("Ctrl") || n.includes("Control"),
      a = n.includes("Meta") || n.includes("Cmd");
    function p(u) {
      u.key === s &&
        u.shiftKey === r &&
        u.altKey === o &&
        u.ctrlKey === i &&
        u.metaKey === a &&
        (O ? je() : we(e));
    }
    return (window.addEventListener("keydown", p), () => window.removeEventListener("keydown", p));
  }
  typeof window < "u" && (Se(), (window.__se_devtools_ready = !0));
})();
