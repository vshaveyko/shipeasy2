"use strict";
(() => {
  var Xe = Object.defineProperty;
  var Ze = (e, t, n) =>
    t in e ? Xe(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var G = (e, t, n) => Ze(e, typeof t != "symbol" ? t + "" : t, n);
  var ue = `
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
  var J = "se_dt_session";
  function fe() {
    try {
      let e = sessionStorage.getItem(J);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Qe(e) {
    try {
      sessionStorage.setItem(J, JSON.stringify(e));
    } catch {}
  }
  function ge() {
    try {
      sessionStorage.removeItem(J);
    } catch {}
  }
  async function me(e, t) {
    let n = new URL(e.adminUrl).origin,
      o = window.location.origin,
      r = `shipeasy-devtools-auth-${Date.now()}`,
      a = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(o)}`,
        r,
        "width=460,height=640,noopener=no",
      );
    if (!a) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      a.focus();
    } catch {}
    return (
      t(),
      new Promise((s, i) => {
        let f = !1;
        function h(p, l) {
          f ||
            ((f = !0),
            window.removeEventListener("message", u),
            clearInterval(E),
            clearTimeout(x),
            p ? i(p) : s(l));
        }
        function u(p) {
          if (p.origin !== n) return;
          let l = p.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let v = { token: l.token, projectId: l.projectId };
          (Qe(v), h(null, v));
        }
        window.addEventListener("message", u);
        let y = Date.now(),
          E = setInterval(() => {
            Date.now() - y < 1500 ||
              (a.closed && !f && h(new Error("Sign-in window closed before approval.")));
          }, 500),
          x = setTimeout(() => {
            h(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var et = /^(true|on|1|yes)$/i,
    tt = /^(false|off|0|no)$/i,
    ve = /^se(?:_|-|$)/;
  function F(e) {
    return et.test(e) ? !0 : tt.test(e) ? !1 : null;
  }
  function V(e) {
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
  function be(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Y() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function R(e, t) {
    let n = Y(),
      o = n.get(e);
    if (o !== null) return o;
    if (t) {
      let r = n.get(t);
      if (r !== null) return r;
    }
    return null;
  }
  function O(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, o] of e) o === null ? t.searchParams.delete(n) : t.searchParams.set(n, o);
    window.location.assign(t.toString());
  }
  function he() {
    if (typeof window > "u") return !1;
    let e = Y();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function X(e) {
    let t = R(`se_ks_${e}`) ?? R(`se_gate_${e}`) ?? R(`se-gate-${e}`);
    return t === null ? null : F(t);
  }
  function xe(e, t, n = "session") {
    O([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function Z(e) {
    let t = R(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return V(t);
  }
  function Q(e, t, n = "session") {
    O([
      [`se_config_${e}`, t == null ? null : be(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function ye(e) {
    let t = R(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function we(e, t, n = "session") {
    O([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function ee() {
    return R("se_i18n");
  }
  function ke(e, t = "session") {
    O([["se_i18n", e]]);
  }
  function Ee() {
    return R("se_i18n_draft");
  }
  function Le(e, t = "session") {
    O([["se_i18n_draft", e]]);
  }
  function Se(e) {
    return R(`se_i18n_label_${e}`);
  }
  function te(e, t, n = "session") {
    O([[`se_i18n_label_${e}`, t]]);
  }
  function Me() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) ve.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function ne(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let o of [...n.searchParams.keys()]) ve.test(o) && n.searchParams.delete(o);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [o, r] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${o}`, r ? "true" : "false");
    for (let [o, r] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${o}`, r);
    for (let [o, r] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${o}`, be(r));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [o, r] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${o}`, r);
    return n.toString();
  }
  function oe() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Y();
    for (let [n, o] of t)
      if (n.startsWith("se_ks_")) {
        let r = F(o);
        r !== null && (e.gates[n.slice(6)] = r);
      } else if (n.startsWith("se_gate_")) {
        let r = F(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else if (n.startsWith("se-gate-")) {
        let r = F(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = o)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = V(o))
            : n === "se_i18n"
              ? (e.i18nProfile = o)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = o)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = o);
    return e;
  }
  function Te(e) {
    if (typeof window > "u") return;
    let t = { ...oe(), ...e, openDevtools: !0 },
      n = ne(t);
    window.location.assign(n);
  }
  var K = class {
    constructor(t, n) {
      G(this, "adminUrl", t);
      G(this, "token", n);
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
    async configs() {
      let t = await this.get("/api/admin/configs"),
        n = "prod";
      return await Promise.all(
        t.map(async (r) => {
          try {
            let a = await this.get(`/api/admin/configs/${r.id}`),
              s = a.valueJson !== void 0 ? a.valueJson : (a.values?.[n] ?? null);
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
          let a = await o.json();
          r = a.detail ?? a.error ?? "";
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
      <div class="empty-title">${re(e.title)}</div>
      <div class="empty-msg">${re(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${re(e.ctaLabel)}</a>
    </div>`;
  }
  function re(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function nt() {
    return window.__shipeasy ?? null;
  }
  function ot(e) {
    let t = X(e.name),
      n = nt()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function rt(e, t) {
    let n = (o) => (t === (o === "on" ? !0 : o === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function $e(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(a)}</div>`;
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
          (a) => `
        <div class="row">
          <div>
            <div class="row-name">${a.name}</div>
            <div class="row-sub">${(a.rolloutPct / 100).toFixed(a.rolloutPct % 100 === 0 ? 0 : 2)}% rollout</div>
          </div>
          ${ot(a)}
          ${rt(a.name, X(a.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let s = a.closest("[data-gate]").dataset.gate,
              i = a.dataset.v;
            (xe(s, i === "default" ? null : i === "on"), o());
          });
        }));
    }
    o();
    let r = () => o();
    window.addEventListener("se:state:update", r);
  }
  function st(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function at(e) {
    return Z(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function Re(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(a)}</div>`;
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
          let i = Z(s.name),
            c = i !== void 0 ? i : s.valueJson,
            f = o.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${at(s.name)}
              ${f ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              f
                ? `
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(c, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${i !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${st(c)}</div>`
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
      function a(s, i) {
        let c = s.dataset.name,
          f = e.querySelector(`textarea[data-name="${c}"]`);
        if (f)
          try {
            let h = JSON.parse(f.value);
            (Q(c, h, i), o.delete(c), r());
          } catch {
            f.style.borderColor = "#f87171";
          }
      }
      (e.querySelectorAll(".save-session").forEach((s) => {
        s.addEventListener("click", () => a(s, "session"));
      }),
        e.querySelectorAll(".save-local").forEach((s) => {
          s.addEventListener("click", () => a(s, "local"));
        }),
        e.querySelectorAll(".clear-ov").forEach((s) => {
          s.addEventListener("click", () => {
            (Q(s.dataset.name, null), o.delete(s.dataset.name), r());
          });
        }));
    }
    r();
  }
  function it() {
    return window.__shipeasy ?? null;
  }
  function lt(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function dt(e) {
    let t = ye(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      o = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${o}</select>`;
  }
  function ct(e) {
    let t = it()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function pt(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${lt(e.status)}
      ${e.status === "running" ? ct(e.name) : ""}
      ${e.status === "running" ? dt(e) : ""}
    </div>`;
  }
  function _e(e, t, n, o) {
    let r = n.filter((c) => c.universe === t.name);
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
    let a = r.filter((c) => c.status === "running"),
      s = r.filter((c) => c.status !== "running"),
      i = (c, f) => (c.length === 0 ? "" : `<div class="sec-head">${f}</div>${c.map(pt).join("")}`);
    ((e.innerHTML = i(a, "Running") + i(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((c) => {
        c.addEventListener("change", () => {
          let f = c.dataset.name;
          we(f, c.value || null);
        });
      }));
  }
  async function Pe(e, t) {
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
    function a() {
      let s = o
        .map(
          (f) => `
          <button class="tab${f.name === r.activeUniverse ? " active" : ""}"
                  data-universe="${f.name}">${f.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${s}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((f) => {
          f.addEventListener("click", () => {
            ((r.activeUniverse = f.dataset.universe), a());
          });
        }));
      let i = e.querySelector(".tab-body"),
        c = o.find((f) => f.name === r.activeUniverse);
      _e(i, c, n, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          i = o.find((c) => c.name === r.activeUniverse);
        s && i && _e(s, i, n, t.adminUrl);
      }));
  }
  function ut(e) {
    let t = new Map();
    for (let n of e) {
      let o = n.key.split("."),
        r = o.length > 1 ? o[0] : "(root)",
        a = o.length > 1 ? o.slice(1) : o;
      t.has(r) || t.set(r, { segment: r, children: [] });
      let s = t.get(r);
      for (let i = 0; i < a.length; i++) {
        let c = a[i],
          f = s.children.find((h) => h.segment === c);
        (f || ((f = { segment: c, children: [] }), s.children.push(f)), (s = f));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) Ce(n);
    return t;
  }
  function Ce(e) {
    e.children.sort((t, n) => {
      let o = t.value !== void 0,
        r = n.value !== void 0;
      return o !== r ? (o ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Ce(t);
  }
  function S(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Oe(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let r = e.fullKey ? Se(e.fullKey) : null,
        a = r ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${S(e.fullKey ?? "")}">
        <span class="tree-seg">${S(e.segment)}</span>
        <span class="tree-val${r !== null ? " overridden" : ""}" title="${S(a)}">${S(a)}</span>
      </div>`;
    }
    let o = e.children.map((r) => Oe(r, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${S(e.segment)}</span>
    </div>
    ${o}`;
  }
  var _ = "__se_label_target",
    ae = "__se_label_target_style",
    D = !1,
    se = null,
    A = null;
  function ft() {
    if (document.getElementById(ae)) return;
    let e = document.createElement("style");
    ((e.id = ae),
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
  function He() {
    document.getElementById(ae)?.remove();
  }
  function B() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function H() {
    (A?.remove(),
      (A = null),
      document.querySelectorAll(`.${_}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function gt(e, t) {
    (H(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      o = e.dataset.labelDesc ?? "",
      a = ee() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let s = e.textContent ?? "",
      i = document.createElement("div");
    ((i.className = "label-popper"),
      (i.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${S(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${S(a)}</span>
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
      t.appendChild(i));
    let c = e.getBoundingClientRect(),
      f = i.offsetHeight,
      h = i.offsetWidth,
      u = 8,
      y = c.bottom + u;
    y + f > window.innerHeight - 8 && (y = Math.max(8, c.top - f - u));
    let E = c.left;
    (E + h > window.innerWidth - 8 && (E = Math.max(8, window.innerWidth - h - 8)),
      (i.style.top = `${y}px`),
      (i.style.left = `${E}px`));
    let x = i.querySelector(".lp-input");
    (x.focus(),
      x.select(),
      i.querySelector(".lp-close").addEventListener("click", H),
      i.querySelector('[data-action="save"]').addEventListener("click", () => {
        let p = x.value;
        ((e.textContent = p),
          te(n, p),
          window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: n, value: p } })),
          H());
      }),
      i.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let p = e.dataset.__seOriginal ?? "";
        ((e.textContent = p),
          te(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          H());
      }),
      i.addEventListener("click", (p) => p.stopPropagation()),
      i.addEventListener("mousedown", (p) => p.stopPropagation()),
      (A = i));
  }
  function mt(e, t, n) {
    if (((D = e), se?.(), (se = null), !e)) {
      H();
      for (let u of B()) u.classList.remove(_);
      He();
      return;
    }
    ft();
    for (let u of B()) u.classList.add(_);
    function o(u) {
      return A !== null && u.composedPath().includes(A);
    }
    function r(u) {
      for (let y of u.composedPath())
        if (y instanceof HTMLElement && y.hasAttribute("data-label")) return y;
      return null;
    }
    let a = [
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
    function s(u) {
      o(u) || (r(u) && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation()));
    }
    function i(u) {
      if (o(u)) return;
      let y = r(u);
      y && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation(), gt(y, t));
    }
    function c(u) {
      A && (o(u) || r(u) || H());
    }
    function f(u) {
      u.key === "Escape" && H();
    }
    let h = new MutationObserver(() => {
      if (D) {
        for (let u of B()) u.classList.add(_);
        n();
      }
    });
    h.observe(document.body, { childList: !0, subtree: !0 });
    for (let u of a) document.addEventListener(u, s, !0);
    (document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", c, !0),
      document.addEventListener("keydown", f),
      (se = () => {
        for (let u of a) document.removeEventListener(u, s, !0);
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", c, !0),
          document.removeEventListener("keydown", f),
          h.disconnect());
        for (let u of B()) u.classList.remove(_);
        He();
      }));
  }
  async function Ae(e, t, n, o) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'), (n.innerHTML = ""));
    let r, a, s;
    try {
      [r, a, s] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (y) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(y)}</div>`;
      return;
    }
    let i = ut(s),
      c = Array.from(i.keys()),
      f = { activeChunk: c[0] ?? null };
    function h() {
      if (c.length === 0) {
        e.innerHTML = $({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let y = c
          .map(
            (p) =>
              `<button class="tab${p === f.activeChunk ? " active" : ""}" data-chunk="${S(p)}">${S(p)}</button>`,
          )
          .join(""),
        E = f.activeChunk ? i.get(f.activeChunk) : null,
        x = E ? E.children.map((p) => Oe(p, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${y}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${x}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((p) => {
          p.addEventListener("click", () => {
            ((f.activeChunk = p.dataset.chunk), h());
          });
        }));
    }
    function u() {
      let y = ee() ?? "",
        E = Ee() ?? "",
        x = B().length,
        p = D
          ? `Editing ${x} label${x === 1 ? "" : "s"}`
          : x === 0
            ? "No labels found"
            : `Edit labels (${x})`,
        l =
          x === 0
            ? "No [data-label] elements on this page. Wrap copy in <ShipEasyI18nString> to make it editable."
            : "Toggle in-page label editing",
        v = [
          '<option value="">Default</option>',
          ...r.map(
            (w) =>
              `<option value="${S(w.id)}" ${y === w.id ? "selected" : ""}>${S(w.name)}</option>`,
          ),
        ].join(""),
        k = [
          '<option value="">No draft</option>',
          ...a.map(
            (w) =>
              `<option value="${S(w.id)}" ${E === w.id ? "selected" : ""}>${S(w.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${D ? " on" : ""}${x === 0 ? " dim" : ""}" id="se-edit-toggle" title="${S(l)}">
        <span class="dot"></span>
        ${S(p)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${v}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${k}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          (mt(!D, o, () => u()), u());
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (w) => {
          let b = w.target.value || null;
          ke(b);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (w) => {
          let b = w.target.value || null;
          Le(b);
        }));
    }
    (h(), u());
  }
  function I(e, t) {
    let n = document.createElement("div");
    n.className = "se-modal-overlay";
    let o = document.createElement("div");
    ((o.className = `se-modal se-modal-${t.size ?? "md"}`), n.appendChild(o));
    let r = document.createElement("div");
    r.className = "se-modal-head";
    let a = document.createElement("div");
    ((a.className = "se-modal-title"), (a.textContent = t.title));
    let s = document.createElement("button");
    ((s.className = "se-modal-close"),
      (s.type = "button"),
      s.setAttribute("aria-label", "Close"),
      (s.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'),
      r.appendChild(a),
      r.appendChild(s),
      o.appendChild(r));
    let i = document.createElement("div");
    ((i.className = "se-modal-body"), o.appendChild(i));
    function c() {
      (n.removeEventListener("click", f),
        document.removeEventListener("keydown", h),
        n.remove(),
        t.onClose?.());
    }
    function f(u) {
      u.target === n && c();
    }
    function h(u) {
      u.key === "Escape" && c();
    }
    return (
      n.addEventListener("click", f),
      document.addEventListener("keydown", h),
      s.addEventListener("click", c),
      e.appendChild(n),
      { body: i, root: o, close: c }
    );
  }
  async function qe() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 });
    try {
      let t = document.createElement("video");
      ((t.srcObject = e),
        (t.muted = !0),
        (t.playsInline = !0),
        await new Promise((i, c) => {
          let f = setTimeout(() => c(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(f), i());
          }),
            (t.onerror = () => {
              (clearTimeout(f), c(new Error("Capture stream errored")));
            }));
        }),
        await t.play(),
        await new Promise((i) => requestAnimationFrame(() => i(null))));
      let n = t.videoWidth,
        o = t.videoHeight;
      if (!n || !o) throw new Error("Capture stream returned no frames.");
      let r = document.createElement("canvas");
      ((r.width = n), (r.height = o));
      let a = r.getContext("2d");
      if (!a) throw new Error("Canvas 2d context unavailable");
      return (
        a.drawImage(t, 0, 0, n, o),
        await new Promise((i, c) => {
          r.toBlob((f) => (f ? i(f) : c(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      e.getTracks().forEach((t) => t.stop());
    }
  }
  async function Be() {
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
    function a() {
      e.getTracks().forEach((s) => s.stop());
    }
    return {
      stop() {
        return new Promise((s, i) => {
          if (o.state === "inactive") {
            if ((a(), r.length === 0)) {
              i(new Error("No recording data."));
              return;
            }
            s(new Blob(r, { type: n || "video/webm" }));
            return;
          }
          (o.addEventListener(
            "stop",
            () => {
              (a(), s(new Blob(r, { type: n || "video/webm" })));
            },
            { once: !0 },
          ),
            o.addEventListener("error", (c) => i(c), { once: !0 }),
            o.stop());
        });
      },
      cancel() {
        (o.state !== "inactive" && o.stop(), a());
      },
    };
  }
  var De = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Ie(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((d, m) => {
        let g = new Image();
        ((g.onload = () => d(g)),
          (g.onerror = () => m(new Error("Failed to load screenshot for annotation."))),
          (g.src = t));
      }),
      o = document.createElement("div");
    o.className = "se-annot";
    let r = document.createElement("div");
    ((r.className = "se-annot-toolbar"), o.appendChild(r));
    let a = "arrow",
      s = De[0],
      i = [];
    function c(d, m) {
      let g = document.createElement("button");
      return (
        (g.type = "button"),
        (g.className = "se-annot-btn"),
        (g.dataset.tool = d),
        (g.textContent = m),
        g.addEventListener("click", () => {
          ((a = d),
            r
              .querySelectorAll("[data-tool]")
              .forEach((L) => L.classList.toggle("on", L.dataset.tool === d)));
        }),
        g
      );
    }
    let f = c("arrow", "\u2197 arrow");
    (f.classList.add("on"),
      r.appendChild(f),
      r.appendChild(c("rect", "\u25AD rect")),
      r.appendChild(c("text", "T text")));
    let h = document.createElement("span");
    ((h.className = "se-annot-sep"), r.appendChild(h));
    for (let d of De) {
      let m = document.createElement("button");
      ((m.type = "button"),
        (m.className = "se-annot-swatch"),
        (m.dataset.color = d),
        (m.style.background = d),
        d === s && m.classList.add("on"),
        m.addEventListener("click", () => {
          ((s = d),
            r
              .querySelectorAll("[data-color]")
              .forEach((g) => g.classList.toggle("on", g.dataset.color === d)));
        }),
        r.appendChild(m));
    }
    let u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "se-annot-btn"),
      (u.textContent = "\u21B6 undo"),
      u.addEventListener("click", () => {
        (i.pop(), w());
      }),
      r.appendChild(u));
    let y = document.createElement("button");
    ((y.type = "button"),
      (y.className = "se-annot-btn"),
      (y.textContent = "clear"),
      y.addEventListener("click", () => {
        ((i.length = 0), w());
      }),
      r.appendChild(y));
    let E = document.createElement("div");
    ((E.className = "se-annot-stage"), o.appendChild(E));
    let x = document.createElement("canvas");
    ((x.width = n.naturalWidth),
      (x.height = n.naturalHeight),
      (x.className = "se-annot-canvas"),
      (x.style.cursor = "crosshair"),
      (x.style.touchAction = "none"),
      E.appendChild(x));
    let p = x.getContext("2d");
    function l(d) {
      let m = x.getBoundingClientRect(),
        g = x.width / m.width,
        L = x.height / m.height;
      return { x: (d.clientX - m.left) * g, y: (d.clientY - m.top) * L };
    }
    function v() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function k(d) {
      if (
        (p.save(),
        (p.strokeStyle = d.color),
        (p.fillStyle = d.color),
        (p.lineWidth = v()),
        (p.lineCap = "round"),
        (p.lineJoin = "round"),
        d.tool === "rect")
      ) {
        let m = Math.min(d.x1, d.x2),
          g = Math.min(d.y1, d.y2),
          L = Math.abs(d.x2 - d.x1),
          M = Math.abs(d.y2 - d.y1);
        p.strokeRect(m, g, L, M);
      } else if (d.tool === "arrow") {
        (p.beginPath(), p.moveTo(d.x1, d.y1), p.lineTo(d.x2, d.y2), p.stroke());
        let m = Math.atan2(d.y2 - d.y1, d.x2 - d.x1),
          g = v() * 5;
        (p.beginPath(),
          p.moveTo(d.x2, d.y2),
          p.lineTo(d.x2 - g * Math.cos(m - Math.PI / 6), d.y2 - g * Math.sin(m - Math.PI / 6)),
          p.lineTo(d.x2 - g * Math.cos(m + Math.PI / 6), d.y2 - g * Math.sin(m + Math.PI / 6)),
          p.closePath(),
          p.fill());
      } else if (d.tool === "text" && d.text) {
        let m = Math.max(14, Math.round(n.naturalWidth / 60));
        ((p.font = `600 ${m}px ui-sans-serif, system-ui, sans-serif`), (p.textBaseline = "top"));
        let g = m * 0.3,
          M = p.measureText(d.text).width + g * 2,
          T = m + g * 2;
        ((p.fillStyle = "rgba(0,0,0,0.55)"),
          p.fillRect(d.x1, d.y1, M, T),
          (p.fillStyle = d.color),
          p.fillText(d.text, d.x1 + g, d.y1 + g));
      }
      p.restore();
    }
    function w(d) {
      (p.clearRect(0, 0, x.width, x.height), p.drawImage(n, 0, 0));
      for (let m of i) k(m);
      d && k(d);
    }
    w();
    let b = null;
    return (
      x.addEventListener("pointerdown", (d) => {
        d.preventDefault();
        let m = l(d);
        if (a === "text") {
          let g = prompt("Annotation text:");
          g &&
            g.trim() &&
            (i.push({ tool: "text", color: s, x1: m.x, y1: m.y, x2: m.x, y2: m.y, text: g.trim() }),
            w());
          return;
        }
        ((b = { x1: m.x, y1: m.y }), x.setPointerCapture(d.pointerId));
      }),
      x.addEventListener("pointermove", (d) => {
        if (!b) return;
        let m = l(d);
        w({ tool: a, color: s, x1: b.x1, y1: b.y1, x2: m.x, y2: m.y });
      }),
      x.addEventListener("pointerup", (d) => {
        if (!b) return;
        let m = l(d),
          g = Math.abs(m.x - b.x1),
          L = Math.abs(m.y - b.y1);
        ((g > 4 || L > 4) && i.push({ tool: a, color: s, x1: b.x1, y1: b.y1, x2: m.x, y2: m.y }),
          (b = null),
          w());
      }),
      {
        root: o,
        async export() {
          let d = await new Promise((m, g) => {
            x.toBlob((L) => (L ? m(L) : g(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), d);
        },
      }
    );
  }
  function z(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function vt(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function bt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function ze(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let a;
      try {
        a = await t.bugs();
      } catch (i) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${z(String(i))}</div>`), r());
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
      (a.length === 0
        ? (s.innerHTML =
            '<div class="empty">No bugs filed yet. Spotted one? Hit \u201CFile a bug\u201D.</div>')
        : (s.innerHTML = a
            .map(
              (i) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/bugs/${i.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${z(i.title)}</div>
                <div class="row-sub">${bt(i.createdAt)}${i.reporterEmail ? ` \xB7 ${z(i.reporterEmail)}` : ""}</div>
              </div>
              ${vt(i.status)}
            </a>`,
            )
            .join("")),
        r());
    }
    function r() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => ht(t, n, o));
    }
    await o();
  }
  function ht(e, t, n) {
    let o = I(t, { title: "File a bug", size: "lg" }),
      r = [],
      a = null;
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
      i = o.body.querySelector("#se-b-steps"),
      c = o.body.querySelector("#se-b-actual"),
      f = o.body.querySelector("#se-b-expected"),
      h = o.body.querySelector("#se-b-attach"),
      u = o.body.querySelector("#se-b-status"),
      y = o.body.querySelector("#se-b-file"),
      E = o.body.querySelector("#se-b-record");
    function x() {
      if (r.length === 0) {
        h.innerHTML = "";
        return;
      }
      ((h.innerHTML = r
        .map(
          (l, v) => `
          <div class="se-attach-item">
            <span>${z(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${v}">remove</button>
          </div>`,
        )
        .join("")),
        h.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (r.splice(Number(l.dataset.idx), 1), x());
          });
        }));
    }
    function p(l, v = !1) {
      ((u.textContent = l), (u.style.color = v ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (o.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      p("Pick a screen/tab to capture\u2026");
      try {
        let l = await qe();
        (p(""),
          xt(t, l, (v) => {
            (r.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: v }),
              x());
          }));
      } catch (l) {
        p(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      E.addEventListener("click", async () => {
        if (a) {
          try {
            ((E.disabled = !0), p("Finalizing recording\u2026"));
            let l = await a.stop();
            ((a = null),
              (E.textContent = "\u23FA Record screen"),
              E.classList.remove("danger"),
              r.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              x(),
              p(""));
          } catch (l) {
            p(String(l instanceof Error ? l.message : l), !0);
          } finally {
            E.disabled = !1;
          }
          return;
        }
        p("Pick a screen/tab to record\u2026");
        try {
          ((a = await Be()),
            (E.textContent = "\u25A0 Stop recording"),
            E.classList.add("danger"),
            p("Recording\u2026 click stop when done."));
        } catch (l) {
          (p(String(l instanceof Error ? l.message : l), !0), (a = null));
        }
      }),
      o.body.querySelector("#se-b-upload").addEventListener("click", () => y.click()),
      y.addEventListener("change", () => {
        let l = y.files?.[0];
        l && (r.push({ kind: "file", filename: l.name, blob: l }), (y.value = ""), x());
      }),
      o.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (a && a.cancel(), o.close());
      }),
      o.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let l = o.body.querySelector("#se-b-submit"),
          v = s.value.trim();
        if (!v) {
          (p("Title is required", !0), s.focus());
          return;
        }
        ((l.disabled = !0), p("Submitting\u2026"));
        try {
          let k = await e.createBug({
            title: v,
            stepsToReproduce: i.value,
            actualResult: c.value,
            expectedResult: f.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let w = 0; w < r.length; w++) {
            let b = r[w];
            (p(`Uploading attachment ${w + 1}/${r.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: k.id,
                kind: b.kind,
                filename: b.filename,
                blob: b.blob,
              }));
          }
          (o.close(), n());
        } catch (k) {
          (p(String(k instanceof Error ? k.message : k), !0), (l.disabled = !1));
        }
      }));
  }
  function xt(e, t, n) {
    let o = I(e, { title: "Annotate screenshot", size: "lg" });
    o.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let r = o.body.querySelector("#se-annot-host");
    ((r.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Ie(t)
        .then((a) => {
          ((r.innerHTML = ""),
            r.appendChild(a.root),
            o.body.querySelector("#se-a-cancel").addEventListener("click", () => o.close()),
            o.body.querySelector("#se-a-save").addEventListener("click", async () => {
              let s = await a.export();
              (o.close(), n(s));
            }));
        })
        .catch((a) => {
          r.innerHTML = `<div class="err">${z(String(a))}</div>`;
        }));
  }
  function ie(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function yt(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function wt(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function kt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function Ue(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let r;
      try {
        r = await t.featureRequests();
      } catch (s) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${ie(String(s))}</div>`;
        return;
      }
      e.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-fr">+ Request a feature</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/feature-requests">Open dashboard \u2197</a>
      </div>
      <div class="se-feedback-list" id="se-fr-list"></div>
    `;
      let a = e.querySelector("#se-fr-list");
      (r.length === 0
        ? (a.innerHTML = '<div class="empty">No feature requests yet.</div>')
        : (a.innerHTML = r
            .map(
              (s) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/feature-requests/${s.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${ie(s.title)}</div>
                <div class="row-sub">${kt(s.createdAt)}${s.reporterEmail ? ` \xB7 ${ie(s.reporterEmail)}` : ""}</div>
              </div>
              ${wt(s.importance)}
              ${yt(s.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => Et(t, n, o)));
    }
    await o();
  }
  function Et(e, t, n) {
    let o = I(t, { title: "Request a feature", size: "lg" });
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
      a = o.body.querySelector("#se-f-desc"),
      s = o.body.querySelector("#se-f-use"),
      i = o.body.querySelector("#se-f-imp"),
      c = o.body.querySelector("#se-f-status");
    (o.body.querySelector("#se-f-cancel").addEventListener("click", () => o.close()),
      o.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let f = r.value.trim();
        if (!f) {
          ((c.textContent = "Title is required"), (c.style.color = "var(--se-danger)"), r.focus());
          return;
        }
        let h = o.body.querySelector("#se-f-submit");
        ((h.disabled = !0),
          (c.textContent = "Submitting\u2026"),
          (c.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: f,
            description: a.value,
            useCase: s.value,
            importance: i.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            o.close(),
            n());
        } catch (u) {
          ((c.textContent = String(u instanceof Error ? u.message : u)),
            (c.style.color = "var(--se-danger)"),
            (h.disabled = !1));
        }
      }));
  }
  var Lt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    St =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    Mt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Tt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    $t =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Rt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    _t =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Pt =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    W = {
      gates: { icon: Lt, label: "Gates" },
      configs: { icon: St, label: "Configs" },
      experiments: { icon: Mt, label: "Experiments" },
      i18n: { icon: Tt, label: "Translations" },
      bugs: { icon: $t, label: "Bugs" },
      features: { icon: Rt, label: "Feature requests" },
    },
    Ge = "se_l_overlay",
    le = "se_l_active_panel";
  function Ht() {
    try {
      let e = sessionStorage.getItem(le);
      if (e && e in W) return e;
    } catch {}
    return null;
  }
  function Ne(e) {
    try {
      e === null ? sessionStorage.removeItem(le) : sessionStorage.setItem(le, e);
    } catch {}
  }
  var de = 240,
    je = 580,
    ce = 180,
    Fe = 700,
    Ke = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Ct() {
    try {
      let e = localStorage.getItem(Ge);
      if (e) return { ...Ke, ...JSON.parse(e) };
    } catch {}
    return { ...Ke };
  }
  function We(e) {
    try {
      localStorage.setItem(Ge, JSON.stringify(e));
    } catch {}
  }
  function Ot(e, t) {
    let n = window.innerWidth,
      o = window.innerHeight,
      r = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [o - t, "bottom"],
      ];
    r.sort((c, f) => c[0] - f[0]);
    let a = r[0][1],
      i = Math.max(5, Math.min(95, a === "left" || a === "right" ? (t / o) * 100 : (e / n) * 100));
    return { edge: a, offsetPct: i };
  }
  function U(e, t, n, o) {
    let { edge: r, offsetPct: a, panelWidth: s, panelHeight: i } = o,
      c = window.innerWidth,
      f = window.innerHeight,
      h = r === "left" || r === "right",
      u = Math.max(de, Math.min(s, c - 80)),
      y = Math.max(ce, Math.min(i, f - 40)),
      E = (a / 100) * (h ? f : c),
      x = e.getBoundingClientRect(),
      p = h ? x.width || 52 : x.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = h ? "column" : "row"),
      (l.padding = h ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((l.right = "0"),
          (l.top = `${a}%`),
          (l.transform = "translateY(-50%)"),
          (l.borderRadius = "10px 0 0 10px"),
          (l.borderRight = "none"),
          (l.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((l.left = "0"),
            (l.top = `${a}%`),
            (l.transform = "translateY(-50%)"),
            (l.borderRadius = "0 10px 10px 0"),
            (l.borderLeft = "none"),
            (l.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((l.top = "0"),
              (l.left = `${a}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "0 0 10px 10px"),
              (l.borderTop = "none"),
              (l.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((l.bottom = "0"),
              (l.left = `${a}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "10px 10px 0 0"),
              (l.borderBottom = "none"),
              (l.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let v = t.style;
    if (
      ((v.top = v.bottom = v.left = v.right = v.transform = ""),
      (v.borderTop = v.borderBottom = v.borderLeft = v.borderRight = ""),
      (v.width = u + "px"),
      (v.height = y + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let w = Math.max(10, Math.min(f - y - 10, E - y / 2));
      ((v.right = p + "px"),
        (v.top = w + "px"),
        (v.borderRadius = "10px 0 0 10px"),
        (v.borderRight = "none"),
        (v.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let w = Math.max(10, Math.min(f - y - 10, E - y / 2));
      ((v.left = p + "px"),
        (v.top = w + "px"),
        (v.borderRadius = "0 10px 10px 0"),
        (v.borderLeft = "none"),
        (v.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let w = Math.max(10, Math.min(c - u - 10, E - u / 2));
      ((v.top = p + "px"),
        (v.left = w + "px"),
        (v.borderRadius = "0 0 10px 10px"),
        (v.borderTop = "none"),
        (v.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let w = Math.max(10, Math.min(c - u - 10, E - u / 2));
      ((v.bottom = p + "px"),
        (v.left = w + "px"),
        (v.borderRadius = "10px 10px 0 0"),
        (v.borderBottom = "none"),
        (v.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let k = n.style;
    ((k.top = k.bottom = k.left = k.right = k.width = k.height = ""),
      (n.dataset.dir = h ? "ew" : "ns"),
      h
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
  function Je(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${ue}</style><div id="toolbar"></div><div id="panel"></div>`;
    let o = n.getElementById("toolbar"),
      r = n.getElementById("panel");
    ((o.className = "toolbar"), (r.className = "panel"));
    let a = document.createElement("div");
    ((a.className = "resize-handle"), r.appendChild(a));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), r.appendChild(s));
    let i = Ct(),
      c = null,
      f = fe(),
      h = Ht();
    requestAnimationFrame(() => U(o, r, a, i));
    let u = document.createElement("div");
    ((u.className = "drag-handle"),
      (u.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (u.innerHTML = Pt),
      o.appendChild(u),
      u.addEventListener("mousedown", (b) => {
        (b.preventDefault(), u.classList.add("dragging"));
        let d = (g) => {
            let { edge: L, offsetPct: M } = Ot(g.clientX, g.clientY);
            ((i = { ...i, edge: L, offsetPct: M }), U(o, r, a, i));
          },
          m = () => {
            (u.classList.remove("dragging"),
              document.removeEventListener("mousemove", d),
              document.removeEventListener("mouseup", m),
              We(i));
          };
        (document.addEventListener("mousemove", d), document.addEventListener("mouseup", m));
      }));
    let y = new Map();
    for (let [b, { icon: d, label: m }] of Object.entries(W)) {
      let g = document.createElement("button");
      ((g.className = "btn"),
        (g.title = m),
        (g.innerHTML = d),
        g.addEventListener("click", () => l(b)),
        o.appendChild(g),
        y.set(b, g));
    }
    a.addEventListener("mousedown", (b) => {
      (b.preventDefault(), b.stopPropagation(), a.classList.add("dragging"));
      let d = b.clientX,
        m = b.clientY,
        g = i.panelWidth,
        L = i.panelHeight,
        { edge: M } = i,
        T = (C) => {
          let j = C.clientX - d,
            pe = C.clientY - m,
            q = { ...i };
          (M === "right" && (q.panelWidth = Math.max(de, Math.min(je, g - j))),
            M === "left" && (q.panelWidth = Math.max(de, Math.min(je, g + j))),
            M === "top" && (q.panelHeight = Math.max(ce, Math.min(Fe, L + pe))),
            M === "bottom" && (q.panelHeight = Math.max(ce, Math.min(Fe, L - pe))),
            (i = q),
            U(o, r, a, i));
        },
        P = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", T),
            document.removeEventListener("mouseup", P),
            We(i));
        };
      (document.addEventListener("mousemove", T), document.addEventListener("mouseup", P));
    });
    let E = () => U(o, r, a, i);
    window.addEventListener("resize", E);
    function x(b) {
      ((c = b),
        Ne(b),
        y.forEach((d, m) => d.classList.toggle("active", m === b)),
        r.classList.add("open"),
        U(o, r, a, i),
        k(b));
    }
    function p() {
      (r.classList.remove("open"),
        y.forEach((b) => b.classList.remove("active")),
        (c = null),
        Ne(null));
    }
    function l(b) {
      c === b ? p() : x(b);
    }
    function v(b, d) {
      let m = typeof window < "u" && window.location ? window.location.host : "",
        g = m ? `<span class="sub">${m}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${b}</span>
          <span class="panel-title-label">${d}</span>
          ${g}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${_t}</button>
      </div>`;
    }
    function k(b) {
      let { icon: d, label: m } = W[b];
      if (!f) {
        w(b);
        return;
      }
      let g = new K(e.adminUrl, f.token);
      ((s.innerHTML = `
      ${v(d, m)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        s.querySelector("#se-close").addEventListener("click", p),
        s.querySelector("#se-signout").addEventListener("click", () => {
          (ge(), (f = null), w(b));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Me(), k(b));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          Te();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let P = ne({ ...oe(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(P);
            let C = s.querySelector("#se-share"),
              j = C.textContent;
            ((C.textContent = "Copied \u2713"), setTimeout(() => (C.textContent = j), 1500));
          } catch {
            prompt("Copy this URL:", P);
          }
        }));
      let L = s.querySelector("#se-body"),
        M = s.querySelector("#se-subfoot");
      ({
        gates: () => $e(L, g),
        configs: () => Re(L, g),
        experiments: () => Pe(L, g),
        i18n: () => Ae(L, g, M, n),
        bugs: () => ze(L, g, n),
        features: () => Ue(L, g, n),
      })
        [b]()
        .catch((P) => {
          L.innerHTML = `<div class="err">${String(P)}</div>`;
        });
    }
    function w(b) {
      let { icon: d, label: m } = W[b];
      ((s.innerHTML = `
      ${v(d, m)}
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
        s.querySelector("#se-close").addEventListener("click", p),
        s.querySelector("#se-connect").addEventListener("click", async () => {
          let g = s.querySelector("#se-connect"),
            L = s.querySelector("#se-auth-status"),
            M = s.querySelector("#se-auth-err");
          ((g.disabled = !0),
            (g.textContent = "Opening\u2026"),
            (L.textContent = ""),
            (M.textContent = ""));
          try {
            ((f = await me(e, () => {
              ((L.textContent = "Waiting for approval in the opened tab\u2026"),
                (g.textContent = "Waiting\u2026"));
            })),
              k(b));
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
      h && requestAnimationFrame(() => x(h)),
      {
        destroy() {
          (window.removeEventListener("resize", E), t.remove());
        },
      }
    );
  }
  function At() {
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
  var N = null;
  function Ve(e = {}) {
    if (N || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? At() },
      { destroy: n } = Je(t);
    N = n;
  }
  function qt() {
    (N?.(), (N = null));
  }
  function Ye(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    he() && Ve(e);
    let n = t.split("+"),
      o = n[n.length - 1],
      r = n.includes("Shift"),
      a = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      i = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(o) ? `Key${o.toUpperCase()}` : null;
    function f(h) {
      (c ? h.code === c : h.key.toLowerCase() === o.toLowerCase()) &&
        h.shiftKey === r &&
        h.altKey === a &&
        h.ctrlKey === s &&
        h.metaKey === i &&
        (N ? qt() : Ve(e));
    }
    return (window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (Ye(e), (window.__se_devtools_ready = !0));
  }
})();
