// Event configuration drawer for the metrics page.

const { useState: useStateD } = React;

function CodeSnippet({ name, props }) {
  const propStr =
    props.length === 0
      ? ""
      : `, { ${props.map((p) => p.name + ": " + (p.type === "number" ? "129.00" : p.type === "boolean" ? "true" : '"…"')).join(", ")} }`;
  return (
    <div className="code-block">
      <span className="cmt">// In your client or server SDK</span>
      {"\n"}
      <span className="kw">import</span> {`{ log }`} <span className="kw">from</span>{" "}
      <span className="str">'@shipeasy/sdk'</span>;{"\n\n"}
      <span className="fn">log</span>(<span className="str">{`'${name}'`}</span>
      {propStr && (
        <>
          , {`{`}
          {props.map((p, i) => (
            <React.Fragment key={p.name}>
              {i > 0 && ", "}
              <span style={{ color: "var(--fg)" }}>{p.name}</span>
              {": "}
              {p.type === "number" ? (
                <span className="num">129.00</span>
              ) : p.type === "boolean" ? (
                <span className="num">true</span>
              ) : (
                <span className="str">'…'</span>
              )}
            </React.Fragment>
          ))}
          {`}`}
        </>
      )}
      );
    </div>
  );
}

function EventDrawer({ event, onClose, onSave }) {
  const isNew = !event;
  const [name, setName] = useStateD(event?.name || "user_checkout");
  const [kind, setKind] = useStateD(event?.kind || "event");
  const [props, setProps] = useStateD(
    event?.props?.map((p) => ({ name: p, type: "string", required: false })) || [
      { name: "userId", type: "string", required: true },
      { name: "amount", type: "number", required: false },
    ],
  );

  const addProp = () => setProps([...props, { name: "new_prop", type: "string", required: false }]);
  const rmProp = (i) => setProps(props.filter((_, k) => k !== i));
  const setProp = (i, k, v) => setProps(props.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
              border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            }}
          >
            <IconActivity size={14} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {isNew ? "Register event" : event.name}
            </div>
            <div className="t-mono-xs dim-2" style={{ marginTop: 2 }}>
              {isNew
                ? "Define the event you'll send from your app"
                : `first seen ${event.firstSeen} · ${event.volume} this period`}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={onClose}
          >
            <IconX size={12} />
          </button>
        </div>

        <div className="body">
          <div className="field">
            <label>Event name</label>
            <div className="input mono">
              <span className="prefix">log(</span>
              <input
                value={`'${name}'`}
                onChange={(e) => setName(e.target.value.replace(/'/g, ""))}
              />
              <span className="suffix">, props)</span>
            </div>
            <div className="hint">
              snake_case · used as-is in your SDK call. Once seen, alias it from Settings if you
              need to rename.
            </div>
          </div>

          <div className="field">
            <label>Type</label>
            <div className="seg">
              {[
                ["event", "Event", "any countable action"],
                ["conversion", "Conversion", "tracked in funnels & experiments"],
                ["funnel", "Funnel step", "intermediate step in a flow"],
                ["error", "Error", "surfaces in error rate"],
              ].map(([k, l, d]) => (
                <div
                  key={k}
                  className={`opt ${kind === k ? "on" : ""}`}
                  onClick={() => setKind(k)}
                  title={d}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Properties · the second arg of log()</label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 12px",
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 70px 24px",
                  gap: 8,
                  fontFamily: "var(--mono)",
                  fontSize: 9.5,
                  color: "var(--fg-4)",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "2px 0 6px",
                }}
              >
                <span>Name</span>
                <span>Type</span>
                <span>Required</span>
                <span />
              </div>
              {props.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 70px 24px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div className="input mono" style={{ height: 28 }}>
                    <input value={p.name} onChange={(e) => setProp(i, "name", e.target.value)} />
                  </div>
                  <div className="select" style={{ height: 28 }}>
                    <select
                      value={p.type}
                      onChange={(e) => setProp(i, "type", e.target.value)}
                      style={{ height: 28 }}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                  </div>
                  <div
                    onClick={() => setProp(i, "required", !p.required)}
                    style={{ justifySelf: "center" }}
                  >
                    <div className={`toggle ${p.required ? "on" : ""}`} />
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 24, height: 24 }}
                    onClick={() => rmProp(i)}
                  >
                    <IconX size={11} />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start", marginTop: 4 }}
                onClick={addProp}
              >
                <IconPlus size={11} /> Add property
              </button>
            </div>
            <div className="hint">
              Properties are inferred automatically too — but declaring them gives you autocomplete,
              type checks in the SDK, and validation on the server.
            </div>
          </div>

          <div className="field">
            <label>SDK call</label>
            <CodeSnippet name={name} props={props.filter((p) => p.name)} />
            <div className="hint">
              Drop into any client or server. Calls are batched and flushed every 10s — no extra
              setup.
            </div>
          </div>

          <div className="field">
            <label>Dashboard</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div className="t-caps dim-2">Aggregate</div>
                <div className="select">
                  <select defaultValue="count">
                    <option>count</option>
                    <option>sum</option>
                    <option>avg</option>
                    <option>p50</option>
                    <option>p95</option>
                    <option>unique users</option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div className="t-caps dim-2">Pin to overview</div>
                <div className="flex items-center gap-2" style={{ height: 32 }}>
                  <div className="toggle on" />
                  <span className="t-sm dim">Show as a tile up top</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="foot">
          {!isNew && (
            <button className="btn btn-danger btn-sm" style={{ marginRight: "auto" }}>
              Archive event
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            <IconCheck size={12} /> {isNew ? "Register event" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { EventDrawer, CodeSnippet });
