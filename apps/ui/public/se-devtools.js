"use strict";
(() => {
  var De = Object.defineProperty;
  var Ue = (e, t, n) =>
    t in e ? De(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var j = (e, t, n) => Ue(e, typeof t != "symbol" ? t + "" : t, n);
  var ae = `
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
  background: var(--se-bg);
  border: 1px solid var(--se-line-2);
}

/* Drag handle */
.drag-handle {
  width: 36px;
  height: 36px;
  border-radius: var(--se-r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  font-size: 15px;
  color: var(--se-fg-4);
  user-select: none;
  flex-shrink: 0;
  touch-action: none;
}
.drag-handle:hover { background: var(--se-bg-2); color: var(--se-fg-3); }
.drag-handle.dragging { cursor: grabbing; color: var(--se-accent); }

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
.drag-handle svg { width: 14px; height: 14px; display: block; }

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
  background: var(--se-bg-1);
  align-items: center;
}

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
  var K = "se_dt_session";
  function ie() {
    try {
      let e = sessionStorage.getItem(K);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Ie(e) {
    try {
      sessionStorage.setItem(K, JSON.stringify(e));
    } catch {}
  }
  function le() {
    try {
      sessionStorage.removeItem(K);
    } catch {}
  }
  async function de(e, t) {
    let n = new URL(e.adminUrl).origin,
      r = window.location.origin,
      o = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(r)}`,
        "shipeasy-devtools-auth",
        "width=460,height=640,noopener=no",
      );
    if (!o) throw new Error("Popup blocked. Allow popups for this site and try again.");
    return (
      t(),
      new Promise((i, s) => {
        let d = !1;
        function a(b, m) {
          d ||
            ((d = !0),
            window.removeEventListener("message", p),
            clearInterval(y),
            clearTimeout(h),
            b ? s(b) : i(m));
        }
        function p(b) {
          if (b.origin !== n) return;
          let m = b.data;
          if (!m || m.type !== "se:devtools-auth" || !m.token || !m.projectId) return;
          let g = { token: m.token, projectId: m.projectId };
          (Ie(g), a(null, g));
        }
        window.addEventListener("message", p);
        let y = setInterval(() => {
            o.closed && !d && a(new Error("Sign-in window closed before approval."));
          }, 500),
          h = setTimeout(() => {
            a(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Ne = /^(true|on|1|yes)$/i,
    qe = /^(false|off|0|no)$/i,
    ce = /^se(?:_|-|$)/;
  function I(e) {
    return Ne.test(e) ? !0 : qe.test(e) ? !1 : null;
  }
  function W(e) {
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
  function pe(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function F() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function $(e, t) {
    let n = F(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let o = n.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function R(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function ue() {
    if (typeof window > "u") return !1;
    let e = F();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function G(e) {
    let t = $(`se_ks_${e}`) ?? $(`se_gate_${e}`) ?? $(`se-gate-${e}`);
    return t === null ? null : I(t);
  }
  function fe(e, t, n = "session") {
    R([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function J(e) {
    let t = $(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return W(t);
  }
  function X(e, t, n = "session") {
    R([
      [`se_config_${e}`, t == null ? null : pe(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function ge(e) {
    let t = $(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function ve(e, t, n = "session") {
    R([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Y() {
    return $("se_i18n");
  }
  function me(e, t = "session") {
    R([["se_i18n", e]]);
  }
  function be() {
    return $("se_i18n_draft");
  }
  function he(e, t = "session") {
    R([["se_i18n_draft", e]]);
  }
  function xe(e) {
    return $(`se_i18n_label_${e}`);
  }
  function V(e, t, n = "session") {
    R([[`se_i18n_label_${e}`, t]]);
  }
  function ye() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) ce.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Z(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) ce.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, pe(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function Q() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = F();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let o = I(r);
        o !== null && (e.gates[n.slice(6)] = o);
      } else if (n.startsWith("se_gate_")) {
        let o = I(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else if (n.startsWith("se-gate-")) {
        let o = I(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = W(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function we(e) {
    if (typeof window > "u") return;
    let t = { ...Q(), ...e, openDevtools: !0 },
      n = Z(t);
    window.location.assign(n);
  }
  var N = class {
    constructor(t, n) {
      j(this, "adminUrl", t);
      j(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let o = "";
        try {
          let i = await n.json();
          o = i.detail ?? i.error ?? "";
        } catch {
          try {
            o = (await n.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${n.status}${o ? ` \u2014 ${o}` : ""}`);
      }
      let r = await n.json();
      return Array.isArray(r) ? r : (r.data ?? r);
    }
    gates() {
      return this.get("/api/admin/gates");
    }
    async configs() {
      let t = await this.get("/api/admin/configs"),
        n = "prod";
      return await Promise.all(
        t.map(async (o) => {
          try {
            let i = await this.get(`/api/admin/configs/${o.id}`),
              s = i.valueJson !== void 0 ? i.valueJson : (i.values?.[n] ?? null);
            return { ...o, valueJson: s };
          } catch {
            return { ...o, valueJson: null };
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
    async keys(t) {
      let n = t ? `?profile_id=${encodeURIComponent(t)}` : "",
        r = await this.get(`/api/admin/i18n/keys${n}`);
      return Array.isArray(r) ? r : r && Array.isArray(r.keys) ? r.keys : [];
    }
  };
  function _(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${ee(e.title)}</div>
      <div class="empty-msg">${ee(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${ee(e.ctaLabel)}</a>
    </div>`;
  }
  function ee(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Be() {
    return window.__shipeasy ?? null;
  }
  function je(e) {
    let t = G(e.name),
      n = Be()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Ke(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function ke(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
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
    function r() {
      ((e.innerHTML = n
        .map(
          (i) => `
        <div class="row">
          <div>
            <div class="row-name">${i.name}</div>
            <div class="row-sub">${i.rolloutPct}% rollout</div>
          </div>
          ${je(i)}
          ${Ke(i.name, G(i.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((i) => {
          i.addEventListener("click", () => {
            let s = i.closest("[data-gate]").dataset.gate,
              l = i.dataset.v;
            (fe(s, l === "default" ? null : l === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function We(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function Fe(e) {
    return J(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function Le(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
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
    let r = new Set();
    function o() {
      ((e.innerHTML = n
        .map((s) => {
          let l = J(s.name),
            d = l !== void 0 ? l : s.valueJson,
            a = r.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${Fe(s.name)}
              ${a ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              a
                ? `
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(d, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${l !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${We(d)}</div>`
            }
          </div>`;
        })
        .join("")),
        e.querySelectorAll(".edit-btn").forEach((s) => {
          s.addEventListener("click", () => {
            (r.add(s.dataset.name), o());
          });
        }),
        e.querySelectorAll(".cancel-edit").forEach((s) => {
          s.addEventListener("click", () => {
            (r.delete(s.dataset.name), o());
          });
        }));
      function i(s, l) {
        let d = s.dataset.name,
          a = e.querySelector(`textarea[data-name="${d}"]`);
        if (a)
          try {
            let p = JSON.parse(a.value);
            (X(d, p, l), r.delete(d), o());
          } catch {
            a.style.borderColor = "#f87171";
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
            (X(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function Ge() {
    return window.__shipeasy ?? null;
  }
  function Je(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function Xe(e) {
    let t = ge(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function Ye(e) {
    let t = Ge()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function Ve(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${Je(e.status)}
      ${e.status === "running" ? Ye(e.name) : ""}
      ${e.status === "running" ? Xe(e) : ""}
    </div>`;
  }
  function Ee(e, t, n, r) {
    let o = n.filter((d) => d.universe === t.name);
    if (o.length === 0) {
      e.innerHTML = _({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${r}/dashboard/experiments/new`,
      });
      return;
    }
    let i = o.filter((d) => d.status === "running"),
      s = o.filter((d) => d.status !== "running"),
      l = (d, a) => (d.length === 0 ? "" : `<div class="sec-head">${a}</div>${d.map(Ve).join("")}`);
    ((e.innerHTML = l(i, "Running") + l(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((d) => {
        d.addEventListener("change", () => {
          let a = d.dataset.name;
          ve(a, d.value || null);
        });
      }));
  }
  async function Se(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (s) {
      e.innerHTML = `<div class="err">Failed to load: ${String(s)}</div>`;
      return;
    }
    if (r.length === 0) {
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
    let o = { activeUniverse: r[0].name };
    function i() {
      let s = r
        .map(
          (a) => `
          <button class="tab${a.name === o.activeUniverse ? " active" : ""}"
                  data-universe="${a.name}">${a.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${s}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((a) => {
          a.addEventListener("click", () => {
            ((o.activeUniverse = a.dataset.universe), i());
          });
        }));
      let l = e.querySelector(".tab-body"),
        d = r.find((a) => a.name === o.activeUniverse);
      Ee(l, d, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          l = r.find((d) => d.name === o.activeUniverse);
        s && l && Ee(s, l, n, t.adminUrl);
      }));
  }
  function Ze(e) {
    let t = new Map();
    for (let n of e) {
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        i = r.length > 1 ? r.slice(1) : r;
      t.has(o) || t.set(o, { segment: o, children: [] });
      let s = t.get(o);
      for (let l = 0; l < i.length; l++) {
        let d = i[l],
          a = s.children.find((p) => p.segment === d);
        (a || ((a = { segment: d, children: [] }), s.children.push(a)), (s = a));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) _e(n);
    return t;
  }
  function _e(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) _e(t);
  }
  function k(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function $e(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? xe(e.fullKey) : null,
        i = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${k(e.fullKey ?? "")}">
        <span class="tree-seg">${k(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${k(i)}">${k(i)}</span>
      </div>`;
    }
    let r = e.children.map((o) => $e(o, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${k(e.segment)}</span>
    </div>
    ${r}`;
  }
  var A = "__se_label_target",
    B = !1,
    te = null,
    C = null;
  function q() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function T() {
    (C?.remove(),
      (C = null),
      document.querySelectorAll(`.${A}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function Qe(e, t) {
    (T(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      r = e.dataset.labelDesc ?? "",
      i = Y() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let s = e.textContent ?? "",
      l = document.createElement("div");
    ((l.className = "label-popper"),
      (l.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${k(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${k(i)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${r ? "" : "empty"}">${r ? k(r) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${k(s)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>`),
      t.appendChild(l));
    let d = e.getBoundingClientRect(),
      a = l.offsetHeight,
      p = l.offsetWidth,
      y = 8,
      h = d.bottom + y;
    h + a > window.innerHeight - 8 && (h = Math.max(8, d.top - a - y));
    let b = d.left;
    (b + p > window.innerWidth - 8 && (b = Math.max(8, window.innerWidth - p - 8)),
      (l.style.top = `${h}px`),
      (l.style.left = `${b}px`));
    let m = l.querySelector(".lp-input");
    (m.focus(),
      m.select(),
      l.querySelector(".lp-close").addEventListener("click", T),
      l.querySelector('[data-action="save"]').addEventListener("click", () => {
        let g = m.value;
        ((e.textContent = g),
          V(n, g),
          window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: n, value: g } })),
          T());
      }),
      l.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let g = e.dataset.__seOriginal ?? "";
        ((e.textContent = g),
          V(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          T());
      }),
      l.addEventListener("click", (g) => g.stopPropagation()),
      l.addEventListener("mousedown", (g) => g.stopPropagation()),
      (C = l));
  }
  function et(e, t, n) {
    if (((B = e), te?.(), (te = null), !e)) {
      T();
      for (let a of q()) a.classList.remove(A);
      return;
    }
    for (let a of q()) a.classList.add(A);
    function r(a) {
      return C !== null && a.composedPath().includes(C);
    }
    function o(a) {
      for (let p of a.composedPath())
        if (p instanceof HTMLElement && p.hasAttribute("data-label")) return p;
      return null;
    }
    function i(a) {
      if (r(a)) return;
      let p = o(a);
      p && (a.preventDefault(), a.stopPropagation(), Qe(p, t));
    }
    function s(a) {
      C && (r(a) || o(a) || T());
    }
    function l(a) {
      a.key === "Escape" && T();
    }
    let d = new MutationObserver(() => {
      if (B) {
        for (let a of q()) a.classList.add(A);
        n();
      }
    });
    (d.observe(document.body, { childList: !0, subtree: !0 }),
      document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", s, !0),
      document.addEventListener("keydown", l),
      (te = () => {
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", s, !0),
          document.removeEventListener("keydown", l),
          d.disconnect());
        for (let a of q()) a.classList.remove(A);
      }));
  }
  async function Oe(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'), (n.innerHTML = ""));
    let o, i, s;
    try {
      [o, i, s] = await Promise.all([t.profiles(), t.drafts(), t.keys()]);
    } catch (h) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(h)}</div>`;
      return;
    }
    let l = Ze(s),
      d = Array.from(l.keys()),
      a = { activeChunk: d[0] ?? null };
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
      let h = d
          .map(
            (g) =>
              `<button class="tab${g === a.activeChunk ? " active" : ""}" data-chunk="${k(g)}">${k(g)}</button>`,
          )
          .join(""),
        b = a.activeChunk ? l.get(a.activeChunk) : null,
        m = b ? b.children.map((g) => $e(g, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${h}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${m}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((g) => {
          g.addEventListener("click", () => {
            ((a.activeChunk = g.dataset.chunk), p());
          });
        }));
    }
    function y() {
      let h = Y() ?? "",
        b = be() ?? "",
        m = [
          '<option value="">Default</option>',
          ...o.map(
            (c) =>
              `<option value="${k(c.id)}" ${h === c.id ? "selected" : ""}>${k(c.name)}</option>`,
          ),
        ].join(""),
        g = [
          '<option value="">No draft</option>',
          ...i.map(
            (c) =>
              `<option value="${k(c.id)}" ${b === c.id ? "selected" : ""}>${k(c.name)}</option>`,
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
          (et(!B, r, () => {}), y());
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (c) => {
          let u = c.target.value || null;
          me(u);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (c) => {
          let u = c.target.value || null;
          he(u);
        }));
    }
    (p(), y());
  }
  var tt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    nt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    rt =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    ot =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    st =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    at =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
    ne = {
      gates: { icon: tt, label: "Gates" },
      configs: { icon: nt, label: "Configs" },
      experiments: { icon: rt, label: "Experiments" },
      i18n: { icon: ot, label: "Translations" },
    },
    Ce = "se_l_overlay",
    re = 240,
    Me = 580,
    oe = 180,
    Te = 700,
    Pe = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function it() {
    try {
      let e = localStorage.getItem(Ce);
      if (e) return { ...Pe, ...JSON.parse(e) };
    } catch {}
    return { ...Pe };
  }
  function Re(e) {
    try {
      localStorage.setItem(Ce, JSON.stringify(e));
    } catch {}
  }
  function lt(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((d, a) => d[0] - a[0]);
    let i = o[0][1],
      l = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: l };
  }
  function z(e, t, n, r) {
    let { edge: o, offsetPct: i, panelWidth: s, panelHeight: l } = r,
      d = window.innerWidth,
      a = window.innerHeight,
      p = o === "left" || o === "right",
      y = Math.max(re, Math.min(s, d - 80)),
      h = Math.max(oe, Math.min(l, a - 40)),
      b = (i / 100) * (p ? a : d),
      m = e.getBoundingClientRect(),
      g = p ? m.width || 52 : m.height || 52,
      c = e.style;
    ((c.top = c.bottom = c.left = c.right = c.transform = ""),
      (c.borderTop = c.borderBottom = c.borderLeft = c.borderRight = ""),
      (c.flexDirection = p ? "column" : "row"),
      (c.padding = p ? "8px 6px" : "6px 8px"),
      o === "right"
        ? ((c.right = "0"),
          (c.top = `${i}%`),
          (c.transform = "translateY(-50%)"),
          (c.borderRadius = "10px 0 0 10px"),
          (c.borderRight = "none"),
          (c.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : o === "left"
          ? ((c.left = "0"),
            (c.top = `${i}%`),
            (c.transform = "translateY(-50%)"),
            (c.borderRadius = "0 10px 10px 0"),
            (c.borderLeft = "none"),
            (c.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : o === "top"
            ? ((c.top = "0"),
              (c.left = `${i}%`),
              (c.transform = "translateX(-50%)"),
              (c.borderRadius = "0 0 10px 10px"),
              (c.borderTop = "none"),
              (c.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((c.bottom = "0"),
              (c.left = `${i}%`),
              (c.transform = "translateX(-50%)"),
              (c.borderRadius = "10px 10px 0 0"),
              (c.borderBottom = "none"),
              (c.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let u = t.style;
    if (
      ((u.top = u.bottom = u.left = u.right = u.transform = ""),
      (u.borderTop = u.borderBottom = u.borderLeft = u.borderRight = ""),
      (u.width = y + "px"),
      (u.height = h + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let f = Math.max(10, Math.min(a - h - 10, b - h / 2));
      ((u.right = g + "px"),
        (u.top = f + "px"),
        (u.borderRadius = "10px 0 0 10px"),
        (u.borderRight = "none"),
        (u.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let f = Math.max(10, Math.min(a - h - 10, b - h / 2));
      ((u.left = g + "px"),
        (u.top = f + "px"),
        (u.borderRadius = "0 10px 10px 0"),
        (u.borderLeft = "none"),
        (u.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let f = Math.max(10, Math.min(d - y - 10, b - y / 2));
      ((u.top = g + "px"),
        (u.left = f + "px"),
        (u.borderRadius = "0 0 10px 10px"),
        (u.borderTop = "none"),
        (u.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let f = Math.max(10, Math.min(d - y - 10, b - y / 2));
      ((u.bottom = g + "px"),
        (u.left = f + "px"),
        (u.borderRadius = "10px 10px 0 0"),
        (u.borderBottom = "none"),
        (u.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let x = n.style;
    ((x.top = x.bottom = x.left = x.right = x.width = x.height = ""),
      (n.dataset.dir = p ? "ew" : "ns"),
      p
        ? ((x.width = "10px"),
          (x.top = "0"),
          (x.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          o === "right" ? (x.left = "0") : (x.right = "0"))
        : ((x.height = "10px"),
          (x.left = "0"),
          (x.right = "0"),
          (n.style.cursor = "ns-resize"),
          o === "top" ? (x.bottom = "0") : (x.top = "0")));
  }
  function He(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${ae}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), o.appendChild(i));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), o.appendChild(s));
    let l = it(),
      d = null,
      a = ie();
    requestAnimationFrame(() => z(r, o, i, l));
    let p = document.createElement("div");
    ((p.className = "drag-handle"),
      (p.title = "Drag to reposition"),
      (p.innerHTML = at),
      r.appendChild(p),
      p.addEventListener("mousedown", (f) => {
        (f.preventDefault(), p.classList.add("dragging"));
        let L = (v) => {
            let { edge: E, offsetPct: S } = lt(v.clientX, v.clientY);
            ((l = { ...l, edge: E, offsetPct: S }), z(r, o, i, l));
          },
          w = () => {
            (p.classList.remove("dragging"),
              document.removeEventListener("mousemove", L),
              document.removeEventListener("mouseup", w),
              Re(l));
          };
        (document.addEventListener("mousemove", L), document.addEventListener("mouseup", w));
      }));
    let y = new Map();
    for (let [f, { icon: L, label: w }] of Object.entries(ne)) {
      let v = document.createElement("button");
      ((v.className = "btn"),
        (v.title = w),
        (v.innerHTML = L),
        v.addEventListener("click", () => g(f)),
        r.appendChild(v),
        y.set(f, v));
    }
    i.addEventListener("mousedown", (f) => {
      (f.preventDefault(), f.stopPropagation(), i.classList.add("dragging"));
      let L = f.clientX,
        w = f.clientY,
        v = l.panelWidth,
        E = l.panelHeight,
        { edge: S } = l,
        O = (P) => {
          let U = P.clientX - L,
            se = P.clientY - w,
            H = { ...l };
          (S === "right" && (H.panelWidth = Math.max(re, Math.min(Me, v - U))),
            S === "left" && (H.panelWidth = Math.max(re, Math.min(Me, v + U))),
            S === "top" && (H.panelHeight = Math.max(oe, Math.min(Te, E + se))),
            S === "bottom" && (H.panelHeight = Math.max(oe, Math.min(Te, E - se))),
            (l = H),
            z(r, o, i, l));
        },
        M = () => {
          (i.classList.remove("dragging"),
            document.removeEventListener("mousemove", O),
            document.removeEventListener("mouseup", M),
            Re(l));
        };
      (document.addEventListener("mousemove", O), document.addEventListener("mouseup", M));
    });
    let h = () => z(r, o, i, l);
    window.addEventListener("resize", h);
    function b(f) {
      ((d = f),
        y.forEach((L, w) => L.classList.toggle("active", w === f)),
        o.classList.add("open"),
        z(r, o, i, l),
        u(f));
    }
    function m() {
      (o.classList.remove("open"), y.forEach((f) => f.classList.remove("active")), (d = null));
    }
    function g(f) {
      d === f ? m() : b(f);
    }
    function c(f, L) {
      let w = typeof window < "u" && window.location ? window.location.host : "",
        v = w ? `<span class="sub">${w}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${f}</span>
          <span class="panel-title-label">${L}</span>
          ${v}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${st}</button>
      </div>`;
    }
    function u(f) {
      let { icon: L, label: w } = ne[f];
      if (!a) {
        x(f);
        return;
      }
      let v = new N(e.adminUrl, a.token);
      ((s.innerHTML = `
      ${c(L, w)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        s.querySelector("#se-close").addEventListener("click", m),
        s.querySelector("#se-signout").addEventListener("click", () => {
          (le(), (a = null), x(f));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (ye(), u(f));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          we();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let M = Z({ ...Q(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(M);
            let P = s.querySelector("#se-share"),
              U = P.textContent;
            ((P.textContent = "Copied \u2713"), setTimeout(() => (P.textContent = U), 1500));
          } catch {
            prompt("Copy this URL:", M);
          }
        }));
      let E = s.querySelector("#se-body"),
        S = s.querySelector("#se-subfoot");
      ({
        gates: () => ke(E, v),
        configs: () => Le(E, v),
        experiments: () => Se(E, v),
        i18n: () => Oe(E, v, S, n),
      })
        [f]()
        .catch((M) => {
          E.innerHTML = `<div class="err">${String(M)}</div>`;
        });
    }
    function x(f) {
      let { icon: L, label: w } = ne[f];
      ((s.innerHTML = `
      ${c(L, w)}
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
        s.querySelector("#se-close").addEventListener("click", m),
        s.querySelector("#se-connect").addEventListener("click", async () => {
          let v = s.querySelector("#se-connect"),
            E = s.querySelector("#se-auth-status"),
            S = s.querySelector("#se-auth-err");
          ((v.disabled = !0),
            (v.textContent = "Opening\u2026"),
            (E.textContent = ""),
            (S.textContent = ""));
          try {
            ((a = await de(e, () => {
              ((E.textContent = "Waiting for approval in the opened tab\u2026"),
                (v.textContent = "Waiting\u2026"));
            })),
              u(f));
          } catch (O) {
            ((S.textContent = O instanceof Error ? O.message : String(O)),
              (E.textContent = ""),
              (v.disabled = !1),
              (v.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      {
        destroy() {
          (window.removeEventListener("resize", h), t.remove());
        },
      }
    );
  }
  function dt() {
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
  var D = null;
  function Ae(e = {}) {
    if (D || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? dt() },
      { destroy: n } = He(t);
    D = n;
  }
  function ct() {
    (D?.(), (D = null));
  }
  function ze(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    ue() && Ae(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      l = n.includes("Meta") || n.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function a(p) {
      (d ? p.code === d : p.key.toLowerCase() === r.toLowerCase()) &&
        p.shiftKey === o &&
        p.altKey === i &&
        p.ctrlKey === s &&
        p.metaKey === l &&
        (D ? ct() : Ae(e));
    }
    return (window.addEventListener("keydown", a), () => window.removeEventListener("keydown", a));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    (ze(e), (window.__se_devtools_ready = !0));
  }
})();
