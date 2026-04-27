"use strict";
(() => {
  var We = Object.defineProperty;
  var Ge = (e, t, n) =>
    t in e ? We(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var K = (e, t, n) => Ge(e, typeof t != "symbol" ? t + "" : t, n);
  var de = `
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

/* Edit-labels hover highlight on the customer page */
.__se_label_target {
  outline: 2px dashed var(--se-accent) !important;
  outline-offset: 2px !important;
  cursor: pointer !important;
  transition: outline-color 0.12s;
}
.__se_label_target:hover,
.__se_label_target.__se_label_active {
  outline-style: solid !important;
  outline-color: var(--se-accent) !important;
}
`;
  var W = "se_dt_session";
  function ce() {
    try {
      let e = sessionStorage.getItem(W);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Je(e) {
    try {
      sessionStorage.setItem(W, JSON.stringify(e));
    } catch {}
  }
  function pe() {
    try {
      sessionStorage.removeItem(W);
    } catch {}
  }
  async function ue(e, t) {
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
        function b(p, l) {
          f ||
            ((f = !0),
            window.removeEventListener("message", g),
            clearInterval(w),
            clearTimeout(x),
            p ? i(p) : s(l));
        }
        function g(p) {
          if (p.origin !== n) return;
          let l = p.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let m = { token: l.token, projectId: l.projectId };
          (Je(m), b(null, m));
        }
        window.addEventListener("message", g);
        let y = Date.now(),
          w = setInterval(() => {
            Date.now() - y < 1500 ||
              (a.closed && !f && b(new Error("Sign-in window closed before approval.")));
          }, 500),
          x = setTimeout(() => {
            b(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Ve = /^(true|on|1|yes)$/i,
    Xe = /^(false|off|0|no)$/i,
    fe = /^se(?:_|-|$)/;
  function U(e) {
    return Ve.test(e) ? !0 : Xe.test(e) ? !1 : null;
  }
  function G(e) {
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
  function ge(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function J() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function R(e, t) {
    let n = J(),
      o = n.get(e);
    if (o !== null) return o;
    if (t) {
      let r = n.get(t);
      if (r !== null) return r;
    }
    return null;
  }
  function H(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, o] of e) o === null ? t.searchParams.delete(n) : t.searchParams.set(n, o);
    window.location.assign(t.toString());
  }
  function me() {
    if (typeof window > "u") return !1;
    let e = J();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function V(e) {
    let t = R(`se_ks_${e}`) ?? R(`se_gate_${e}`) ?? R(`se-gate-${e}`);
    return t === null ? null : U(t);
  }
  function ve(e, t, n = "session") {
    H([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function X(e) {
    let t = R(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return G(t);
  }
  function Y(e, t, n = "session") {
    H([
      [`se_config_${e}`, t == null ? null : ge(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function be(e) {
    let t = R(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function he(e, t, n = "session") {
    H([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Z() {
    return R("se_i18n");
  }
  function xe(e, t = "session") {
    H([["se_i18n", e]]);
  }
  function ye() {
    return R("se_i18n_draft");
  }
  function we(e, t = "session") {
    H([["se_i18n_draft", e]]);
  }
  function ke(e) {
    return R(`se_i18n_label_${e}`);
  }
  function Q(e, t, n = "session") {
    H([[`se_i18n_label_${e}`, t]]);
  }
  function Ee() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) fe.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function ee(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let o of [...n.searchParams.keys()]) fe.test(o) && n.searchParams.delete(o);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [o, r] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${o}`, r ? "true" : "false");
    for (let [o, r] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${o}`, r);
    for (let [o, r] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${o}`, ge(r));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [o, r] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${o}`, r);
    return n.toString();
  }
  function te() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = J();
    for (let [n, o] of t)
      if (n.startsWith("se_ks_")) {
        let r = U(o);
        r !== null && (e.gates[n.slice(6)] = r);
      } else if (n.startsWith("se_gate_")) {
        let r = U(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else if (n.startsWith("se-gate-")) {
        let r = U(o);
        r !== null && (e.gates[n.slice(8)] = r);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = o)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = G(o))
            : n === "se_i18n"
              ? (e.i18nProfile = o)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = o)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = o);
    return e;
  }
  function Le(e) {
    if (typeof window > "u") return;
    let t = { ...te(), ...e, openDevtools: !0 },
      n = ee(t);
    window.location.assign(n);
  }
  var N = class {
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
      <div class="empty-title">${ne(e.title)}</div>
      <div class="empty-msg">${ne(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${ne(e.ctaLabel)}</a>
    </div>`;
  }
  function ne(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ye() {
    return window.__shipeasy ?? null;
  }
  function Ze(e) {
    let t = V(e.name),
      n = Ye()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Qe(e, t) {
    let n = (o) => (t === (o === "on" ? !0 : o === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function Se(e, t) {
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
            <div class="row-sub">${a.rolloutPct}% rollout</div>
          </div>
          ${Ze(a)}
          ${Qe(a.name, V(a.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let s = a.closest("[data-gate]").dataset.gate,
              i = a.dataset.v;
            (ve(s, i === "default" ? null : i === "on"), o());
          });
        }));
    }
    o();
    let r = () => o();
    window.addEventListener("se:state:update", r);
  }
  function et(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function tt(e) {
    return X(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function Me(e, t) {
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
          let i = X(s.name),
            c = i !== void 0 ? i : s.valueJson,
            f = o.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${tt(s.name)}
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
                : `<div class="mono val-display">${et(c)}</div>`
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
            let b = JSON.parse(f.value);
            (Y(c, b, i), o.delete(c), r());
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
            (Y(s.dataset.name, null), o.delete(s.dataset.name), r());
          });
        }));
    }
    r();
  }
  function nt() {
    return window.__shipeasy ?? null;
  }
  function ot(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function rt(e) {
    let t = be(e.name),
      n = ["control", ...e.groups.map((r) => r.name)],
      o = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${o}</select>`;
  }
  function st(e) {
    let t = nt()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function at(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${ot(e.status)}
      ${e.status === "running" ? st(e.name) : ""}
      ${e.status === "running" ? rt(e) : ""}
    </div>`;
  }
  function Te(e, t, n, o) {
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
      i = (c, f) => (c.length === 0 ? "" : `<div class="sec-head">${f}</div>${c.map(at).join("")}`);
    ((e.innerHTML = i(a, "Running") + i(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((c) => {
        c.addEventListener("change", () => {
          let f = c.dataset.name;
          he(f, c.value || null);
        });
      }));
  }
  async function $e(e, t) {
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
      Te(i, c, n, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          i = o.find((c) => c.name === r.activeUniverse);
        s && i && Te(s, i, n, t.adminUrl);
      }));
  }
  function it(e) {
    let t = new Map();
    for (let n of e) {
      let o = n.key.split("."),
        r = o.length > 1 ? o[0] : "(root)",
        a = o.length > 1 ? o.slice(1) : o;
      t.has(r) || t.set(r, { segment: r, children: [] });
      let s = t.get(r);
      for (let i = 0; i < a.length; i++) {
        let c = a[i],
          f = s.children.find((b) => b.segment === c);
        (f || ((f = { segment: c, children: [] }), s.children.push(f)), (s = f));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) Re(n);
    return t;
  }
  function Re(e) {
    e.children.sort((t, n) => {
      let o = t.value !== void 0,
        r = n.value !== void 0;
      return o !== r ? (o ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Re(t);
  }
  function S(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function _e(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let r = e.fullKey ? ke(e.fullKey) : null,
        a = r ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${S(e.fullKey ?? "")}">
        <span class="tree-seg">${S(e.segment)}</span>
        <span class="tree-val${r !== null ? " overridden" : ""}" title="${S(a)}">${S(a)}</span>
      </div>`;
    }
    let o = e.children.map((r) => _e(r, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${S(e.segment)}</span>
    </div>
    ${o}`;
  }
  var A = "__se_label_target",
    F = !1,
    oe = null,
    C = null;
  function j() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function _() {
    (C?.remove(),
      (C = null),
      document.querySelectorAll(`.${A}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function lt(e, t) {
    (_(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      o = e.dataset.labelDesc ?? "",
      a = Z() ?? "default";
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
      b = i.offsetWidth,
      g = 8,
      y = c.bottom + g;
    y + f > window.innerHeight - 8 && (y = Math.max(8, c.top - f - g));
    let w = c.left;
    (w + b > window.innerWidth - 8 && (w = Math.max(8, window.innerWidth - b - 8)),
      (i.style.top = `${y}px`),
      (i.style.left = `${w}px`));
    let x = i.querySelector(".lp-input");
    (x.focus(),
      x.select(),
      i.querySelector(".lp-close").addEventListener("click", _),
      i.querySelector('[data-action="save"]').addEventListener("click", () => {
        let p = x.value;
        ((e.textContent = p),
          Q(n, p),
          window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: n, value: p } })),
          _());
      }),
      i.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let p = e.dataset.__seOriginal ?? "";
        ((e.textContent = p),
          Q(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          _());
      }),
      i.addEventListener("click", (p) => p.stopPropagation()),
      i.addEventListener("mousedown", (p) => p.stopPropagation()),
      (C = i));
  }
  function dt(e, t, n) {
    if (((F = e), oe?.(), (oe = null), !e)) {
      _();
      for (let g of j()) g.classList.remove(A);
      return;
    }
    for (let g of j()) g.classList.add(A);
    function o(g) {
      return C !== null && g.composedPath().includes(C);
    }
    function r(g) {
      for (let y of g.composedPath())
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
    function s(g) {
      o(g) || (r(g) && (g.preventDefault(), g.stopPropagation(), g.stopImmediatePropagation()));
    }
    function i(g) {
      if (o(g)) return;
      let y = r(g);
      y && (g.preventDefault(), g.stopPropagation(), g.stopImmediatePropagation(), lt(y, t));
    }
    function c(g) {
      C && (o(g) || r(g) || _());
    }
    function f(g) {
      g.key === "Escape" && _();
    }
    let b = new MutationObserver(() => {
      if (F) {
        for (let g of j()) g.classList.add(A);
        n();
      }
    });
    b.observe(document.body, { childList: !0, subtree: !0 });
    for (let g of a) document.addEventListener(g, s, !0);
    (document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", c, !0),
      document.addEventListener("keydown", f),
      (oe = () => {
        for (let g of a) document.removeEventListener(g, s, !0);
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", c, !0),
          document.removeEventListener("keydown", f),
          b.disconnect());
        for (let g of j()) g.classList.remove(A);
      }));
  }
  async function Pe(e, t, n, o) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'), (n.innerHTML = ""));
    let r, a, s;
    try {
      [r, a, s] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (y) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(y)}</div>`;
      return;
    }
    let i = it(s),
      c = Array.from(i.keys()),
      f = { activeChunk: c[0] ?? null };
    function b() {
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
        w = f.activeChunk ? i.get(f.activeChunk) : null,
        x = w ? w.children.map((p) => _e(p, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${y}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${x}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((p) => {
          p.addEventListener("click", () => {
            ((f.activeChunk = p.dataset.chunk), b());
          });
        }));
    }
    function g() {
      let y = Z() ?? "",
        w = ye() ?? "",
        x = [
          '<option value="">Default</option>',
          ...r.map(
            (l) =>
              `<option value="${S(l.id)}" ${y === l.id ? "selected" : ""}>${S(l.name)}</option>`,
          ),
        ].join(""),
        p = [
          '<option value="">No draft</option>',
          ...a.map(
            (l) =>
              `<option value="${S(l.id)}" ${w === l.id ? "selected" : ""}>${S(l.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${F ? " on" : ""}" id="se-edit-toggle" title="Toggle in-page label editing">
        <span class="dot"></span>
        Edit labels
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${x}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${p}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          (dt(!F, o, () => {}), g());
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (l) => {
          let m = l.target.value || null;
          xe(m);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (l) => {
          let m = l.target.value || null;
          we(m);
        }));
    }
    (b(), g());
  }
  function q(e, t) {
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
        document.removeEventListener("keydown", b),
        n.remove(),
        t.onClose?.());
    }
    function f(g) {
      g.target === n && c();
    }
    function b(g) {
      g.key === "Escape" && c();
    }
    return (
      n.addEventListener("click", f),
      document.addEventListener("keydown", b),
      s.addEventListener("click", c),
      e.appendChild(n),
      { body: i, root: o, close: c }
    );
  }
  async function He() {
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
  async function Ce() {
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
  var Oe = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Ae(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((d, u) => {
        let v = new Image();
        ((v.onload = () => d(v)),
          (v.onerror = () => u(new Error("Failed to load screenshot for annotation."))),
          (v.src = t));
      }),
      o = document.createElement("div");
    o.className = "se-annot";
    let r = document.createElement("div");
    ((r.className = "se-annot-toolbar"), o.appendChild(r));
    let a = "arrow",
      s = Oe[0],
      i = [];
    function c(d, u) {
      let v = document.createElement("button");
      return (
        (v.type = "button"),
        (v.className = "se-annot-btn"),
        (v.dataset.tool = d),
        (v.textContent = u),
        v.addEventListener("click", () => {
          ((a = d),
            r
              .querySelectorAll("[data-tool]")
              .forEach((L) => L.classList.toggle("on", L.dataset.tool === d)));
        }),
        v
      );
    }
    let f = c("arrow", "\u2197 arrow");
    (f.classList.add("on"),
      r.appendChild(f),
      r.appendChild(c("rect", "\u25AD rect")),
      r.appendChild(c("text", "T text")));
    let b = document.createElement("span");
    ((b.className = "se-annot-sep"), r.appendChild(b));
    for (let d of Oe) {
      let u = document.createElement("button");
      ((u.type = "button"),
        (u.className = "se-annot-swatch"),
        (u.dataset.color = d),
        (u.style.background = d),
        d === s && u.classList.add("on"),
        u.addEventListener("click", () => {
          ((s = d),
            r
              .querySelectorAll("[data-color]")
              .forEach((v) => v.classList.toggle("on", v.dataset.color === d)));
        }),
        r.appendChild(u));
    }
    let g = document.createElement("button");
    ((g.type = "button"),
      (g.className = "se-annot-btn"),
      (g.textContent = "\u21B6 undo"),
      g.addEventListener("click", () => {
        (i.pop(), h());
      }),
      r.appendChild(g));
    let y = document.createElement("button");
    ((y.type = "button"),
      (y.className = "se-annot-btn"),
      (y.textContent = "clear"),
      y.addEventListener("click", () => {
        ((i.length = 0), h());
      }),
      r.appendChild(y));
    let w = document.createElement("div");
    ((w.className = "se-annot-stage"), o.appendChild(w));
    let x = document.createElement("canvas");
    ((x.width = n.naturalWidth),
      (x.height = n.naturalHeight),
      (x.className = "se-annot-canvas"),
      (x.style.cursor = "crosshair"),
      (x.style.touchAction = "none"),
      w.appendChild(x));
    let p = x.getContext("2d");
    function l(d) {
      let u = x.getBoundingClientRect(),
        v = x.width / u.width,
        L = x.height / u.height;
      return { x: (d.clientX - u.left) * v, y: (d.clientY - u.top) * L };
    }
    function m() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function E(d) {
      if (
        (p.save(),
        (p.strokeStyle = d.color),
        (p.fillStyle = d.color),
        (p.lineWidth = m()),
        (p.lineCap = "round"),
        (p.lineJoin = "round"),
        d.tool === "rect")
      ) {
        let u = Math.min(d.x1, d.x2),
          v = Math.min(d.y1, d.y2),
          L = Math.abs(d.x2 - d.x1),
          M = Math.abs(d.y2 - d.y1);
        p.strokeRect(u, v, L, M);
      } else if (d.tool === "arrow") {
        (p.beginPath(), p.moveTo(d.x1, d.y1), p.lineTo(d.x2, d.y2), p.stroke());
        let u = Math.atan2(d.y2 - d.y1, d.x2 - d.x1),
          v = m() * 5;
        (p.beginPath(),
          p.moveTo(d.x2, d.y2),
          p.lineTo(d.x2 - v * Math.cos(u - Math.PI / 6), d.y2 - v * Math.sin(u - Math.PI / 6)),
          p.lineTo(d.x2 - v * Math.cos(u + Math.PI / 6), d.y2 - v * Math.sin(u + Math.PI / 6)),
          p.closePath(),
          p.fill());
      } else if (d.tool === "text" && d.text) {
        let u = Math.max(14, Math.round(n.naturalWidth / 60));
        ((p.font = `600 ${u}px ui-sans-serif, system-ui, sans-serif`), (p.textBaseline = "top"));
        let v = u * 0.3,
          M = p.measureText(d.text).width + v * 2,
          T = u + v * 2;
        ((p.fillStyle = "rgba(0,0,0,0.55)"),
          p.fillRect(d.x1, d.y1, M, T),
          (p.fillStyle = d.color),
          p.fillText(d.text, d.x1 + v, d.y1 + v));
      }
      p.restore();
    }
    function h(d) {
      (p.clearRect(0, 0, x.width, x.height), p.drawImage(n, 0, 0));
      for (let u of i) E(u);
      d && E(d);
    }
    h();
    let k = null;
    return (
      x.addEventListener("pointerdown", (d) => {
        d.preventDefault();
        let u = l(d);
        if (a === "text") {
          let v = prompt("Annotation text:");
          v &&
            v.trim() &&
            (i.push({ tool: "text", color: s, x1: u.x, y1: u.y, x2: u.x, y2: u.y, text: v.trim() }),
            h());
          return;
        }
        ((k = { x1: u.x, y1: u.y }), x.setPointerCapture(d.pointerId));
      }),
      x.addEventListener("pointermove", (d) => {
        if (!k) return;
        let u = l(d);
        h({ tool: a, color: s, x1: k.x1, y1: k.y1, x2: u.x, y2: u.y });
      }),
      x.addEventListener("pointerup", (d) => {
        if (!k) return;
        let u = l(d),
          v = Math.abs(u.x - k.x1),
          L = Math.abs(u.y - k.y1);
        ((v > 4 || L > 4) && i.push({ tool: a, color: s, x1: k.x1, y1: k.y1, x2: u.x, y2: u.y }),
          (k = null),
          h());
      }),
      {
        root: o,
        async export() {
          let d = await new Promise((u, v) => {
            x.toBlob((L) => (L ? u(L) : v(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), d);
        },
      }
    );
  }
  function B(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function ct(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function pt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function qe(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let a;
      try {
        a = await t.bugs();
      } catch (i) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${B(String(i))}</div>`), r());
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
                <div class="row-name">${B(i.title)}</div>
                <div class="row-sub">${pt(i.createdAt)}${i.reporterEmail ? ` \xB7 ${B(i.reporterEmail)}` : ""}</div>
              </div>
              ${ct(i.status)}
            </a>`,
            )
            .join("")),
        r());
    }
    function r() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => ut(t, n, o));
    }
    await o();
  }
  function ut(e, t, n) {
    let o = q(t, { title: "File a bug", size: "lg" }),
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
      b = o.body.querySelector("#se-b-attach"),
      g = o.body.querySelector("#se-b-status"),
      y = o.body.querySelector("#se-b-file"),
      w = o.body.querySelector("#se-b-record");
    function x() {
      if (r.length === 0) {
        b.innerHTML = "";
        return;
      }
      ((b.innerHTML = r
        .map(
          (l, m) => `
          <div class="se-attach-item">
            <span>${B(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${m}">remove</button>
          </div>`,
        )
        .join("")),
        b.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (r.splice(Number(l.dataset.idx), 1), x());
          });
        }));
    }
    function p(l, m = !1) {
      ((g.textContent = l), (g.style.color = m ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (o.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      p("Pick a screen/tab to capture\u2026");
      try {
        let l = await He();
        (p(""),
          ft(t, l, (m) => {
            (r.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: m }),
              x());
          }));
      } catch (l) {
        p(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      w.addEventListener("click", async () => {
        if (a) {
          try {
            ((w.disabled = !0), p("Finalizing recording\u2026"));
            let l = await a.stop();
            ((a = null),
              (w.textContent = "\u23FA Record screen"),
              w.classList.remove("danger"),
              r.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              x(),
              p(""));
          } catch (l) {
            p(String(l instanceof Error ? l.message : l), !0);
          } finally {
            w.disabled = !1;
          }
          return;
        }
        p("Pick a screen/tab to record\u2026");
        try {
          ((a = await Ce()),
            (w.textContent = "\u25A0 Stop recording"),
            w.classList.add("danger"),
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
          m = s.value.trim();
        if (!m) {
          (p("Title is required", !0), s.focus());
          return;
        }
        ((l.disabled = !0), p("Submitting\u2026"));
        try {
          let E = await e.createBug({
            title: m,
            stepsToReproduce: i.value,
            actualResult: c.value,
            expectedResult: f.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let h = 0; h < r.length; h++) {
            let k = r[h];
            (p(`Uploading attachment ${h + 1}/${r.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: E.id,
                kind: k.kind,
                filename: k.filename,
                blob: k.blob,
              }));
          }
          (o.close(), n());
        } catch (E) {
          (p(String(E instanceof Error ? E.message : E), !0), (l.disabled = !1));
        }
      }));
  }
  function ft(e, t, n) {
    let o = q(e, { title: "Annotate screenshot", size: "lg" });
    o.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let r = o.body.querySelector("#se-annot-host");
    ((r.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Ae(t)
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
          r.innerHTML = `<div class="err">${B(String(a))}</div>`;
        }));
  }
  function re(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function gt(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function mt(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function vt(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let o = Math.floor(n / 60);
    return o < 24 ? `${o}h ago` : `${Math.floor(o / 24)}d ago`;
  }
  async function Be(e, t, n) {
    async function o() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let r;
      try {
        r = await t.featureRequests();
      } catch (s) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${re(String(s))}</div>`;
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
                <div class="row-name">${re(s.title)}</div>
                <div class="row-sub">${vt(s.createdAt)}${s.reporterEmail ? ` \xB7 ${re(s.reporterEmail)}` : ""}</div>
              </div>
              ${mt(s.importance)}
              ${gt(s.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => bt(t, n, o)));
    }
    await o();
  }
  function bt(e, t, n) {
    let o = q(t, { title: "Request a feature", size: "lg" });
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
        let b = o.body.querySelector("#se-f-submit");
        ((b.disabled = !0),
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
        } catch (g) {
          ((c.textContent = String(g instanceof Error ? g.message : g)),
            (c.style.color = "var(--se-danger)"),
            (b.disabled = !1));
        }
      }));
  }
  var ht =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    xt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    yt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    wt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    kt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Et =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    Lt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    St =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    se = {
      gates: { icon: ht, label: "Gates" },
      configs: { icon: xt, label: "Configs" },
      experiments: { icon: yt, label: "Experiments" },
      i18n: { icon: wt, label: "Translations" },
      bugs: { icon: kt, label: "Bugs" },
      features: { icon: Et, label: "Feature requests" },
    },
    Ne = "se_l_overlay",
    ae = 240,
    De = 580,
    ie = 180,
    ze = 700,
    Ie = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Mt() {
    try {
      let e = localStorage.getItem(Ne);
      if (e) return { ...Ie, ...JSON.parse(e) };
    } catch {}
    return { ...Ie };
  }
  function Ue(e) {
    try {
      localStorage.setItem(Ne, JSON.stringify(e));
    } catch {}
  }
  function Tt(e, t) {
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
  function D(e, t, n, o) {
    let { edge: r, offsetPct: a, panelWidth: s, panelHeight: i } = o,
      c = window.innerWidth,
      f = window.innerHeight,
      b = r === "left" || r === "right",
      g = Math.max(ae, Math.min(s, c - 80)),
      y = Math.max(ie, Math.min(i, f - 40)),
      w = (a / 100) * (b ? f : c),
      x = e.getBoundingClientRect(),
      p = b ? x.width || 52 : x.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = b ? "column" : "row"),
      (l.padding = b ? "8px 6px" : "6px 8px"),
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
    let m = t.style;
    if (
      ((m.top = m.bottom = m.left = m.right = m.transform = ""),
      (m.borderTop = m.borderBottom = m.borderLeft = m.borderRight = ""),
      (m.width = g + "px"),
      (m.height = y + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let h = Math.max(10, Math.min(f - y - 10, w - y / 2));
      ((m.right = p + "px"),
        (m.top = h + "px"),
        (m.borderRadius = "10px 0 0 10px"),
        (m.borderRight = "none"),
        (m.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let h = Math.max(10, Math.min(f - y - 10, w - y / 2));
      ((m.left = p + "px"),
        (m.top = h + "px"),
        (m.borderRadius = "0 10px 10px 0"),
        (m.borderLeft = "none"),
        (m.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let h = Math.max(10, Math.min(c - g - 10, w - g / 2));
      ((m.top = p + "px"),
        (m.left = h + "px"),
        (m.borderRadius = "0 0 10px 10px"),
        (m.borderTop = "none"),
        (m.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let h = Math.max(10, Math.min(c - g - 10, w - g / 2));
      ((m.bottom = p + "px"),
        (m.left = h + "px"),
        (m.borderRadius = "10px 10px 0 0"),
        (m.borderBottom = "none"),
        (m.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let E = n.style;
    ((E.top = E.bottom = E.left = E.right = E.width = E.height = ""),
      (n.dataset.dir = b ? "ew" : "ns"),
      b
        ? ((E.width = "10px"),
          (E.top = "0"),
          (E.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          r === "right" ? (E.left = "0") : (E.right = "0"))
        : ((E.height = "10px"),
          (E.left = "0"),
          (E.right = "0"),
          (n.style.cursor = "ns-resize"),
          r === "top" ? (E.bottom = "0") : (E.top = "0")));
  }
  function je(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${de}</style><div id="toolbar"></div><div id="panel"></div>`;
    let o = n.getElementById("toolbar"),
      r = n.getElementById("panel");
    ((o.className = "toolbar"), (r.className = "panel"));
    let a = document.createElement("div");
    ((a.className = "resize-handle"), r.appendChild(a));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), r.appendChild(s));
    let i = Mt(),
      c = null,
      f = ce();
    requestAnimationFrame(() => D(o, r, a, i));
    let b = document.createElement("div");
    ((b.className = "drag-handle"),
      (b.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (b.innerHTML = St),
      o.appendChild(b),
      b.addEventListener("mousedown", (h) => {
        (h.preventDefault(), b.classList.add("dragging"));
        let k = (u) => {
            let { edge: v, offsetPct: L } = Tt(u.clientX, u.clientY);
            ((i = { ...i, edge: v, offsetPct: L }), D(o, r, a, i));
          },
          d = () => {
            (b.classList.remove("dragging"),
              document.removeEventListener("mousemove", k),
              document.removeEventListener("mouseup", d),
              Ue(i));
          };
        (document.addEventListener("mousemove", k), document.addEventListener("mouseup", d));
      }));
    let g = new Map();
    for (let [h, { icon: k, label: d }] of Object.entries(se)) {
      let u = document.createElement("button");
      ((u.className = "btn"),
        (u.title = d),
        (u.innerHTML = k),
        u.addEventListener("click", () => p(h)),
        o.appendChild(u),
        g.set(h, u));
    }
    a.addEventListener("mousedown", (h) => {
      (h.preventDefault(), h.stopPropagation(), a.classList.add("dragging"));
      let k = h.clientX,
        d = h.clientY,
        u = i.panelWidth,
        v = i.panelHeight,
        { edge: L } = i,
        M = (P) => {
          let I = P.clientX - k,
            le = P.clientY - d,
            O = { ...i };
          (L === "right" && (O.panelWidth = Math.max(ae, Math.min(De, u - I))),
            L === "left" && (O.panelWidth = Math.max(ae, Math.min(De, u + I))),
            L === "top" && (O.panelHeight = Math.max(ie, Math.min(ze, v + le))),
            L === "bottom" && (O.panelHeight = Math.max(ie, Math.min(ze, v - le))),
            (i = O),
            D(o, r, a, i));
        },
        T = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", M),
            document.removeEventListener("mouseup", T),
            Ue(i));
        };
      (document.addEventListener("mousemove", M), document.addEventListener("mouseup", T));
    });
    let y = () => D(o, r, a, i);
    window.addEventListener("resize", y);
    function w(h) {
      ((c = h),
        g.forEach((k, d) => k.classList.toggle("active", d === h)),
        r.classList.add("open"),
        D(o, r, a, i),
        m(h));
    }
    function x() {
      (r.classList.remove("open"), g.forEach((h) => h.classList.remove("active")), (c = null));
    }
    function p(h) {
      c === h ? x() : w(h);
    }
    function l(h, k) {
      let d = typeof window < "u" && window.location ? window.location.host : "",
        u = d ? `<span class="sub">${d}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${h}</span>
          <span class="panel-title-label">${k}</span>
          ${u}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${Lt}</button>
      </div>`;
    }
    function m(h) {
      let { icon: k, label: d } = se[h];
      if (!f) {
        E(h);
        return;
      }
      let u = new N(e.adminUrl, f.token);
      ((s.innerHTML = `
      ${l(k, d)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        s.querySelector("#se-close").addEventListener("click", x),
        s.querySelector("#se-signout").addEventListener("click", () => {
          (pe(), (f = null), E(h));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Ee(), m(h));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          Le();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let T = ee({ ...te(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(T);
            let P = s.querySelector("#se-share"),
              I = P.textContent;
            ((P.textContent = "Copied \u2713"), setTimeout(() => (P.textContent = I), 1500));
          } catch {
            prompt("Copy this URL:", T);
          }
        }));
      let v = s.querySelector("#se-body"),
        L = s.querySelector("#se-subfoot");
      ({
        gates: () => Se(v, u),
        configs: () => Me(v, u),
        experiments: () => $e(v, u),
        i18n: () => Pe(v, u, L, n),
        bugs: () => qe(v, u, n),
        features: () => Be(v, u, n),
      })
        [h]()
        .catch((T) => {
          v.innerHTML = `<div class="err">${String(T)}</div>`;
        });
    }
    function E(h) {
      let { icon: k, label: d } = se[h];
      ((s.innerHTML = `
      ${l(k, d)}
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
        s.querySelector("#se-close").addEventListener("click", x),
        s.querySelector("#se-connect").addEventListener("click", async () => {
          let u = s.querySelector("#se-connect"),
            v = s.querySelector("#se-auth-status"),
            L = s.querySelector("#se-auth-err");
          ((u.disabled = !0),
            (u.textContent = "Opening\u2026"),
            (v.textContent = ""),
            (L.textContent = ""));
          try {
            ((f = await ue(e, () => {
              ((v.textContent = "Waiting for approval in the opened tab\u2026"),
                (u.textContent = "Waiting\u2026"));
            })),
              m(h));
          } catch (M) {
            ((L.textContent = M instanceof Error ? M.message : String(M)),
              (v.textContent = ""),
              (u.disabled = !1),
              (u.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      {
        destroy() {
          (window.removeEventListener("resize", y), t.remove());
        },
      }
    );
  }
  function $t() {
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
  var z = null;
  function Fe(e = {}) {
    if (z || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? $t() },
      { destroy: n } = je(t);
    z = n;
  }
  function Rt() {
    (z?.(), (z = null));
  }
  function Ke(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    me() && Fe(e);
    let n = t.split("+"),
      o = n[n.length - 1],
      r = n.includes("Shift"),
      a = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      i = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(o) ? `Key${o.toUpperCase()}` : null;
    function f(b) {
      (c ? b.code === c : b.key.toLowerCase() === o.toLowerCase()) &&
        b.shiftKey === r &&
        b.altKey === a &&
        b.ctrlKey === s &&
        b.metaKey === i &&
        (z ? Rt() : Fe(e));
    }
    return (window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (Ke(e), (window.__se_devtools_ready = !0));
  }
})();
