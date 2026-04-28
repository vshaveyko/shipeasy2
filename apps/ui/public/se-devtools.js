"use strict";
(() => {
  var st = Object.defineProperty;
  var at = (e, t, o) =>
    t in e ? st(e, t, { enumerable: !0, configurable: !0, writable: !0, value: o }) : (e[t] = o);
  var Q = (e, t, o) => at(e, typeof t != "symbol" ? t + "" : t, o);
  var xe = `
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
.lp-err {
  padding: 4px 12px 8px;
  font-size: 11px;
  color: var(--se-red, #f87171);
  min-height: 0;
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
  var ee = "se_dt_session";
  function ye() {
    try {
      let e = sessionStorage.getItem(ee);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function it(e) {
    try {
      sessionStorage.setItem(ee, JSON.stringify(e));
    } catch {}
  }
  function we() {
    try {
      sessionStorage.removeItem(ee);
    } catch {}
  }
  async function Ee(e, t) {
    let o = new URL(e.adminUrl).origin,
      n = window.location.origin,
      r = `shipeasy-devtools-auth-${Date.now()}`,
      a = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(n)}`,
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
        let d = !1;
        function g(f, p) {
          d ||
            ((d = !0),
            window.removeEventListener("message", c),
            clearInterval(k),
            clearTimeout(y),
            f ? i(f) : s(p));
        }
        function c(f) {
          if (f.origin !== o) return;
          let p = f.data;
          if (!p || p.type !== "se:devtools-auth" || !p.token || !p.projectId) return;
          let b = { token: p.token, projectId: p.projectId };
          (it(b), g(null, b));
        }
        window.addEventListener("message", c);
        let x = Date.now(),
          k = setInterval(() => {
            Date.now() - x < 1500 ||
              (a.closed && !d && g(new Error("Sign-in window closed before approval.")));
          }, 500),
          y = setTimeout(() => {
            g(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var lt = /^(true|on|1|yes)$/i,
    dt = /^(false|off|0|no)$/i,
    ke = /^se(?:_|-|$)/;
  function W(e) {
    return lt.test(e) ? !0 : dt.test(e) ? !1 : null;
  }
  function te(e) {
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
  function Le(e) {
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
    let o = G(),
      n = o.get(e);
    if (n !== null) return n;
    if (t) {
      let r = o.get(t);
      if (r !== null) return r;
    }
    return null;
  }
  function C(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [o, n] of e) n === null ? t.searchParams.delete(o) : t.searchParams.set(o, n);
    window.location.assign(t.toString());
  }
  function Se() {
    if (typeof window > "u") return !1;
    let e = G();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function D() {
    return typeof window > "u" ? !1 : G().has("se_edit_labels");
  }
  function ne(e) {
    C([["se_edit_labels", e ? "1" : null]]);
  }
  function oe(e) {
    let t = R(`se_ks_${e}`) ?? R(`se_gate_${e}`) ?? R(`se-gate-${e}`);
    return t === null ? null : W(t);
  }
  function Me(e, t, o = "session") {
    C([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function re(e) {
    let t = R(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return te(t);
  }
  function se(e, t, o = "session") {
    C([
      [`se_config_${e}`, t == null ? null : Le(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Te(e) {
    let t = R(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function $e(e, t, o = "session") {
    C([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function J() {
    return R("se_i18n");
  }
  function Re(e, t = "session") {
    C([["se_i18n", e]]);
  }
  function ae() {
    return R("se_i18n_draft");
  }
  function _e(e, t = "session") {
    C([["se_i18n_draft", e]]);
  }
  function V(e) {
    return R(`se_i18n_label_${e}`);
  }
  function ie(e, t, o = "session") {
    C([[`se_i18n_label_${e}`, t]]);
  }
  function Pe() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) ke.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function le(e, t) {
    let o = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let n of [...o.searchParams.keys()]) ke.test(n) && o.searchParams.delete(n);
    e.openDevtools && o.searchParams.set("se", "1");
    for (let [n, r] of Object.entries(e.gates ?? {}))
      o.searchParams.set(`se_ks_${n}`, r ? "true" : "false");
    for (let [n, r] of Object.entries(e.experiments ?? {})) o.searchParams.set(`se_exp_${n}`, r);
    for (let [n, r] of Object.entries(e.configs ?? {})) o.searchParams.set(`se_config_${n}`, Le(r));
    (e.i18nProfile && o.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && o.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [n, r] of Object.entries(e.i18nLabels ?? {}))
      o.searchParams.set(`se_i18n_label_${n}`, r);
    return o.toString();
  }
  function de() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = G();
    for (let [o, n] of t)
      if (o.startsWith("se_ks_")) {
        let r = W(n);
        r !== null && (e.gates[o.slice(6)] = r);
      } else if (o.startsWith("se_gate_")) {
        let r = W(n);
        r !== null && (e.gates[o.slice(8)] = r);
      } else if (o.startsWith("se-gate-")) {
        let r = W(n);
        r !== null && (e.gates[o.slice(8)] = r);
      } else
        o.startsWith("se_exp_") || o.startsWith("se-exp-")
          ? (e.experiments[o.slice(7)] = n)
          : o.startsWith("se_config_") || o.startsWith("se-config-")
            ? (e.configs[o.slice(10)] = te(n))
            : o === "se_i18n"
              ? (e.i18nProfile = n)
              : o === "se_i18n_draft"
                ? (e.i18nDraft = n)
                : o.startsWith("se_i18n_label_") && (e.i18nLabels[o.slice(14)] = n);
    return e;
  }
  function Ae(e) {
    if (typeof window > "u") return;
    let t = { ...de(), ...e, openDevtools: !0 },
      o = le(t);
    window.location.assign(o);
  }
  var Y = class {
    constructor(t, o) {
      Q(this, "adminUrl", t);
      Q(this, "token", o);
    }
    async get(t) {
      let o = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
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
      let n = await o.json();
      return Array.isArray(n) ? n : (n.data ?? n);
    }
    gates() {
      return this.get("/api/admin/gates");
    }
    async configs() {
      let t = await this.get("/api/admin/configs"),
        o = "prod";
      return await Promise.all(
        t.map(async (r) => {
          try {
            let a = await this.get(`/api/admin/configs/${r.id}`),
              s = a.valueJson !== void 0 ? a.valueJson : (a.values?.[o] ?? null);
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
    async put(t, o) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(o),
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
      return await n.json();
    }
    async post(t, o) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(o),
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
      return await n.json();
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
      let o = new FormData();
      (o.append("reportKind", t.reportKind),
        o.append("reportId", t.reportId),
        o.append("kind", t.kind),
        o.append("filename", t.filename),
        o.append("file", t.blob, t.filename));
      let n = await fetch(`${this.adminUrl}/api/admin/reports/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: o,
      });
      if (!n.ok) {
        let r = "";
        try {
          r = (await n.json()).error ?? "";
        } catch {}
        throw new Error(`upload failed \u2192 HTTP ${n.status}${r ? ` \u2014 ${r}` : ""}`);
      }
      return await n.json();
    }
    upsertDraftKey(t, o, n) {
      return this.post(`/api/admin/i18n/drafts/${encodeURIComponent(t)}/keys`, {
        key: o,
        value: n,
      });
    }
    updateKeyById(t, o) {
      return this.put(`/api/admin/i18n/keys/${encodeURIComponent(t)}`, { value: o });
    }
    async keys(t) {
      let o = t ? `?profile_id=${encodeURIComponent(t)}` : "",
        n = await this.get(`/api/admin/i18n/keys${o}`);
      return Array.isArray(n) ? n : n && Array.isArray(n.keys) ? n.keys : [];
    }
  };
  function $(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${ce(e.title)}</div>
      <div class="empty-msg">${ce(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${ce(e.ctaLabel)}</a>
    </div>`;
  }
  function ce(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function ct() {
    return window.__shipeasy ?? null;
  }
  function pt(e) {
    let t = oe(e.name),
      o = ct()?.getFlag(e.name);
    return (t !== null ? t : (o ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function ut(e, t) {
    let o = (n) => (t === (n === "on" ? !0 : n === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${o("default")}" data-v="default">default</button>
      <button class="tog-btn${o("on")}" data-v="on">ON</button>
      <button class="tog-btn${o("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function Ce(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let o;
    try {
      o = await t.gates();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(a)}</div>`;
      return;
    }
    if (o.length === 0) {
      e.innerHTML = $({
        icon: "\u26F3",
        title: "No gates yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        ctaLabel: "Create new gate",
        ctaHref: `${t.adminUrl}/dashboard/gates/new`,
      });
      return;
    }
    function n() {
      ((e.innerHTML = o
        .map(
          (a) => `
        <div class="row">
          <div>
            <div class="row-name">${a.name}</div>
            <div class="row-sub">${(a.rolloutPct / 100).toFixed(a.rolloutPct % 100 === 0 ? 0 : 2)}% rollout</div>
          </div>
          ${pt(a)}
          ${ut(a.name, oe(a.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let s = a.closest("[data-gate]").dataset.gate,
              i = a.dataset.v;
            (Me(s, i === "default" ? null : i === "on"), n());
          });
        }));
    }
    n();
    let r = () => n();
    window.addEventListener("se:state:update", r);
  }
  function ft(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function gt(e) {
    return re(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function He(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let o;
    try {
      o = await t.configs();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(a)}</div>`;
      return;
    }
    if (o.length === 0) {
      e.innerHTML = $({
        icon: "\u2699",
        title: "No configs yet",
        message: "Remote config values you can tweak per-session without redeploying.",
        ctaLabel: "Create new config",
        ctaHref: `${t.adminUrl}/dashboard/configs/values/new`,
      });
      return;
    }
    let n = new Set();
    function r() {
      ((e.innerHTML = o
        .map((s) => {
          let i = re(s.name),
            l = i !== void 0 ? i : s.valueJson,
            d = n.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${gt(s.name)}
              ${d ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              d
                ? `
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(l, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${i !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${ft(l)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((s) => {
          s.addEventListener("click", () => {
            (n.add(s.dataset.name), r());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((s) => {
          s.addEventListener("click", () => {
            (n.delete(s.dataset.name), r());
          });
        }));
      function a(s, i) {
        let l = s.dataset.name,
          d = e.querySelector(`textarea[data-name="${l}"]`);
        if (d)
          try {
            let g = JSON.parse(d.value);
            (se(l, g, i), n.delete(l), r());
          } catch {
            d.style.borderColor = "#f87171";
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
            (se(s.dataset.name, null), n.delete(s.dataset.name), r());
          });
        }));
    }
    r();
  }
  function mt() {
    return window.__shipeasy ?? null;
  }
  function vt(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function bt(e) {
    let t = Te(e.name),
      o = ["control", ...e.groups.map((r) => r.name)],
      n = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...o.map((r) => `<option value="${r}" ${t === r ? "selected" : ""}>${r}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${n}</select>`;
  }
  function ht(e) {
    let t = mt()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function xt(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${vt(e.status)}
      ${e.status === "running" ? ht(e.name) : ""}
      ${e.status === "running" ? bt(e) : ""}
    </div>`;
  }
  function Oe(e, t, o, n) {
    let r = o.filter((l) => l.universe === t.name);
    if (r.length === 0) {
      e.innerHTML = $({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${n}/dashboard/experiments/new`,
      });
      return;
    }
    let a = r.filter((l) => l.status === "running"),
      s = r.filter((l) => l.status !== "running"),
      i = (l, d) => (l.length === 0 ? "" : `<div class="sec-head">${d}</div>${l.map(xt).join("")}`);
    ((e.innerHTML = i(a, "Running") + i(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((l) => {
        l.addEventListener("change", () => {
          let d = l.dataset.name;
          $e(d, l.value || null);
        });
      }));
  }
  async function Be(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let o, n;
    try {
      [o, n] = await Promise.all([t.experiments(), t.universes()]);
    } catch (s) {
      e.innerHTML = `<div class="err">Failed to load: ${String(s)}</div>`;
      return;
    }
    if (n.length === 0) {
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
    let r = { activeUniverse: n[0].name };
    function a() {
      let s = n
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
            ((r.activeUniverse = d.dataset.universe), a());
          });
        }));
      let i = e.querySelector(".tab-body"),
        l = n.find((d) => d.name === r.activeUniverse);
      Oe(i, l, o, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          i = n.find((l) => l.name === r.activeUniverse);
        s && i && Oe(s, i, o, t.adminUrl);
      }));
  }
  var X = "\uFFF9";
  var H = /￹([^￺￻]+)￺([^￻]*)￻/g;
  function yt(e) {
    let t = new Map();
    for (let o of e) {
      let n = o.key.split("."),
        r = n.length > 1 ? n[0] : "(root)",
        a = n.length > 1 ? n.slice(1) : n;
      t.has(r) || t.set(r, { segment: r, children: [] });
      let s = t.get(r);
      for (let i = 0; i < a.length; i++) {
        let l = a[i],
          d = s.children.find((g) => g.segment === l);
        (d || ((d = { segment: l, children: [] }), s.children.push(d)), (s = d));
      }
      ((s.value = o.value), (s.fullKey = o.key));
    }
    for (let o of t.values()) De(o);
    return t;
  }
  function De(e) {
    e.children.sort((t, o) => {
      let n = t.value !== void 0,
        r = o.value !== void 0;
      return n !== r ? (n ? 1 : -1) : t.segment.localeCompare(o.segment);
    });
    for (let t of e.children) De(t);
  }
  function S(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function ze(e, t) {
    let o = t * 14 + 6;
    if (e.value !== void 0) {
      let r = e.fullKey ? V(e.fullKey) : null,
        a = r ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${o}px" data-key="${S(e.fullKey ?? "")}">
        <span class="tree-seg">${S(e.segment)}</span>
        <span class="tree-val${r !== null ? " overridden" : ""}" title="${S(a)}">${S(a)}</span>
      </div>`;
    }
    let n = e.children.map((r) => ze(r, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${o}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${S(e.segment)}</span>
    </div>
    ${n}`;
  }
  var _ = "__se_label_target",
    ue = "__se_label_target_style",
    B = !1,
    pe = null,
    q = null,
    Ne = null,
    Ue = [];
  function wt() {
    if (document.getElementById(ue)) return;
    let e = document.createElement("style");
    ((e.id = ue),
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
    document.getElementById(ue)?.remove();
  }
  function fe(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      o = [],
      n = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      r;
    for (; (r = t.nextNode()); ) {
      let i = r.nodeValue ?? "";
      if (
        !i.includes(X) ||
        n.has(r.parentElement?.tagName ?? "") ||
        r.parentElement?.closest?.("[data-label]")
      )
        continue;
      let l = document.createDocumentFragment(),
        d = 0;
      H.lastIndex = 0;
      let g;
      for (; (g = H.exec(i)) !== null; ) {
        g.index > d && l.appendChild(document.createTextNode(i.slice(d, g.index)));
        let c = document.createElement("span");
        c.setAttribute("data-label", g[1]);
        let x = V(g[1]);
        ((c.textContent = x ?? g[2]), l.appendChild(c), (d = g.index + g[0].length));
      }
      (d < i.length && l.appendChild(document.createTextNode(i.slice(d))), o.push([r, l]));
    }
    for (let [i, l] of o) i.parentNode?.replaceChild(l, i);
    let a = window._sei18n_t;
    for (let i of Array.from(document.querySelectorAll("[data-label]"))) {
      let l = i.textContent ?? "",
        d = i.getAttribute("data-label"),
        g = V(d);
      if (l.includes(X)) {
        H.lastIndex = 0;
        let c = H.exec(l);
        c && (i.textContent = g ?? c[2]);
      } else if (a)
        try {
          let c = i.dataset.variables ? JSON.parse(i.dataset.variables) : void 0,
            x = a(d, c);
          x && x !== d ? (i.textContent = g ?? x) : g && (i.textContent = g);
        } catch {}
    }
    let s = ["placeholder", "alt", "aria-label", "title"];
    for (let i of s)
      for (let l of Array.from(document.querySelectorAll(`[${i}]`))) {
        let d = l.getAttribute(i);
        if (!d.includes(X)) continue;
        H.lastIndex = 0;
        let g = H.exec(d);
        g && l.setAttribute(i, g[2]);
      }
    return o.length;
  }
  function z() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function P() {
    (q?.remove(),
      (q = null),
      document.querySelectorAll(`.${_}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  async function Et(e, t, o, n) {
    ((o.textContent = t),
      ie(e, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e, value: t } })));
    let r = ae(),
      a = J(),
      s = Ne;
    if (!s || (!r && !a)) {
      P();
      return;
    }
    let i = n.querySelector('[data-action="save"]'),
      l = n.querySelector(".lp-err");
    ((i.disabled = !0), (i.textContent = "Saving\u2026"), l && (l.textContent = ""));
    try {
      if (r) await s.upsertDraftKey(r, e, t);
      else if (a) {
        let d = Ue.find((g) => g.key === e && g.profileId === a);
        d && (await s.updateKeyById(d.id, t));
      }
      P();
    } catch (d) {
      ((i.disabled = !1),
        (i.textContent = "Save"),
        l && (l.textContent = d instanceof Error ? d.message : String(d)));
    }
  }
  function kt(e, t) {
    (P(), e.classList.add("__se_label_active"));
    let o = e.dataset.label ?? "",
      n = e.dataset.labelDesc ?? "",
      a = J() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let s = e.textContent ?? "",
      i = document.createElement("div");
    ((i.className = "label-popper"),
      (i.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${S(o)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${S(a)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${n ? "" : "empty"}">${n ? S(n) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${S(s)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      t.appendChild(i));
    let l = e.getBoundingClientRect(),
      d = i.offsetHeight,
      g = i.offsetWidth,
      c = 8,
      x = l.bottom + c;
    x + d > window.innerHeight - 8 && (x = Math.max(8, l.top - d - c));
    let k = l.left;
    (k + g > window.innerWidth - 8 && (k = Math.max(8, window.innerWidth - g - 8)),
      (i.style.top = `${x}px`),
      (i.style.left = `${k}px`));
    let y = i.querySelector(".lp-input");
    (y.focus(),
      y.select(),
      i.querySelector(".lp-close").addEventListener("click", P),
      i.querySelector('[data-action="save"]').addEventListener("click", () => {
        Et(o, y.value, e, i);
      }),
      i.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let f = e.dataset.__seOriginal ?? "";
        ((e.textContent = f),
          ie(o, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: o, value: null } }),
          ),
          P());
      }),
      i.addEventListener("click", (f) => f.stopPropagation()),
      i.addEventListener("mousedown", (f) => f.stopPropagation()),
      (q = i));
  }
  function Ie(e, t, o) {
    if (((B = e), pe?.(), (pe = null), !e)) {
      P();
      for (let c of z()) c.classList.remove(_);
      qe();
      return;
    }
    wt();
    for (let c of z()) c.classList.add(_);
    function n(c) {
      return q !== null && c.composedPath().includes(q);
    }
    function r(c) {
      for (let x of c.composedPath())
        if (x instanceof HTMLElement && x.hasAttribute("data-label")) return x;
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
    function s(c) {
      n(c) || (r(c) && (c.preventDefault(), c.stopPropagation(), c.stopImmediatePropagation()));
    }
    function i(c) {
      if (n(c)) return;
      let x = r(c);
      x && (c.preventDefault(), c.stopPropagation(), c.stopImmediatePropagation(), kt(x, t));
    }
    function l(c) {
      q && (n(c) || r(c) || P());
    }
    function d(c) {
      c.key === "Escape" && P();
    }
    let g = new MutationObserver(() => {
      if (B) {
        for (let c of z()) c.classList.add(_);
        o();
      }
    });
    g.observe(document.body, { childList: !0, subtree: !0 });
    for (let c of a) document.addEventListener(c, s, !0);
    (document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", l, !0),
      document.addEventListener("keydown", d),
      (pe = () => {
        for (let c of a) document.removeEventListener(c, s, !0);
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", l, !0),
          document.removeEventListener("keydown", d),
          g.disconnect());
        for (let c of z()) c.classList.remove(_);
        qe();
      }));
  }
  async function Fe(e, t, o, n) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (o.innerHTML = ""),
      (Ne = t));
    let r, a, s;
    try {
      [r, a, s] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (x) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(x)}</div>`;
      return;
    }
    Ue = s;
    let i = yt(s),
      l = Array.from(i.keys()),
      d = { activeChunk: l[0] ?? null };
    function g() {
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
        k = d.activeChunk ? i.get(d.activeChunk) : null,
        y = k ? k.children.map((f) => ze(f, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${x}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${y}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((f) => {
          f.addEventListener("click", () => {
            ((d.activeChunk = f.dataset.chunk), g());
          });
        }));
    }
    function c() {
      let x = J() ?? "",
        k = ae() ?? "",
        y = z().length,
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
        E = [
          '<option value="">No draft</option>',
          ...a.map(
            (w) =>
              `<option value="${S(w.id)}" ${k === w.id ? "selected" : ""}>${S(w.name)}</option>`,
          ),
        ].join("");
      ((o.innerHTML = `
      <button class="subfoot-btn${B ? " on" : ""}${y === 0 ? " dim" : ""}" id="se-edit-toggle" title="${S(p)}">
        <span class="dot"></span>
        ${S(f)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${b}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${E}</select>`),
        o.querySelector("#se-edit-toggle").addEventListener("click", () => {
          D() ? ne(!1) : B ? (Ie(!1, n, () => c()), c()) : ne(!0);
        }),
        o.querySelector("#se-profile-sel").addEventListener("change", (w) => {
          let h = w.target.value || null;
          Re(h);
        }),
        o.querySelector("#se-draft-sel").addEventListener("change", (w) => {
          let h = w.target.value || null;
          _e(h);
        }));
    }
    (D() && (fe(), B || Ie(!0, n, () => c())), g(), c());
  }
  function N(e, t) {
    let o = document.createElement("div");
    o.className = "se-modal-overlay";
    let n = document.createElement("div");
    ((n.className = `se-modal se-modal-${t.size ?? "md"}`), o.appendChild(n));
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
      n.appendChild(r));
    let i = document.createElement("div");
    ((i.className = "se-modal-body"), n.appendChild(i));
    function l() {
      (o.removeEventListener("click", d),
        document.removeEventListener("keydown", g),
        o.remove(),
        t.onClose?.());
    }
    function d(c) {
      c.target === o && l();
    }
    function g(c) {
      c.key === "Escape" && l();
    }
    return (
      o.addEventListener("click", d),
      document.addEventListener("keydown", g),
      s.addEventListener("click", l),
      e.appendChild(o),
      { body: i, root: n, close: l }
    );
  }
  async function je() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 });
    try {
      let t = document.createElement("video");
      ((t.srcObject = e),
        (t.muted = !0),
        (t.playsInline = !0),
        await new Promise((i, l) => {
          let d = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(d), i());
          }),
            (t.onerror = () => {
              (clearTimeout(d), l(new Error("Capture stream errored")));
            }));
        }),
        await t.play(),
        await new Promise((i) => requestAnimationFrame(() => i(null))));
      let o = t.videoWidth,
        n = t.videoHeight;
      if (!o || !n) throw new Error("Capture stream returned no frames.");
      let r = document.createElement("canvas");
      ((r.width = o), (r.height = n));
      let a = r.getContext("2d");
      if (!a) throw new Error("Canvas 2d context unavailable");
      return (
        a.drawImage(t, 0, 0, o, n),
        await new Promise((i, l) => {
          r.toBlob((d) => (d ? i(d) : l(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      e.getTracks().forEach((t) => t.stop());
    }
  }
  async function Ke() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      o =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((s) =>
          MediaRecorder.isTypeSupported(s),
        ) ?? "",
      n = o ? new MediaRecorder(e, { mimeType: o }) : new MediaRecorder(e),
      r = [];
    (n.addEventListener("dataavailable", (s) => {
      s.data && s.data.size > 0 && r.push(s.data);
    }),
      n.start(500),
      e.getVideoTracks()[0]?.addEventListener("ended", () => {
        n.state !== "inactive" && n.stop();
      }));
    function a() {
      e.getTracks().forEach((s) => s.stop());
    }
    return {
      stop() {
        return new Promise((s, i) => {
          if (n.state === "inactive") {
            if ((a(), r.length === 0)) {
              i(new Error("No recording data."));
              return;
            }
            s(new Blob(r, { type: o || "video/webm" }));
            return;
          }
          (n.addEventListener(
            "stop",
            () => {
              (a(), s(new Blob(r, { type: o || "video/webm" })));
            },
            { once: !0 },
          ),
            n.addEventListener("error", (l) => i(l), { once: !0 }),
            n.stop());
        });
      },
      cancel() {
        (n.state !== "inactive" && n.stop(), a());
      },
    };
  }
  var We = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Ge(e) {
    let t = URL.createObjectURL(e),
      o = await new Promise((u, v) => {
        let m = new Image();
        ((m.onload = () => u(m)),
          (m.onerror = () => v(new Error("Failed to load screenshot for annotation."))),
          (m.src = t));
      }),
      n = document.createElement("div");
    n.className = "se-annot";
    let r = document.createElement("div");
    ((r.className = "se-annot-toolbar"), n.appendChild(r));
    let a = "arrow",
      s = We[0],
      i = [];
    function l(u, v) {
      let m = document.createElement("button");
      return (
        (m.type = "button"),
        (m.className = "se-annot-btn"),
        (m.dataset.tool = u),
        (m.textContent = v),
        m.addEventListener("click", () => {
          ((a = u),
            r
              .querySelectorAll("[data-tool]")
              .forEach((L) => L.classList.toggle("on", L.dataset.tool === u)));
        }),
        m
      );
    }
    let d = l("arrow", "\u2197 arrow");
    (d.classList.add("on"),
      r.appendChild(d),
      r.appendChild(l("rect", "\u25AD rect")),
      r.appendChild(l("text", "T text")));
    let g = document.createElement("span");
    ((g.className = "se-annot-sep"), r.appendChild(g));
    for (let u of We) {
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
              .forEach((m) => m.classList.toggle("on", m.dataset.color === u)));
        }),
        r.appendChild(v));
    }
    let c = document.createElement("button");
    ((c.type = "button"),
      (c.className = "se-annot-btn"),
      (c.textContent = "\u21B6 undo"),
      c.addEventListener("click", () => {
        (i.pop(), w());
      }),
      r.appendChild(c));
    let x = document.createElement("button");
    ((x.type = "button"),
      (x.className = "se-annot-btn"),
      (x.textContent = "clear"),
      x.addEventListener("click", () => {
        ((i.length = 0), w());
      }),
      r.appendChild(x));
    let k = document.createElement("div");
    ((k.className = "se-annot-stage"), n.appendChild(k));
    let y = document.createElement("canvas");
    ((y.width = o.naturalWidth),
      (y.height = o.naturalHeight),
      (y.className = "se-annot-canvas"),
      (y.style.cursor = "crosshair"),
      (y.style.touchAction = "none"),
      k.appendChild(y));
    let f = y.getContext("2d");
    function p(u) {
      let v = y.getBoundingClientRect(),
        m = y.width / v.width,
        L = y.height / v.height;
      return { x: (u.clientX - v.left) * m, y: (u.clientY - v.top) * L };
    }
    function b() {
      return Math.max(2, Math.round(o.naturalWidth / 400));
    }
    function E(u) {
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
          m = Math.min(u.y1, u.y2),
          L = Math.abs(u.x2 - u.x1),
          M = Math.abs(u.y2 - u.y1);
        f.strokeRect(v, m, L, M);
      } else if (u.tool === "arrow") {
        (f.beginPath(), f.moveTo(u.x1, u.y1), f.lineTo(u.x2, u.y2), f.stroke());
        let v = Math.atan2(u.y2 - u.y1, u.x2 - u.x1),
          m = b() * 5;
        (f.beginPath(),
          f.moveTo(u.x2, u.y2),
          f.lineTo(u.x2 - m * Math.cos(v - Math.PI / 6), u.y2 - m * Math.sin(v - Math.PI / 6)),
          f.lineTo(u.x2 - m * Math.cos(v + Math.PI / 6), u.y2 - m * Math.sin(v + Math.PI / 6)),
          f.closePath(),
          f.fill());
      } else if (u.tool === "text" && u.text) {
        let v = Math.max(14, Math.round(o.naturalWidth / 60));
        ((f.font = `600 ${v}px ui-sans-serif, system-ui, sans-serif`), (f.textBaseline = "top"));
        let m = v * 0.3,
          M = f.measureText(u.text).width + m * 2,
          T = v + m * 2;
        ((f.fillStyle = "rgba(0,0,0,0.55)"),
          f.fillRect(u.x1, u.y1, M, T),
          (f.fillStyle = u.color),
          f.fillText(u.text, u.x1 + m, u.y1 + m));
      }
      f.restore();
    }
    function w(u) {
      (f.clearRect(0, 0, y.width, y.height), f.drawImage(o, 0, 0));
      for (let v of i) E(v);
      u && E(u);
    }
    w();
    let h = null;
    return (
      y.addEventListener("pointerdown", (u) => {
        u.preventDefault();
        let v = p(u);
        if (a === "text") {
          let m = prompt("Annotation text:");
          m &&
            m.trim() &&
            (i.push({ tool: "text", color: s, x1: v.x, y1: v.y, x2: v.x, y2: v.y, text: m.trim() }),
            w());
          return;
        }
        ((h = { x1: v.x, y1: v.y }), y.setPointerCapture(u.pointerId));
      }),
      y.addEventListener("pointermove", (u) => {
        if (!h) return;
        let v = p(u);
        w({ tool: a, color: s, x1: h.x1, y1: h.y1, x2: v.x, y2: v.y });
      }),
      y.addEventListener("pointerup", (u) => {
        if (!h) return;
        let v = p(u),
          m = Math.abs(v.x - h.x1),
          L = Math.abs(v.y - h.y1);
        ((m > 4 || L > 4) && i.push({ tool: a, color: s, x1: h.x1, y1: h.y1, x2: v.x, y2: v.y }),
          (h = null),
          w());
      }),
      {
        root: n,
        async export() {
          let u = await new Promise((v, m) => {
            y.toBlob((L) => (L ? v(L) : m(new Error("toBlob failed"))), "image/png");
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
  function Lt(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function St(e) {
    let t = Date.now() - Date.parse(e),
      o = Math.floor(t / 6e4);
    if (o < 1) return "just now";
    if (o < 60) return `${o}m ago`;
    let n = Math.floor(o / 60);
    return n < 24 ? `${n}h ago` : `${Math.floor(n / 24)}d ago`;
  }
  async function Je(e, t, o) {
    async function n() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let a;
      try {
        a = await t.bugs();
      } catch (i) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${U(String(i))}</div>`), r());
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
                <div class="row-name">${U(i.title)}</div>
                <div class="row-sub">${St(i.createdAt)}${i.reporterEmail ? ` \xB7 ${U(i.reporterEmail)}` : ""}</div>
              </div>
              ${Lt(i.status)}
            </a>`,
            )
            .join("")),
        r());
    }
    function r() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => Mt(t, o, n));
    }
    await n();
  }
  function Mt(e, t, o) {
    let n = N(t, { title: "File a bug", size: "lg" }),
      r = [],
      a = null;
    n.body.innerHTML = `
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
    let s = n.body.querySelector("#se-b-title"),
      i = n.body.querySelector("#se-b-steps"),
      l = n.body.querySelector("#se-b-actual"),
      d = n.body.querySelector("#se-b-expected"),
      g = n.body.querySelector("#se-b-attach"),
      c = n.body.querySelector("#se-b-status"),
      x = n.body.querySelector("#se-b-file"),
      k = n.body.querySelector("#se-b-record");
    function y() {
      if (r.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = r
        .map(
          (p, b) => `
          <div class="se-attach-item">
            <span>${U(p.filename)} <span class="dim">(${(p.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${b}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((p) => {
          p.addEventListener("click", () => {
            (r.splice(Number(p.dataset.idx), 1), y());
          });
        }));
    }
    function f(p, b = !1) {
      ((c.textContent = p), (c.style.color = b ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (n.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let p = await je();
        (f(""),
          Tt(t, p, (b) => {
            (r.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: b }),
              y());
          }));
      } catch (p) {
        f(String(p instanceof Error ? p.message : p), !0);
      }
    }),
      k.addEventListener("click", async () => {
        if (a) {
          try {
            ((k.disabled = !0), f("Finalizing recording\u2026"));
            let p = await a.stop();
            ((a = null),
              (k.textContent = "\u23FA Record screen"),
              k.classList.remove("danger"),
              r.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: p }),
              y(),
              f(""));
          } catch (p) {
            f(String(p instanceof Error ? p.message : p), !0);
          } finally {
            k.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((a = await Ke()),
            (k.textContent = "\u25A0 Stop recording"),
            k.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (p) {
          (f(String(p instanceof Error ? p.message : p), !0), (a = null));
        }
      }),
      n.body.querySelector("#se-b-upload").addEventListener("click", () => x.click()),
      x.addEventListener("change", () => {
        let p = x.files?.[0];
        p && (r.push({ kind: "file", filename: p.name, blob: p }), (x.value = ""), y());
      }),
      n.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (a && a.cancel(), n.close());
      }),
      n.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let p = n.body.querySelector("#se-b-submit"),
          b = s.value.trim();
        if (!b) {
          (f("Title is required", !0), s.focus());
          return;
        }
        ((p.disabled = !0), f("Submitting\u2026"));
        try {
          let E = await e.createBug({
            title: b,
            stepsToReproduce: i.value,
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
                reportId: E.id,
                kind: h.kind,
                filename: h.filename,
                blob: h.blob,
              }));
          }
          (n.close(), o());
        } catch (E) {
          (f(String(E instanceof Error ? E.message : E), !0), (p.disabled = !1));
        }
      }));
  }
  function Tt(e, t, o) {
    let n = N(e, { title: "Annotate screenshot", size: "lg" });
    n.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let r = n.body.querySelector("#se-annot-host");
    ((r.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Ge(t)
        .then((a) => {
          ((r.innerHTML = ""),
            r.appendChild(a.root),
            n.body.querySelector("#se-a-cancel").addEventListener("click", () => n.close()),
            n.body.querySelector("#se-a-save").addEventListener("click", async () => {
              let s = await a.export();
              (n.close(), o(s));
            }));
        })
        .catch((a) => {
          r.innerHTML = `<div class="err">${U(String(a))}</div>`;
        }));
  }
  function ge(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function $t(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Rt(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function _t(e) {
    let t = Date.now() - Date.parse(e),
      o = Math.floor(t / 6e4);
    if (o < 1) return "just now";
    if (o < 60) return `${o}m ago`;
    let n = Math.floor(o / 60);
    return n < 24 ? `${n}h ago` : `${Math.floor(n / 24)}d ago`;
  }
  async function Ve(e, t, o) {
    async function n() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let r;
      try {
        r = await t.featureRequests();
      } catch (s) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${ge(String(s))}</div>`;
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
                <div class="row-name">${ge(s.title)}</div>
                <div class="row-sub">${_t(s.createdAt)}${s.reporterEmail ? ` \xB7 ${ge(s.reporterEmail)}` : ""}</div>
              </div>
              ${Rt(s.importance)}
              ${$t(s.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => Pt(t, o, n)));
    }
    await n();
  }
  function Pt(e, t, o) {
    let n = N(t, { title: "Request a feature", size: "lg" });
    n.body.innerHTML = `
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
    let r = n.body.querySelector("#se-f-title"),
      a = n.body.querySelector("#se-f-desc"),
      s = n.body.querySelector("#se-f-use"),
      i = n.body.querySelector("#se-f-imp"),
      l = n.body.querySelector("#se-f-status");
    (n.body.querySelector("#se-f-cancel").addEventListener("click", () => n.close()),
      n.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let d = r.value.trim();
        if (!d) {
          ((l.textContent = "Title is required"), (l.style.color = "var(--se-danger)"), r.focus());
          return;
        }
        let g = n.body.querySelector("#se-f-submit");
        ((g.disabled = !0),
          (l.textContent = "Submitting\u2026"),
          (l.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: d,
            description: a.value,
            useCase: s.value,
            importance: i.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            n.close(),
            o());
        } catch (c) {
          ((l.textContent = String(c instanceof Error ? c.message : c)),
            (l.style.color = "var(--se-danger)"),
            (g.disabled = !1));
        }
      }));
  }
  var At =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    Ct =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    Ht =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Ot =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    Bt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    qt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    It =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Dt =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    Z = {
      gates: { icon: At, label: "Gates" },
      configs: { icon: Ct, label: "Configs" },
      experiments: { icon: Ht, label: "Experiments" },
      i18n: { icon: Ot, label: "Translations" },
      bugs: { icon: Bt, label: "Bugs" },
      features: { icon: qt, label: "Feature requests" },
    },
    tt = "se_l_overlay",
    me = "se_l_active_panel";
  function zt() {
    try {
      let e = sessionStorage.getItem(me);
      if (e && e in Z) return e;
    } catch {}
    return null;
  }
  function Ye(e) {
    try {
      e === null ? sessionStorage.removeItem(me) : sessionStorage.setItem(me, e);
    } catch {}
  }
  var ve = 240,
    Xe = 580,
    be = 180,
    Ze = 700,
    Qe = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Nt() {
    try {
      let e = localStorage.getItem(tt);
      if (e) return { ...Qe, ...JSON.parse(e) };
    } catch {}
    return { ...Qe };
  }
  function et(e) {
    try {
      localStorage.setItem(tt, JSON.stringify(e));
    } catch {}
  }
  function Ut(e, t) {
    let o = window.innerWidth,
      n = window.innerHeight,
      r = [
        [o - e, "right"],
        [e, "left"],
        [t, "top"],
        [n - t, "bottom"],
      ];
    r.sort((l, d) => l[0] - d[0]);
    let a = r[0][1],
      i = Math.max(5, Math.min(95, a === "left" || a === "right" ? (t / n) * 100 : (e / o) * 100));
    return { edge: a, offsetPct: i };
  }
  function F(e, t, o, n) {
    let { edge: r, offsetPct: a, panelWidth: s, panelHeight: i } = n,
      l = window.innerWidth,
      d = window.innerHeight,
      g = r === "left" || r === "right",
      c = Math.max(ve, Math.min(s, l - 80)),
      x = Math.max(be, Math.min(i, d - 40)),
      k = (a / 100) * (g ? d : l),
      y = e.getBoundingClientRect(),
      f = g ? y.width || 52 : y.height || 52,
      p = e.style;
    ((p.top = p.bottom = p.left = p.right = p.transform = ""),
      (p.borderTop = p.borderBottom = p.borderLeft = p.borderRight = ""),
      (p.flexDirection = g ? "column" : "row"),
      (p.padding = g ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((p.right = "0"),
          (p.top = `${a}%`),
          (p.transform = "translateY(-50%)"),
          (p.borderRadius = "10px 0 0 10px"),
          (p.borderRight = "none"),
          (p.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((p.left = "0"),
            (p.top = `${a}%`),
            (p.transform = "translateY(-50%)"),
            (p.borderRadius = "0 10px 10px 0"),
            (p.borderLeft = "none"),
            (p.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((p.top = "0"),
              (p.left = `${a}%`),
              (p.transform = "translateX(-50%)"),
              (p.borderRadius = "0 0 10px 10px"),
              (p.borderTop = "none"),
              (p.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((p.bottom = "0"),
              (p.left = `${a}%`),
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
      let w = Math.max(10, Math.min(d - x - 10, k - x / 2));
      ((b.right = f + "px"),
        (b.top = w + "px"),
        (b.borderRadius = "10px 0 0 10px"),
        (b.borderRight = "none"),
        (b.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let w = Math.max(10, Math.min(d - x - 10, k - x / 2));
      ((b.left = f + "px"),
        (b.top = w + "px"),
        (b.borderRadius = "0 10px 10px 0"),
        (b.borderLeft = "none"),
        (b.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let w = Math.max(10, Math.min(l - c - 10, k - c / 2));
      ((b.top = f + "px"),
        (b.left = w + "px"),
        (b.borderRadius = "0 0 10px 10px"),
        (b.borderTop = "none"),
        (b.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let w = Math.max(10, Math.min(l - c - 10, k - c / 2));
      ((b.bottom = f + "px"),
        (b.left = w + "px"),
        (b.borderRadius = "10px 10px 0 0"),
        (b.borderBottom = "none"),
        (b.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let E = o.style;
    ((E.top = E.bottom = E.left = E.right = E.width = E.height = ""),
      (o.dataset.dir = g ? "ew" : "ns"),
      g
        ? ((E.width = "10px"),
          (E.top = "0"),
          (E.bottom = "0"),
          (o.style.cursor = "ew-resize"),
          r === "right" ? (E.left = "0") : (E.right = "0"))
        : ((E.height = "10px"),
          (E.left = "0"),
          (E.right = "0"),
          (o.style.cursor = "ns-resize"),
          r === "top" ? (E.bottom = "0") : (E.top = "0")));
  }
  function nt(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let o = t.attachShadow({ mode: "open" });
    o.innerHTML = `<style>${xe}</style><div id="toolbar"></div><div id="panel"></div>`;
    let n = o.getElementById("toolbar"),
      r = o.getElementById("panel");
    ((n.className = "toolbar"), (r.className = "panel"));
    let a = document.createElement("div");
    ((a.className = "resize-handle"), r.appendChild(a));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), r.appendChild(s));
    let i = Nt(),
      l = null,
      d = ye(),
      g = zt();
    requestAnimationFrame(() => F(n, r, a, i));
    let c = document.createElement("div");
    ((c.className = "drag-handle"),
      (c.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (c.innerHTML = Dt),
      n.appendChild(c),
      c.addEventListener("mousedown", (h) => {
        (h.preventDefault(), c.classList.add("dragging"));
        let u = (m) => {
            let { edge: L, offsetPct: M } = Ut(m.clientX, m.clientY);
            ((i = { ...i, edge: L, offsetPct: M }), F(n, r, a, i));
          },
          v = () => {
            (c.classList.remove("dragging"),
              document.removeEventListener("mousemove", u),
              document.removeEventListener("mouseup", v),
              et(i));
          };
        (document.addEventListener("mousemove", u), document.addEventListener("mouseup", v));
      }));
    let x = new Map();
    for (let [h, { icon: u, label: v }] of Object.entries(Z)) {
      let m = document.createElement("button");
      ((m.className = "btn"),
        (m.title = v),
        (m.innerHTML = u),
        m.addEventListener("click", () => p(h)),
        n.appendChild(m),
        x.set(h, m));
    }
    a.addEventListener("mousedown", (h) => {
      (h.preventDefault(), h.stopPropagation(), a.classList.add("dragging"));
      let u = h.clientX,
        v = h.clientY,
        m = i.panelWidth,
        L = i.panelHeight,
        { edge: M } = i,
        T = (O) => {
          let K = O.clientX - u,
            he = O.clientY - v,
            I = { ...i };
          (M === "right" && (I.panelWidth = Math.max(ve, Math.min(Xe, m - K))),
            M === "left" && (I.panelWidth = Math.max(ve, Math.min(Xe, m + K))),
            M === "top" && (I.panelHeight = Math.max(be, Math.min(Ze, L + he))),
            M === "bottom" && (I.panelHeight = Math.max(be, Math.min(Ze, L - he))),
            (i = I),
            F(n, r, a, i));
        },
        A = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", T),
            document.removeEventListener("mouseup", A),
            et(i));
        };
      (document.addEventListener("mousemove", T), document.addEventListener("mouseup", A));
    });
    let k = () => F(n, r, a, i);
    window.addEventListener("resize", k);
    function y(h) {
      ((l = h),
        Ye(h),
        x.forEach((u, v) => u.classList.toggle("active", v === h)),
        r.classList.add("open"),
        F(n, r, a, i),
        E(h));
    }
    function f() {
      (r.classList.remove("open"),
        x.forEach((h) => h.classList.remove("active")),
        (l = null),
        Ye(null));
    }
    function p(h) {
      l === h ? f() : y(h);
    }
    function b(h, u) {
      let v = typeof window < "u" && window.location ? window.location.host : "",
        m = v ? `<span class="sub">${v}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${h}</span>
          <span class="panel-title-label">${u}</span>
          ${m}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${It}</button>
      </div>`;
    }
    function E(h) {
      let { icon: u, label: v } = Z[h];
      if (!d) {
        w(h);
        return;
      }
      let m = new Y(e.adminUrl, d.token);
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
          (we(), (d = null), w(h));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Pe(), E(h));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          Ae();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let A = le({ ...de(), openDevtools: !0 });
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
        gates: () => Ce(L, m),
        configs: () => He(L, m),
        experiments: () => Be(L, m),
        i18n: () => Fe(L, m, M, o),
        bugs: () => Je(L, m, o),
        features: () => Ve(L, m, o),
      })
        [h]()
        .catch((A) => {
          L.innerHTML = `<div class="err">${String(A)}</div>`;
        });
    }
    function w(h) {
      let { icon: u, label: v } = Z[h];
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
          let m = s.querySelector("#se-connect"),
            L = s.querySelector("#se-auth-status"),
            M = s.querySelector("#se-auth-err");
          ((m.disabled = !0),
            (m.textContent = "Opening\u2026"),
            (L.textContent = ""),
            (M.textContent = ""));
          try {
            ((d = await Ee(e, () => {
              ((L.textContent = "Waiting for approval in the opened tab\u2026"),
                (m.textContent = "Waiting\u2026"));
            })),
              E(h));
          } catch (T) {
            ((M.textContent = T instanceof Error ? T.message : String(T)),
              (L.textContent = ""),
              (m.disabled = !1),
              (m.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      g && requestAnimationFrame(() => y(g)),
      {
        destroy() {
          (window.removeEventListener("resize", k), t.remove());
        },
      }
    );
  }
  function Ft() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          return new URL(e.src).origin;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let o of Array.from(t))
        if (o.src.includes("se-devtools.js"))
          try {
            return new URL(o.src).origin;
          } catch {}
    }
    return typeof window < "u" ? window.location.origin : "";
  }
  var j = null;
  function ot(e = {}) {
    if (j || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? Ft() },
      { destroy: o } = nt(t);
    j = o;
  }
  function jt() {
    (j?.(), (j = null));
  }
  function rt(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    Se() && ot(e);
    let o = t.split("+"),
      n = o[o.length - 1],
      r = o.includes("Shift"),
      a = o.includes("Alt") || o.includes("Option"),
      s = o.includes("Ctrl") || o.includes("Control"),
      i = o.includes("Meta") || o.includes("Cmd"),
      l = /^[a-zA-Z]$/.test(n) ? `Key${n.toUpperCase()}` : null;
    function d(g) {
      (l ? g.code === l : g.key.toLowerCase() === n.toLowerCase()) &&
        g.shiftKey === r &&
        g.altKey === a &&
        g.ctrlKey === s &&
        g.metaKey === i &&
        (j ? jt() : ot(e));
    }
    return (window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((rt(e), D())) {
      let t = !1,
        o = new MutationObserver(() => n()),
        n = () => {
          t ||
            ((t = !0),
            requestAnimationFrame(() => {
              ((t = !1),
                o.disconnect(),
                fe(),
                o.observe(document.body, { childList: !0, subtree: !0 }));
            }));
        };
      (n(), window.addEventListener("se:i18n:ready", () => n(), { once: !0 }));
      let r = window;
      r.i18n?.on && r.i18n.on("update", () => n());
    }
    window.__se_devtools_ready = !0;
  }
})();
