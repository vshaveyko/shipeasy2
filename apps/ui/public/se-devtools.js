"use strict";
(() => {
  var ot = Object.defineProperty;
  var rt = (e, t, n) =>
    t in e ? ot(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var Z = (e, t, n) => rt(e, typeof t != "symbol" ? t + "" : t, n);
  var he = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host {
  all: initial;
  /* Design tokens \u2014 kept in sync with the dashboard design system. */
  --se-bg:    #0a0a0b;
  --se-bg-1:  #111112;
  --se-bg-2:  #16161a;
  --se-bg-3:  #1c1c21;
  --se-line:    rgba(255,255,255,0.07);
  --se-line-2:  rgba(255,255,255,0.12);
  --se-fg:    #f5f5f4;
  --se-fg-2:  rgba(245,245,244,0.78);
  --se-fg-3:  rgba(245,245,244,0.56);
  --se-fg-4:  rgba(245,245,244,0.36);
  --se-accent:      #4ade80;
  --se-accent-fg:   #052e16;
  --se-accent-soft: rgba(74,222,128,0.14);
  --se-warn:        #f59e0b;
  --se-warn-soft:   rgba(245,158,11,0.16);
  --se-danger:      #f87171;
  --se-danger-soft: rgba(248,113,113,0.14);
  --se-mono: 'Geist Mono', 'SFMono-Regular', ui-monospace, Consolas, 'Courier New', monospace;
  --se-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --se-r-sm: 5px;
  --se-r-md: 8px;
  --se-r-lg: 12px;
}

/* Toolbar \u2014 position/flex-direction/padding/borderRadius/boxShadow set by JS */
.toolbar {
  position: fixed;
  z-index: 2147483646;
  display: flex;
  gap: 4px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--se-accent) 8%, transparent), transparent 60%),
    var(--se-bg);
  border: 1px solid var(--se-line-2);
}

/* Drag handle \u2014 doubles as the ShipEasy brand mark. */
.drag-handle {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: var(--se-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  font-size: 15px;
  color: var(--se-accent);
  user-select: none;
  flex-shrink: 0;
  touch-action: none;
  background: var(--se-accent-soft);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--se-accent) 30%, transparent);
}
.drag-handle:hover {
  background: color-mix(in oklab, var(--se-accent) 22%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--se-accent) 50%, transparent);
}
.drag-handle.dragging {
  cursor: grabbing;
  color: var(--se-accent-fg);
  background: var(--se-accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--se-accent) 40%, transparent);
}

.btn {
  all: unset;
  width: 34px;
  height: 34px;
  border-radius: var(--se-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--se-fg-3);
  transition: background 0.12s, color 0.12s;
}
.btn svg { width: 18px; height: 18px; display: block; }
.btn:hover { background: var(--se-bg-2); color: var(--se-fg); }
.btn.active {
  background: var(--se-accent-soft);
  color: var(--se-accent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--se-accent) 32%, transparent);
}
.drag-handle svg { width: 18px; height: 18px; display: block; }

/* Panel \u2014 position/size/borderRadius/boxShadow/border-one-side set by JS */
.panel {
  position: fixed;
  z-index: 2147483645;
  display: flex;
  flex-direction: column;
  background: var(--se-bg);
  border: 1px solid var(--se-line-2);
  overflow: hidden;
  font-family: var(--se-sans);
  font-size: 13px;
  color: var(--se-fg);
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
  background: var(--se-fg-3);
  border-radius: 999px;
  opacity: 0.9;
  transition: opacity 0.15s, background 0.15s, transform 0.15s;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
}
.resize-handle[data-dir="ew"]::before { width: 4px;  height: 56px; }
.resize-handle[data-dir="ns"]::before { width: 56px; height: 4px;  }
.resize-handle:hover, .resize-handle.dragging { background: var(--se-accent-soft); }
.resize-handle:hover::before, .resize-handle.dragging::before {
  background: var(--se-accent); opacity: 1; transform: scale(1.15);
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
  padding: 12px 14px;
  border-bottom: 1px solid var(--se-line);
  gap: 10px;
  flex-shrink: 0;
  background: var(--se-bg-1);
}
/* Brand mark \u2014 conic gradient square that matches the marketing site logo. */
.panel-head .mk {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: conic-gradient(from 140deg, var(--se-accent), #0a0a0b 40%, var(--se-accent) 80%);
  box-shadow: 0 0 0 1px var(--se-line-2);
  position: relative;
  flex-shrink: 0;
}
.panel-head .mk::after {
  content: "";
  position: absolute;
  inset: 5px;
  background: var(--se-bg);
  border-radius: 3px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  color: var(--se-fg);
  min-width: 0;
  line-height: 1.2;
}
.panel-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--se-accent-soft);
  color: var(--se-accent);
  flex-shrink: 0;
}
.panel-title-icon svg { width: 14px; height: 14px; display: block; }
.panel-title-label { white-space: nowrap; }
.panel-title .sub {
  display: block;
  margin-left: auto;
  padding-left: 8px;
  font-family: var(--se-mono);
  font-size: 10px;
  color: var(--se-fg-4);
  letter-spacing: 0.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-head .live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--se-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--se-accent-soft);
  color: var(--se-accent);
  border: 1px solid color-mix(in oklab, var(--se-accent) 30%, transparent);
}
.panel-head .live .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--se-accent);
  box-shadow: 0 0 6px var(--se-accent);
}
.close {
  all: unset;
  cursor: pointer;
  color: var(--se-fg-3);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.close svg { width: 14px; height: 14px; display: block; }
.close:hover { color: var(--se-fg); background: var(--se-bg-2); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 4px;
  min-height: 0;
  background: var(--se-bg);
}
.panel-body::-webkit-scrollbar { width: 6px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: var(--se-line-2); border-radius: 3px; }

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--se-line);
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  row-gap: 6px;
  background: var(--se-bg-1);
  align-items: center;
}
.panel-footer .foot-status {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.panel-footer .ibtn { flex-shrink: 0; }

/* Per-panel control bar that sits above the global Sign-out / Clear-overrides footer. */
.panel-subfoot {
  padding: 6px 10px;
  border-top: 1px solid var(--se-line);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  background: var(--se-bg-1);
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
  border-radius: var(--se-r-sm);
  color: var(--se-fg-3);
  border: 1px solid var(--se-line-2);
  background: var(--se-bg-2);
  white-space: nowrap;
  flex-shrink: 0;
}
.subfoot-btn:hover { background: var(--se-bg-3); color: var(--se-fg); }
.subfoot-btn.dim { color: var(--se-fg-4); cursor: default; }
.subfoot-btn.dim:hover { background: var(--se-bg-2); color: var(--se-fg-4); }
.subfoot-btn.on {
  background: var(--se-accent-soft);
  color: var(--se-accent);
  border-color: color-mix(in oklab, var(--se-accent) 30%, transparent);
}
.subfoot-btn .dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--se-fg-4);
}
.subfoot-btn.on .dot { background: var(--se-accent); box-shadow: 0 0 0 3px var(--se-accent-soft); }
.subfoot-sel {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-2);
  color: var(--se-fg-3);
  border: 1px solid var(--se-line-2);
  max-width: 110px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.subfoot-sel:focus { border-color: var(--se-accent); }

/* Row list \u2014 mirrors the design's .dt-item: icon \xB7 label \xB7 value \xB7 control. */
.row {
  display: flex;
  align-items: center;
  padding: 9px 10px;
  border-radius: 6px;
  gap: 10px;
  margin-bottom: 1px;
}
.row:hover { background: var(--se-bg-1); }
.row-ic {
  width: 22px;
  height: 22px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-3);
  border: 1px solid var(--se-line-2);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--se-fg-3);
}
.row-name {
  flex: 1;
  font-family: var(--se-mono);
  font-size: 12px;
  color: var(--se-fg-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-sub {
  font-family: var(--se-mono);
  font-size: 10.5px;
  color: var(--se-fg-4);
  margin-top: 2px;
  letter-spacing: 0.02em;
}

/* Badges */
.badge {
  font-family: var(--se-mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid transparent;
}
.badge-on  {
  background: var(--se-accent-soft);
  color: var(--se-accent);
  border-color: color-mix(in oklab, var(--se-accent) 30%, transparent);
}
.badge-off {
  background: var(--se-danger-soft);
  color: var(--se-danger);
  border-color: color-mix(in oklab, var(--se-danger) 30%, transparent);
}
.badge-run {
  background: rgba(96,165,250,0.14);
  color: #60a5fa;
  border-color: rgba(96,165,250,0.30);
}
.badge-draft, .badge-stop {
  background: var(--se-bg-2);
  color: var(--se-fg-4);
  border-color: var(--se-line-2);
}

/* Toggle group */
.tog {
  display: flex;
  border-radius: var(--se-r-sm);
  overflow: hidden;
  border: 1px solid var(--se-line-2);
  flex-shrink: 0;
  background: var(--se-bg-2);
}
.tog-btn {
  all: unset;
  cursor: pointer;
  font-family: var(--se-mono);
  font-size: 10px;
  padding: 3px 7px;
  color: var(--se-fg-4);
  background: transparent;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
.tog-btn:hover { background: var(--se-bg-3); color: var(--se-fg-3); }
.tog-btn.sel { background: var(--se-accent); color: var(--se-accent-fg); }

/* Buttons */
.ibtn {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-2);
  color: var(--se-fg-3);
  border: 1px solid var(--se-line-2);
  white-space: nowrap;
  flex-shrink: 0;
}
.ibtn:hover { background: var(--se-bg-3); color: var(--se-fg); }
.ibtn.pri {
  background: var(--se-accent);
  color: var(--se-accent-fg);
  border-color: transparent;
  font-weight: 500;
}
.ibtn.pri:hover { background: color-mix(in oklab, var(--se-accent) 88%, white); }
.ibtn.danger {
  color: var(--se-danger);
  border-color: color-mix(in oklab, var(--se-danger) 30%, transparent);
  background: var(--se-danger-soft);
}
.ibtn.danger:hover { background: color-mix(in oklab, var(--se-danger) 22%, transparent); color: var(--se-fg); }
.ibtn:disabled { opacity: 0.4; cursor: default; }

/* Select */
.sel-input {
  all: unset;
  cursor: pointer;
  font-family: var(--se-mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-2);
  color: var(--se-fg-2);
  border: 1px solid var(--se-line-2);
  flex-shrink: 0;
}
.sel-input:focus { border-color: var(--se-accent); }

/* Config value editor */
.mono {
  font-family: var(--se-mono);
  font-size: 11px;
  color: var(--se-fg-3);
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
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
  color: var(--se-fg);
  font-family: var(--se-mono);
  font-size: 11px;
  resize: vertical;
  min-height: 56px;
  line-height: 1.5;
  margin-top: 4px;
}
textarea.editor:focus { border-color: var(--se-accent); outline: none; }
.edit-row { display: flex; gap: 4px; margin-top: 4px; }

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--se-line);
  flex-shrink: 0;
  padding: 0 8px;
  gap: 2px;
  background: var(--se-bg-1);
}
.tab {
  all: unset;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  padding: 8px 10px;
  color: var(--se-fg-3);
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px;
  transition: color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.tab:hover { color: var(--se-fg-2); }
.tab.active { color: var(--se-fg); border-bottom-color: var(--se-accent); }

/* Section header \u2014 mono uppercase with optional right-aligned counter (.sec-c). */
.sec-head {
  display: flex;
  align-items: center;
  font-family: var(--se-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--se-fg-4);
  padding: 9px 14px;
  background: var(--se-bg-1);
  border-top: 1px solid var(--se-line);
  border-bottom: 1px solid var(--se-line);
  margin: 6px -4px 4px;
}
.sec-head .sec-c {
  margin-left: auto;
  letter-spacing: 0;
  text-transform: none;
  font-size: 10.5px;
  color: var(--se-fg-4);
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
  background: linear-gradient(135deg, color-mix(in oklab, var(--se-accent) 80%, black) 0%, var(--se-accent) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 0 0 1px var(--se-line-2);
}
.auth-title { font-size: 14px; font-weight: 600; color: var(--se-fg); }
.auth-desc  { font-size: 11.5px; color: var(--se-fg-3); line-height: 1.5; }
.auth-status { font-size: 11px; color: var(--se-fg-3); min-height: 14px; }
.auth-err    { font-size: 11px; color: var(--se-danger); line-height: 1.4; }

/* States */
.loading { text-align: center; padding: 24px; color: var(--se-fg-4); font-size: 12px; }
.empty   { text-align: center; padding: 24px; color: var(--se-fg-4); font-size: 12px; }
.err     { text-align: center; padding: 24px; color: var(--se-danger); font-size: 12px; }

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
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--se-fg-3);
}
.empty-title { font-size: 13px; font-weight: 600; color: var(--se-fg-2); }
.empty-msg   { font-size: 11.5px; color: var(--se-fg-3); line-height: 1.5; max-width: 240px; }
.empty-cta {
  all: unset;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--se-accent);
  color: var(--se-accent-fg);
  text-decoration: none;
  transition: background 0.12s;
  margin-top: 4px;
}
.empty-cta:hover { background: color-mix(in oklab, var(--se-accent) 88%, white); }

/* Switch */
.sw { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.sw-track {
  width: 30px; height: 16px; border-radius: 8px;
  background: var(--se-bg-3); position: relative;
  transition: background 0.15s; flex-shrink: 0;
  border: 1px solid var(--se-line-2);
}
.sw-track.on { background: var(--se-accent); border-color: transparent; }
.sw-thumb {
  position: absolute; width: 12px; height: 12px;
  border-radius: 6px; background: #fff;
  top: 1px; left: 1px; transition: transform 0.15s;
}
.sw-track.on .sw-thumb { transform: translateX(14px); }
.sw-label { font-size: 12px; color: var(--se-fg-2); }

/* Foot status \u2014 green dot + small mono text, right-aligned shortcuts. */
.foot-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--se-fg-3);
  margin-right: auto;
}
.foot-status .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--se-accent);
  box-shadow: 0 0 6px var(--se-accent);
}
.foot-status b { font-weight: 500; color: var(--se-fg-2); }
.foot-hint {
  font-family: var(--se-mono);
  font-size: 10px;
  color: var(--se-fg-4);
  letter-spacing: 0.03em;
}

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
  border-radius: var(--se-r-sm);
  gap: 8px;
  font-size: 11.5px;
  line-height: 1.4;
  min-height: 22px;
}
.tree-row:hover { background: var(--se-bg-1); }
.tree-row.branch > .tree-seg { color: var(--se-fg-2); font-weight: 600; }
.tree-row.leaf   > .tree-seg { color: var(--se-fg-2); font-family: var(--se-mono); }
.tree-row.leaf   > .tree-val {
  flex: 1;
  text-align: right;
  color: var(--se-fg-3);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.tree-row.leaf > .tree-val.overridden {
  color: var(--se-accent);
  font-style: normal;
}
.tree-row .tree-caret {
  display: inline-block;
  width: 10px;
  color: var(--se-fg-3);
  font-size: 9px;
}

/* Label popper \u2014 floats next to a page [data-label] element */
.label-popper {
  position: fixed;
  z-index: 2147483647;
  width: 300px;
  max-width: calc(100vw - 24px);
  background: var(--se-bg);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-lg);
  box-shadow: 0 16px 40px rgba(0,0,0,0.55);
  font-family: var(--se-sans);
  font-size: 12px;
  color: var(--se-fg);
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
  border-bottom: 1px solid var(--se-line);
  gap: 8px;
  background: var(--se-bg-1);
}
.lp-key {
  flex: 1;
  font-family: var(--se-mono);
  font-size: 11px;
  color: var(--se-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-close {
  all: unset;
  cursor: pointer;
  color: var(--se-fg-3);
  width: 20px; height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 13px;
}
.lp-close:hover { color: var(--se-fg); background: var(--se-bg-2); }
.lp-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
.lp-field { display: flex; flex-direction: column; gap: 3px; }
.lp-field > label {
  font-family: var(--se-mono);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--se-fg-4);
}
.lp-field > span {
  font-size: 11px;
  color: var(--se-fg-2);
  line-height: 1.4;
}
.lp-field > span.empty { color: var(--se-fg-4); font-style: italic; }
.lp-input {
  all: unset;
  display: block;
  width: 100%;
  padding: 7px 9px;
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
  color: var(--se-fg);
  font-size: 12px;
  line-height: 1.4;
  min-height: 52px;
  font-family: var(--se-sans);
  box-sizing: border-box;
  resize: vertical;
}
.lp-input:focus { border-color: var(--se-accent); outline: none; }
.lp-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: var(--se-bg-1);
  border-top: 1px solid var(--se-line);
  justify-content: flex-end;
}

/* \u2500\u2500 Feedback (bugs / feature requests) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.se-feedback-head {
  display: flex;
  gap: 6px;
  padding: 6px 6px 8px;
  align-items: center;
}
.se-feedback-head .ibtn { flex-shrink: 0; }
.se-feedback-list { display: flex; flex-direction: column; gap: 1px; }
.se-feedback-row {
  text-decoration: none;
  color: inherit;
}

/* \u2500\u2500 Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.se-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: var(--se-sans);
  color: var(--se-fg);
  animation: se-modal-fade 0.12s ease-out;
}
@keyframes se-modal-fade { from { opacity: 0; } to { opacity: 1; } }
.se-modal {
  background: var(--se-bg);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-lg);
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  width: 100%;
  overflow: hidden;
}
.se-modal-md { max-width: 480px; }
.se-modal-lg { max-width: 720px; }
.se-modal-head {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--se-line);
  gap: 10px;
  background: var(--se-bg-1);
  flex-shrink: 0;
}
.se-modal-title { flex: 1; font-size: 14px; font-weight: 600; }
.se-modal-close {
  all: unset;
  cursor: pointer;
  color: var(--se-fg-3);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.se-modal-close svg { width: 14px; height: 14px; }
.se-modal-close:hover { color: var(--se-fg); background: var(--se-bg-2); }
.se-modal-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}
.se-modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--se-line);
  margin-top: auto;
}

/* \u2500\u2500 Form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.se-form { display: flex; flex-direction: column; gap: 12px; }
.se-field { display: flex; flex-direction: column; gap: 4px; }
.se-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 520px) {
  .se-field-row { grid-template-columns: 1fr; }
}
.se-label {
  font-family: var(--se-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--se-fg-4);
}
.se-input {
  all: unset;
  display: block;
  width: 100%;
  padding: 8px 10px;
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
  color: var(--se-fg);
  font-size: 12.5px;
  line-height: 1.45;
  font-family: var(--se-sans);
  box-sizing: border-box;
}
.se-input:focus { border-color: var(--se-accent); outline: none; }
.se-textarea { resize: vertical; min-height: 64px; font-family: var(--se-sans); }
select.se-input { cursor: pointer; }

.se-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.se-attach-list { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.se-attach-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  font-size: 11.5px;
  color: var(--se-fg-2);
  gap: 8px;
}
.se-attach-item .dim { color: var(--se-fg-4); }
.se-status { font-size: 11px; color: var(--se-fg-3); min-height: 14px; }

/* \u2500\u2500 Annotator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.se-annot { display: flex; flex-direction: column; gap: 8px; }
.se-annot-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px;
  background: var(--se-bg-1);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
}
.se-annot-btn {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--se-r-sm);
  background: var(--se-bg-2);
  color: var(--se-fg-3);
  border: 1px solid var(--se-line-2);
}
.se-annot-btn:hover { color: var(--se-fg); background: var(--se-bg-3); }
.se-annot-btn.on {
  background: var(--se-accent-soft);
  color: var(--se-accent);
  border-color: color-mix(in oklab, var(--se-accent) 30%, transparent);
}
.se-annot-sep {
  width: 1px;
  height: 18px;
  background: var(--se-line-2);
  margin: 0 4px;
}
.se-annot-swatch {
  all: unset;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
}
.se-annot-swatch.on { border-color: var(--se-fg); }
.se-annot-stage {
  position: relative;
  background: #000;
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
  overflow: hidden;
  max-height: 60vh;
  display: flex;
  justify-content: center;
}
.se-annot-canvas {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  height: auto;
  width: auto;
}
.se-annot-host { display: flex; flex-direction: column; gap: 8px; }

/* Edit-labels highlight (.__se_label_target) lives in panels/i18n.ts and
 * is injected directly into document.head \u2014 these elements are in the
 * customer page DOM, outside our shadow root, so shadow CSS can't reach
 * them. */
`;
  var Q = "se_dt_session";
  function xe() {
    try {
      let e = sessionStorage.getItem(Q);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function st(e) {
    try {
      sessionStorage.setItem(Q, JSON.stringify(e));
    } catch {}
  }
  function ye() {
    try {
      sessionStorage.removeItem(Q);
    } catch {}
  }
  async function we(e, t) {
    let n = new URL(e.adminUrl).origin,
      o = window.location.origin,
      r = `shipeasy-devtools-auth-${Date.now()}`,
      i = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(o)}`,
        r,
        "width=460,height=640,noopener=no",
      );
    if (!i) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      i.focus();
    } catch {}
    return (
      t(),
      new Promise((s, a) => {
        let d = !1;
        function m(f, p) {
          d ||
            ((d = !0),
            window.removeEventListener("message", c),
            clearInterval(E),
            clearTimeout(y),
            f ? a(f) : s(p));
        }
        function c(f) {
          if (f.origin !== n) return;
          let p = f.data;
          if (!p || p.type !== "se:devtools-auth" || !p.token || !p.projectId) return;
          let b = { token: p.token, projectId: p.projectId };
          (st(b), m(null, b));
        }
        window.addEventListener("message", c);
        let x = Date.now(),
          E = setInterval(() => {
            Date.now() - x < 1500 ||
              (i.closed && !d && m(new Error("Sign-in window closed before approval.")));
          }, 500),
          y = setTimeout(() => {
            m(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var at = /^(true|on|1|yes)$/i,
    it = /^(false|off|0|no)$/i,
    ke = /^se(?:_|-|$)/;
  function W(e) {
    return at.test(e) ? !0 : it.test(e) ? !1 : null;
  }
  function ee(e) {
    if (e.startsWith("b64:"))
      try {
        let t = atob(e.slice(4).replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(t);
      } catch {
        return e;
      }
    try {
      return JSON.parse(e);
    } catch {
      return e;
    }
  }
  function Ee(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function G() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function R(e, t) {
    let n = G(),
      o = n.get(e);
    if (o !== null) return o;
    if (t) {
      let r = n.get(t);
      if (r !== null) return r;
    }
    return null;
  }
  function P(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, o] of e) o === null ? t.searchParams.delete(n) : t.searchParams.set(n, o);
    window.location.assign(t.toString());
  }
  function Le() {
    if (typeof window > "u") return !1;
    let e = G();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function I() {
    return typeof window > "u" ? !1 : G().has("se_edit_labels");
  }
  function te(e) {
    P([["se_edit_labels", e ? "1" : null]]);
  }
  function ne(e) {
    let t = R(`se_ks_${e}`) ?? R(`se_gate_${e}`) ?? R(`se-gate-${e}`);
    return t === null ? null : W(t);
  }
  function Se(e, t, n = "session") {
    P([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function oe(e) {
    let t = R(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return ee(t);
  }
  function re(e, t, n = "session") {
    P([
      [`se_config_${e}`, t == null ? null : Ee(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Me(e) {
    let t = R(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function Te(e, t, n = "session") {
    P([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function se() {
    return R("se_i18n");
  }
  function $e(e, t = "session") {
    P([["se_i18n", e]]);
  }
  function Re() {
    return R("se_i18n_draft");
  }
  function _e(e, t = "session") {
    P([["se_i18n_draft", e]]);
  }
  function J(e) {
    return R(`se_i18n_label_${e}`);
  }
  function ae(e, t, n = "session") {
    P([[`se_i18n_label_${e}`, t]]);
  }
  function Ae() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) ke.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function ie(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let o of [...n.searchParams.keys()]) ke.test(o) && n.searchParams.delete(o);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [o, r] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${o}`, r ? "true" : "false");
    for (let [o, r] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${o}`, r);
    for (let [o, r] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${o}`, Ee(r));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [o, r] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${o}`, r);
    return n.toString();
  }
  function le() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = G();
    for (let [n, o] of t)
      if (n.startsWith("se_ks_")) {
        let r = W(o);
        r !== null && (e.gates[n.slice(6)] = r);
      } else if (n.startsWith("se_gate_")) {
        let r = W(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else if (n.startsWith("se-gate-")) {
        let r = W(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = o)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = ee(o))
            : n === "se_i18n"
              ? (e.i18nProfile = o)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = o)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = o);
    return e;
  }
  function Pe(e) {
    if (typeof window > "u") return;
    let t = { ...le(), ...e, openDevtools: !0 },
      n = ie(t);
    window.location.assign(n);
  }
  var V = class {
    constructor(t, n) {
      Z(this, "adminUrl", t);
      Z(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let r = "";
        try {
          let i = await n.json();
          r = i.detail ?? i.error ?? "";
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
    async configs() {
      let t = await this.get("/api/admin/configs"),
        n = "prod";
      return await Promise.all(
        t.map(async (r) => {
          try {
            let i = await this.get(`/api/admin/configs/${r.id}`),
              s = i.valueJson !== void 0 ? i.valueJson : (i.values?.[n] ?? null);
            return { ...r, valueJson: s };
          } catch {
            return { ...r, valueJson: null };
          }
        }),
      );
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
    async post(t, n) {
      let o = await fetch(`${this.adminUrl}${t}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (!o.ok) {
        let r = "";
        try {
          let i = await o.json();
          r = i.detail ?? i.error ?? "";
        } catch {
          try {
            r = (await o.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${o.status}${r ? ` \u2014 ${r}` : ""}`);
      }
      return await o.json();
    }
    bugs() {
      return this.get("/api/admin/bugs");
    }
    createBug(t) {
      return this.post("/api/admin/bugs", t);
    }
    featureRequests() {
      return this.get("/api/admin/feature-requests");
    }
    createFeatureRequest(t) {
      return this.post("/api/admin/feature-requests", t);
    }
    async uploadAttachment(t) {
      let n = new FormData();
      (n.append("reportKind", t.reportKind),
        n.append("reportId", t.reportId),
        n.append("kind", t.kind),
        n.append("filename", t.filename),
        n.append("file", t.blob, t.filename));
      let o = await fetch(`${this.adminUrl}/api/admin/reports/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: n,
      });
      if (!o.ok) {
        let r = "";
        try {
          r = (await o.json()).error ?? "";
        } catch {}
        throw new Error(`upload failed \u2192 HTTP ${o.status}${r ? ` \u2014 ${r}` : ""}`);
      }
      return await o.json();
    }
    async keys(t) {
      let n = t ? `?profile_id=${encodeURIComponent(t)}` : "",
        o = await this.get(`/api/admin/i18n/keys${n}`);
      return Array.isArray(o) ? o : o && Array.isArray(o.keys) ? o.keys : [];
    }
  };
  function $(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${de(e.title)}</div>
      <div class="empty-msg">${de(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${de(e.ctaLabel)}</a>
    </div>`;
  }
  function de(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function lt() {
    return window.__shipeasy ?? null;
  }
  function dt(e) {
    let t = ne(e.name),
      n = lt()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function ct(e, t) {
    let n = (o) => (t === (o === "on" ? !0 : o === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function Ce(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = $({
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
          (i) => `
        <div class="row">
          <div>
            <div class="row-name">${i.name}</div>
            <div class="row-sub">${(i.rolloutPct / 100).toFixed(i.rolloutPct % 100 === 0 ? 0 : 2)}% rollout</div>
          </div>
          ${dt(i)}
          ${ct(i.name, ne(i.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((i) => {
          i.addEventListener("click", () => {
            let s = i.closest("[data-gate]").dataset.gate,
              a = i.dataset.v;
            (Se(s, a === "default" ? null : a === "on"), o());
          });
        }));
    }
    o();
    let r = () => o();
    window.addEventListener("se:state:update", r);
  }
  function pt(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function ut(e) {
    return oe(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function He(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = $({
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
        .map((s) => {
          let a = oe(s.name),
            l = a !== void 0 ? a : s.valueJson,
            d = o.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${ut(s.name)}
              ${d ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              d
                ? `
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(l, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${a !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${pt(l)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((s) => {
          s.addEventListener("click", () => {
            (o.add(s.dataset.name), r());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((s) => {
          s.addEventListener("click", () => {
            (o.delete(s.dataset.name), r());
          });
        }));
      function i(s, a) {
        let l = s.dataset.name,
          d = e.querySelector(`textarea[data-name="${l}"]`);
        if (d)
          try {
            let m = JSON.parse(d.value);
            (re(l, m, a), o.delete(l), r());
          } catch {
            d.style.borderColor = "#f87171";
          }
      }
      (e.querySelectorAll(".save-session").forEach((s) => {
        s.addEventListener("click", () => i(s, "session"));
      }),
        e.querySelectorAll(".save-local").forEach((s) => {
          s.addEventListener("click", () => i(s, "local"));
        }),
        e.querySelectorAll(".clear-ov").forEach((s) => {
          s.addEventListener("click", () => {
            (re(s.dataset.name, null), o.delete(s.dataset.name), r());
          });
        }));
    }
    r();
  }
  function ft() {
    return window.__shipeasy ?? null;
  }
  function gt(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function mt(e) {
    let t = Me(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      o = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${o}</select>`;
  }
  function vt(e) {
    let t = ft()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function bt(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${gt(e.status)}
      ${e.status === "running" ? vt(e.name) : ""}
      ${e.status === "running" ? mt(e) : ""}
    </div>`;
  }
  function Oe(e, t, n, o) {
    let r = n.filter((l) => l.universe === t.name);
    if (r.length === 0) {
      e.innerHTML = $({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${o}/dashboard/experiments/new`,
      });
      return;
    }
    let i = r.filter((l) => l.status === "running"),
      s = r.filter((l) => l.status !== "running"),
      a = (l, d) => (l.length === 0 ? "" : `<div class="sec-head">${d}</div>${l.map(bt).join("")}`);
    ((e.innerHTML = a(i, "Running") + a(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((l) => {
        l.addEventListener("change", () => {
          let d = l.dataset.name;
          Te(d, l.value || null);
        });
      }));
  }
  async function Be(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, o;
    try {
      [n, o] = await Promise.all([t.experiments(), t.universes()]);
    } catch (s) {
      e.innerHTML = `<div class="err">Failed to load: ${String(s)}</div>`;
      return;
    }
    if (o.length === 0) {
      e.innerHTML = $({
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
    function i() {
      let s = o
        .map(
          (d) => `
          <button class="tab${d.name === r.activeUniverse ? " active" : ""}"
                  data-universe="${d.name}">${d.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${s}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((d) => {
          d.addEventListener("click", () => {
            ((r.activeUniverse = d.dataset.universe), i());
          });
        }));
      let a = e.querySelector(".tab-body"),
        l = o.find((d) => d.name === r.activeUniverse);
      Oe(a, l, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          a = o.find((l) => l.name === r.activeUniverse);
        s && a && Oe(s, a, n, t.adminUrl);
      }));
  }
  var Y = "\uFFF9";
  var C = /￹([^￺￻]+)￺([^￻]*)￻/g;
  function ht(e) {
    let t = new Map();
    for (let n of e) {
      let o = n.key.split("."),
        r = o.length > 1 ? o[0] : "(root)",
        i = o.length > 1 ? o.slice(1) : o;
      t.has(r) || t.set(r, { segment: r, children: [] });
      let s = t.get(r);
      for (let a = 0; a < i.length; a++) {
        let l = i[a],
          d = s.children.find((m) => m.segment === l);
        (d || ((d = { segment: l, children: [] }), s.children.push(d)), (s = d));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) Ie(n);
    return t;
  }
  function Ie(e) {
    e.children.sort((t, n) => {
      let o = t.value !== void 0,
        r = n.value !== void 0;
      return o !== r ? (o ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Ie(t);
  }
  function S(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ne(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let r = e.fullKey ? J(e.fullKey) : null,
        i = r ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${S(e.fullKey ?? "")}">
        <span class="tree-seg">${S(e.segment)}</span>
        <span class="tree-val${r !== null ? " overridden" : ""}" title="${S(i)}">${S(i)}</span>
      </div>`;
    }
    let o = e.children.map((r) => Ne(r, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${S(e.segment)}</span>
    </div>
    ${o}`;
  }
  var _ = "__se_label_target",
    pe = "__se_label_target_style",
    B = !1,
    ce = null,
    q = null;
  function xt() {
    if (document.getElementById(pe)) return;
    let e = document.createElement("style");
    ((e.id = pe),
      (e.textContent = `
    .${_} {
      outline: 2px solid #4ade80 !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      background-color: color-mix(in oklab, #4ade80 14%, transparent) !important;
      border-radius: 3px !important;
      box-shadow: 0 0 0 1px color-mix(in oklab, #4ade80 25%, transparent) !important;
      transition:
        background-color 0.12s,
        box-shadow 0.12s,
        outline-color 0.12s !important;
      position: relative;
    }
    .${_}:hover,
    .${_}.__se_label_active {
      background-color: color-mix(in oklab, #4ade80 28%, transparent) !important;
      box-shadow:
        0 0 0 4px color-mix(in oklab, #4ade80 35%, transparent),
        0 4px 14px color-mix(in oklab, #4ade80 30%, transparent) !important;
      outline-color: #6ee7a0 !important;
      z-index: 1;
    }
  `),
      document.head.appendChild(e));
  }
  function qe() {
    document.getElementById(pe)?.remove();
  }
  function ue(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      o = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      r;
    for (; (r = t.nextNode()); ) {
      let a = r.nodeValue ?? "";
      if (
        !a.includes(Y) ||
        o.has(r.parentElement?.tagName ?? "") ||
        r.parentElement?.closest?.("[data-label]")
      )
        continue;
      let l = document.createDocumentFragment(),
        d = 0;
      C.lastIndex = 0;
      let m;
      for (; (m = C.exec(a)) !== null; ) {
        m.index > d && l.appendChild(document.createTextNode(a.slice(d, m.index)));
        let c = document.createElement("span");
        c.setAttribute("data-label", m[1]);
        let x = J(m[1]);
        ((c.textContent = x ?? m[2]), l.appendChild(c), (d = m.index + m[0].length));
      }
      (d < a.length && l.appendChild(document.createTextNode(a.slice(d))), n.push([r, l]));
    }
    for (let [a, l] of n) a.parentNode?.replaceChild(l, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let l = a.textContent ?? "",
        d = a.getAttribute("data-label"),
        m = J(d);
      if (l.includes(Y)) {
        C.lastIndex = 0;
        let c = C.exec(l);
        c && (a.textContent = m ?? c[2]);
      } else if (i)
        try {
          let c = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            x = i(d, c);
          x && x !== d ? (a.textContent = m ?? x) : m && (a.textContent = m);
        } catch {}
    }
    let s = ["placeholder", "alt", "aria-label", "title"];
    for (let a of s)
      for (let l of Array.from(document.querySelectorAll(`[${a}]`))) {
        let d = l.getAttribute(a);
        if (!d.includes(Y)) continue;
        C.lastIndex = 0;
        let m = C.exec(d);
        m && l.setAttribute(a, m[2]);
      }
    return n.length;
  }
  function N() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function H() {
    (q?.remove(),
      (q = null),
      document.querySelectorAll(`.${_}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function yt(e, t) {
    (H(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      o = e.dataset.labelDesc ?? "",
      i = se() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let s = e.textContent ?? "",
      a = document.createElement("div");
    ((a.className = "label-popper"),
      (a.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${S(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${S(i)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${o ? "" : "empty"}">${o ? S(o) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${S(s)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>`),
      t.appendChild(a));
    let l = e.getBoundingClientRect(),
      d = a.offsetHeight,
      m = a.offsetWidth,
      c = 8,
      x = l.bottom + c;
    x + d > window.innerHeight - 8 && (x = Math.max(8, l.top - d - c));
    let E = l.left;
    (E + m > window.innerWidth - 8 && (E = Math.max(8, window.innerWidth - m - 8)),
      (a.style.top = `${x}px`),
      (a.style.left = `${E}px`));
    let y = a.querySelector(".lp-input");
    (y.focus(),
      y.select(),
      a.querySelector(".lp-close").addEventListener("click", H),
      a.querySelector('[data-action="save"]').addEventListener("click", () => {
        let f = y.value;
        ((e.textContent = f),
          ae(n, f),
          window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: n, value: f } })),
          H());
      }),
      a.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let f = e.dataset.__seOriginal ?? "";
        ((e.textContent = f),
          ae(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          H());
      }),
      a.addEventListener("click", (f) => f.stopPropagation()),
      a.addEventListener("mousedown", (f) => f.stopPropagation()),
      (q = a));
  }
  function De(e, t, n) {
    if (((B = e), ce?.(), (ce = null), !e)) {
      H();
      for (let c of N()) c.classList.remove(_);
      qe();
      return;
    }
    xt();
    for (let c of N()) c.classList.add(_);
    function o(c) {
      return q !== null && c.composedPath().includes(q);
    }
    function r(c) {
      for (let x of c.composedPath())
        if (x instanceof HTMLElement && x.hasAttribute("data-label")) return x;
      return null;
    }
    let i = [
      "mousedown",
      "mouseup",
      "pointerdown",
      "pointerup",
      "touchstart",
      "touchend",
      "dblclick",
      "contextmenu",
      "submit",
      "auxclick",
    ];
    function s(c) {
      o(c) || (r(c) && (c.preventDefault(), c.stopPropagation(), c.stopImmediatePropagation()));
    }
    function a(c) {
      if (o(c)) return;
      let x = r(c);
      x && (c.preventDefault(), c.stopPropagation(), c.stopImmediatePropagation(), yt(x, t));
    }
    function l(c) {
      q && (o(c) || r(c) || H());
    }
    function d(c) {
      c.key === "Escape" && H();
    }
    let m = new MutationObserver(() => {
      if (B) {
        for (let c of N()) c.classList.add(_);
        n();
      }
    });
    m.observe(document.body, { childList: !0, subtree: !0 });
    for (let c of i) document.addEventListener(c, s, !0);
    (document.addEventListener("click", a, !0),
      document.addEventListener("mousedown", l, !0),
      document.addEventListener("keydown", d),
      (ce = () => {
        for (let c of i) document.removeEventListener(c, s, !0);
        (document.removeEventListener("click", a, !0),
          document.removeEventListener("mousedown", l, !0),
          document.removeEventListener("keydown", d),
          m.disconnect());
        for (let c of N()) c.classList.remove(_);
        qe();
      }));
  }
  async function ze(e, t, n, o) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'), (n.innerHTML = ""));
    let r, i, s;
    try {
      [r, i, s] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (x) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(x)}</div>`;
      return;
    }
    let a = ht(s),
      l = Array.from(a.keys()),
      d = { activeChunk: l[0] ?? null };
    function m() {
      if (l.length === 0) {
        e.innerHTML = $({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let x = l
          .map(
            (f) =>
              `<button class="tab${f === d.activeChunk ? " active" : ""}" data-chunk="${S(f)}">${S(f)}</button>`,
          )
          .join(""),
        E = d.activeChunk ? a.get(d.activeChunk) : null,
        y = E ? E.children.map((f) => Ne(f, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${x}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${y}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((f) => {
          f.addEventListener("click", () => {
            ((d.activeChunk = f.dataset.chunk), m());
          });
        }));
    }
    function c() {
      let x = se() ?? "",
        E = Re() ?? "",
        y = N().length,
        f = B
          ? `Editing ${y} label${y === 1 ? "" : "s"}`
          : y === 0
            ? "No labels found"
            : `Edit labels (${y})`,
        p =
          y === 0
            ? "No translatable elements found. Use t() / tEl() / <ShipEasyI18nString> in your templates."
            : "Toggle in-page label editing (reloads page)",
        b = [
          '<option value="">Default</option>',
          ...r.map(
            (w) =>
              `<option value="${S(w.id)}" ${x === w.id ? "selected" : ""}>${S(w.name)}</option>`,
          ),
        ].join(""),
        k = [
          '<option value="">No draft</option>',
          ...i.map(
            (w) =>
              `<option value="${S(w.id)}" ${E === w.id ? "selected" : ""}>${S(w.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${B ? " on" : ""}${y === 0 ? " dim" : ""}" id="se-edit-toggle" title="${S(p)}">
        <span class="dot"></span>
        ${S(f)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${b}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${k}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          I() ? te(!1) : B ? (De(!1, o, () => c()), c()) : te(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (w) => {
          let h = w.target.value || null;
          $e(h);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (w) => {
          let h = w.target.value || null;
          _e(h);
        }));
    }
    (I() && (ue(), B || De(!0, o, () => c())), m(), c());
  }
  function z(e, t) {
    let n = document.createElement("div");
    n.className = "se-modal-overlay";
    let o = document.createElement("div");
    ((o.className = `se-modal se-modal-${t.size ?? "md"}`), n.appendChild(o));
    let r = document.createElement("div");
    r.className = "se-modal-head";
    let i = document.createElement("div");
    ((i.className = "se-modal-title"), (i.textContent = t.title));
    let s = document.createElement("button");
    ((s.className = "se-modal-close"),
      (s.type = "button"),
      s.setAttribute("aria-label", "Close"),
      (s.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'),
      r.appendChild(i),
      r.appendChild(s),
      o.appendChild(r));
    let a = document.createElement("div");
    ((a.className = "se-modal-body"), o.appendChild(a));
    function l() {
      (n.removeEventListener("click", d),
        document.removeEventListener("keydown", m),
        n.remove(),
        t.onClose?.());
    }
    function d(c) {
      c.target === n && l();
    }
    function m(c) {
      c.key === "Escape" && l();
    }
    return (
      n.addEventListener("click", d),
      document.addEventListener("keydown", m),
      s.addEventListener("click", l),
      e.appendChild(n),
      { body: a, root: o, close: l }
    );
  }
  async function Ue() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 });
    try {
      let t = document.createElement("video");
      ((t.srcObject = e),
        (t.muted = !0),
        (t.playsInline = !0),
        await new Promise((a, l) => {
          let d = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(d), a());
          }),
            (t.onerror = () => {
              (clearTimeout(d), l(new Error("Capture stream errored")));
            }));
        }),
        await t.play(),
        await new Promise((a) => requestAnimationFrame(() => a(null))));
      let n = t.videoWidth,
        o = t.videoHeight;
      if (!n || !o) throw new Error("Capture stream returned no frames.");
      let r = document.createElement("canvas");
      ((r.width = n), (r.height = o));
      let i = r.getContext("2d");
      if (!i) throw new Error("Canvas 2d context unavailable");
      return (
        i.drawImage(t, 0, 0, n, o),
        await new Promise((a, l) => {
          r.toBlob((d) => (d ? a(d) : l(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      e.getTracks().forEach((t) => t.stop());
    }
  }
  async function Fe() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((s) =>
          MediaRecorder.isTypeSupported(s),
        ) ?? "",
      o = n ? new MediaRecorder(e, { mimeType: n }) : new MediaRecorder(e),
      r = [];
    (o.addEventListener("dataavailable", (s) => {
      s.data && s.data.size > 0 && r.push(s.data);
    }),
      o.start(500),
      e.getVideoTracks()[0]?.addEventListener("ended", () => {
        o.state !== "inactive" && o.stop();
      }));
    function i() {
      e.getTracks().forEach((s) => s.stop());
    }
    return {
      stop() {
        return new Promise((s, a) => {
          if (o.state === "inactive") {
            if ((i(), r.length === 0)) {
              a(new Error("No recording data."));
              return;
            }
            s(new Blob(r, { type: n || "video/webm" }));
            return;
          }
          (o.addEventListener(
            "stop",
            () => {
              (i(), s(new Blob(r, { type: n || "video/webm" })));
            },
            { once: !0 },
          ),
            o.addEventListener("error", (l) => a(l), { once: !0 }),
            o.stop());
        });
      },
      cancel() {
        (o.state !== "inactive" && o.stop(), i());
      },
    };
  }
  var je = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Ke(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((u, v) => {
        let g = new Image();
        ((g.onload = () => u(g)),
          (g.onerror = () => v(new Error("Failed to load screenshot for annotation."))),
          (g.src = t));
      }),
      o = document.createElement("div");
    o.className = "se-annot";
    let r = document.createElement("div");
    ((r.className = "se-annot-toolbar"), o.appendChild(r));
    let i = "arrow",
      s = je[0],
      a = [];
    function l(u, v) {
      let g = document.createElement("button");
      return (
        (g.type = "button"),
        (g.className = "se-annot-btn"),
        (g.dataset.tool = u),
        (g.textContent = v),
        g.addEventListener("click", () => {
          ((i = u),
            r
              .querySelectorAll("[data-tool]")
              .forEach((L) => L.classList.toggle("on", L.dataset.tool === u)));
        }),
        g
      );
    }
    let d = l("arrow", "\u2197 arrow");
    (d.classList.add("on"),
      r.appendChild(d),
      r.appendChild(l("rect", "\u25AD rect")),
      r.appendChild(l("text", "T text")));
    let m = document.createElement("span");
    ((m.className = "se-annot-sep"), r.appendChild(m));
    for (let u of je) {
      let v = document.createElement("button");
      ((v.type = "button"),
        (v.className = "se-annot-swatch"),
        (v.dataset.color = u),
        (v.style.background = u),
        u === s && v.classList.add("on"),
        v.addEventListener("click", () => {
          ((s = u),
            r
              .querySelectorAll("[data-color]")
              .forEach((g) => g.classList.toggle("on", g.dataset.color === u)));
        }),
        r.appendChild(v));
    }
    let c = document.createElement("button");
    ((c.type = "button"),
      (c.className = "se-annot-btn"),
      (c.textContent = "\u21B6 undo"),
      c.addEventListener("click", () => {
        (a.pop(), w());
      }),
      r.appendChild(c));
    let x = document.createElement("button");
    ((x.type = "button"),
      (x.className = "se-annot-btn"),
      (x.textContent = "clear"),
      x.addEventListener("click", () => {
        ((a.length = 0), w());
      }),
      r.appendChild(x));
    let E = document.createElement("div");
    ((E.className = "se-annot-stage"), o.appendChild(E));
    let y = document.createElement("canvas");
    ((y.width = n.naturalWidth),
      (y.height = n.naturalHeight),
      (y.className = "se-annot-canvas"),
      (y.style.cursor = "crosshair"),
      (y.style.touchAction = "none"),
      E.appendChild(y));
    let f = y.getContext("2d");
    function p(u) {
      let v = y.getBoundingClientRect(),
        g = y.width / v.width,
        L = y.height / v.height;
      return { x: (u.clientX - v.left) * g, y: (u.clientY - v.top) * L };
    }
    function b() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function k(u) {
      if (
        (f.save(),
        (f.strokeStyle = u.color),
        (f.fillStyle = u.color),
        (f.lineWidth = b()),
        (f.lineCap = "round"),
        (f.lineJoin = "round"),
        u.tool === "rect")
      ) {
        let v = Math.min(u.x1, u.x2),
          g = Math.min(u.y1, u.y2),
          L = Math.abs(u.x2 - u.x1),
          M = Math.abs(u.y2 - u.y1);
        f.strokeRect(v, g, L, M);
      } else if (u.tool === "arrow") {
        (f.beginPath(), f.moveTo(u.x1, u.y1), f.lineTo(u.x2, u.y2), f.stroke());
        let v = Math.atan2(u.y2 - u.y1, u.x2 - u.x1),
          g = b() * 5;
        (f.beginPath(),
          f.moveTo(u.x2, u.y2),
          f.lineTo(u.x2 - g * Math.cos(v - Math.PI / 6), u.y2 - g * Math.sin(v - Math.PI / 6)),
          f.lineTo(u.x2 - g * Math.cos(v + Math.PI / 6), u.y2 - g * Math.sin(v + Math.PI / 6)),
          f.closePath(),
          f.fill());
      } else if (u.tool === "text" && u.text) {
        let v = Math.max(14, Math.round(n.naturalWidth / 60));
        ((f.font = `600 ${v}px ui-sans-serif, system-ui, sans-serif`), (f.textBaseline = "top"));
        let g = v * 0.3,
          M = f.measureText(u.text).width + g * 2,
          T = v + g * 2;
        ((f.fillStyle = "rgba(0,0,0,0.55)"),
          f.fillRect(u.x1, u.y1, M, T),
          (f.fillStyle = u.color),
          f.fillText(u.text, u.x1 + g, u.y1 + g));
      }
      f.restore();
    }
    function w(u) {
      (f.clearRect(0, 0, y.width, y.height), f.drawImage(n, 0, 0));
      for (let v of a) k(v);
      u && k(u);
    }
    w();
    let h = null;
    return (
      y.addEventListener("pointerdown", (u) => {
        u.preventDefault();
        let v = p(u);
        if (i === "text") {
          let g = prompt("Annotation text:");
          g &&
            g.trim() &&
            (a.push({ tool: "text", color: s, x1: v.x, y1: v.y, x2: v.x, y2: v.y, text: g.trim() }),
            w());
          return;
        }
        ((h = { x1: v.x, y1: v.y }), y.setPointerCapture(u.pointerId));
      }),
      y.addEventListener("pointermove", (u) => {
        if (!h) return;
        let v = p(u);
        w({ tool: i, color: s, x1: h.x1, y1: h.y1, x2: v.x, y2: v.y });
      }),
      y.addEventListener("pointerup", (u) => {
        if (!h) return;
        let v = p(u),
          g = Math.abs(v.x - h.x1),
          L = Math.abs(v.y - h.y1);
        ((g > 4 || L > 4) && a.push({ tool: i, color: s, x1: h.x1, y1: h.y1, x2: v.x, y2: v.y }),
          (h = null),
          w());
      }),
      {
        root: o,
        async export() {
          let u = await new Promise((v, g) => {
            y.toBlob((L) => (L ? v(L) : g(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), u);
        },
      }
    );
  }
  function U(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function wt(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function kt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function We(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let i;
      try {
        i = await t.bugs();
      } catch (a) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${U(String(a))}</div>`), r());
        return;
      }
      e.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-bug">+ File a bug</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/bugs">Open dashboard \u2197</a>
      </div>
      <div class="se-feedback-list" id="se-bugs-list"></div>
    `;
      let s = e.querySelector("#se-bugs-list");
      (i.length === 0
        ? (s.innerHTML =
            '<div class="empty">No bugs filed yet. Spotted one? Hit \u201CFile a bug\u201D.</div>')
        : (s.innerHTML = i
            .map(
              (a) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/bugs/${a.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${U(a.title)}</div>
                <div class="row-sub">${kt(a.createdAt)}${a.reporterEmail ? ` \xB7 ${U(a.reporterEmail)}` : ""}</div>
              </div>
              ${wt(a.status)}
            </a>`,
            )
            .join("")),
        r());
    }
    function r() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => Et(t, n, o));
    }
    await o();
  }
  function Et(e, t, n) {
    let o = z(t, { title: "File a bug", size: "lg" }),
      r = [],
      i = null;
    o.body.innerHTML = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" id="se-b-title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field">
        <span class="se-label">Steps to reproduce</span>
        <textarea class="se-input se-textarea" id="se-b-steps" rows="4" placeholder="1. Go to\u2026&#10;2. Click\u2026"></textarea>
      </label>
      <div class="se-field-row">
        <label class="se-field">
          <span class="se-label">Actual result</span>
          <textarea class="se-input se-textarea" id="se-b-actual" rows="3"></textarea>
        </label>
        <label class="se-field">
          <span class="se-label">Expected result</span>
          <textarea class="se-input se-textarea" id="se-b-expected" rows="3"></textarea>
        </label>
      </div>
      <div class="se-field">
        <span class="se-label">Attachments</span>
        <div class="se-actions">
          <button type="button" class="ibtn" id="se-b-screenshot">\u{1F4F7} Screenshot</button>
          <button type="button" class="ibtn" id="se-b-record">\u23FA Record screen</button>
          <button type="button" class="ibtn" id="se-b-upload">\u{1F4CE} Upload file</button>
          <input type="file" id="se-b-file" hidden />
        </div>
        <div class="se-attach-list" id="se-b-attach"></div>
        <div class="se-status" id="se-b-status"></div>
      </div>
    </div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-b-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-b-submit">Submit</button>
    </div>
  `;
    let s = o.body.querySelector("#se-b-title"),
      a = o.body.querySelector("#se-b-steps"),
      l = o.body.querySelector("#se-b-actual"),
      d = o.body.querySelector("#se-b-expected"),
      m = o.body.querySelector("#se-b-attach"),
      c = o.body.querySelector("#se-b-status"),
      x = o.body.querySelector("#se-b-file"),
      E = o.body.querySelector("#se-b-record");
    function y() {
      if (r.length === 0) {
        m.innerHTML = "";
        return;
      }
      ((m.innerHTML = r
        .map(
          (p, b) => `
          <div class="se-attach-item">
            <span>${U(p.filename)} <span class="dim">(${(p.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${b}">remove</button>
          </div>`,
        )
        .join("")),
        m.querySelectorAll("button[data-idx]").forEach((p) => {
          p.addEventListener("click", () => {
            (r.splice(Number(p.dataset.idx), 1), y());
          });
        }));
    }
    function f(p, b = !1) {
      ((c.textContent = p), (c.style.color = b ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (o.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let p = await Ue();
        (f(""),
          Lt(t, p, (b) => {
            (r.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: b }),
              y());
          }));
      } catch (p) {
        f(String(p instanceof Error ? p.message : p), !0);
      }
    }),
      E.addEventListener("click", async () => {
        if (i) {
          try {
            ((E.disabled = !0), f("Finalizing recording\u2026"));
            let p = await i.stop();
            ((i = null),
              (E.textContent = "\u23FA Record screen"),
              E.classList.remove("danger"),
              r.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: p }),
              y(),
              f(""));
          } catch (p) {
            f(String(p instanceof Error ? p.message : p), !0);
          } finally {
            E.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((i = await Fe()),
            (E.textContent = "\u25A0 Stop recording"),
            E.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (p) {
          (f(String(p instanceof Error ? p.message : p), !0), (i = null));
        }
      }),
      o.body.querySelector("#se-b-upload").addEventListener("click", () => x.click()),
      x.addEventListener("change", () => {
        let p = x.files?.[0];
        p && (r.push({ kind: "file", filename: p.name, blob: p }), (x.value = ""), y());
      }),
      o.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (i && i.cancel(), o.close());
      }),
      o.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let p = o.body.querySelector("#se-b-submit"),
          b = s.value.trim();
        if (!b) {
          (f("Title is required", !0), s.focus());
          return;
        }
        ((p.disabled = !0), f("Submitting\u2026"));
        try {
          let k = await e.createBug({
            title: b,
            stepsToReproduce: a.value,
            actualResult: l.value,
            expectedResult: d.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let w = 0; w < r.length; w++) {
            let h = r[w];
            (f(`Uploading attachment ${w + 1}/${r.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: k.id,
                kind: h.kind,
                filename: h.filename,
                blob: h.blob,
              }));
          }
          (o.close(), n());
        } catch (k) {
          (f(String(k instanceof Error ? k.message : k), !0), (p.disabled = !1));
        }
      }));
  }
  function Lt(e, t, n) {
    let o = z(e, { title: "Annotate screenshot", size: "lg" });
    o.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let r = o.body.querySelector("#se-annot-host");
    ((r.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Ke(t)
        .then((i) => {
          ((r.innerHTML = ""),
            r.appendChild(i.root),
            o.body.querySelector("#se-a-cancel").addEventListener("click", () => o.close()),
            o.body.querySelector("#se-a-save").addEventListener("click", async () => {
              let s = await i.export();
              (o.close(), n(s));
            }));
        })
        .catch((i) => {
          r.innerHTML = `<div class="err">${U(String(i))}</div>`;
        }));
  }
  function fe(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function St(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Mt(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function Tt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function Ge(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let r;
      try {
        r = await t.featureRequests();
      } catch (s) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${fe(String(s))}</div>`;
        return;
      }
      e.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-fr">+ Request a feature</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/feature-requests">Open dashboard \u2197</a>
      </div>
      <div class="se-feedback-list" id="se-fr-list"></div>
    `;
      let i = e.querySelector("#se-fr-list");
      (r.length === 0
        ? (i.innerHTML = '<div class="empty">No feature requests yet.</div>')
        : (i.innerHTML = r
            .map(
              (s) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/feature-requests/${s.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${fe(s.title)}</div>
                <div class="row-sub">${Tt(s.createdAt)}${s.reporterEmail ? ` \xB7 ${fe(s.reporterEmail)}` : ""}</div>
              </div>
              ${Mt(s.importance)}
              ${St(s.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => $t(t, n, o)));
    }
    await o();
  }
  function $t(e, t, n) {
    let o = z(t, { title: "Request a feature", size: "lg" });
    o.body.innerHTML = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" id="se-f-title" placeholder="One-line summary of the feature" />
      </label>
      <label class="se-field">
        <span class="se-label">What would it do?</span>
        <textarea class="se-input se-textarea" id="se-f-desc" rows="4" placeholder="Describe the feature you'd like to see."></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Use case / why does it matter?</span>
        <textarea class="se-input se-textarea" id="se-f-use" rows="3" placeholder="Who needs this? What does it unlock?"></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Importance</span>
        <select class="se-input" id="se-f-imp">
          <option value="nice_to_have">Nice to have</option>
          <option value="important">Important</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div class="se-status" id="se-f-status"></div>
    </div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-f-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-f-submit">Submit</button>
    </div>
  `;
    let r = o.body.querySelector("#se-f-title"),
      i = o.body.querySelector("#se-f-desc"),
      s = o.body.querySelector("#se-f-use"),
      a = o.body.querySelector("#se-f-imp"),
      l = o.body.querySelector("#se-f-status");
    (o.body.querySelector("#se-f-cancel").addEventListener("click", () => o.close()),
      o.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let d = r.value.trim();
        if (!d) {
          ((l.textContent = "Title is required"), (l.style.color = "var(--se-danger)"), r.focus());
          return;
        }
        let m = o.body.querySelector("#se-f-submit");
        ((m.disabled = !0),
          (l.textContent = "Submitting\u2026"),
          (l.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: d,
            description: i.value,
            useCase: s.value,
            importance: a.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            o.close(),
            n());
        } catch (c) {
          ((l.textContent = String(c instanceof Error ? c.message : c)),
            (l.style.color = "var(--se-danger)"),
            (m.disabled = !1));
        }
      }));
  }
  var Rt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    _t =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    At =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Pt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    Ct =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Ht =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    Ot =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Bt =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    X = {
      gates: { icon: Rt, label: "Gates" },
      configs: { icon: _t, label: "Configs" },
      experiments: { icon: At, label: "Experiments" },
      i18n: { icon: Pt, label: "Translations" },
      bugs: { icon: Ct, label: "Bugs" },
      features: { icon: Ht, label: "Feature requests" },
    },
    Qe = "se_l_overlay",
    ge = "se_l_active_panel";
  function qt() {
    try {
      let e = sessionStorage.getItem(ge);
      if (e && e in X) return e;
    } catch {}
    return null;
  }
  function Je(e) {
    try {
      e === null ? sessionStorage.removeItem(ge) : sessionStorage.setItem(ge, e);
    } catch {}
  }
  var me = 240,
    Ve = 580,
    ve = 180,
    Ye = 700,
    Xe = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Dt() {
    try {
      let e = localStorage.getItem(Qe);
      if (e) return { ...Xe, ...JSON.parse(e) };
    } catch {}
    return { ...Xe };
  }
  function Ze(e) {
    try {
      localStorage.setItem(Qe, JSON.stringify(e));
    } catch {}
  }
  function It(e, t) {
    let n = window.innerWidth,
      o = window.innerHeight,
      r = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [o - t, "bottom"],
      ];
    r.sort((l, d) => l[0] - d[0]);
    let i = r[0][1],
      a = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / o) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: a };
  }
  function F(e, t, n, o) {
    let { edge: r, offsetPct: i, panelWidth: s, panelHeight: a } = o,
      l = window.innerWidth,
      d = window.innerHeight,
      m = r === "left" || r === "right",
      c = Math.max(me, Math.min(s, l - 80)),
      x = Math.max(ve, Math.min(a, d - 40)),
      E = (i / 100) * (m ? d : l),
      y = e.getBoundingClientRect(),
      f = m ? y.width || 52 : y.height || 52,
      p = e.style;
    ((p.top = p.bottom = p.left = p.right = p.transform = ""),
      (p.borderTop = p.borderBottom = p.borderLeft = p.borderRight = ""),
      (p.flexDirection = m ? "column" : "row"),
      (p.padding = m ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((p.right = "0"),
          (p.top = `${i}%`),
          (p.transform = "translateY(-50%)"),
          (p.borderRadius = "10px 0 0 10px"),
          (p.borderRight = "none"),
          (p.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((p.left = "0"),
            (p.top = `${i}%`),
            (p.transform = "translateY(-50%)"),
            (p.borderRadius = "0 10px 10px 0"),
            (p.borderLeft = "none"),
            (p.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((p.top = "0"),
              (p.left = `${i}%`),
              (p.transform = "translateX(-50%)"),
              (p.borderRadius = "0 0 10px 10px"),
              (p.borderTop = "none"),
              (p.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((p.bottom = "0"),
              (p.left = `${i}%`),
              (p.transform = "translateX(-50%)"),
              (p.borderRadius = "10px 10px 0 0"),
              (p.borderBottom = "none"),
              (p.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let b = t.style;
    if (
      ((b.top = b.bottom = b.left = b.right = b.transform = ""),
      (b.borderTop = b.borderBottom = b.borderLeft = b.borderRight = ""),
      (b.width = c + "px"),
      (b.height = x + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let w = Math.max(10, Math.min(d - x - 10, E - x / 2));
      ((b.right = f + "px"),
        (b.top = w + "px"),
        (b.borderRadius = "10px 0 0 10px"),
        (b.borderRight = "none"),
        (b.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let w = Math.max(10, Math.min(d - x - 10, E - x / 2));
      ((b.left = f + "px"),
        (b.top = w + "px"),
        (b.borderRadius = "0 10px 10px 0"),
        (b.borderLeft = "none"),
        (b.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let w = Math.max(10, Math.min(l - c - 10, E - c / 2));
      ((b.top = f + "px"),
        (b.left = w + "px"),
        (b.borderRadius = "0 0 10px 10px"),
        (b.borderTop = "none"),
        (b.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let w = Math.max(10, Math.min(l - c - 10, E - c / 2));
      ((b.bottom = f + "px"),
        (b.left = w + "px"),
        (b.borderRadius = "10px 10px 0 0"),
        (b.borderBottom = "none"),
        (b.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let k = n.style;
    ((k.top = k.bottom = k.left = k.right = k.width = k.height = ""),
      (n.dataset.dir = m ? "ew" : "ns"),
      m
        ? ((k.width = "10px"),
          (k.top = "0"),
          (k.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          r === "right" ? (k.left = "0") : (k.right = "0"))
        : ((k.height = "10px"),
          (k.left = "0"),
          (k.right = "0"),
          (n.style.cursor = "ns-resize"),
          r === "top" ? (k.bottom = "0") : (k.top = "0")));
  }
  function et(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${he}</style><div id="toolbar"></div><div id="panel"></div>`;
    let o = n.getElementById("toolbar"),
      r = n.getElementById("panel");
    ((o.className = "toolbar"), (r.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), r.appendChild(i));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), r.appendChild(s));
    let a = Dt(),
      l = null,
      d = xe(),
      m = qt();
    requestAnimationFrame(() => F(o, r, i, a));
    let c = document.createElement("div");
    ((c.className = "drag-handle"),
      (c.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (c.innerHTML = Bt),
      o.appendChild(c),
      c.addEventListener("mousedown", (h) => {
        (h.preventDefault(), c.classList.add("dragging"));
        let u = (g) => {
            let { edge: L, offsetPct: M } = It(g.clientX, g.clientY);
            ((a = { ...a, edge: L, offsetPct: M }), F(o, r, i, a));
          },
          v = () => {
            (c.classList.remove("dragging"),
              document.removeEventListener("mousemove", u),
              document.removeEventListener("mouseup", v),
              Ze(a));
          };
        (document.addEventListener("mousemove", u), document.addEventListener("mouseup", v));
      }));
    let x = new Map();
    for (let [h, { icon: u, label: v }] of Object.entries(X)) {
      let g = document.createElement("button");
      ((g.className = "btn"),
        (g.title = v),
        (g.innerHTML = u),
        g.addEventListener("click", () => p(h)),
        o.appendChild(g),
        x.set(h, g));
    }
    i.addEventListener("mousedown", (h) => {
      (h.preventDefault(), h.stopPropagation(), i.classList.add("dragging"));
      let u = h.clientX,
        v = h.clientY,
        g = a.panelWidth,
        L = a.panelHeight,
        { edge: M } = a,
        T = (O) => {
          let K = O.clientX - u,
            be = O.clientY - v,
            D = { ...a };
          (M === "right" && (D.panelWidth = Math.max(me, Math.min(Ve, g - K))),
            M === "left" && (D.panelWidth = Math.max(me, Math.min(Ve, g + K))),
            M === "top" && (D.panelHeight = Math.max(ve, Math.min(Ye, L + be))),
            M === "bottom" && (D.panelHeight = Math.max(ve, Math.min(Ye, L - be))),
            (a = D),
            F(o, r, i, a));
        },
        A = () => {
          (i.classList.remove("dragging"),
            document.removeEventListener("mousemove", T),
            document.removeEventListener("mouseup", A),
            Ze(a));
        };
      (document.addEventListener("mousemove", T), document.addEventListener("mouseup", A));
    });
    let E = () => F(o, r, i, a);
    window.addEventListener("resize", E);
    function y(h) {
      ((l = h),
        Je(h),
        x.forEach((u, v) => u.classList.toggle("active", v === h)),
        r.classList.add("open"),
        F(o, r, i, a),
        k(h));
    }
    function f() {
      (r.classList.remove("open"),
        x.forEach((h) => h.classList.remove("active")),
        (l = null),
        Je(null));
    }
    function p(h) {
      l === h ? f() : y(h);
    }
    function b(h, u) {
      let v = typeof window < "u" && window.location ? window.location.host : "",
        g = v ? `<span class="sub">${v}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${h}</span>
          <span class="panel-title-label">${u}</span>
          ${g}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${Ot}</button>
      </div>`;
    }
    function k(h) {
      let { icon: u, label: v } = X[h];
      if (!d) {
        w(h);
        return;
      }
      let g = new V(e.adminUrl, d.token);
      ((s.innerHTML = `
      ${b(u, v)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        s.querySelector("#se-close").addEventListener("click", f),
        s.querySelector("#se-signout").addEventListener("click", () => {
          (ye(), (d = null), w(h));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Ae(), k(h));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          Pe();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let A = ie({ ...le(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(A);
            let O = s.querySelector("#se-share"),
              K = O.textContent;
            ((O.textContent = "Copied \u2713"), setTimeout(() => (O.textContent = K), 1500));
          } catch {
            prompt("Copy this URL:", A);
          }
        }));
      let L = s.querySelector("#se-body"),
        M = s.querySelector("#se-subfoot");
      ({
        gates: () => Ce(L, g),
        configs: () => He(L, g),
        experiments: () => Be(L, g),
        i18n: () => ze(L, g, M, n),
        bugs: () => We(L, g, n),
        features: () => Ge(L, g, n),
      })
        [h]()
        .catch((A) => {
          L.innerHTML = `<div class="err">${String(A)}</div>`;
        });
    }
    function w(h) {
      let { icon: u, label: v } = X[h];
      ((s.innerHTML = `
      ${b(u, v)}
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
        s.querySelector("#se-close").addEventListener("click", f),
        s.querySelector("#se-connect").addEventListener("click", async () => {
          let g = s.querySelector("#se-connect"),
            L = s.querySelector("#se-auth-status"),
            M = s.querySelector("#se-auth-err");
          ((g.disabled = !0),
            (g.textContent = "Opening\u2026"),
            (L.textContent = ""),
            (M.textContent = ""));
          try {
            ((d = await we(e, () => {
              ((L.textContent = "Waiting for approval in the opened tab\u2026"),
                (g.textContent = "Waiting\u2026"));
            })),
              k(h));
          } catch (T) {
            ((M.textContent = T instanceof Error ? T.message : String(T)),
              (L.textContent = ""),
              (g.disabled = !1),
              (g.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      m && requestAnimationFrame(() => y(m)),
      {
        destroy() {
          (window.removeEventListener("resize", E), t.remove());
        },
      }
    );
  }
  function Nt() {
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
  var j = null;
  function tt(e = {}) {
    if (j || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? Nt() },
      { destroy: n } = et(t);
    j = n;
  }
  function zt() {
    (j?.(), (j = null));
  }
  function nt(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    Le() && tt(e);
    let n = t.split("+"),
      o = n[n.length - 1],
      r = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      a = n.includes("Meta") || n.includes("Cmd"),
      l = /^[a-zA-Z]$/.test(o) ? `Key${o.toUpperCase()}` : null;
    function d(m) {
      (l ? m.code === l : m.key.toLowerCase() === o.toLowerCase()) &&
        m.shiftKey === r &&
        m.altKey === i &&
        m.ctrlKey === s &&
        m.metaKey === a &&
        (j ? zt() : tt(e));
    }
    return (window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((nt(e), I())) {
      let t = !1,
        n = new MutationObserver(() => o()),
        o = () => {
          t ||
            ((t = !0),
            requestAnimationFrame(() => {
              ((t = !1),
                n.disconnect(),
                ue(),
                n.observe(document.body, { childList: !0, subtree: !0 }));
            }));
        };
      (o(), window.addEventListener("se:i18n:ready", () => o(), { once: !0 }));
      let r = window;
      r.i18n?.on && r.i18n.on("update", () => o());
    }
    window.__se_devtools_ready = !0;
  }
})();
