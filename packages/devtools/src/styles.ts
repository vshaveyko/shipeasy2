export const STYLES = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host { all: initial; }

/* Toolbar — position/flex-direction/padding/borderRadius/boxShadow set by JS */
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

/* Panel — position/size/borderRadius/boxShadow/border-one-side set by JS */
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

/* Resize handle — position/size/cursor set by JS.
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

/* Auth — vertically centered inside panel-body; no footer renders here */
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

/* Label popper — floats next to a page [data-label] element */
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
