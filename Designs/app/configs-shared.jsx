// Shipeasy — Configs shared components: SchemaBuilder, ValueForm, IntegrationModal.
//
// Depends on:
//   icons.jsx, icons-ext.jsx, configs-data.jsx (TYPE_ICON, tsInterface, toJsonSchema, highlightJson)

const {
  useState: cfgUseState,
  useMemo: cfgUseMemo,
  useEffect: cfgUseEffect,
  useRef: cfgUseRef,
} = React;

/* ────────────────────────────────────────────────────────────
   SchemaBuilder — visual + raw JSON editor for a JSON Schema.
   ──────────────────────────────────────────────────────────── */

const TYPE_LABEL = {
  string: "String",
  number: "Number",
  integer: "Integer",
  boolean: "Boolean",
  object: "Object",
  array: "Array",
  enum: "Enum",
};
const TYPES = ["string", "integer", "number", "boolean", "enum", "object", "array"];

function TypePill({ type }) {
  const I = TYPE_ICON[type] || TYPE_ICON.string;
  return (
    <span className={`tp ${type}`}>
      <I />
      {type}
    </span>
  );
}

function MiniInput({ value, onChange, mono, placeholder, type = "text" }) {
  return (
    <div className={"ed-input sm" + (mono ? " mono" : "")}>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

/* ── CSelect — designed selector that replaces native <select>.
   Props:
     value     — current value
     options   — array of [v, label] | { v, label, icon?, meta?, section? } | scalar
     onChange  — (v) => void
     size      — 'md' | 'sm' (sm matches .ed-input.sm)
     mono      — render values as monospace
     placeholder — shown when value is missing
     renderValue, renderOption — custom renderers (receive option obj) */
function CSelect({
  value,
  options,
  onChange,
  size = "sm",
  mono,
  placeholder,
  renderValue,
  renderOption,
}) {
  const [open, setOpen] = cfgUseState(false);
  const ref = cfgUseRef(null);

  cfgUseEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const opts = (options || []).map((o) => {
    if (Array.isArray(o)) return { v: o[0], label: o[1] };
    if (typeof o === "object" && o !== null) return o;
    return { v: o, label: String(o) };
  });
  const selected = opts.find((o) => o.v === value);

  return (
    <div ref={ref} className="cs-wrap">
      <div
        className={`cs-trigger ${size}${open ? " is-open" : ""}${mono ? " mono" : ""}`}
        onClick={() => setOpen(!open)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className="cs-val">
          {selected ? (
            renderValue ? (
              renderValue(selected)
            ) : (
              <>
                {selected.icon}
                <span className="cs-text">{selected.label}</span>
              </>
            )
          ) : (
            <span className="cs-placeholder cs-text">{placeholder || "— select —"}</span>
          )}
        </span>
        <span className="cs-chev">
          <IconChevronDown size={11} />
        </span>
      </div>
      {open && (
        <div className="cs-menu" role="listbox">
          {opts.map((o, i) => {
            const isOn = o.v === value;
            return (
              <div
                key={String(o.v) + i}
                className={`cs-item ${isOn ? "on" : ""} ${mono ? "mono" : ""}`}
                role="option"
                aria-selected={isOn}
                onClick={() => {
                  onChange(o.v);
                  setOpen(false);
                }}
              >
                {renderOption ? (
                  renderOption(o)
                ) : (
                  <>
                    {o.icon}
                    <span className="cs-text">{o.label}</span>
                    {o.meta && <span className="cs-meta">{o.meta}</span>}
                  </>
                )}
                <span className={`cs-tick ${isOn ? "" : "invisible"}`}>
                  <IconCheck size={11} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Convenience wrapper — drop-in replacement for the old MiniSelect signature */
function MiniSelect({ value, onChange, options }) {
  return <CSelect value={value} onChange={onChange} options={options} />;
}

/* Edit panel inside a field row, shown when field.open is true */
function FieldEditor({ field, onChange, isItem }) {
  const isNum = field.type === "number" || field.type === "integer";
  const isStr = field.type === "string";

  return (
    <div className="sb-field-body">
      <div className="row r2">
        <div className="mfield">
          <label>Key</label>
          <MiniInput
            mono
            value={field.key}
            onChange={(v) => onChange({ ...field, key: v.replace(/[^A-Za-z0-9_]/g, "") })}
          />
        </div>
        <div className="mfield">
          <label>Type</label>
          <CSelect
            value={field.type}
            options={TYPES.map((t) => {
              const I = TYPE_ICON[t];
              return { v: t, label: TYPE_LABEL[t], icon: <I /> };
            })}
            renderValue={(o) => (
              <>
                <TypePill type={o.v} />
              </>
            )}
            onChange={(v) => {
              const next = { ...field, type: v };
              if (v === "object" && !Array.isArray(next.properties)) next.properties = [];
              if (v !== "object") next.properties = null;
              if (v === "array" && !next.items) next.items = { type: "string" };
              if (v !== "array") next.items = null;
              if (v === "enum" && !Array.isArray(next.enum)) next.enum = [];
              if (v !== "enum") next.enum = undefined;
              onChange(next);
            }}
          />
        </div>
      </div>

      <div className="mfield">
        <label>Description</label>
        <div className="ed-input sm">
          <input
            value={field.description || ""}
            onChange={(e) => onChange({ ...field, description: e.target.value })}
            placeholder="What this field means to consumers"
          />
        </div>
      </div>

      {isNum && (
        <div className="row r2">
          <div className="mfield">
            <label>Minimum</label>
            <MiniInput
              value={field.min}
              type="number"
              onChange={(v) => onChange({ ...field, min: v === "" ? undefined : Number(v) })}
            />
          </div>
          <div className="mfield">
            <label>Maximum</label>
            <MiniInput
              value={field.max}
              type="number"
              onChange={(v) => onChange({ ...field, max: v === "" ? undefined : Number(v) })}
            />
          </div>
        </div>
      )}

      {isStr && (
        <div className="row r2">
          <div className="mfield">
            <label>Format</label>
            <MiniSelect
              value={field.format || ""}
              options={[
                ["", "none"],
                ["multiline", "multiline"],
                ["email", "email"],
                ["url", "url"],
                ["uuid", "uuid"],
                ["date", "date"],
              ]}
              onChange={(v) => onChange({ ...field, format: v || undefined })}
            />
          </div>
          <div className="mfield">
            <label>Pattern (regex)</label>
            <MiniInput
              mono
              value={field.pattern}
              onChange={(v) => onChange({ ...field, pattern: v || undefined })}
              placeholder="^[a-z]+$"
            />
          </div>
        </div>
      )}

      {field.type === "enum" && (
        <div className="mfield">
          <label>Allowed values</label>
          <EnumChips
            values={field.enum || []}
            onChange={(vals) => onChange({ ...field, enum: vals })}
          />
        </div>
      )}

      {field.type === "array" && (
        <div className="row r2">
          <div className="mfield">
            <label>Item type</label>
            <MiniSelect
              value={field.items?.type || "string"}
              options={TYPES.filter((t) => t !== "enum").map((t) => [t, TYPE_LABEL[t]])}
              onChange={(v) => onChange({ ...field, items: { type: v } })}
            />
          </div>
          <div className="mfield">
            <label>Min items</label>
            <MiniInput
              value={field.minItems}
              type="number"
              onChange={(v) => onChange({ ...field, minItems: v === "" ? undefined : Number(v) })}
            />
          </div>
        </div>
      )}

      <div className="row r2">
        <div className="mfield">
          <label>Required</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 2 }}>
            <label className="switch sw-sm">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
              />
              <span className="track" />
            </label>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>
              {field.required ? "required" : "optional"}
            </span>
          </div>
        </div>
        {!isItem && (
          <div className="mfield">
            <label>Aria id (auto)</label>
            <div
              className="ed-input sm"
              style={{ cursor: "not-allowed", background: "var(--bg-1)", borderStyle: "dashed" }}
            >
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-4)" }}>
                cfg-field-{field.id}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EnumChips({ values, onChange }) {
  const [draft, setDraft] = cfgUseState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="enum-chips">
      {values.map((v, i) => (
        <span className="chip" key={v + i}>
          {v}
          <button className="x" onClick={() => onChange(values.filter((_, j) => j !== i))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="add value · Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
        }}
      />
    </div>
  );
}

function SchemaFieldRow({ field, onChange, onRemove, depth = 0, openMap, setOpenMap }) {
  const open = !!openMap[field.id];
  const setOpen = (v) => setOpenMap({ ...openMap, [field.id]: v });
  const isObj = field.type === "object";

  return (
    <div className={"sb-field" + (open ? " open" : "") + (!field.key ? " error" : "")}>
      <div className="sb-field-hd" onClick={() => setOpen(!open)}>
        <span className="grip" onClick={(e) => e.stopPropagation()} title="Drag to reorder">
          <IconGrip size={12} />
        </span>
        <span className="chev">
          <IconChevR size={11} />
        </span>
        <div className="key-row">
          <span className="key">{field.key || "(unnamed)"}</span>
          {field.required && <span className="req-mark">·required</span>}
          {field.description && <span className="desc-pre">{field.description}</span>}
        </div>
        <TypePill type={field.type} />
        <div className="acts" onClick={(e) => e.stopPropagation()}>
          <button
            className="ic-btn"
            title="Duplicate"
            onClick={() => {
              /* no-op in mock */
            }}
          >
            <IconCopy size={11} />
          </button>
          <button className="ic-btn danger" title="Remove field" onClick={onRemove}>
            <IconTrash size={11} />
          </button>
        </div>
      </div>
      {open && <FieldEditor field={field} onChange={onChange} />}
      {open && isObj && (
        <div className="sb-children">
          {(field.properties || []).map((child, i) => (
            <SchemaFieldRow
              key={child.id}
              field={child}
              onChange={(c) => {
                const next = field.properties.slice();
                next[i] = c;
                onChange({ ...field, properties: next });
              }}
              onRemove={() => {
                const next = field.properties.filter((_, j) => j !== i);
                onChange({ ...field, properties: next });
              }}
              depth={depth + 1}
              openMap={openMap}
              setOpenMap={setOpenMap}
            />
          ))}
          <button
            className="sb-add sb-add-child"
            onClick={() => {
              const newField = mkField("new_field", "string", {});
              onChange({ ...field, properties: [...(field.properties || []), newField] });
              setOpenMap({ ...openMap, [newField.id]: true });
            }}
          >
            <IconPlus size={11} /> Add property inside{" "}
            <span style={{ fontFamily: "var(--mono)" }}>{field.key}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function SchemaBuilder({ schema, onChange, mode = "visual", setMode, onImport }) {
  const [openMap, setOpenMap] = cfgUseState({});

  const fieldCount = cfgUseMemo(() => countFields(schema), [schema]);
  const requiredMissingDefault = cfgUseMemo(() => {
    return (schema || []).filter(
      (f) => f.required && f.default == null && f.type !== "object" && f.type !== "array",
    ).length;
  }, [schema]);

  if (mode === "json") {
    const jsonStr = JSON.stringify(toJsonSchema(schema), null, 2);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="sb-toolbar">
          <div className="sb-stats">
            <span className="v">{fieldCount}</span> field{fieldCount === 1 ? "" : "s"}
            <span className="sep">·</span>
            <span className={"v" + (requiredMissingDefault ? " warn" : "")}>
              {requiredMissingDefault}
            </span>{" "}
            required w/o default
          </div>
          <div className="seg" style={{ marginLeft: "auto" }}>
            <button onClick={() => setMode && setMode("visual")}>
              <IconList2 size={11} /> Visual
            </button>
            <button className="active">
              <IconCode size={11} /> JSON
            </button>
          </div>
        </div>
        <textarea
          className="ed-textarea mono"
          style={{ minHeight: 420 }}
          value={jsonStr}
          onChange={(e) => {
            // round-trip — accept partial edits but only re-parse on blur
            // for mock purposes, we just keep the visual schema unchanged when invalid JSON is typed
          }}
        />
        <div className="val-banner ok">
          <div className="icn">
            <IconCheck size={13} />
          </div>
          <div className="body">
            <div className="ttl">JSON Schema is valid</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
              Draft 2020-12 · round-trips with the visual builder.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="sb-toolbar">
        <div className="sb-stats">
          <span className="v">{fieldCount}</span> field{fieldCount === 1 ? "" : "s"}
          <span className="sep">·</span>
          <span className={"v" + (requiredMissingDefault ? " warn" : "")}>
            {requiredMissingDefault}
          </span>{" "}
          required w/o default
        </div>
        {onImport && (
          <button className="btn btn-ghost btn-sm" onClick={onImport}>
            <IconUpload size={11} /> Import from JSON
          </button>
        )}
        {setMode && (
          <div className="seg" style={{ marginLeft: onImport ? 0 : "auto" }}>
            <button className="active">
              <IconList2 size={11} /> Visual
            </button>
            <button onClick={() => setMode("json")}>
              <IconCode size={11} /> JSON
            </button>
          </div>
        )}
      </div>

      <div className="sb-fields">
        {(schema || []).map((field, i) => (
          <SchemaFieldRow
            key={field.id}
            field={field}
            onChange={(f) => {
              const next = schema.slice();
              next[i] = f;
              onChange(next);
            }}
            onRemove={() => onChange(schema.filter((_, j) => j !== i))}
            openMap={openMap}
            setOpenMap={setOpenMap}
          />
        ))}

        <button
          className="sb-add"
          onClick={() => {
            const newField = mkField("new_field", "string", {});
            onChange([...(schema || []), newField]);
            setOpenMap({ ...openMap, [newField.id]: true });
          }}
        >
          <IconPlus size={12} /> Add field
        </button>
      </div>

      {fieldCount === 0 && (
        <div className="val-banner warn">
          <div className="icn">
            <IconAlert size={13} />
          </div>
          <div className="body">
            <div className="ttl">Empty schema</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              Any JSON object will validate. The value editor will fall back to a raw JSON textarea.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ValueForm — schema-driven value editor with live validation.
   ──────────────────────────────────────────────────────────── */

function validateField(field, v) {
  if (v == null || v === "") {
    if (field.required) return "required";
    return null;
  }
  if (field.type === "integer") {
    if (!Number.isInteger(Number(v))) return "must be an integer";
  }
  if (field.type === "number" || field.type === "integer") {
    const n = Number(v);
    if (field.min != null && n < field.min) return `must be ≥ ${field.min}`;
    if (field.max != null && n > field.max) return `must be ≤ ${field.max}`;
  }
  if (field.type === "string") {
    if (field.max != null && String(v).length > field.max) return `≤ ${field.max} chars`;
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(v)) return `does not match /${field.pattern}/`;
      } catch {}
    }
  }
  if (field.type === "enum") {
    if (!(field.enum || []).includes(v)) return `must be one of ${(field.enum || []).join(", ")}`;
  }
  return null;
}

function ValueField({ field, value, onChange, depth = 0 }) {
  const err = validateField(field, value);
  const longStr =
    field.type === "string" &&
    (field.format === "multiline" || (typeof value === "string" && value.length > 60));

  return (
    <div
      className={
        "vf-field" +
        (err ? " error" : "") +
        (field.type === "object" || field.type === "array" ? " nested" : "")
      }
    >
      <div className="vf-lbl">
        <span>{field.key}</span>
        {field.required && <span className="req">·required</span>}
        <TypePill type={field.type} />
      </div>
      {field.description && <div className="vf-desc">{field.description}</div>}

      <div className="vf-input">
        {field.type === "boolean" && (
          <div className="vf-bool">
            <button
              className={"f" + (value === false ? " on" : "")}
              onClick={() => onChange(false)}
            >
              false
            </button>
            <button className={"t" + (value === true ? " on" : "")} onClick={() => onChange(true)}>
              true
            </button>
          </div>
        )}

        {(field.type === "number" || field.type === "integer") && (
          <div className="ed-step" style={{ width: 200 }}>
            <button onClick={() => onChange(Number(value || 0) - 1)}>−</button>
            <input
              value={value ?? ""}
              type="number"
              onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            />
            <button onClick={() => onChange(Number(value || 0) + 1)}>+</button>
            {field.max != null && <span className="unit">≤ {field.max}</span>}
          </div>
        )}

        {field.type === "enum" && (
          <div style={{ width: "100%" }}>
            <CSelect
              value={value ?? ""}
              placeholder="— select —"
              options={[
                { v: "", label: "(unset)" },
                ...(field.enum || []).map((v) => ({
                  v,
                  label: v,
                  icon: <IconList2 size={11} style={{ color: "var(--fg-3)" }} />,
                })),
              ]}
              onChange={(v) => onChange(v || null)}
            />
          </div>
        )}

        {field.type === "string" && field.enum && (
          <div style={{ width: "100%" }}>
            <CSelect
              value={value ?? ""}
              options={(field.enum || []).map((v) => ({
                v,
                label: v,
                icon: <IconType size={11} style={{ color: "var(--fg-3)" }} />,
              }))}
              onChange={(v) => onChange(v)}
            />
          </div>
        )}

        {field.type === "string" &&
          !field.enum &&
          (longStr ? (
            <textarea
              className="ed-textarea"
              style={{ minHeight: 88 }}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <div className="ed-input sm" style={{ width: "100%" }}>
              <input
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="—"
              />
            </div>
          ))}

        {field.type === "object" && (
          <div
            className="vf-children"
            style={{
              marginTop: 4,
              width: "100%",
              paddingLeft: 14,
              borderLeft: "1px solid var(--line-2)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {(field.properties || []).map((child) => (
              <ValueField
                key={child.id}
                field={child}
                value={value?.[child.key]}
                onChange={(v) => onChange({ ...(value || {}), [child.key]: v })}
                depth={depth + 1}
              />
            ))}
          </div>
        )}

        {field.type === "array" && <ArrayField field={field} value={value} onChange={onChange} />}
      </div>

      {err && (
        <div className="vf-err">
          <IconAlert size={10} /> {field.key}: {err}
        </div>
      )}
    </div>
  );
}

function ArrayField({ field, value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const itemType = field.items?.type || "string";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
      {items.map((item, i) => (
        <div key={i} className="vf-arr-item">
          <div className="vf-arr-hd">
            <span className="grip">
              <IconGrip size={11} />
            </span>
            <span className="n">{i + 1}</span>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <TypePill type={itemType} />
            <button
              className="rm"
              title="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <IconX size={10} />
            </button>
          </div>
          {itemType === "string" && (
            <div className="ed-input sm">
              <input
                value={item ?? ""}
                onChange={(e) => {
                  const next = items.slice();
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
            </div>
          )}
          {(itemType === "number" || itemType === "integer") && (
            <div className="ed-input sm">
              <input
                type="number"
                value={item ?? ""}
                onChange={(e) => {
                  const next = items.slice();
                  next[i] = Number(e.target.value);
                  onChange(next);
                }}
              />
            </div>
          )}
          {itemType === "object" && (
            <ObjectItemEditor
              value={item}
              onChange={(v) => {
                const next = items.slice();
                next[i] = v;
                onChange(next);
              }}
            />
          )}
          {itemType === "boolean" && (
            <div className="vf-bool">
              <button
                className={"f" + (item === false ? " on" : "")}
                onClick={() => {
                  const next = items.slice();
                  next[i] = false;
                  onChange(next);
                }}
              >
                false
              </button>
              <button
                className={"t" + (item === true ? " on" : "")}
                onClick={() => {
                  const next = items.slice();
                  next[i] = true;
                  onChange(next);
                }}
              >
                true
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        className="sb-add"
        onClick={() => {
          const blank =
            itemType === "string"
              ? ""
              : itemType === "object"
                ? {}
                : itemType === "boolean"
                  ? false
                  : 0;
          onChange([...items, blank]);
        }}
      >
        <IconPlus size={11} /> Add item
      </button>
    </div>
  );
}

/* For arrays-of-objects in the mock, render the existing keys with a small form */
function ObjectItemEditor({ value, onChange }) {
  const keys = Object.keys(value || {});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
      {keys.map((k) => {
        const v = value[k];
        const isBool = typeof v === "boolean";
        const isNum = typeof v === "number";
        return (
          <div
            key={k}
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-3)" }}>
              {k}
            </span>
            {isBool ? (
              <div className="vf-bool">
                <button
                  className={"f" + (v === false ? " on" : "")}
                  onClick={() => onChange({ ...value, [k]: false })}
                >
                  false
                </button>
                <button
                  className={"t" + (v === true ? " on" : "")}
                  onClick={() => onChange({ ...value, [k]: true })}
                >
                  true
                </button>
              </div>
            ) : isNum ? (
              <div className="ed-input sm">
                <input
                  type="number"
                  value={v ?? ""}
                  onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="ed-input sm">
                <input
                  value={v ?? ""}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ValueForm({ schema, value, onChange }) {
  if (!schema || schema.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="val-banner warn">
          <div className="icn">
            <IconAlert size={12} />
          </div>
          <div className="body">
            <div className="ttl">Schema is empty</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Falling back to raw JSON.</div>
          </div>
        </div>
        <textarea
          className="ed-textarea mono"
          style={{ minHeight: 280 }}
          value={JSON.stringify(value || {}, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {}
          }}
        />
      </div>
    );
  }

  const errs = (schema || []).flatMap((f) => {
    const e = validateField(f, value?.[f.key]);
    return e ? [{ key: f.key, err: e }] : [];
  });

  return (
    <div className="vf">
      {errs.length > 0 ? (
        <div className="val-banner danger">
          <div className="icn">
            <IconAlert size={13} />
          </div>
          <div className="body">
            <div className="ttl">
              {errs.length} validation error{errs.length === 1 ? "" : "s"}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
              {errs.slice(0, 2).map((e) => (
                <span key={e.key}>
                  <code>{e.key}</code> {e.err}
                  {" · "}
                </span>
              ))}
              {errs.length > 2 && <span>+ {errs.length - 2} more</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="val-banner ok">
          <div className="icn">
            <IconCheck size={13} />
          </div>
          <div className="body">
            <div className="ttl">Value validates against the schema</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Ready to publish.</div>
          </div>
        </div>
      )}

      {schema.map((field) => (
        <ValueField
          key={field.id}
          field={field}
          value={value?.[field.key]}
          onChange={(v) => onChange({ ...(value || {}), [field.key]: v })}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   IntegrationModal — SDK call snippet w/ inferred TS type.
   ──────────────────────────────────────────────────────────── */

function IntegrationModal({ open, configName, schema, value, onClose }) {
  const [tab, setTab] = cfgUseState("ts");
  if (!open) return null;

  const tsName = (configName || "Config")
    .replace(/[^A-Za-z0-9]/g, "_")
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
  const tsI = tsInterface(configName || "Config", schema);

  const ts = `import { initialize, getConfig } from '@shipeasy/sdk';

await initialize({ apiKey: process.env.SHIPEASY_KEY });

${tsI}

const ${tsName}Default: ${tsName}Config = ${JSON.stringify(value || {}, null, 2)
    .replace(/^/gm, "  ")
    .trimStart()};

export function get${tsName}() {
  // typed read — returns ${tsName}Default if not yet hydrated
  return getConfig<${tsName}Config>('${configName}', ${tsName}Default);
}`;

  const py = `from shipeasy import client, get_config

# get_config returns a dict — validate at the call site if needed
${tsName.toLowerCase()} = get_config(
    name="${configName}",
    default=${JSON.stringify(value || {}, null, 2)
      .replace(/^/gm, "    ")
      .trimStart()},
)`;

  const curl = `curl -H "Authorization: Bearer $SHIPEASY_KEY" \\
  https://api.shipeasy.dev/v1/configs/${encodeURIComponent(configName || "")}/value`;

  const snippets = { ts, py, curl };
  const code = snippets[tab];

  // crude syntax highlight
  function hl(s, lang) {
    const lines = s.split("\n");
    return lines
      .map((line, i) => {
        const n = String(i + 1).padStart(2, " ");
        let out = line;
        if (lang === "ts") {
          out = out
            .replace(
              /(import|from|export|const|interface|return|await|function|process)/g,
              '<span class="kw">$1</span>',
            )
            .replace(/('[^']*'|"[^"]*")/g, '<span class="str">$1</span>')
            .replace(/(\b\d+\b)/g, '<span class="num">$1</span>')
            .replace(/(\/\/[^\n]*)/g, '<span class="com">$1</span>')
            .replace(/(\b[A-Z][A-Za-z0-9_]+)/g, '<span class="typ">$1</span>');
        }
        if (lang === "py") {
          out = out
            .replace(/(from|import|def|return)/g, '<span class="kw">$1</span>')
            .replace(/('[^']*'|"[^"]*")/g, '<span class="str">$1</span>')
            .replace(/(#[^\n]*)/g, '<span class="com">$1</span>');
        }
        if (lang === "curl") {
          out = out.replace(/(curl|-H|\\)/g, '<span class="kw">$1</span>');
        }
        return `<span class="ln-num">${n}</span>${out}`;
      })
      .join("\n");
  }

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="icn accent">
            <IconCode size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ttl">Integration snippet</div>
            <div className="sub">{configName} · typed read</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <IconX size={11} />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div className="sdk-tabs">
            {[
              { k: "ts", lbl: "TypeScript · @shipeasy/sdk" },
              { k: "py", lbl: "Python · shipeasy" },
              { k: "curl", lbl: "cURL · REST" },
            ].map((t) => (
              <button key={t.k} className={tab === t.k ? "active" : ""} onClick={() => setTab(t.k)}>
                {t.lbl}
              </button>
            ))}
          </div>
          <div className="sdk-body" style={{ flex: 1, overflow: "auto" }}>
            <div className="copy-fab">
              <IconCopy size={11} /> Copy
            </div>
            <pre dangerouslySetInnerHTML={{ __html: hl(code, tab) }} />
          </div>
        </div>
        <div className="modal-ft">
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconBookOpen size={11} /> Configs guide · docs.shipeasy.dev/configs
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ConfirmDelete modal — used by edit & bulk delete.
   ──────────────────────────────────────────────────────────── */
function ConfirmDeleteModal({ open, items, onCancel, onConfirm }) {
  if (!open) return null;
  const isBulk = items.length > 1;
  return (
    <div className="modal-bd" onClick={onCancel}>
      <div className="modal md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="icn danger">
            <IconTrash size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ttl">
              Delete{" "}
              {isBulk ? (
                `${items.length} configs`
              ) : (
                <code style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{items[0]?.name}</code>
              )}
            </div>
            <div className="sub">cannot be undone</div>
          </div>
        </div>
        <div className="modal-bd-content">
          <p style={{ margin: 0, color: "var(--fg-2)", fontSize: 13, lineHeight: 1.55 }}>
            {isBulk ? (
              <>
                You are about to delete <b style={{ color: "var(--fg)" }}>{items.length} configs</b>
                . SDK callers that reference these by name will start receiving the default value
                you supplied to{" "}
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    background: "var(--bg-3)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  getConfig()
                </code>
                .
              </>
            ) : (
              <>
                Deleting{" "}
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    background: "var(--bg-3)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {items[0]?.name}
                </code>{" "}
                stops the KV from publishing this key. SDK callers will fall back to their inline
                defaults.
              </>
            )}
          </p>
          {isBulk && (
            <div className="confirm-list">
              {items.map((c) => (
                <div key={c.id} className="ci">
                  <IconSliders size={11} style={{ color: "var(--fg-3)" }} />
                  <span>{c.name}</span>
                  <span className="v">v{c.version}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-ft">
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-4)" }}>
            irreversible · activity log keeps a tombstone
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              <IconTrash size={11} /> Delete {isBulk ? `${items.length} configs` : "config"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Import-from-JSON modal — paste payload OR full schema.
   ──────────────────────────────────────────────────────────── */
function ImportJsonModal({ open, onClose, onImportPayload, onImportSchema }) {
  const [mode, setMode] = cfgUseState("payload");
  const [text, setText] = cfgUseState(
    mode === "payload"
      ? '{\n  "timeout_ms": 15000,\n  "retries": 3,\n  "providers": ["stripe","adyen"]\n}'
      : "",
  );

  cfgUseEffect(() => {
    if (mode === "payload")
      setText('{\n  "timeout_ms": 15000,\n  "retries": 3,\n  "providers": ["stripe","adyen"]\n}');
    else
      setText(
        '{\n  "type": "object",\n  "properties": {\n    "timeout_ms": { "type": "integer" }\n  },\n  "required": ["timeout_ms"]\n}',
      );
  }, [mode]);

  if (!open) return null;

  let parsed = null,
    parseErr = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    parseErr = e.message;
  }

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="icn accent">
            <IconUpload size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ttl">Import from JSON</div>
            <div className="sub">payload → infer schema · full schema → adopt</div>
          </div>
        </div>
        <div className="modal-bd-content">
          <div className="seg">
            <button
              className={mode === "payload" ? "active" : ""}
              onClick={() => setMode("payload")}
            >
              <IconBraces size={11} /> Example payload
            </button>
            <button className={mode === "schema" ? "active" : ""} onClick={() => setMode("schema")}>
              <IconCode size={11} /> Full JSON Schema
            </button>
          </div>
          <p style={{ margin: "0 0 -4px", color: "var(--fg-3)", fontSize: 12, lineHeight: 1.55 }}>
            {mode === "payload" ? (
              <>
                Paste a representative payload — types are inferred per key. Required is left off;
                you can flip it in the builder afterwards.
              </>
            ) : (
              <>
                Paste a Draft 2020-12 JSON Schema. Top-level{" "}
                <code style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>properties</code>{" "}
                become fields, top-level{" "}
                <code style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>required</code>{" "}
                sets the required flag.
              </>
            )}
          </p>
          <textarea
            className="ed-textarea mono"
            style={{ minHeight: 280 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {parseErr ? (
            <div className="val-banner danger">
              <div className="icn">
                <IconAlert size={12} />
              </div>
              <div className="body">
                <div className="ttl">Invalid JSON</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--mono)" }}>
                  {parseErr}
                </div>
              </div>
            </div>
          ) : (
            <div className="val-banner ok">
              <div className="icn">
                <IconCheck size={12} />
              </div>
              <div className="body">
                <div className="ttl">JSON parses cleanly</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  {mode === "payload"
                    ? `Will infer ${Object.keys(parsed || {}).length} field${Object.keys(parsed || {}).length === 1 ? "" : "s"}.`
                    : `Schema has ${Object.keys((parsed || {}).properties || {}).length} top-level properties.`}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-ft">
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-4)" }}>
            ⏎ to import · esc to cancel
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!!parseErr}
              onClick={() => {
                if (parseErr) return;
                if (mode === "payload") onImportPayload(parsed);
                else onImportSchema(parsed);
                onClose();
              }}
            >
              <IconCheck size={11} /> Import & merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Inference: payload → flat schema */
function inferSchemaFromPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload).map(([k, v]) => {
    if (typeof v === "boolean") return mkField(k, "boolean", { default: v });
    if (typeof v === "number")
      return mkField(k, Number.isInteger(v) ? "integer" : "number", { default: v });
    if (typeof v === "string") return mkField(k, "string", { default: v });
    if (Array.isArray(v))
      return mkField(k, "array", {
        items: { type: typeof v[0] === "object" ? "object" : typeof v[0] || "string" },
      });
    if (typeof v === "object")
      return mkField(k, "object", { properties: inferSchemaFromPayload(v) });
    return mkField(k, "string");
  });
}

Object.assign(window, {
  SchemaBuilder,
  ValueForm,
  IntegrationModal,
  ConfirmDeleteModal,
  ImportJsonModal,
  inferSchemaFromPayload,
  validateField,
  TypePill,
});
