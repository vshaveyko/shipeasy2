"use strict";
(() => {
  var st = Object.defineProperty;
  var at = (e, t, o) =>
    t in e ? st(e, t, { enumerable: !0, configurable: !0, writable: !0, value: o }) : (e[t] = o);
  var ee = (e, t, o) => at(e, typeof t != "symbol" ? t + "" : t, o);
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
  var te = "se_dt_session";
  function ye() {
    try {
      let e = sessionStorage.getItem(te);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function it(e) {
    try {
      sessionStorage.setItem(te, JSON.stringify(e));
    } catch {}
  }
  function we() {
    try {
      sessionStorage.removeItem(te);
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
        let c = !1;
        function g(f, d) {
          c ||
            ((c = !0),
            window.removeEventListener("message", p),
            clearInterval(w),
            clearTimeout(y),
            f ? i(f) : s(d));
        }
        function p(f) {
          if (f.origin !== o) return;
          let d = f.data;
          if (!d || d.type !== "se:devtools-auth" || !d.token || !d.projectId) return;
          let h = { token: d.token, projectId: d.projectId };
          (it(h), g(null, h));
        }
        window.addEventListener("message", p);
        let x = Date.now(),
          w = setInterval(() => {
            Date.now() - x < 1500 ||
              (a.closed && !c && g(new Error("Sign-in window closed before approval.")));
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
  function J(e) {
    return lt.test(e) ? !0 : dt.test(e) ? !1 : null;
  }
  function ne(e) {
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
  function V() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function R(e, t) {
    let o = V(),
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
    let e = V();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function D() {
    return typeof window > "u" ? !1 : V().has("se_edit_labels");
  }
  function oe(e) {
    C([["se_edit_labels", e ? "1" : null]]);
  }
  function re(e) {
    let t = R(`se_ks_${e}`) ?? R(`se_gate_${e}`) ?? R(`se-gate-${e}`);
    return t === null ? null : J(t);
  }
  function Me(e, t, o = "session") {
    C([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function se(e) {
    let t = R(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return ne(t);
  }
  function ae(e, t, o = "session") {
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
  function z() {
    return R("se_i18n");
  }
  function Re(e, t = "session") {
    C([["se_i18n", e]]);
  }
  function ie() {
    return R("se_i18n_draft");
  }
  function _e(e, t = "session") {
    C([["se_i18n_draft", e]]);
  }
  function Y(e) {
    return R(`se_i18n_label_${e}`);
  }
  function le(e, t, o = "session") {
    C([[`se_i18n_label_${e}`, t]]);
  }
  function Pe() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) ke.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function de(e, t) {
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
  function ce() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = V();
    for (let [o, n] of t)
      if (o.startsWith("se_ks_")) {
        let r = J(n);
        r !== null && (e.gates[o.slice(6)] = r);
      } else if (o.startsWith("se_gate_")) {
        let r = J(n);
        r !== null && (e.gates[o.slice(8)] = r);
      } else if (o.startsWith("se-gate-")) {
        let r = J(n);
        r !== null && (e.gates[o.slice(8)] = r);
      } else
        o.startsWith("se_exp_") || o.startsWith("se-exp-")
          ? (e.experiments[o.slice(7)] = n)
          : o.startsWith("se_config_") || o.startsWith("se-config-")
            ? (e.configs[o.slice(10)] = ne(n))
            : o === "se_i18n"
              ? (e.i18nProfile = n)
              : o === "se_i18n_draft"
                ? (e.i18nDraft = n)
                : o.startsWith("se_i18n_label_") && (e.i18nLabels[o.slice(14)] = n);
    return e;
  }
  function Ae(e) {
    if (typeof window > "u") return;
    let t = { ...ce(), ...e, openDevtools: !0 },
      o = de(t);
    window.location.assign(o);
  }
  var X = class {
    constructor(t, o) {
      ee(this, "adminUrl", t);
      ee(this, "token", o);
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
      <div class="empty-title">${pe(e.title)}</div>
      <div class="empty-msg">${pe(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${pe(e.ctaLabel)}</a>
    </div>`;
  }
  function pe(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function ct() {
    return window.__shipeasy ?? null;
  }
  function pt(e) {
    let t = re(e.name),
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
          ${ut(a.name, re(a.name))}
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
    return se(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
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
          let i = se(s.name),
            l = i !== void 0 ? i : s.valueJson,
            c = n.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${gt(s.name)}
              ${c ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              c
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
          c = e.querySelector(`textarea[data-name="${l}"]`);
        if (c)
          try {
            let g = JSON.parse(c.value);
            (ae(l, g, i), n.delete(l), r());
          } catch {
            c.style.borderColor = "#f87171";
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
            (ae(s.dataset.name, null), n.delete(s.dataset.name), r());
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
      i = (l, c) => (l.length === 0 ? "" : `<div class="sec-head">${c}</div>${l.map(xt).join("")}`);
    ((e.innerHTML = i(a, "Running") + i(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((l) => {
        l.addEventListener("change", () => {
          let c = l.dataset.name;
          $e(c, l.value || null);
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
          (c) => `
          <button class="tab${c.name === r.activeUniverse ? " active" : ""}"
                  data-universe="${c.name}">${c.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${s}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((c) => {
          c.addEventListener("click", () => {
            ((r.activeUniverse = c.dataset.universe), a());
          });
        }));
      let i = e.querySelector(".tab-body"),
        l = n.find((c) => c.name === r.activeUniverse);
      Oe(i, l, o, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          i = n.find((l) => l.name === r.activeUniverse);
        s && i && Oe(s, i, o, t.adminUrl);
      }));
  }
  var Z = "\uFFF9";
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
          c = s.children.find((g) => g.segment === l);
        (c || ((c = { segment: l, children: [] }), s.children.push(c)), (s = c));
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
      let r = e.fullKey ? Y(e.fullKey) : null,
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
    fe = "__se_label_target_style",
    O = !1,
    ue = null,
    q = null,
    Ne = null,
    Ue = [];
  function wt() {
    if (document.getElementById(fe)) return;
    let e = document.createElement("style");
    ((e.id = fe),
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
    document.getElementById(fe)?.remove();
  }
  function U(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      o = [],
      n = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      r;
    for (; (r = t.nextNode()); ) {
      let i = r.nodeValue ?? "";
      if (
        !i.includes(Z) ||
        n.has(r.parentElement?.tagName ?? "") ||
        r.parentElement?.closest?.("[data-label]")
      )
        continue;
      let l = document.createDocumentFragment(),
        c = 0;
      H.lastIndex = 0;
      let g;
      for (; (g = H.exec(i)) !== null; ) {
        g.index > c && l.appendChild(document.createTextNode(i.slice(c, g.index)));
        let p = document.createElement("span");
        p.setAttribute("data-label", g[1]);
        let x = Y(g[1]);
        ((p.textContent = x ?? g[2]), l.appendChild(p), (c = g.index + g[0].length));
      }
      (c < i.length && l.appendChild(document.createTextNode(i.slice(c))), o.push([r, l]));
    }
    for (let [i, l] of o) i.parentNode?.replaceChild(l, i);
    let a = window._sei18n_t;
    for (let i of Array.from(document.querySelectorAll("[data-label]"))) {
      let l = i.textContent ?? "",
        c = i.getAttribute("data-label"),
        g = Y(c);
      if (l.includes(Z)) {
        H.lastIndex = 0;
        let p = H.exec(l);
        p && (i.textContent = g ?? p[2]);
      } else if (a)
        try {
          let p = i.dataset.variables ? JSON.parse(i.dataset.variables) : void 0,
            x = a(c, p);
          x && x !== c ? (i.textContent = g ?? x) : g && (i.textContent = g);
        } catch {}
    }
    let s = ["placeholder", "alt", "aria-label", "title"];
    for (let i of s)
      for (let l of Array.from(document.querySelectorAll(`[${i}]`))) {
        let c = l.getAttribute(i);
        if (!c.includes(Z)) continue;
        H.lastIndex = 0;
        let g = H.exec(c);
        g && l.setAttribute(i, g[2]);
      }
    return o.length;
  }
  function N() {
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
      le(e, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e, value: t } })));
    let r = ie(),
      a = z(),
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
        let c = Ue.find((g) => g.key === e && g.profileId === a);
        c && (await s.updateKeyById(c.id, t));
      }
      P();
    } catch (c) {
      ((i.disabled = !1),
        (i.textContent = "Save"),
        l && (l.textContent = c instanceof Error ? c.message : String(c)));
    }
  }
  function kt(e, t) {
    (P(), e.classList.add("__se_label_active"));
    let o = e.dataset.label ?? "",
      n = e.dataset.labelDesc ?? "",
      a = z() ?? "default";
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
      c = i.offsetHeight,
      g = i.offsetWidth,
      p = 8,
      x = l.bottom + p;
    x + c > window.innerHeight - 8 && (x = Math.max(8, l.top - c - p));
    let w = l.left;
    (w + g > window.innerWidth - 8 && (w = Math.max(8, window.innerWidth - g - 8)),
      (i.style.top = `${x}px`),
      (i.style.left = `${w}px`));
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
          le(o, null),
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
    if (((O = e), ue?.(), (ue = null), !e)) {
      P();
      for (let p of N()) p.classList.remove(_);
      qe();
      return;
    }
    wt();
    for (let p of N()) p.classList.add(_);
    function n(p) {
      return q !== null && p.composedPath().includes(q);
    }
    function r(p) {
      for (let x of p.composedPath())
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
    function s(p) {
      n(p) || (r(p) && (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation()));
    }
    function i(p) {
      if (n(p)) return;
      let x = r(p);
      x && (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation(), kt(x, t));
    }
    function l(p) {
      q && (n(p) || r(p) || P());
    }
    function c(p) {
      p.key === "Escape" && P();
    }
    let g = new MutationObserver(() => {
      if (O) {
        for (let p of N()) p.classList.add(_);
        o();
      }
    });
    g.observe(document.body, { childList: !0, subtree: !0 });
    for (let p of a) document.addEventListener(p, s, !0);
    (document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", l, !0),
      document.addEventListener("keydown", c),
      (ue = () => {
        for (let p of a) document.removeEventListener(p, s, !0);
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", l, !0),
          document.removeEventListener("keydown", c),
          g.disconnect());
        for (let p of N()) p.classList.remove(_);
        qe();
      }));
  }
  async function Fe(e, t, o, n) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (o.innerHTML = ""),
      (Ne = t));
    let r, a, s;
    try {
      let w = z() ?? void 0;
      [r, a, s] = await Promise.all([t.profiles(), t.drafts(), t.keys(w)]);
    } catch (w) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(w)}</div>`;
      return;
    }
    Ue = s;
    let i = yt(s),
      l = Array.from(i.keys()),
      c = { activeChunk: l[0] ?? null };
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
      let w = l
          .map(
            (d) =>
              `<button class="tab${d === c.activeChunk ? " active" : ""}" data-chunk="${S(d)}">${S(d)}</button>`,
          )
          .join(""),
        y = c.activeChunk ? i.get(c.activeChunk) : null,
        f = y ? y.children.map((d) => ze(d, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${w}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${f}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((d) => {
          d.addEventListener("click", () => {
            ((c.activeChunk = d.dataset.chunk), g());
          });
        }));
    }
    function p() {
      let w = z() ?? "",
        y = ie() ?? "";
      U();
      let f = N().length,
        d = O
          ? `Editing ${f} label${f === 1 ? "" : "s"}`
          : f > 0
            ? `Edit labels (${f})`
            : "Edit labels",
        h = O
          ? "Disable in-page label editing"
          : f === 0
            ? "Enable in-page label editing \u2014 reloads page with ?se_edit_labels=1 to scan all translation strings"
            : "Toggle in-page label editing (reloads page)",
        E = [
          '<option value="">Default</option>',
          ...r.map(
            (b) =>
              `<option value="${S(b.id)}" ${w === b.id ? "selected" : ""}>${S(b.name)}</option>`,
          ),
        ].join(""),
        L = [
          '<option value="">No draft</option>',
          ...a.map(
            (b) =>
              `<option value="${S(b.id)}" ${y === b.id ? "selected" : ""}>${S(b.name)}</option>`,
          ),
        ].join("");
      ((o.innerHTML = `
      <button class="subfoot-btn${O ? " on" : ""}" id="se-edit-toggle" title="${S(h)}">
        <span class="dot"></span>
        ${S(d)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${E}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${L}</select>`),
        o.querySelector("#se-edit-toggle").addEventListener("click", () => {
          D() ? oe(!1) : O ? (Ie(!1, n, () => p()), p()) : oe(!0);
        }),
        o.querySelector("#se-profile-sel").addEventListener("change", (b) => {
          let u = b.target.value || null;
          Re(u);
        }),
        o.querySelector("#se-draft-sel").addEventListener("change", (b) => {
          let u = b.target.value || null;
          _e(u);
        }));
    }
    (D() && (U(), O || Ie(!0, n, () => p())),
      g(),
      p(),
      window.i18n?.on?.("update", () => {
        (U(), p());
      }));
  }
  function F(e, t) {
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
      (o.removeEventListener("click", c),
        document.removeEventListener("keydown", g),
        o.remove(),
        t.onClose?.());
    }
    function c(p) {
      p.target === o && l();
    }
    function g(p) {
      p.key === "Escape" && l();
    }
    return (
      o.addEventListener("click", c),
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
          let c = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(c), i());
          }),
            (t.onerror = () => {
              (clearTimeout(c), l(new Error("Capture stream errored")));
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
          r.toBlob((c) => (c ? i(c) : l(new Error("toBlob failed"))), "image/png");
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
              .forEach((k) => k.classList.toggle("on", k.dataset.tool === u)));
        }),
        m
      );
    }
    let c = l("arrow", "\u2197 arrow");
    (c.classList.add("on"),
      r.appendChild(c),
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
    let p = document.createElement("button");
    ((p.type = "button"),
      (p.className = "se-annot-btn"),
      (p.textContent = "\u21B6 undo"),
      p.addEventListener("click", () => {
        (i.pop(), L());
      }),
      r.appendChild(p));
    let x = document.createElement("button");
    ((x.type = "button"),
      (x.className = "se-annot-btn"),
      (x.textContent = "clear"),
      x.addEventListener("click", () => {
        ((i.length = 0), L());
      }),
      r.appendChild(x));
    let w = document.createElement("div");
    ((w.className = "se-annot-stage"), n.appendChild(w));
    let y = document.createElement("canvas");
    ((y.width = o.naturalWidth),
      (y.height = o.naturalHeight),
      (y.className = "se-annot-canvas"),
      (y.style.cursor = "crosshair"),
      (y.style.touchAction = "none"),
      w.appendChild(y));
    let f = y.getContext("2d");
    function d(u) {
      let v = y.getBoundingClientRect(),
        m = y.width / v.width,
        k = y.height / v.height;
      return { x: (u.clientX - v.left) * m, y: (u.clientY - v.top) * k };
    }
    function h() {
      return Math.max(2, Math.round(o.naturalWidth / 400));
    }
    function E(u) {
      if (
        (f.save(),
        (f.strokeStyle = u.color),
        (f.fillStyle = u.color),
        (f.lineWidth = h()),
        (f.lineCap = "round"),
        (f.lineJoin = "round"),
        u.tool === "rect")
      ) {
        let v = Math.min(u.x1, u.x2),
          m = Math.min(u.y1, u.y2),
          k = Math.abs(u.x2 - u.x1),
          M = Math.abs(u.y2 - u.y1);
        f.strokeRect(v, m, k, M);
      } else if (u.tool === "arrow") {
        (f.beginPath(), f.moveTo(u.x1, u.y1), f.lineTo(u.x2, u.y2), f.stroke());
        let v = Math.atan2(u.y2 - u.y1, u.x2 - u.x1),
          m = h() * 5;
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
    function L(u) {
      (f.clearRect(0, 0, y.width, y.height), f.drawImage(o, 0, 0));
      for (let v of i) E(v);
      u && E(u);
    }
    L();
    let b = null;
    return (
      y.addEventListener("pointerdown", (u) => {
        u.preventDefault();
        let v = d(u);
        if (a === "text") {
          let m = prompt("Annotation text:");
          m &&
            m.trim() &&
            (i.push({ tool: "text", color: s, x1: v.x, y1: v.y, x2: v.x, y2: v.y, text: m.trim() }),
            L());
          return;
        }
        ((b = { x1: v.x, y1: v.y }), y.setPointerCapture(u.pointerId));
      }),
      y.addEventListener("pointermove", (u) => {
        if (!b) return;
        let v = d(u);
        L({ tool: a, color: s, x1: b.x1, y1: b.y1, x2: v.x, y2: v.y });
      }),
      y.addEventListener("pointerup", (u) => {
        if (!b) return;
        let v = d(u),
          m = Math.abs(v.x - b.x1),
          k = Math.abs(v.y - b.y1);
        ((m > 4 || k > 4) && i.push({ tool: a, color: s, x1: b.x1, y1: b.y1, x2: v.x, y2: v.y }),
          (b = null),
          L());
      }),
      {
        root: n,
        async export() {
          let u = await new Promise((v, m) => {
            y.toBlob((k) => (k ? v(k) : m(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), u);
        },
      }
    );
  }
  function j(e) {
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
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${j(String(i))}</div>`), r());
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
                <div class="row-name">${j(i.title)}</div>
                <div class="row-sub">${St(i.createdAt)}${i.reporterEmail ? ` \xB7 ${j(i.reporterEmail)}` : ""}</div>
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
    let n = F(t, { title: "File a bug", size: "lg" }),
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
      c = n.body.querySelector("#se-b-expected"),
      g = n.body.querySelector("#se-b-attach"),
      p = n.body.querySelector("#se-b-status"),
      x = n.body.querySelector("#se-b-file"),
      w = n.body.querySelector("#se-b-record");
    function y() {
      if (r.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = r
        .map(
          (d, h) => `
          <div class="se-attach-item">
            <span>${j(d.filename)} <span class="dim">(${(d.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${h}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((d) => {
          d.addEventListener("click", () => {
            (r.splice(Number(d.dataset.idx), 1), y());
          });
        }));
    }
    function f(d, h = !1) {
      ((p.textContent = d), (p.style.color = h ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (n.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let d = await je();
        (f(""),
          Tt(t, d, (h) => {
            (r.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: h }),
              y());
          }));
      } catch (d) {
        f(String(d instanceof Error ? d.message : d), !0);
      }
    }),
      w.addEventListener("click", async () => {
        if (a) {
          try {
            ((w.disabled = !0), f("Finalizing recording\u2026"));
            let d = await a.stop();
            ((a = null),
              (w.textContent = "\u23FA Record screen"),
              w.classList.remove("danger"),
              r.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: d }),
              y(),
              f(""));
          } catch (d) {
            f(String(d instanceof Error ? d.message : d), !0);
          } finally {
            w.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((a = await Ke()),
            (w.textContent = "\u25A0 Stop recording"),
            w.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (d) {
          (f(String(d instanceof Error ? d.message : d), !0), (a = null));
        }
      }),
      n.body.querySelector("#se-b-upload").addEventListener("click", () => x.click()),
      x.addEventListener("change", () => {
        let d = x.files?.[0];
        d && (r.push({ kind: "file", filename: d.name, blob: d }), (x.value = ""), y());
      }),
      n.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (a && a.cancel(), n.close());
      }),
      n.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let d = n.body.querySelector("#se-b-submit"),
          h = s.value.trim();
        if (!h) {
          (f("Title is required", !0), s.focus());
          return;
        }
        ((d.disabled = !0), f("Submitting\u2026"));
        try {
          let E = await e.createBug({
            title: h,
            stepsToReproduce: i.value,
            actualResult: l.value,
            expectedResult: c.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let L = 0; L < r.length; L++) {
            let b = r[L];
            (f(`Uploading attachment ${L + 1}/${r.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: E.id,
                kind: b.kind,
                filename: b.filename,
                blob: b.blob,
              }));
          }
          (n.close(), o());
        } catch (E) {
          (f(String(E instanceof Error ? E.message : E), !0), (d.disabled = !1));
        }
      }));
  }
  function Tt(e, t, o) {
    let n = F(e, { title: "Annotate screenshot", size: "lg" });
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
          r.innerHTML = `<div class="err">${j(String(a))}</div>`;
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
    let n = F(t, { title: "Request a feature", size: "lg" });
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
        let c = r.value.trim();
        if (!c) {
          ((l.textContent = "Title is required"), (l.style.color = "var(--se-danger)"), r.focus());
          return;
        }
        let g = n.body.querySelector("#se-f-submit");
        ((g.disabled = !0),
          (l.textContent = "Submitting\u2026"),
          (l.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: c,
            description: a.value,
            useCase: s.value,
            importance: i.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            n.close(),
            o());
        } catch (p) {
          ((l.textContent = String(p instanceof Error ? p.message : p)),
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
    Q = {
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
      if (e && e in Q) return e;
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
    r.sort((l, c) => l[0] - c[0]);
    let a = r[0][1],
      i = Math.max(5, Math.min(95, a === "left" || a === "right" ? (t / n) * 100 : (e / o) * 100));
    return { edge: a, offsetPct: i };
  }
  function K(e, t, o, n) {
    let { edge: r, offsetPct: a, panelWidth: s, panelHeight: i } = n,
      l = window.innerWidth,
      c = window.innerHeight,
      g = r === "left" || r === "right",
      p = Math.max(ve, Math.min(s, l - 80)),
      x = Math.max(be, Math.min(i, c - 40)),
      w = (a / 100) * (g ? c : l),
      y = e.getBoundingClientRect(),
      f = g ? y.width || 52 : y.height || 52,
      d = e.style;
    ((d.top = d.bottom = d.left = d.right = d.transform = ""),
      (d.borderTop = d.borderBottom = d.borderLeft = d.borderRight = ""),
      (d.flexDirection = g ? "column" : "row"),
      (d.padding = g ? "8px 6px" : "6px 8px"),
      r === "right"
        ? ((d.right = "0"),
          (d.top = `${a}%`),
          (d.transform = "translateY(-50%)"),
          (d.borderRadius = "10px 0 0 10px"),
          (d.borderRight = "none"),
          (d.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : r === "left"
          ? ((d.left = "0"),
            (d.top = `${a}%`),
            (d.transform = "translateY(-50%)"),
            (d.borderRadius = "0 10px 10px 0"),
            (d.borderLeft = "none"),
            (d.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : r === "top"
            ? ((d.top = "0"),
              (d.left = `${a}%`),
              (d.transform = "translateX(-50%)"),
              (d.borderRadius = "0 0 10px 10px"),
              (d.borderTop = "none"),
              (d.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((d.bottom = "0"),
              (d.left = `${a}%`),
              (d.transform = "translateX(-50%)"),
              (d.borderRadius = "10px 10px 0 0"),
              (d.borderBottom = "none"),
              (d.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let h = t.style;
    if (
      ((h.top = h.bottom = h.left = h.right = h.transform = ""),
      (h.borderTop = h.borderBottom = h.borderLeft = h.borderRight = ""),
      (h.width = p + "px"),
      (h.height = x + "px"),
      (t.dataset.edge = r),
      r === "right")
    ) {
      let L = Math.max(10, Math.min(c - x - 10, w - x / 2));
      ((h.right = f + "px"),
        (h.top = L + "px"),
        (h.borderRadius = "10px 0 0 10px"),
        (h.borderRight = "none"),
        (h.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "left") {
      let L = Math.max(10, Math.min(c - x - 10, w - x / 2));
      ((h.left = f + "px"),
        (h.top = L + "px"),
        (h.borderRadius = "0 10px 10px 0"),
        (h.borderLeft = "none"),
        (h.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (r === "top") {
      let L = Math.max(10, Math.min(l - p - 10, w - p / 2));
      ((h.top = f + "px"),
        (h.left = L + "px"),
        (h.borderRadius = "0 0 10px 10px"),
        (h.borderTop = "none"),
        (h.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let L = Math.max(10, Math.min(l - p - 10, w - p / 2));
      ((h.bottom = f + "px"),
        (h.left = L + "px"),
        (h.borderRadius = "10px 10px 0 0"),
        (h.borderBottom = "none"),
        (h.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
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
      c = ye(),
      g = zt();
    requestAnimationFrame(() => K(n, r, a, i));
    let p = document.createElement("div");
    ((p.className = "drag-handle"),
      (p.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (p.innerHTML = Dt),
      n.appendChild(p),
      p.addEventListener("mousedown", (b) => {
        (b.preventDefault(), p.classList.add("dragging"));
        let u = (m) => {
            let { edge: k, offsetPct: M } = Ut(m.clientX, m.clientY);
            ((i = { ...i, edge: k, offsetPct: M }), K(n, r, a, i));
          },
          v = () => {
            (p.classList.remove("dragging"),
              document.removeEventListener("mousemove", u),
              document.removeEventListener("mouseup", v),
              et(i));
          };
        (document.addEventListener("mousemove", u), document.addEventListener("mouseup", v));
      }));
    let x = new Map();
    for (let [b, { icon: u, label: v }] of Object.entries(Q)) {
      let m = document.createElement("button");
      ((m.className = "btn"),
        (m.title = v),
        (m.innerHTML = u),
        m.addEventListener("click", () => d(b)),
        n.appendChild(m),
        x.set(b, m));
    }
    a.addEventListener("mousedown", (b) => {
      (b.preventDefault(), b.stopPropagation(), a.classList.add("dragging"));
      let u = b.clientX,
        v = b.clientY,
        m = i.panelWidth,
        k = i.panelHeight,
        { edge: M } = i,
        T = (B) => {
          let G = B.clientX - u,
            he = B.clientY - v,
            I = { ...i };
          (M === "right" && (I.panelWidth = Math.max(ve, Math.min(Xe, m - G))),
            M === "left" && (I.panelWidth = Math.max(ve, Math.min(Xe, m + G))),
            M === "top" && (I.panelHeight = Math.max(be, Math.min(Ze, k + he))),
            M === "bottom" && (I.panelHeight = Math.max(be, Math.min(Ze, k - he))),
            (i = I),
            K(n, r, a, i));
        },
        A = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", T),
            document.removeEventListener("mouseup", A),
            et(i));
        };
      (document.addEventListener("mousemove", T), document.addEventListener("mouseup", A));
    });
    let w = () => K(n, r, a, i);
    window.addEventListener("resize", w);
    function y(b) {
      ((l = b),
        Ye(b),
        x.forEach((u, v) => u.classList.toggle("active", v === b)),
        r.classList.add("open"),
        K(n, r, a, i),
        E(b));
    }
    function f() {
      (r.classList.remove("open"),
        x.forEach((b) => b.classList.remove("active")),
        (l = null),
        Ye(null));
    }
    function d(b) {
      l === b ? f() : y(b);
    }
    function h(b, u) {
      let v = typeof window < "u" && window.location ? window.location.host : "",
        m = v ? `<span class="sub">${v}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${b}</span>
          <span class="panel-title-label">${u}</span>
          ${m}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${It}</button>
      </div>`;
    }
    function E(b) {
      let { icon: u, label: v } = Q[b];
      if (!c) {
        L(b);
        return;
      }
      let m = new X(e.adminUrl, c.token);
      ((s.innerHTML = `
      ${h(u, v)}
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
          (we(), (c = null), L(b));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Pe(), E(b));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          Ae();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let A = de({ ...ce(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(A);
            let B = s.querySelector("#se-share"),
              G = B.textContent;
            ((B.textContent = "Copied \u2713"), setTimeout(() => (B.textContent = G), 1500));
          } catch {
            prompt("Copy this URL:", A);
          }
        }));
      let k = s.querySelector("#se-body"),
        M = s.querySelector("#se-subfoot");
      ({
        gates: () => Ce(k, m),
        configs: () => He(k, m),
        experiments: () => Be(k, m),
        i18n: () => Fe(k, m, M, o),
        bugs: () => Je(k, m, o),
        features: () => Ve(k, m, o),
      })
        [b]()
        .catch((A) => {
          k.innerHTML = `<div class="err">${String(A)}</div>`;
        });
    }
    function L(b) {
      let { icon: u, label: v } = Q[b];
      ((s.innerHTML = `
      ${h(u, v)}
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
            k = s.querySelector("#se-auth-status"),
            M = s.querySelector("#se-auth-err");
          ((m.disabled = !0),
            (m.textContent = "Opening\u2026"),
            (k.textContent = ""),
            (M.textContent = ""));
          try {
            ((c = await Ee(e, () => {
              ((k.textContent = "Waiting for approval in the opened tab\u2026"),
                (m.textContent = "Waiting\u2026"));
            })),
              E(b));
          } catch (T) {
            ((M.textContent = T instanceof Error ? T.message : String(T)),
              (k.textContent = ""),
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
          (window.removeEventListener("resize", w), t.remove());
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
  var W = null;
  function ot(e = {}) {
    if (W || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? Ft() },
      { destroy: o } = nt(t);
    W = o;
  }
  function jt() {
    (W?.(), (W = null));
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
    function c(g) {
      (l ? g.code === l : g.key.toLowerCase() === n.toLowerCase()) &&
        g.shiftKey === r &&
        g.altKey === a &&
        g.ctrlKey === s &&
        g.metaKey === i &&
        (W ? jt() : ot(e));
    }
    return (window.addEventListener("keydown", c), () => window.removeEventListener("keydown", c));
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
                U(),
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
