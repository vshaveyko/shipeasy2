"use strict";
(() => {
  var Ln = Object.create;
  var vt = Object.defineProperty;
  var _n = Object.getOwnPropertyDescriptor;
  var Tn = Object.getOwnPropertyNames;
  var Rn = Object.getPrototypeOf,
    Mn = Object.prototype.hasOwnProperty;
  var An = (e, t, r) =>
    t in e ? vt(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : (e[t] = r);
  var Pn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var Hn = (e, t, r, n) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of Tn(t))
        !Mn.call(e, o) &&
          o !== r &&
          vt(e, o, { get: () => t[o], enumerable: !(n = _n(t, o)) || n.enumerable });
    return e;
  };
  var Cn = (e, t, r) => (
    (r = e != null ? Ln(Rn(e)) : {}),
    Hn(t || !e || !e.__esModule ? vt(r, "default", { value: e, enumerable: !0 }) : r, e)
  );
  var X = (e, t, r) => An(e, typeof t != "symbol" ? t + "" : t, r);
  var Dr = Pn((ts, jr) => {
    "use strict";
    var qt = Object.defineProperty,
      Ho = Object.getOwnPropertyDescriptor,
      Co = Object.getOwnPropertyNames,
      Oo = Object.prototype.hasOwnProperty,
      Io = (e, t) => {
        for (var r in t) qt(e, r, { get: t[r], enumerable: !0 });
      },
      zo = (e, t, r, n) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of Co(t))
            !Oo.call(e, o) &&
              o !== r &&
              qt(e, o, { get: () => t[o], enumerable: !(n = Ho(t, o)) || n.enumerable });
        return e;
      },
      qo = (e) => zo(qt({}, "__esModule", { value: !0 }), e),
      Mr = {};
    Io(Mr, {
      FlagsClientBrowser: () => Ar,
      LABEL_MARKER_END: () => qr,
      LABEL_MARKER_RE: () => ea,
      LABEL_MARKER_SEP: () => zr,
      LABEL_MARKER_START: () => Ir,
      _resetShipeasyForTests: () => Zo,
      attachDevtools: () => Hr,
      configureShipeasy: () => Dt,
      encodeLabelMarker: () => Br,
      flags: () => Or,
      getShipeasyClient: () => Xo,
      i18n: () => fa,
      isDevtoolsRequested: () => Ct,
      labelAttrs: () => ta,
      loadDevtools: () => Ot,
      readConfigOverride: () => jt,
      readExpOverride: () => Pr,
      readGateOverride: () => Bt,
      shipeasy: () => Cr,
      version: () => Bo,
    });
    jr.exports = qo(Mr);
    var Bo = "1.0.0",
      jo = 5e3,
      Do = 100,
      Lr = "__se_anon_id",
      _r = "__se_seen",
      Ke = "__se_pending_alias",
      Uo = class {
        constructor(e, t) {
          X(this, "collectUrl");
          X(this, "sdkKey");
          X(this, "queue", []);
          X(this, "exposureSeen", new Set());
          X(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), jo)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let r = sessionStorage.getItem(_r);
              r && (this.exposureSeen = new Set(JSON.parse(r)));
            } catch {}
          }
        }
        destroy() {
          this.timer !== null && (clearInterval(this.timer), (this.timer = null));
        }
        pushExposure(e, t, r, n) {
          let o = `${r || n}:${e}`;
          if (!this.exposureSeen.has(o)) {
            this.exposureSeen.add(o);
            try {
              sessionStorage.setItem(_r, JSON.stringify([...this.exposureSeen]));
            } catch {}
            this.enqueue({
              type: "exposure",
              experiment: e,
              group: t,
              user_id: r,
              anonymous_id: n,
              ts: Date.now(),
            });
          }
        }
        pushMetric(e, t, r, n) {
          this.enqueue({
            type: "metric",
            event_name: e,
            user_id: t,
            anonymous_id: r,
            ts: Date.now(),
            ...(n ? { properties: n } : {}),
          });
        }
        async alias(e, t) {
          let r = { anonymousId: e, userId: t, ts: Date.now() };
          try {
            localStorage.setItem(Ke, JSON.stringify(r));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(Ke);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(Ke);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(Ke);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(Ke));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= Do && this.flush());
        }
        flush(e = !1) {
          if (!this.queue.length) return;
          let t = this.queue.splice(0),
            r = JSON.stringify({ events: t });
          if (e && typeof navigator < "u" && navigator.sendBeacon) {
            navigator.sendBeacon(this.collectUrl, new Blob([r], { type: "text/plain" }));
            return;
          }
          fetch(this.collectUrl, {
            method: "POST",
            headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
            body: r,
            keepalive: !0,
          }).catch(() => {});
        }
        async flushAsync() {
          if (!this.queue.length) return;
          let e = this.queue.splice(0),
            t = JSON.stringify({ events: e });
          await fetch(this.collectUrl, {
            method: "POST",
            headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
            body: t,
          }).catch(() => {});
        }
      },
      st = 5;
    function No(e, t, r) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let n = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
        d = !1;
      try {
        new PerformanceObserver((m) => {
          let x = m.getEntries();
          x.length && (n = x[x.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((m) => {
          for (let x of m.getEntries()) {
            let g = x.duration ?? 0;
            (o === null || g > o) && (o = g);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((m) => {
          for (let x of m.getEntries()) x.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let c = window.onerror;
      ((window.onerror = (u, m, x, g, L) => (
        a < st &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, r, {
            value: 1,
            kind: "exception",
            message: typeof u == "string" ? u.slice(0, 200) : String(L ?? "").slice(0, 200),
            source: typeof m == "string" ? m.slice(0, 200) : "",
            line: x ?? 0,
          })),
        typeof c == "function" ? c(u, m, x, g, L) : !1
      )),
        window.addEventListener("unhandledrejection", (u) => {
          if (a < st) {
            a += 1;
            let m = u.reason,
              x = m instanceof Error ? m.message : typeof m == "string" ? m : String(m);
            e.pushMetric("__auto_js_error", t, r, {
              value: 1,
              kind: "unhandled_rejection",
              message: x.slice(0, 200),
            });
          }
        }));
      let l = window.fetch;
      window.fetch = async function (...u) {
        let m = typeof performance < "u" ? performance.now() : 0,
          x = typeof u[0] == "string" ? u[0] : u[0].toString(),
          g;
        try {
          g = await l.apply(this, u);
        } catch (L) {
          throw (
            s < st &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, r, {
                value: 1,
                kind: "network",
                status: 0,
                url: x.slice(0, 200),
              })),
            L
          );
        }
        if (g.status >= 500 && s < st) {
          s += 1;
          let L = typeof performance < "u" ? performance.now() - m : 0;
          e.pushMetric("__auto_network_error", t, r, {
            value: 1,
            kind: "5xx",
            status: g.status,
            url: x.slice(0, 200),
            duration_ms: Math.round(L),
          });
        }
        return g;
      };
      let f = () => {
        if (!d) {
          d = !0;
          try {
            let m = performance.getEntriesByType("navigation")[0];
            if (m) {
              let g = m.startTime ?? 0;
              (m.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, r, { value: m.loadEventEnd - g }),
                m.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, r, { value: m.responseStart - g }),
                m.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, r, {
                    value: m.domContentLoadedEventEnd - g,
                  }));
            }
            let x = performance.getEntriesByType("paint");
            for (let g of x)
              g.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, r, { value: g.startTime })
                : g.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, r, { value: g.startTime });
          } catch {}
        }
      };
      document.readyState === "complete"
        ? setTimeout(f, 0)
        : window.addEventListener(
            "load",
            () => {
              setTimeout(f, 0);
            },
            { once: !0 },
          );
      let p = () => {
        (f(),
          n !== null && e.pushMetric("__auto_lcp", t, r, { value: n }),
          o !== null && e.pushMetric("__auto_inp", t, r, { value: o }),
          i && e.pushMetric("__auto_cls_binary", t, r, { value: 1 }));
        let u = n === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, r, { value: u }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && p();
      });
    }
    function Ko() {
      try {
        let t = localStorage.getItem(Lr);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(Lr, e);
      } catch {}
      return e;
    }
    function Fo() {
      if (typeof window > "u") return {};
      let e = {};
      try {
        typeof navigator < "u" && navigator.language && (e.locale = navigator.language);
      } catch {}
      try {
        let t = Intl.DateTimeFormat().resolvedOptions().timeZone;
        t && (e.timezone = t);
      } catch {}
      try {
        document.referrer && (e.referrer = document.referrer);
      } catch {}
      try {
        e.path = window.location.pathname;
      } catch {}
      try {
        window.screen &&
          ((e.screen_width = window.screen.width), (e.screen_height = window.screen.height));
      } catch {}
      try {
        typeof navigator < "u" &&
          typeof navigator.userAgent == "string" &&
          (e.user_agent = navigator.userAgent);
      } catch {}
      return e;
    }
    function Wo() {
      if (typeof window > "u") return {};
      let e = {};
      try {
        let t = new URLSearchParams(window.location.search);
        for (let [r, n] of t)
          !n ||
            n === "default" ||
            n === "none" ||
            ((r.startsWith("se_exp_") || r.startsWith("se-exp-")) && (e[r.slice(7)] = n));
      } catch {}
      return e;
    }
    var Ar = class {
        constructor(e) {
          X(this, "sdkKey");
          X(this, "baseUrl");
          X(this, "autoGuardrails");
          X(this, "env");
          X(this, "evalResult", null);
          X(this, "anonId");
          X(this, "userId", "");
          X(this, "buffer");
          X(this, "guardrailsInstalled", !1);
          X(this, "listeners", new Set());
          X(this, "overrideListenerInstalled", !1);
          X(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = Ko()),
            (this.buffer = new Uo(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let r = { ...Fo(), anonymous_id: this.anonId, ...e },
            n = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: r, experiment_overrides: Wo() }),
            });
          if (!n.ok) throw new Error(`/sdk/evaluate returned ${n.status}`);
          ((this.evalResult = await n.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), No(this.buffer, this.userId, this.anonId)),
            this.notify());
        }
        get ready() {
          return this.evalResult !== null;
        }
        notify() {
          for (let e of this.listeners)
            try {
              e();
            } catch (t) {
              console.warn("[shipeasy] subscriber threw:", String(t));
            }
        }
        initFromBootstrap(e) {
          this.evalResult = e;
        }
        getFlag(e) {
          if (this.evalResult === null) return !1;
          let t = Bt(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let r = jt(e),
            n = r !== void 0 ? r : this.evalResult.configs?.[e];
          if (n !== void 0) {
            if (!t) return n;
            try {
              return t(n);
            } catch (o) {
              console.warn(`[shipeasy] getConfig('${e}') decode failed:`, String(o));
              return;
            }
          }
        }
        getExperiment(e, t, r, n) {
          let o = { inExperiment: !1, group: "control", params: t },
            i = Pr(e);
          if (i !== null) {
            let s = n?.[i],
              d = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: i, params: d };
          }
          let a = this.evalResult?.experiments[e];
          if (!a || !a.inExperiment) return o;
          if ((this.buffer.pushExposure(e, a.group, this.userId, this.anonId), !r))
            return { inExperiment: !0, group: a.group, params: a.params };
          try {
            return { inExperiment: !0, group: a.group, params: r(a.params) };
          } catch (s) {
            return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(s)), o);
          }
        }
        subscribe(e) {
          return (
            this.listeners.add(e),
            !this.overrideListenerInstalled &&
              typeof window < "u" &&
              ((this.overrideListenerInstalled = !0),
              window.addEventListener("se:override:change", this.onOverrideChange)),
            () => {
              this.listeners.delete(e);
            }
          );
        }
        installBridge() {
          if (typeof window > "u") return null;
          let e = {
            getFlag: (t) => this.getFlag(t),
            getExperiment: (t) => {
              let r = this.getExperiment(t, {});
              return { inExperiment: r.inExperiment, group: r.group };
            },
            getConfig: (t) => this.getConfig(t),
          };
          return (
            (window.__shipeasy = e),
            window.dispatchEvent(new CustomEvent("se:state:update")),
            e
          );
        }
        track(e, t) {
          this.buffer.pushMetric(e, this.userId, this.anonId, t);
        }
        async flush() {
          await this.buffer.flushAsync();
        }
        destroy() {
          (this.buffer.flush(),
            this.buffer.destroy(),
            this.listeners.clear(),
            this.overrideListenerInstalled &&
              typeof window < "u" &&
              (window.removeEventListener("se:override:change", this.onOverrideChange),
              (this.overrideListenerInstalled = !1)));
        }
      },
      Go = /^(true|on|1|yes)$/i,
      Jo = /^(false|off|0|no)$/i;
    function Vo(e) {
      return Go.test(e) ? !0 : Jo.test(e) ? !1 : null;
    }
    function Yo(e) {
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
    function Fe(e, t) {
      if (typeof window > "u" || !window.location) return null;
      let r = new URLSearchParams(window.location.search),
        n = r.get(e);
      if (n !== null) return n;
      if (t) {
        let o = r.get(t);
        if (o !== null) return o;
      }
      return null;
    }
    function Bt(e) {
      let t = Fe(`se_ks_${e}`) ?? Fe(`se_gate_${e}`) ?? Fe(`se-gate-${e}`);
      return t === null ? null : Vo(t);
    }
    function jt(e) {
      let t = Fe(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return Yo(t);
    }
    function Pr(e) {
      let t = Fe(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function Ct() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function Ot(e = {}) {
      if (typeof window > "u") return;
      let r = window.__shipeasy_devtools_global;
      if (!r) return;
      r.init(e);
      let n = window;
      if (!n.__shipeasy_devtools) {
        let o = !0;
        n.__shipeasy_devtools = {
          toggle() {
            o ? (r.destroy(), (o = !1)) : (r.init(e), (o = !0));
          },
        };
      }
    }
    function Hr(e, t = {}) {
      if (typeof window > "u") return () => {};
      let n = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = n[n.length - 1],
        i = n.includes("Shift"),
        a = n.includes("Alt"),
        s = n.includes("Ctrl") || n.includes("Control"),
        d = n.includes("Meta") || n.includes("Cmd");
      (e.installBridge(), Ct() && Ot({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let c = Ct();
      function l(p) {
        p.key === o &&
          p.shiftKey === i &&
          p.altKey === a &&
          p.ctrlKey === s &&
          p.metaKey === d &&
          (c
            ? window.__shipeasy_devtools?.toggle()
            : ((c = !0), Ot({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", l);
      let f = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", l), f());
      };
    }
    var ae = null;
    function Cr(e) {
      let t = Dt({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (Or.notifyMounted(), Hr(t, { adminUrl: e.adminUrl }));
    }
    function Dt(e) {
      return ae || ((ae = new Ar(e)), ae);
    }
    function Xo() {
      return ae;
    }
    function Zo() {
      (ae?.destroy(), (ae = null));
    }
    function Tr() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var At = !1,
      It = new Set(),
      Rr = !1;
    function Qo() {
      Rr ||
        typeof window > "u" ||
        ((Rr = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of It) e();
        }));
    }
    var Or = {
        configure(e) {
          Dt(e);
        },
        identify(e) {
          return ae
            ? ae.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = Tr();
          return t !== null && e in t.flags
            ? t.flags[e]
            : At
              ? ae
                ? ae.getFlag(e)
                : (Bt(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let r = Tr();
          if (r !== null && e in r.configs) {
            let o = r.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!At) return;
          if (ae) return ae.getConfig(e, t);
          let n = jt(e);
          if (n !== void 0) {
            if (!t) return n;
            try {
              return t(n);
            } catch {
              return;
            }
          }
        },
        getExperiment(e, t, r, n) {
          return ae?.getExperiment(e, t, r, n) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          ae?.track(e, t);
        },
        flush() {
          return ae?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((At = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return ae ? ae.subscribe(e) : (It.add(e), Qo(), () => It.delete(e));
        },
        get ready() {
          return ae?.ready ?? !1;
        },
      },
      Ir = "\uFFF9",
      zr = "\uFFFA",
      qr = "\uFFFB",
      ea = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function Br(e, t) {
      return `${Ir}${e}${zr}${t}${qr}`;
    }
    function ta(e, t, r) {
      let n = { "data-label": e };
      return (t && (n["data-variables"] = JSON.stringify(t)), r && (n["data-label-desc"] = r), n);
    }
    var ra = null,
      na = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      oa = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function aa() {
      return globalThis[na]?.() ?? null;
    }
    function ia() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[oa];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function lt(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (r, n) => {
            let o = t[n];
            return o != null ? String(o) : r;
          })
        : e;
    }
    var sa = typeof document < "u",
      la = [
        "b",
        "i",
        "u",
        "s",
        "em",
        "strong",
        "del",
        "ins",
        "mark",
        "small",
        "code",
        "pre",
        "kbd",
        "sub",
        "sup",
        "span",
        "a",
        "p",
        "br",
        "hr",
      ];
    function da() {
      let e = {};
      for (let t of la)
        e[t] = sa
          ? (r) => {
              let n = document.createElement(t);
              return (t !== "br" && t !== "hr" && (n.textContent = r), n);
            }
          : (r) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${r}</${t}>`);
      return e;
    }
    var ca = da(),
      zt = {},
      Pt = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function pa(e, t) {
      let r = [],
        n = 0,
        o,
        i = !0;
      for (Pt.lastIndex = 0; (o = Pt.exec(e)) !== null; ) {
        o.index > n && r.push(e.slice(n, o.index));
        let a = o[1],
          s = o[2] ?? "",
          d = t[a] ?? zt[a] ?? ca[a];
        if (d) {
          let c = d(s);
          (typeof c != "string" && (i = !1), r.push(c));
        } else r.push(s);
        n = Pt.lastIndex;
      }
      return (n < e.length && r.push(e.slice(n)), i ? r.join("") : r);
    }
    function Ht(e, t) {
      if (typeof window < "u" && window.i18n) {
        let n = window.i18n.t(e, t);
        return n === e ? void 0 : n;
      }
      let r = aa();
      if (r?.strings[e]) return lt(r.strings[e], t);
    }
    var fa = {
      t(e, t, r) {
        let n, o;
        typeof t == "string" ? ((n = t), (o = r)) : (o = t);
        let i = Ht(e, o);
        return i !== void 0 ? i : n !== void 0 ? lt(n, o) : e;
      },
      rich(e, t, r, n) {
        let i = Ht(e, n) ?? lt(t, n);
        return pa(i, r ?? {});
      },
      tEl(e, t, r, n) {
        if (ia()) {
          let i = Ht(e, r) ?? lt(t, r);
          return Br(e, i);
        }
        return this.t(e, t, r);
      },
      configure(e) {
        (e.components && (zt = { ...zt, ...e.components }),
          e.createElement && (ra = e.createElement));
      },
      get locale() {
        return typeof window < "u" && window.i18n ? window.i18n.locale : null;
      },
      get ready() {
        return typeof window < "u" && window.i18n ? !!window.i18n.locale : !1;
      },
      whenReady() {
        return typeof window > "u" || window.i18n?.locale
          ? Promise.resolve()
          : new Promise((e) => {
              let t = () => e();
              window.addEventListener("se:i18n:ready", t, { once: !0 });
            });
      },
      onUpdate(e) {
        if (typeof window > "u") return () => {};
        if (window.i18n) return window.i18n.on("update", e);
        let t = () => {},
          r = () => {
            window.i18n && (t = window.i18n.on("update", e));
          };
        return (
          window.addEventListener("se:i18n:ready", r, { once: !0 }),
          () => {
            (window.removeEventListener("se:i18n:ready", r), t());
          }
        );
      },
    };
    if (typeof window < "u") {
      let e = window.__SE_BOOTSTRAP;
      e?.apiKey && !ae && Cr({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var Ye = `
:host {
  all: initial;
  --bg-0:#050507;
  --bg-1:#0a0a0c;
  --bg-2:#101012;
  --bg-3:#16161a;
  --line:rgba(255,255,255,0.10);
  --line-2:rgba(255,255,255,0.06);
  --fg:#ededed;
  --fg-2:#b6b6bc;
  --fg-3:#8a8a92;
  --fg-4:#5d5d65;
  --fg-faint:#3d3d44;
  --accent:#4ade80;
  --pri:#7ab8ff;
  --warn:#f59e0b;
  --info:#7ab8ff;
  --danger:#f87171;
  --warn-bg-soft:color-mix(in oklab, var(--warn) 14%, var(--bg-3));
  --warn-bg-strong:color-mix(in oklab, var(--warn) 22%, var(--bg-3));
  --warn-border:color-mix(in oklab, var(--warn) 32%, var(--line));
  --warn-bg-overbar:color-mix(in oklab, var(--warn) 10%, var(--bg-1));
  --mono:'Geist Mono', ui-monospace, monospace;
  --sans:'Geist', ui-sans-serif, system-ui, sans-serif;
  --serif:'Instrument Serif', serif;
  color: var(--fg);
  font-family: var(--sans);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}
*, *::before, *::after { box-sizing: border-box; }
:focus { outline: none; }
:focus-visible { outline:2px solid var(--pri); outline-offset:2px; border-radius:3px; }
input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline:2px solid var(--pri); outline-offset:0; border-color:transparent !important; }
button { font-family: inherit; }

/* Panel \u2014 docked to one edge of the viewport. JS sets right/top/etc.
   min-height anchors the inner flex chain (split / pane / body) so the
   absolutely-positioned auth-locked overlay still has a non-zero pane
   to fill, while letting the panel shrink to content (capped at viewport)
   instead of always claiming full viewport height. */
.dtf-panel { position:fixed; z-index:2147483646;
  width:420px;
  min-height:520px;
  max-height:calc(100vh - 36px);
  background:linear-gradient(180deg, var(--bg-1), var(--bg-0));
  border:1px solid var(--line); border-radius:6px;
  display:flex; flex-direction:column; overflow:hidden;
  box-shadow:0 30px 60px -20px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset;
  animation:dtf-panel-in .18s cubic-bezier(.2,.8,.3,1); }
@keyframes dtf-panel-in {
  from { opacity:0; transform:translateX(8px) scale(.985); }
  to   { opacity:1; transform:translateX(0) scale(1); }
}

/* collapsed = floating rail anchored to one edge */
.dtf-panel.collapsed { background:rgba(8,8,10,0.72);
  backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  border:1px solid color-mix(in oklab, var(--line) 100%, white 14%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 14px 28px -10px rgba(0,0,0,0.85),
    0 4px 10px -2px rgba(0,0,0,0.55),
    0 0 0 1px rgba(0,0,0,0.4);
  border-radius:8px; overflow:visible;
  width:auto; height:auto; min-width:0; min-height:0; max-height:none; padding:0;
  animation:dtf-fade-in .14s ease-out; }
@keyframes dtf-fade-in { from { opacity:0; } to { opacity:1; } }
.dtf-panel.collapsed .dtf-panel-rail { display:flex; align-items:center; gap:4px; padding:6px; }
.dtf-panel.collapsed[data-edge="right"]  .dtf-panel-rail,
.dtf-panel.collapsed[data-edge="left"]   .dtf-panel-rail { flex-direction:column; }
.dtf-panel.collapsed[data-edge="top"]    .dtf-panel-rail,
.dtf-panel.collapsed[data-edge="bottom"] .dtf-panel-rail { flex-direction:row; }
.dtf-panel-rail .mk { border-radius:5px;
  background:conic-gradient(from 140deg, var(--accent), #0a0a0b 40%, var(--accent) 80%);
  box-shadow:0 0 0 1px rgba(255,255,255,0.08), 0 0 10px color-mix(in oklab, var(--accent) 35%, transparent);
  flex-shrink:0; cursor:grab; user-select:none; touch-action:none; }
.dtf-panel-rail .mk:active, .dtf-panel-rail .mk.dragging { cursor:grabbing;
  box-shadow:0 0 0 2px color-mix(in oklab, var(--accent) 40%, transparent); }
.dtf-panel-rail .ri { position:relative; display:grid; place-items:center;
  border:0; background:transparent; color:var(--fg-2);
  border-radius:6px; cursor:pointer;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 1px rgba(0,0,0,0.9)); }
.dtf-panel-rail .ri:hover { color:var(--accent);
  background:color-mix(in oklab, var(--bg-1) 88%, transparent); }
.dtf-panel-rail .ri .c { position:absolute; top:-1px; right:-1px;
  font-family:var(--mono); font-size:8.5px; line-height:1; color:var(--fg);
  background:var(--bg-3); border:1px solid var(--line);
  padding:1px 3px; border-radius:6px; min-width:13px; text-align:center; }
.dtf-panel-rail .ri .dotw { position:absolute; top:1px; left:1px;
  width:5px; height:5px; border-radius:50%;
  background:var(--warn); box-shadow:0 0 4px var(--warn); }
.dtf-panel-rail .ri .tip { position:absolute; background:var(--bg-3); color:var(--fg);
  font-family:var(--mono); font-size:10px; padding:3px 7px; border-radius:3px;
  white-space:nowrap; border:1px solid var(--line);
  opacity:0; pointer-events:none; transition:opacity .12s; z-index:10; }
.dtf-panel-rail .ri:hover .tip { opacity:1; }
/* Multi-line tooltip used by the unauthed lock icon \u2014 wraps and reads as a
   short explanation rather than a one-word label. */
.dtf-panel-rail .ri .tip.tip-multi,
.dtf-rail .t .tip.tip-multi {
  white-space:normal; max-width:240px; min-width:180px;
  text-align:left; line-height:1.45; padding:8px 10px;
  font-family:var(--sans); font-size:11px; color:var(--fg-2); }
.dtf-panel-rail .ri .tip.tip-multi b,
.dtf-rail .t .tip.tip-multi b {
  display:block; margin-bottom:4px;
  font-family:var(--mono); font-size:9.5px; letter-spacing:.06em;
  text-transform:uppercase; color:var(--accent); font-weight:600; }
.dtf-panel-rail .ri .tip.tip-multi .hint,
.dtf-rail .t .tip.tip-multi .hint {
  display:block; margin-top:6px;
  font-family:var(--mono); font-size:9.5px; color:var(--fg-3); letter-spacing:.02em; }
.dtf-panel.collapsed[data-edge="right"]  .ri .tip { right:calc(100% + 8px); top:50%; transform:translateY(-50%); }
.dtf-panel.collapsed[data-edge="left"]   .ri .tip { left:calc(100% + 8px); top:50%; transform:translateY(-50%); }
.dtf-panel.collapsed[data-edge="top"]    .ri .tip { top:calc(100% + 8px); left:50%; transform:translateX(-50%); }
.dtf-panel.collapsed[data-edge="bottom"] .ri .tip { bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); }

.dtf-rail-resize { position:relative; display:grid; place-items:center;
  cursor:ns-resize; opacity:.7; transition:opacity .12s, background .12s; flex-shrink:0;
  border-radius:4px; margin-top:4px; }
.dtf-rail-resize:hover { opacity:1; background:var(--bg-3); }
.dtf-rail-resize::before { content:''; background:var(--fg-3);
  border-radius:999px; box-shadow:0 0 0 1px rgba(0,0,0,0.35); transition:background .12s; }
.dtf-panel.collapsed[data-edge="right"]  .dtf-rail-resize,
.dtf-panel.collapsed[data-edge="left"]   .dtf-rail-resize { cursor:ns-resize; }
.dtf-panel.collapsed[data-edge="top"]    .dtf-rail-resize,
.dtf-panel.collapsed[data-edge="bottom"] .dtf-rail-resize { cursor:ew-resize; }
.dtf-panel.collapsed[data-edge="right"]  .dtf-rail-resize::before,
.dtf-panel.collapsed[data-edge="left"]   .dtf-rail-resize::before { width:18px; height:4px; }
.dtf-panel.collapsed[data-edge="top"]    .dtf-rail-resize::before,
.dtf-panel.collapsed[data-edge="bottom"] .dtf-rail-resize::before { width:4px; height:18px; }
.dtf-rail-resize:hover::before, .dtf-rail-resize.dragging::before {
  background:var(--pri); transform:scale(1.15); }

.dtf-head { display:flex; align-items:center; gap:10px; padding:11px 12px 10px;
  border-bottom:1px solid var(--line); }
.dtf-head .mk { width:14px; height:14px; border-radius:3px;
  background:conic-gradient(from 140deg, var(--accent), #0a0a0b 40%, var(--accent) 80%);
  box-shadow:0 0 0 1px rgba(255,255,255,0.08), 0 0 8px color-mix(in oklab, var(--accent) 30%, transparent);
  cursor:grab; flex-shrink:0; }
.dtf-head .mk.dragging { cursor:grabbing; }
.dtf-head .ti { font-size:12px; font-weight:600; letter-spacing:.01em; flex:1;
  display:flex; align-items:baseline; gap:8px; min-width:0; }
.dtf-head .ti .title { color:var(--fg); font-weight:600; font-size:12px; white-space:nowrap; }
.dtf-head .ti .sub { font-family:var(--mono); font-size:10px; font-weight:400; color:var(--fg-3);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.dtf-head .actions { display:flex; gap:2px; }
.dtf-head .ib { width:26px; height:26px; border-radius:4px; border:0;
  background:transparent; color:var(--fg-3); cursor:pointer;
  display:grid; place-items:center; }
.dtf-head .ib:hover { background:var(--bg-3); color:var(--fg); }
.dtf-head .ib svg { width:11px; height:11px; }

.dtf-split { display:flex; flex:1; min-height:0; }
.dtf-rail { width:40px; flex:0 0 40px; display:flex; flex-direction:column;
  gap:2px; padding:6px 4px; background:var(--bg-1);
  border-right:1px solid var(--line); }
.dtf-rail .t { position:relative; display:grid; place-items:center;
  width:32px; height:32px; border:0; background:transparent; color:var(--fg-3);
  border-radius:4px; cursor:pointer; overflow:visible; }
.dtf-rail .t:hover { color:var(--fg); background:var(--bg-2); }
.dtf-rail .t.active { color:var(--fg); background:var(--bg-3);
  box-shadow:inset 2px 0 0 var(--pri); }
.dtf-rail .t svg { width:14px; height:14px; }
.dtf-rail .t .c { position:absolute; top:-3px; right:-3px;
  font-family:var(--mono); font-size:9.5px; line-height:1;
  color:var(--fg-2); background:var(--bg-3);
  padding:1px 4px; border-radius:6px; min-width:13px; text-align:center;
  border:1px solid var(--line); }
.dtf-rail .t.active .c { color:var(--fg);
  background:color-mix(in oklab, var(--pri) 18%, var(--bg-3)); }
.dtf-rail .t .dotw { position:absolute; top:-2px; left:-2px;
  width:6px; height:6px; border-radius:50%;
  background:var(--warn); box-shadow:0 0 4px var(--warn), 0 0 0 1.5px var(--bg-1); }
.dtf-rail .t .tip { position:absolute; left:calc(100% + 6px); top:50%;
  transform:translateY(-50%); background:var(--bg-3); color:var(--fg);
  font-family:var(--mono); font-size:10px; letter-spacing:.02em;
  padding:3px 7px; border-radius:3px; white-space:nowrap;
  border:1px solid var(--line);
  opacity:0; pointer-events:none; transition:opacity .12s;
  z-index:10; }
.dtf-rail .t:hover .tip { opacity:1; }

.dtf-pane { display:flex; flex-direction:column; flex:1; min-width:0; min-height:0; }

.dtf-overbar { display:flex; align-items:center; gap:8px; padding:8px 12px;
  background:var(--warn-bg-overbar); border-bottom:1px solid var(--warn-border);
  color:var(--fg); font-size:10.5px; font-family:var(--mono); }
.dtf-overbar b { font-weight:600; color:var(--warn); }
.dtf-overbar > span { flex:1; }
.dtf-overbar button { background:transparent; border:1px solid var(--warn-border);
  color:var(--warn); font-family:var(--mono); font-size:10px;
  padding:2px 7px; border-radius:3px; cursor:pointer; }
.dtf-overbar button:hover { background:var(--warn-bg-soft); }
.dtf-overbar svg { width:11px; height:11px; flex-shrink:0; }

.dtf-search { display:flex; gap:8px; padding:8px 10px; border-bottom:1px solid var(--line); }
.dtf-search .input { flex:1; display:flex; align-items:center; gap:7px;
  padding:5px 8px; background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; }
.dtf-search .input svg { width:11px; height:11px; color:var(--fg-3); }
.dtf-search .input input { flex:1; background:transparent; border:0; outline:0;
  color:var(--fg); font-family:var(--mono); font-size:11px; }
.dtf-search .input input::placeholder { color:var(--fg-4); }
.dtf-search .kbd { padding:1px 5px; border:1px solid var(--line); border-radius:3px;
  font-size:10.5px; font-family:var(--mono); color:var(--fg-3); cursor:pointer; }
.dtf-search .seg { display:flex; padding:2px; background:var(--bg-2);
  border:1px solid var(--line); border-radius:4px; }
.dtf-search .seg button { background:transparent; border:0; color:var(--fg-3);
  font-family:var(--mono); font-size:10.5px; padding:3px 8px; border-radius:2px;
  cursor:pointer; }
.dtf-search .seg button.active { background:color-mix(in oklab, var(--pri) 16%, var(--bg-3));
  color:var(--pri); }
.dtf-locale-sel { background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; color:var(--fg); font-family:var(--mono); font-size:11px;
  padding:4px 6px; cursor:pointer; outline:none; max-width:140px; }
.dtf-locale-sel:hover { border-color:var(--fg-4); }

.dtf-body { flex:1; overflow-y:auto; min-height:340px;
  scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
/* When an inline form mounts inside the panel body, swap the body to a flex
   column with no scroll of its own \u2014 the form's own .bd then handles the
   scroll and its .hd / .ft (Submit / Cancel) stay pinned at top/bottom. */
.dtf-body:has(> .dtf-inline-form) { display:flex; flex-direction:column;
  overflow:hidden; }
.dtf-body::-webkit-scrollbar { width:6px; }
.dtf-body::-webkit-scrollbar-thumb { background:var(--line); border-radius:3px; }
.dtf-body::-webkit-scrollbar-thumb:hover { background:var(--fg-4); }
.json-tree, .dtf-modal .bd { scrollbar-width:thin; scrollbar-color:var(--line) transparent; }

.dtf-group { display:flex; align-items:center; gap:8px; padding:8px 12px 5px;
  font-family:var(--mono); font-size:9.5px; color:var(--fg-3);
  letter-spacing:.12em; text-transform:uppercase; }
.dtf-group .c { color:var(--fg-4); }
.dtf-group .pulse { display:flex; align-items:center; gap:5px; color:var(--accent);
  margin-left:auto; }
.dtf-group .pulse .d { width:5px; height:5px; border-radius:50%;
  background:var(--accent); box-shadow:0 0 6px var(--accent); animation:dtf-pulse 1.6s infinite; }
@keyframes dtf-pulse { 50% { opacity:.4; } }

.dtf-row { display:grid; grid-template-columns:18px minmax(0,1fr) auto 36px;
  align-items:center; gap:10px; padding:8px 12px;
  border-bottom:1px solid var(--line-2); cursor:pointer; position:relative; }
.dtf-row:hover { background:var(--bg-2); }
.dtf-row.expanded { background:var(--bg-2); }
.dtf-row.muted .meta .k { color:var(--fg-3); }
.dtf-row .ic { display:grid; place-items:center; color:var(--accent); }
.dtf-row .ic svg { width:11px; height:11px; }
.dtf-row .meta { min-width:0; }
.dtf-row .meta .k { font-family:var(--mono); font-size:11px; color:var(--fg);
  display:flex; align-items:center; gap:7px; min-width:0; }
.dtf-row .meta .k .name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-row .meta .v { font-family:var(--mono); font-size:9.5px;
  color:var(--fg-3); margin-top:1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-row .override-tag { font-family:var(--mono); font-size:9px;
  background:var(--warn-bg-soft); color:var(--warn);
  padding:1px 5px; border-radius:3px; letter-spacing:.05em; }
.dtf-row .live-dot { width:5px; height:5px; border-radius:50%;
  background:var(--accent); box-shadow:0 0 5px var(--accent);
  animation:dtf-pulse 1.4s infinite; flex-shrink:0; }
.dtf-row .val { font-family:var(--mono); font-size:11px;
  padding:2px 7px; border-radius:3px; background:var(--bg-3); color:var(--fg-2);
  letter-spacing:.02em; max-width:160px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-row .val.on { color:var(--accent); background:color-mix(in oklab, var(--accent) 12%, var(--bg-3)); }
.dtf-row .val.off { color:var(--fg-3); }
.dtf-row .val.over { color:var(--warn); background:var(--warn-bg-soft); }
.dtf-row .val.kill-live { color:var(--pri); background:transparent;
  border:1px solid color-mix(in oklab, var(--pri) 50%, var(--line));
  padding:1px 7px; text-transform:uppercase; font-size:10px; font-weight:600; letter-spacing:.06em; }
.dtf-row .val.killed { color:#fff; background:var(--danger);
  border:1px solid var(--danger); padding:1px 7px;
  text-transform:uppercase; font-size:10px; font-weight:700; letter-spacing:.08em;
  box-shadow:0 0 0 1px color-mix(in oklab, var(--danger) 25%, transparent); }
.dtf-row .sel { font-family:var(--mono); font-size:10.5px;
  background:var(--bg-3); color:var(--fg); border:1px solid var(--line);
  border-radius:3px; padding:1px 4px; cursor:pointer; outline:none; }
.dtf-row .sel.over { color:var(--warn); border-color:var(--warn-border); }

.dtf-toggle { width:32px; height:18px; border-radius:9px; background:var(--bg-3);
  border:1px solid var(--line); position:relative; cursor:pointer;
  transition:all .15s; justify-self:end; flex-shrink:0; }
.dtf-toggle::after { content:''; position:absolute; left:2px; top:2px;
  width:12px; height:12px; border-radius:50%; background:var(--fg-3);
  transition:all .15s; }
.dtf-toggle.on { background:color-mix(in oklab, var(--accent) 22%, var(--bg-3));
  border-color:color-mix(in oklab, var(--accent) 30%, var(--line)); }
.dtf-toggle.on::after { left:16px; background:var(--accent); box-shadow:0 0 5px var(--accent); }
.dtf-toggle.over { background:var(--warn-bg-strong); border-color:var(--warn-border); }
.dtf-toggle.over::after { left:16px; background:var(--warn); box-shadow:0 0 5px var(--warn); }

.dtf-detail { display:grid; grid-template-rows:0fr; transition:grid-template-rows .25s ease;
  background:var(--bg-2); border-bottom:1px solid var(--line-2); }
.dtf-detail.open { grid-template-rows:1fr; }
.dtf-detail .inner { overflow:hidden; }
@supports not (grid-template-rows: 1fr) {
  .dtf-detail { display:block; max-height:0; overflow:hidden; transition:max-height .25s ease; }
  .dtf-detail.open { max-height:600px; }
}
.dtf-detail .pad { padding:8px 12px 12px 38px; }
.dtf-detail .crumbs { font-family:var(--mono); font-size:10.5px; color:var(--fg-2); line-height:1.7; }
.dtf-detail .crumbs .pass { color:var(--accent); }
.dtf-detail .crumbs .deny { color:var(--danger); }
.dtf-detail .crumbs .skip { color:var(--warn); }
.dtf-detail .crumbs .meta { color:var(--fg-3); }
.dtf-detail .indent { padding-left:14px; color:var(--fg-3); position:relative; }
.dtf-detail .indent::before { content:'\u251C'; position:absolute; left:2px; color:var(--fg-4); }
.dtf-detail .indent:last-child::before { content:'\u2514'; }

.dtf-detail .var-row { display:flex; align-items:center; gap:8px; padding:4px 0;
  font-family:var(--mono); font-size:10.5px; color:var(--fg-3);
  border-top:1px dashed var(--line-2); }
.dtf-detail .var-row.assigned { color:var(--accent); }
.dtf-detail .var-row .sw { width:8px; height:8px; border-radius:2px; }
.dtf-detail .var-row .pct { color:var(--fg-3); margin-left:auto; }

.dtf-detail .mini { display:grid; grid-template-columns:auto 1fr; gap:4px 12px;
  margin-top:8px; padding-top:8px; border-top:1px dashed var(--line-2);
  font-family:var(--mono); font-size:10px; }
.dtf-detail .mini .lbl { color:var(--fg-3); letter-spacing:.04em; text-transform:uppercase; font-size:10px; }
.dtf-detail .mini .v { color:var(--fg-2); }

.dtf-detail .actions { display:flex; gap:5px; margin-top:10px; flex-wrap:wrap; }
.dtf-detail .actions button, .dtf-detail .actions a { background:var(--bg-3); border:1px solid var(--line);
  color:var(--fg-2); font-family:var(--mono); font-size:10px;
  padding:3px 7px; border-radius:3px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
.dtf-detail .actions button:hover, .dtf-detail .actions a:hover { background:var(--bg-1); color:var(--fg); border-color:var(--fg-4); }
.dtf-detail .actions button.primary { background:var(--warn-bg-soft);
  color:var(--warn); border-color:var(--warn-border); }

/* user tab */
.dtf-user { display:flex; flex-direction:column; flex:1; min-height:0; }
.dtf-user .who { display:flex; align-items:center; gap:10px; padding:10px 12px;
  border-bottom:1px solid var(--line); }
.dtf-user .who .av { width:30px; height:30px; border-radius:50%;
  background:linear-gradient(135deg, color-mix(in oklab, var(--accent) 50%, var(--bg-3)), var(--bg-3));
  color:var(--bg-0); display:grid; place-items:center; font-weight:600; font-size:13px; }
.dtf-user .who .info { flex:1; min-width:0; }
.dtf-user .who .e { font-size:12px; font-weight:500;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-user .who .id { font-family:var(--mono); font-size:9.5px; color:var(--fg-3); margin-top:1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.dtf-prop { display:grid; grid-template-columns:120px 1fr 6px;
  align-items:center; gap:10px; padding:6px 12px;
  font-family:var(--mono); font-size:11px; border-bottom:1px solid var(--line-2); }
.dtf-prop .k { color:var(--fg-3); font-size:10.5px; }
.dtf-prop .v { display:flex; align-items:center; }
.dtf-prop .v input { background:transparent; border:0; outline:none;
  color:var(--fg); font-family:var(--mono); font-size:11px; width:100%;
  padding:1px 4px; border-radius:2px; }
.dtf-prop .v input:focus { background:var(--bg-3); }
.dtf-prop .v.muted { color:var(--fg-3); }
.dtf-prop .changed { width:5px; height:5px; border-radius:50%; background:var(--warn);
  box-shadow:0 0 4px var(--warn); }

.dtf-evalbar { display:flex; gap:6px; padding:8px 10px;
  border-top:1px solid var(--line); background:var(--bg-1); }
.dtf-evalbar .b { flex:1; background:color-mix(in oklab, var(--accent) 14%, var(--bg-3));
  color:var(--accent); border:1px solid color-mix(in oklab, var(--accent) 32%, var(--line));
  font-family:var(--mono); font-size:11px; padding:7px 9px; min-height:28px;
  border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
.dtf-evalbar .b:hover { background:color-mix(in oklab, var(--accent) 24%, var(--bg-3)); }
.dtf-evalbar .b.g { flex:0; background:transparent; color:var(--fg-3);
  border-color:var(--line); padding:7px 12px; }
.dtf-evalbar .b.g:hover { color:var(--fg); }
.dtf-evalbar .b svg { width:11px; height:11px; }

/* events tab */
.dtf-event { display:grid; grid-template-columns:62px 14px 1fr auto;
  align-items:center; gap:8px; padding:6px 12px;
  font-family:var(--mono); font-size:11px;
  border-bottom:1px solid var(--line-2); }
.dtf-event .ts { color:var(--fg-3); font-size:10.5px; }
.dtf-event .lvl { color:var(--accent); }
.dtf-event .lvl.warn { color:var(--warn); }
.dtf-event .lvl.err { color:var(--danger); }
.dtf-event .msg { color:var(--fg-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-event .msg .k { color:var(--fg); }
.dtf-event .msg .s { color:var(--accent); }
.dtf-event .ms { color:var(--fg-3); font-size:10.5px; }

/* empty states */
.dtf-empty { padding:32px 20px; text-align:center; color:var(--fg-2);
  display:flex; flex-direction:column; align-items:center;
  min-height:300px; justify-content:center; }
.dtf-empty .vis { width:96px; height:96px; position:relative; margin-bottom:18px;
  display:grid; place-items:center; }
.dtf-empty .vis .ring { position:absolute; inset:18px; border:1px solid var(--line);
  border-radius:50%; }
.dtf-empty .vis .ring.r2 { inset:0; border-color:var(--line-2); border-style:dashed; animation:dtf-rot 30s linear infinite; }
.dtf-empty .vis .core { width:42px; height:42px; border-radius:50%;
  background:radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--accent) 26%, var(--bg-2)), var(--bg-1));
  border:1px solid color-mix(in oklab, var(--accent) 22%, var(--line));
  display:grid; place-items:center; color:var(--accent);
  font-family:var(--mono); font-size:14px; }
@keyframes dtf-rot { to { transform:rotate(360deg); } }
.dtf-empty h3 { margin:0 0 8px; font-size:18px; font-weight:500; letter-spacing:-0.01em;
  color:var(--fg); line-height:1.2; }
.dtf-empty h3 em { font-family:var(--serif); font-style:italic; color:var(--accent); font-weight:400; }
.dtf-empty p { margin:0 0 16px; font-size:11.5px; color:var(--fg-3); max-width:280px; line-height:1.5; }
.dtf-empty .actions { display:flex; flex-direction:column; gap:5px; width:100%; max-width:240px; }
.dtf-empty .actions .a { display:flex; align-items:center; gap:8px;
  padding:7px 9px; background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; cursor:pointer; color:var(--fg-2); text-decoration:none; }
.dtf-empty .actions .a:hover { color:var(--fg); border-color:var(--fg-4); background:var(--bg-3); }
.dtf-empty .actions .a .ic { width:18px; height:18px; border-radius:3px;
  background:var(--bg-3); display:grid; place-items:center;
  color:var(--accent); font-family:var(--mono); font-size:11px; }
.dtf-empty .actions .a .k { font-size:11px; flex:1; text-align:left; }
.dtf-empty .actions .a .kbd { font-family:var(--mono); font-size:10.5px;
  color:var(--fg-3); border:1px solid var(--line); padding:1px 5px; border-radius:3px; }

.dtf-empty.search .glyph { font-family:var(--mono); font-size:38px;
  color:var(--fg-3); display:flex; align-items:center; gap:4px; margin-bottom:12px; }
.dtf-empty.search .glyph .core { width:14px; height:14px; border-radius:50%;
  background:radial-gradient(circle, var(--warn), transparent 70%); animation:dtf-pulse 1.6s infinite; }

/* loading */
.dtf-load { padding:8px 0 0; position:relative; min-height:300px; }
.dtf-load .topstrip { position:absolute; top:0; left:0; right:0; height:1.5px;
  background:linear-gradient(90deg, transparent, var(--accent), transparent);
  background-size:200% 100%; animation:dtf-strip 1.4s linear infinite; }
@keyframes dtf-strip { 0% { background-position:100% 0; } 100% { background-position:-100% 0; } }
.skel-row { display:grid; grid-template-columns:18px minmax(0,1fr) auto 36px;
  align-items:center; gap:10px; padding:9px 12px;
  border-bottom:1px solid var(--line-2); }
.skel-row .ic { width:11px; height:11px; border-radius:2px; background:var(--bg-3); }
.skel-row .body { display:flex; flex-direction:column; gap:5px; }
.skel-row .togsk { width:32px; height:18px; border-radius:9px; background:var(--bg-3);
  border:1px solid var(--line); justify-self:end; }
.skel { background:linear-gradient(90deg, var(--bg-3), var(--bg-2), var(--bg-3));
  background-size:200% 100%; animation:dtf-shim 1.5s ease-in-out infinite; border-radius:2px; }
@keyframes dtf-shim { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
.skel-row.live .ic { background:color-mix(in oklab, var(--accent) 30%, var(--bg-3)); }
@keyframes dtf-spin { to { transform:rotate(360deg); } }

/* footer */
.dtf-foot { display:flex; flex-direction:column; gap:6px; padding:8px 10px;
  border-top:1px solid var(--line); background:var(--bg-1);
  font-family:var(--mono); font-size:10.5px; color:var(--fg-3); }
.dtf-foot .stat-line { display:flex; align-items:center; gap:6px; }
.dtf-foot .ok { width:5px; height:5px; border-radius:50%; background:var(--accent);
  box-shadow:0 0 5px var(--accent); }
.dtf-foot .stat { color:var(--fg-2); }
.dtf-foot .stat b { color:var(--fg); font-weight:500; }
.dtf-foot .sk { margin-left:auto; color:var(--fg-3); }
.dtf-foot .actions { display:flex; gap:4px; flex-wrap:wrap; }
.dtf-foot .ibtn { background:var(--bg-3); border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10px; padding:3px 8px; border-radius:3px;
  cursor:pointer; line-height:1.4; }
.dtf-foot .ibtn:hover { color:var(--fg); border-color:var(--fg-4); background:var(--bg-2); }
.dtf-foot .ibtn.danger { color:var(--danger);
  border-color:color-mix(in oklab, var(--danger) 28%, var(--line));
  background:color-mix(in oklab, var(--danger) 8%, var(--bg-3)); }
.dtf-foot .ibtn.danger:hover { color:var(--fg);
  background:color-mix(in oklab, var(--danger) 18%, var(--bg-3)); }
.dtf-foot .ibtn.pri { color:var(--accent);
  border-color:color-mix(in oklab, var(--accent) 30%, var(--line));
  background:color-mix(in oklab, var(--accent) 12%, var(--bg-3)); }
.dtf-foot .ibtn.pri:hover { background:color-mix(in oklab, var(--accent) 22%, var(--bg-3)); }
.dtf-foot .grow { flex:1; }

/* Labels tab */
.dtf-group .cov-mini { font-family:var(--mono); font-size:10px; color:var(--fg-3);
  background:var(--bg-3); padding:1px 6px; border-radius:3px;
  letter-spacing:.02em; cursor:help; }
.dtf-lbl-row { display:grid; grid-template-columns:auto 1fr 8px;
  align-items:center; gap:10px; padding:7px 12px;
  border-bottom:1px solid var(--line-2); cursor:pointer; }
.dtf-lbl-row:hover, .dtf-lbl-row.expanded { background:var(--bg-2); }
.dtf-lbl-row .meta { min-width:0; }
.dtf-lbl-row .meta .src { font-size:11.5px; color:var(--fg);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;
  display:flex; align-items:center; gap:5px; }
.dtf-lbl-row.missing .meta .src { color:var(--warn); font-style:italic; }
.dtf-lbl-row .meta .sub { display:flex; align-items:center; gap:5px;
  font-family:var(--mono); font-size:9.5px; color:var(--fg-4); margin-top:1px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dtf-lbl-row .meta .sub .k { color:var(--fg-3); }
.dtf-lbl-row .meta .sub .dot { color:var(--fg-4); }
.dtf-lbl-row .meta .sub .var { color:var(--info); }
.lbl-pill { font-family:var(--mono); font-size:11px; line-height:1;
  width:18px; height:18px; display:inline-grid; place-items:center;
  border-radius:3px; flex-shrink:0; cursor:help; }
.lbl-pill.ok { background:color-mix(in oklab, var(--accent) 14%, var(--bg-3)); color:var(--accent); }
.lbl-pill.missing { background:color-mix(in oklab, var(--warn) 18%, var(--bg-3)); color:var(--warn); }
.lbl-pill.review { background:color-mix(in oklab, var(--danger) 18%, var(--bg-3));
  color:var(--danger); font-weight:700; }
.lbl-pill.partial { background:color-mix(in oklab, var(--warn) 14%, var(--bg-3)); color:var(--warn); }
.lbl-pill.edited { background:color-mix(in oklab, var(--info) 14%, var(--bg-3)); color:var(--info); }
.lbl-pad { padding-left:14px !important; }
.dtf-tree-node { display:flex; align-items:center; gap:6px; padding:5px 12px;
  font-family:var(--mono); font-size:11px; color:var(--fg-2);
  background:var(--bg-1); cursor:pointer;
  border-bottom:1px solid var(--line-2); }
.dtf-tree-node:hover { background:var(--bg-2); color:var(--fg); }
.dtf-tree-node .caret { color:var(--fg-3); width:10px;
  display:inline-block; text-align:center; flex-shrink:0; }
.dtf-tree-node .seg { color:var(--fg); font-weight:500; }
.dtf-tree-node .dotpath { color:var(--fg-3); font-size:10px; margin-left:4px; }
.dtf-tree-node .counts { margin-left:auto; display:flex; gap:6px; align-items:center; }
.dtf-tree-node .counts .m { color:var(--warn); font-size:10.5px;
  background:color-mix(in oklab, var(--warn) 14%, var(--bg-3));
  padding:1px 5px; border-radius:3px; }
.dtf-tree-node .counts .t { color:var(--fg-2); background:var(--bg-3);
  padding:1px 5px; border-radius:3px; font-size:10.5px; }
.lbl-locales { display:grid; grid-template-columns:auto 1fr auto; gap:4px 10px;
  margin-bottom:10px; padding:6px 0; border-top:1px dashed var(--line-2);
  border-bottom:1px dashed var(--line-2); font-family:var(--mono); font-size:10.5px; }
.lbl-locale { display:contents; cursor:pointer; }
.lbl-locale .fl { color:var(--fg-3); font-weight:600; padding:2px 5px;
  background:var(--bg-3); border-radius:2px; font-size:10px;
  align-self:center; justify-self:start; transition:background .12s, color .12s; }
.lbl-locale .nm { color:var(--fg-3); align-self:center; transition:color .12s; }
.lbl-locale .tv { color:var(--fg-2); white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; max-width:170px; align-self:center; justify-self:end;
  transition:color .12s; }
.lbl-locale.miss .tv { color:var(--warn); }
.lbl-locale.miss .fl { color:var(--warn); background:color-mix(in oklab, var(--warn) 14%, var(--bg-3)); }
.lbl-locale.sel .fl { color:var(--accent); background:color-mix(in oklab, var(--accent) 18%, var(--bg-3)); }
.lbl-locale.sel .nm, .lbl-locale.sel .tv { color:var(--fg); }
.lbl-edit { background:var(--bg-1); border:1px solid var(--line); border-radius:4px;
  margin-bottom:10px; }
.lbl-edit .hd { display:flex; align-items:center; padding:6px 8px;
  border-bottom:1px solid var(--line-2); font-family:var(--mono); font-size:10px;
  color:var(--fg-2); }
.lbl-edit .hd button { margin-left:auto; background:transparent; border:0;
  color:var(--info); font-family:var(--mono); font-size:10px; cursor:pointer; }
.lbl-edit textarea { width:100%; box-sizing:border-box; min-height:54px; resize:vertical;
  background:transparent; border:0; outline:none; padding:8px;
  color:var(--fg); font-family:var(--mono); font-size:11.5px; line-height:1.5; }
.lbl-vars { display:flex; align-items:center; gap:5px; padding:5px 8px;
  border-top:1px dashed var(--line-2); font-family:var(--mono); font-size:9.5px;
  color:var(--fg-4); letter-spacing:.05em; text-transform:uppercase; }
.lbl-vars .var { color:var(--info); background:color-mix(in oklab, var(--info) 12%, var(--bg-3));
  padding:1px 4px; border-radius:2px; text-transform:none; letter-spacing:0; font-size:10px; }

/* copy button */
.dtf-copy { background:transparent; border:0; padding:2px 4px; border-radius:3px;
  color:var(--fg-4); cursor:pointer; line-height:0; display:inline-grid; place-items:center;
  transition:color .12s, background .12s, opacity .12s; opacity:.55; }
.dtf-copy svg { width:11px; height:11px; }
.dtf-copy:hover { color:var(--fg); background:var(--bg-3); opacity:1; }
.dtf-copy.done { color:var(--accent); opacity:1; }
.dtf-row .dtf-copy, .dtf-lbl-row .dtf-copy { opacity:0; }
.dtf-row:hover .dtf-copy, .dtf-row.expanded .dtf-copy,
.dtf-lbl-row:hover .dtf-copy, .dtf-lbl-row.expanded .dtf-copy { opacity:.7; }
.dtf-row .dtf-copy:hover, .dtf-lbl-row .dtf-copy:hover { opacity:1; }
.dtf-row .dtf-copy.done, .dtf-lbl-row .dtf-copy.done { opacity:1; }

/* modal \u2014 sized to the panel */
.dtf-modal-bg { position:absolute; inset:0; z-index:50;
  background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  display:grid; place-items:stretch; padding:10px;
  animation:dtf-modal-bg-in .14s ease-out; }
@keyframes dtf-modal-bg-in { from { opacity:0; } to { opacity:1; } }
.dtf-modal { width:100%; max-width:100%;
  max-height:100%; align-self:center; justify-self:stretch;
  background:var(--bg-1); border:1px solid var(--line); border-radius:8px;
  overflow:hidden; display:flex; flex-direction:column;
  box-shadow:0 24px 60px -16px rgba(0,0,0,0.7);
  animation:dtf-modal-in .16s cubic-bezier(.2,.8,.3,1); }
@keyframes dtf-modal-in {
  from { opacity:0; transform:scale(.96) translateY(6px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
.dtf-modal .hd { display:flex; align-items:center; gap:8px;
  padding:10px 12px; border-bottom:1px solid var(--line);
  font-family:var(--mono); font-size:11px; color:var(--fg-2); }
.dtf-modal .hd .k { color:var(--fg); flex:1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.dtf-modal .hd .x { background:transparent; border:0; color:var(--fg-3);
  cursor:pointer; padding:4px; line-height:0; border-radius:3px;
  width:26px; height:26px; display:grid; place-items:center; }
.dtf-modal .hd .x:hover { color:var(--fg); background:var(--bg-3); }
.dtf-modal .hd .back { display:inline-flex; align-items:center; gap:4px;
  background:var(--bg-3); border:1px solid var(--line);
  color:var(--fg-2); font-family:var(--mono); font-size:10px;
  padding:4px 8px 4px 6px; border-radius:3px; cursor:pointer; }
.dtf-modal .hd .back:hover { color:var(--fg); border-color:var(--fg-3); }
.dtf-modal .hd svg { width:11px; height:11px; }
.dtf-modal .bd { padding:12px; display:flex; flex-direction:column; gap:10px;
  flex:1; overflow-y:auto; min-height:0; }
.dtf-modal .row { display:grid; grid-template-columns:80px 1fr; gap:8px; align-items:start;
  font-family:var(--mono); font-size:10.5px; color:var(--fg-3); }
.dtf-modal .row .lbl { padding-top:6px; letter-spacing:.04em; text-transform:uppercase; font-size:9.5px; }
.dtf-modal textarea { width:100%; min-height:80px; box-sizing:border-box;
  padding:6px 8px; background:var(--bg-2); border:1px solid var(--line);
  border-radius:3px; outline:none; resize:vertical;
  color:var(--fg); font-family:var(--mono); font-size:11.5px; line-height:1.45; }
.dtf-modal textarea:focus { border-color:color-mix(in oklab, var(--pri) 45%, var(--line)); }
.dtf-modal .ft { display:flex; gap:6px; padding:10px 12px; border-top:1px solid var(--line);
  background:var(--bg-2); }
.dtf-modal .ft .sp { flex:1; }
.dtf-modal .ft button { background:var(--bg-3); border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10.5px; padding:5px 10px; border-radius:3px; cursor:pointer; }
.dtf-modal .ft button:hover { color:var(--fg); border-color:var(--fg-4); }
.dtf-modal .ft button.primary { background:var(--warn-bg-strong);
  color:var(--warn); border-color:var(--warn-border); }
.dtf-modal .ft button.primary:hover { background:color-mix(in oklab, var(--warn) 30%, var(--bg-3)); }
.dtf-modal .ft button.ghost { background:transparent; }
.dtf-modal .err { color:var(--danger); font-family:var(--mono); font-size:10px;
  padding:4px 8px; border:1px solid color-mix(in oklab, var(--danger) 30%, var(--line));
  background:color-mix(in oklab, var(--danger) 10%, var(--bg-2)); border-radius:3px; }
.dtf-discard { display:flex; align-items:center; gap:8px;
  padding:8px 12px; border-bottom:1px solid var(--warn-border);
  background:var(--warn-bg-overbar);
  color:var(--fg); font-family:var(--mono); font-size:11px; }
.dtf-discard svg { color:var(--warn); flex-shrink:0; width:11px; height:11px; }

/* Inline form (bug / feature) \u2014 renders inside the panel body, not as a
   modal. Same visual rhythm as .dtf-modal but flows in the panel layout. */
.dtf-inline-form { display:flex; flex-direction:column; flex:1; min-height:0; }
.dtf-inline-form .hd { display:flex; align-items:center; gap:8px;
  padding:10px 12px; border-bottom:1px solid var(--line);
  font-family:var(--mono); font-size:11px; color:var(--fg-2); }
.dtf-inline-form .hd .k { color:var(--fg); flex:1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.dtf-inline-form .hd .back { display:inline-flex; align-items:center; gap:4px;
  background:var(--bg-3); border:1px solid var(--line);
  color:var(--fg-2); font-family:var(--mono); font-size:10px;
  padding:4px 8px 4px 6px; border-radius:3px; cursor:pointer; }
.dtf-inline-form .hd .back:hover { color:var(--fg); border-color:var(--fg-3); }
.dtf-inline-form .hd svg { width:11px; height:11px; }
.dtf-inline-form .bd { padding:12px; display:flex; flex-direction:column; gap:10px;
  flex:1; overflow-y:auto; min-height:0; }
.dtf-inline-form .ft { display:flex; gap:6px; padding:10px 12px; border-top:1px solid var(--line);
  background:var(--bg-2); }
.dtf-inline-form .ft .sp { flex:1; }
.dtf-inline-form .ft button { background:var(--bg-3); border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10.5px; padding:5px 10px; border-radius:3px; cursor:pointer; }
.dtf-inline-form .ft button:hover { color:var(--fg); border-color:var(--fg-4); }
.dtf-inline-form .ft button.primary { background:var(--warn-bg-strong);
  color:var(--warn); border-color:var(--warn-border); }
.dtf-inline-form .ft button.primary:hover { background:color-mix(in oklab, var(--warn) 30%, var(--bg-3)); }

/* JSON tree editor */
.json-tree { font-family:var(--mono); font-size:11px; max-height:340px; overflow:auto;
  padding:2px; background:var(--bg-2); border:1px solid var(--line); border-radius:4px; }
.json-row { display:flex; align-items:center; gap:8px; padding:3px 6px;
  border-radius:3px; min-height:24px; }
.json-row:hover { background:var(--bg-3); }
.json-row.branch { color:var(--fg-2); cursor:pointer; }
.json-row .caret { color:var(--fg-4); width:10px; display:inline-block; text-align:center; flex-shrink:0; }
.json-row .key { color:var(--fg); flex-shrink:0; }
.json-row .key.branch-key { color:var(--info); }
.json-row .type { font-size:9px; padding:1px 4px; border-radius:2px;
  letter-spacing:.04em; text-transform:uppercase; flex-shrink:0; }
.json-row .type.t-number  { color:var(--info);   background:color-mix(in oklab, var(--info)   16%, var(--bg-3)); }
.json-row .type.t-string  { color:var(--accent); background:color-mix(in oklab, var(--accent) 14%, var(--bg-3)); }
.json-row .type.t-boolean { color:var(--warn);   background:color-mix(in oklab, var(--warn)   16%, var(--bg-3)); }
.json-row .type.t-null    { color:var(--fg-3);   background:var(--bg-3); }
.json-row .type.t-object,
.json-row .type.t-array   { color:var(--fg-2);   background:var(--bg-3); }
.type-tag { font-family:var(--mono); font-size:10px; font-weight:600;
  padding:2px 7px; border-radius:3px;
  letter-spacing:.05em; text-transform:uppercase; flex-shrink:0;
  margin-left:6px; }
.type-tag.t-number  { color:var(--info);   background:color-mix(in oklab, var(--info)   16%, var(--bg-3)); }
.type-tag.t-string  { color:var(--accent); background:color-mix(in oklab, var(--accent) 14%, var(--bg-3)); }
.type-tag.t-boolean { color:var(--warn);   background:color-mix(in oklab, var(--warn)   16%, var(--bg-3)); }
.type-tag.t-null    { color:var(--fg-3);   background:var(--bg-3); }
.type-tag.t-object,
.type-tag.t-array   { color:var(--fg-2);   background:var(--bg-3); }
.json-row .summary { color:var(--fg-3); font-size:10.5px; margin-left:auto; }
.json-row .ctl { margin-left:auto; display:flex; align-items:center; gap:6px; }
.json-row .ctl input[type=text],
.json-row .ctl input[type=number] {
  background:var(--bg-1); border:1px solid var(--line); color:var(--fg);
  font-family:var(--mono); font-size:11px; padding:2px 6px; border-radius:3px;
  outline:none; min-width:60px; width:140px; }
.json-row .ctl input:focus { border-color:color-mix(in oklab, var(--accent) 40%, var(--line)); }
.json-row .ctl.changed input { border-color:color-mix(in oklab, var(--warn) 50%, var(--line));
  background:color-mix(in oklab, var(--warn) 7%, var(--bg-1)); }
.json-row .ctl .bool { display:flex; gap:0; border:1px solid var(--line); border-radius:3px; overflow:hidden; }
.json-row .ctl .bool button { background:var(--bg-1); border:0; color:var(--fg-3);
  font-family:var(--mono); font-size:10.5px; padding:2px 8px; cursor:pointer; }
.json-row .ctl .bool button.on { color:var(--accent); background:color-mix(in oklab, var(--accent) 14%, var(--bg-1)); }
.json-row .ctl .bool button.on.f { color:var(--danger); background:color-mix(in oklab, var(--danger) 14%, var(--bg-1)); }
.json-row .reset { background:transparent; border:0; color:var(--fg-4); cursor:pointer;
  font-family:var(--mono); font-size:10px; padding:2px 4px; border-radius:2px;
  visibility:hidden; }
.json-row.dirty .reset { visibility:visible; color:var(--warn); }
.json-row .reset:hover { color:var(--fg); background:var(--bg-1); }
.json-children { margin-left:6px; border-left:1px dashed var(--line); padding-left:8px; }
.json-tree > .json-children { margin-left:0; padding-left:0; border-left:0; }

/* schema-driven config form (devtool override modal) */
.dtf-sf { display:flex; flex-direction:column; gap:8px;
  font-family:var(--mono); font-size:11px; }
.dtf-sf-empty { font-family:var(--mono); font-size:11px; color:var(--fg-3);
  padding:14px; border:1px dashed var(--line); border-radius:6px; text-align:center; }
.dtf-sf-field { display:grid; grid-template-columns:140px 1fr; gap:8px;
  align-items:center; }
.dtf-sf-field .dtf-sf-desc { grid-column:2; color:var(--fg-4); font-size:10px;
  margin-top:-2px; }
.dtf-sf-lbl { display:flex; align-items:center; gap:6px; color:var(--fg-2); }
.dtf-sf-lbl .k { color:var(--fg); }
.dtf-sf-lbl .req { color:var(--warn); }
.dtf-sf-lbl .t { color:var(--fg-4); font-size:9.5px; text-transform:uppercase;
  letter-spacing:.04em; margin-left:auto; }
.dtf-sf input[type="text"], .dtf-sf input[type="number"], .dtf-sf select {
  background:var(--bg-3); border:1px solid var(--line); color:var(--fg);
  font-family:var(--mono); font-size:11px;
  padding:4px 8px; border-radius:4px; outline:none; width:100%; box-sizing:border-box; }
.dtf-sf input[type="text"]:focus, .dtf-sf input[type="number"]:focus,
.dtf-sf select:focus {
  border-color:color-mix(in oklab, var(--pri) 45%, var(--line)); }
.dtf-sf-bool { display:inline-flex; gap:0; }
.dtf-sf-bool button { background:var(--bg-3); border:1px solid var(--line);
  color:var(--fg-3); font-family:var(--mono); font-size:11px;
  padding:3px 10px; cursor:pointer; }
.dtf-sf-bool button.t { border-radius:4px 0 0 4px; }
.dtf-sf-bool button.f { border-radius:0 4px 4px 0; border-left:0; }
.dtf-sf-bool button.t.on { background:color-mix(in oklab, var(--pass) 25%, var(--bg-3));
  color:var(--pass); border-color:color-mix(in oklab, var(--pass) 35%, var(--line)); }
.dtf-sf-bool button.f.on { background:color-mix(in oklab, var(--danger) 25%, var(--bg-3));
  color:var(--danger); border-color:color-mix(in oklab, var(--danger) 35%, var(--line)); }
.dtf-sf-error { color:var(--danger); font-family:var(--mono); font-size:10.5px;
  min-height:14px; }

/* feedback (bugs / feature requests) */
.se-fb-subtabs { display:flex; gap:0; padding:0 10px;
  border-bottom:1px solid var(--line); background:var(--bg-1); }
.se-fb-subtabs button { display:inline-flex; align-items:center; gap:6px;
  background:transparent; border:0; color:var(--fg-3);
  font-family:var(--mono); font-size:11px; padding:8px 10px;
  cursor:pointer; border-bottom:1.5px solid transparent;
  margin-bottom:-1px; }
.se-fb-subtabs button:hover { color:var(--fg); }
.se-fb-subtabs button.active { color:var(--fg); border-bottom-color:var(--accent); }
.se-fb-subtabs button .c { font-family:var(--mono); font-size:10.5px;
  color:var(--fg-2); background:var(--bg-3);
  padding:1px 6px; border-radius:3px; }
.se-fb-subtabs button.active .c { color:var(--accent);
  background:color-mix(in oklab, var(--accent) 10%, var(--bg-3)); }
.se-fb-subtabs button svg { width:11px; height:11px; }

.se-feedback-head { display:flex; align-items:center; gap:6px;
  padding:8px 10px; border-bottom:1px solid var(--line-2); }
.se-feedback-head .grow { flex:1; }
.se-feedback-list { display:flex; flex-direction:column; gap:1px; }
.se-feedback-row { display:flex; align-items:center; gap:8px;
  padding:8px 12px; border-bottom:1px solid var(--line-2);
  color:var(--fg-2); cursor:pointer; text-decoration:none; }
.se-feedback-row:hover { background:var(--bg-2); }
.se-feedback-row.expanded { background:var(--bg-2); }
.se-feedback-row .row-name { font-size:11.5px; color:var(--fg);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.se-feedback-row .row-sub { font-family:var(--mono); font-size:9.5px;
  color:var(--fg-4); margin-top:2px; }
.se-feedback-row .grow { flex:1; min-width:0; }
.se-feedback-row .chev { color:var(--fg-4); font-size:10px; width:10px;
  display:inline-block; text-align:center; flex-shrink:0;
  transition:transform .15s ease; }
.se-feedback-row.expanded .chev { transform:rotate(90deg); color:var(--fg-2); }
.se-feedback-detail { display:grid; grid-template-rows:0fr;
  transition:grid-template-rows .22s ease;
  background:var(--bg-2); border-bottom:1px solid var(--line-2); }
.se-feedback-detail.open { grid-template-rows:1fr; }
.se-feedback-detail .inner { overflow:hidden; }
@supports not (grid-template-rows: 1fr) {
  .se-feedback-detail { display:block; max-height:0; overflow:hidden;
    transition:max-height .22s ease; }
  .se-feedback-detail.open { max-height:600px; }
}
.se-feedback-detail .pad { padding:10px 14px 12px 30px;
  display:flex; flex-direction:column; gap:8px; }
.se-fb-block { font-size:11.5px; color:var(--fg-2); line-height:1.45;
  white-space:pre-wrap; }
.se-fb-section { display:flex; flex-direction:column; gap:3px; }
.se-fb-section .lbl { font-family:var(--mono); font-size:9.5px; color:var(--fg-4);
  letter-spacing:.06em; text-transform:uppercase; }
.se-fb-meta { display:grid; grid-template-columns:auto 1fr; gap:3px 12px;
  font-family:var(--mono); font-size:10px; color:var(--fg-2);
  padding-top:6px; border-top:1px dashed var(--line-2); }
.se-fb-meta .k { color:var(--fg-4); letter-spacing:.04em; text-transform:uppercase; font-size:9.5px; }
.se-attach-slot:empty { display:none; }
.se-attach-slot-loading { font-family:var(--mono); font-size:10px;
  color:var(--fg-3); padding:6px 0 2px; }
.se-attach-slot-loading.err { color:var(--danger); }
.se-attach-card.readonly .preview { cursor:pointer; }
.se-fb-actions { display:flex; gap:5px; }

.badge { font-family:var(--mono); font-size:9px; font-weight:600;
  letter-spacing:0.04em; padding:2px 7px; border-radius:999px;
  white-space:nowrap; flex-shrink:0; border:1px solid transparent;
  text-transform:uppercase; }
.badge-on  { background:color-mix(in oklab, var(--accent) 14%, transparent);
  color:var(--accent); border-color:color-mix(in oklab, var(--accent) 30%, transparent); }
.badge-off { background:color-mix(in oklab, var(--danger) 14%, transparent);
  color:var(--danger); border-color:color-mix(in oklab, var(--danger) 30%, transparent); }
.badge-run { background:color-mix(in oklab, var(--pri) 14%, transparent);
  color:var(--pri); border-color:color-mix(in oklab, var(--pri) 30%, transparent); }
.badge-warn { background:color-mix(in oklab, var(--warn) 14%, transparent);
  color:var(--warn); border-color:color-mix(in oklab, var(--warn) 30%, transparent); }
.badge-draft { background:var(--bg-2); color:var(--fg-3); border-color:var(--line-2); }

/* form (used by bug + feature modals) */
.dtf-modal.lg { width:100%; max-width:100%; }
.se-form { display:flex; flex-direction:column; gap:10px; padding:12px; }
.se-field { display:flex; flex-direction:column; gap:4px; }
.se-field-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.se-label { font-family:var(--mono); font-size:9.5px; color:var(--fg-3);
  letter-spacing:.04em; text-transform:uppercase; }
.se-req { color:var(--danger); margin-left:2px; }
.se-input { background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; padding:6px 8px; color:var(--fg);
  font-family:var(--sans); font-size:12px; line-height:1.4;
  outline:none; box-sizing:border-box; }
.se-input:focus { border-color:color-mix(in oklab, var(--accent) 45%, var(--line)); }
/* Field-level validation: applied to .se-field on submit when its input is
   missing/invalid. Cleared when the user types into the field. The label
   turns red too so the failing field is obvious even after the user has
   scrolled past the input. */
.se-field.invalid .se-input { border-color:var(--danger);
  background:color-mix(in oklab, var(--danger) 8%, var(--bg-2)); }
.se-field.invalid .se-label { color:var(--danger); }
.se-field.invalid .se-input:focus { border-color:var(--danger); }
.se-textarea { resize:vertical; min-height:54px; font-family:var(--sans); }
.se-actions { display:flex; gap:6px; flex-wrap:wrap; }
.se-actions .ibtn { display:inline-flex; align-items:center; gap:5px; }
.se-attach-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:8px; }
.se-attach-card { position:relative; background:var(--bg-2);
  border:1px solid var(--line); border-radius:5px; overflow:hidden;
  display:flex; flex-direction:column;
  animation:dtf-attach-in .18s cubic-bezier(.2,.8,.3,1); }
@keyframes dtf-attach-in {
  from { opacity:0; transform:scale(.94) translateY(2px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
.se-attach-card .preview { position:relative; height:96px; overflow:hidden;
  background:var(--bg-3); display:grid; place-items:center; color:var(--fg-3); }
.se-attach-card .preview svg { width:22px; height:22px; }
.se-attach-card .preview.screenshot {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--pri) 14%, var(--bg-3)) 0 12%, transparent 12%),
    linear-gradient(180deg, transparent 30%, color-mix(in oklab, var(--accent) 10%, transparent) 30% 32%, transparent 32%),
    linear-gradient(180deg, transparent 70%, color-mix(in oklab, var(--warn) 14%, transparent) 70% 76%, transparent 76%),
    linear-gradient(135deg, var(--bg-2), var(--bg-3));
}
.se-attach-card .preview.recording {
  background:
    radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--bg-1) 60%, transparent), transparent 70%),
    repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.025) 28px 29px),
    linear-gradient(135deg, var(--bg-3), var(--bg-1));
}
.se-attach-card .preview.recording .play { width:32px; height:32px; border-radius:50%;
  background:rgba(255,255,255,0.08); backdrop-filter:blur(2px);
  display:grid; place-items:center; color:var(--fg);
  box-shadow:0 0 0 1px rgba(255,255,255,0.12); }
.se-attach-card .preview.recording .dur { position:absolute; right:6px; bottom:6px;
  font-family:var(--mono); font-size:9.5px; color:var(--fg);
  background:rgba(0,0,0,0.6); padding:1px 5px; border-radius:2px;
  letter-spacing:.04em; }
.se-attach-card .preview.file .ext { font-family:var(--mono); font-size:11px;
  font-weight:600; color:var(--fg-2); padding:3px 8px;
  background:var(--bg-1); border:1px solid var(--line); border-radius:3px;
  margin-top:6px; letter-spacing:.06em; text-transform:uppercase; }
.se-attach-card .meta { display:flex; align-items:center; gap:6px;
  padding:6px 8px; border-top:1px solid var(--line-2);
  font-family:var(--mono); font-size:10px; }
.se-attach-card .meta .ic { color:var(--fg-3); display:grid; place-items:center; flex-shrink:0; }
.se-attach-card .meta .ic svg { width:11px; height:11px; }
.se-attach-card .meta .name { color:var(--fg); flex:1; min-width:0;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.se-attach-card .meta .size { color:var(--fg-3); flex-shrink:0; }
.se-attach-card .rm { position:absolute; top:5px; right:5px;
  width:22px; height:22px; border-radius:4px; border:0;
  background:rgba(0,0,0,0.7); color:var(--fg);
  display:grid; place-items:center; cursor:pointer;
  opacity:.7; transition:opacity .12s, background .12s; }
.se-attach-card:hover .rm { opacity:1; }
.se-attach-card .rm:hover { background:var(--danger); opacity:1; }
.se-attach-card .rm svg { width:11px; height:11px; }
.se-attach-card .progress { position:absolute; left:0; right:0; bottom:0;
  height:2px; background:rgba(255,255,255,0.06); overflow:hidden; }
.se-attach-card .progress .fill { height:100%; background:var(--pri);
  box-shadow:0 0 6px var(--pri); transition:width .15s linear; }
.se-attach-card .preview { cursor:zoom-in; }
.se-attach-card .preview.screenshot.has-image,
.se-attach-card .preview.recording.has-image {
  background-color:var(--bg-3);
  background-position:center; background-size:cover; background-repeat:no-repeat; }
.se-attach-card .preview.recording .play { z-index:1; }
.se-attach-card .preview.recording.has-image::after {
  content:""; position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%); }
.se-attach-card .preview .scrim {
  position:absolute; inset:0; opacity:0; transition:opacity .12s;
  background:rgba(0,0,0,0.45); display:grid; place-items:center;
  color:var(--fg); font-family:var(--mono); font-size:10px;
  letter-spacing:.06em; text-transform:uppercase; pointer-events:none; z-index:2; }
.se-attach-card .preview:hover .scrim { opacity:1; }
.se-status { font-family:var(--mono); font-size:10px; color:var(--fg-3);
  min-height:14px; }

/* Annotator (screenshot markup tool).
   The default .dtf-modal sizes to its intrinsic content because of
   align-self:center on the grid track \u2014 fine for short forms but lethal for
   a canvas with 1080p natural dimensions, which would push the modal past the
   viewport and break the flex chain. The .annotate variant locks the modal
   to fill the panel so the body has a real max-height for the canvas to
   contain itself against. */
/* Annotator scrim is fixed to the viewport (not the panel-relative absolute
   default) so JS can carve out room for the docked devtools panel. */
.dtf-modal-bg.annotate { position:fixed; padding:24px;
  display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,0.72); }
.dtf-modal.annot-modal { align-self:center; justify-self:center;
  width:auto; height:auto; max-width:100%; max-height:100%;
  border:2px solid color-mix(in oklab, var(--accent) 50%, var(--line));
  box-shadow:0 28px 70px -12px rgba(0,0,0,0.85),
    0 0 0 1px rgba(255,255,255,0.04) inset; }
.dtf-modal.annot-modal .ft button.primary {
  background:color-mix(in oklab, var(--accent) 24%, var(--bg-3));
  color:var(--accent);
  border-color:color-mix(in oklab, var(--accent) 55%, var(--line));
  font-weight:600; padding:6px 14px; }
.dtf-modal.annot-modal .ft button.primary:hover {
  background:color-mix(in oklab, var(--accent) 38%, var(--bg-3));
  color:var(--fg); }
.dtf-modal .bd.annot-bd { padding:0; gap:0; overflow:hidden; }
.se-annot { display:flex; flex-direction:column; flex:0 1 auto; min-height:0;
  background:var(--bg-1); }
.se-annot-toolbar { display:flex; align-items:center; gap:6px;
  padding:8px 10px; background:var(--bg-2);
  border-bottom:1px solid var(--line); flex-wrap:wrap; flex-shrink:0; }
.se-annot-btn { display:inline-flex; align-items:center; gap:5px;
  background:var(--bg-3); border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10.5px; padding:4px 9px;
  border-radius:4px; cursor:pointer; line-height:1.4;
  transition:color .12s, border-color .12s, background .12s; }
.se-annot-btn:hover { color:var(--fg); border-color:var(--fg-4); }
.se-annot-btn.on { color:var(--accent);
  background:color-mix(in oklab, var(--accent) 18%, var(--bg-3));
  border-color:color-mix(in oklab, var(--accent) 35%, var(--line)); }
.se-annot-sep { width:1px; align-self:stretch;
  background:var(--line); margin:2px 4px; }
.se-annot-swatch { width:20px; height:20px; padding:0;
  border:2px solid transparent; border-radius:50%; cursor:pointer;
  box-shadow:0 0 0 1px rgba(0,0,0,0.5);
  transition:transform .12s, border-color .12s; }
.se-annot-swatch:hover { transform:scale(1.08); }
.se-annot-swatch.on { border-color:var(--fg); transform:scale(1.12); }
.se-annot-stage { position:relative; flex:0 1 auto;
  display:flex; align-items:center; justify-content:center;
  padding:12px; box-sizing:border-box; overflow:hidden;
  background:
    linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%) 0 0/14px 14px,
    linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%) 0 0/14px 14px,
    var(--bg-0); }
/* Canvas display dims are set inline by the annotator after measuring the
   available area in the modal (see fitAnnotator in feedback.ts). */
.se-annot-canvas { display:block;
  border:1px solid var(--line); border-radius:4px;
  box-shadow:0 8px 24px -8px rgba(0,0,0,0.6); background:#fff; }
.se-annot-text-input { font-family:ui-sans-serif, system-ui, sans-serif; }

/* Lightbox modal \u2014 preview of an attached screenshot or recording.
   Capped at 50vw/50vh (per request \u2014 small enough to not dominate the page)
   with a strong border + elevation so it stays visible against arbitrary
   dark / busy customer backgrounds. */
.dtf-lightbox { position:fixed; inset:0; z-index:2147483647;
  background:rgba(0,0,0,0.78); backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  display:grid; place-items:center; padding:24px;
  animation:dtf-modal-bg-in .14s ease-out; }
.dtf-lightbox .frame { position:relative;
  max-width:min(50vw, 1100px); max-height:50vh;
  display:flex; flex-direction:column; gap:10px;
  padding:14px; box-sizing:border-box;
  background:var(--bg-1);
  border:2px solid color-mix(in oklab, var(--accent) 42%, var(--line));
  border-radius:10px;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.5),
    0 30px 80px -10px rgba(0,0,0,0.85),
    0 0 40px -8px color-mix(in oklab, var(--accent) 50%, transparent);
  animation:dtf-modal-in .18s cubic-bezier(.2,.8,.3,1); }
.dtf-lightbox img, .dtf-lightbox video { display:block;
  max-width:100%; max-height:calc(50vh - 80px);
  width:auto; height:auto; object-fit:contain;
  border-radius:6px; border:1px solid var(--line);
  background:#000; }
.dtf-lightbox .cap { font-family:var(--mono); font-size:10.5px;
  color:var(--fg-2); display:flex; gap:10px; align-items:center;
  padding-top:8px; border-top:1px dashed var(--line-2); }
.dtf-lightbox .x { position:absolute; top:-12px; right:-12px;
  width:30px; height:30px; border-radius:50%;
  border:2px solid color-mix(in oklab, var(--accent) 42%, var(--line));
  background:var(--bg-1); color:var(--fg);
  display:grid; place-items:center; cursor:pointer;
  box-shadow:0 6px 18px rgba(0,0,0,0.7); }
.dtf-lightbox .x:hover { background:var(--bg-2);
  border-color:var(--accent); color:var(--accent); }
.dtf-lightbox .x svg { width:14px; height:14px; }

/* Quick-actions hovercard on the feedback rail icon. Mounted at shadow-root
   level with position:fixed so it never gets clipped by .dtf-panel overflow.
   Top/left set in JS based on the button's bounding rect. */
.se-qa { position:fixed; z-index:2147483647;
  background:var(--bg-2); border:1px solid var(--line); border-radius:6px;
  padding:5px; display:flex; flex-direction:column; gap:2px;
  min-width:200px;
  box-shadow:0 14px 30px -10px rgba(0,0,0,0.7);
  opacity:0; pointer-events:none;
  transform:translateY(2px);
  transition:opacity .12s ease, transform .12s ease;
  font-family:var(--mono); font-size:11px; color:var(--fg-2); }
.se-qa.show { opacity:1; pointer-events:auto; transform:translateY(0); }
.se-qa .qa-hd { display:block; padding:5px 8px 4px;
  font-size:9.5px; color:var(--fg-4); letter-spacing:.06em;
  text-transform:uppercase; }
.se-qa button { display:flex; align-items:center; gap:8px;
  background:transparent; border:0; color:var(--fg-2);
  font-family:var(--mono); font-size:11px; text-align:left;
  padding:7px 8px; border-radius:4px; cursor:pointer; width:100%; }
.se-qa button:hover { background:var(--bg-3); color:var(--fg); }
.se-qa button svg { width:12px; height:12px; flex-shrink:0; color:var(--fg-3); }
.se-qa button:hover svg { color:var(--accent); }
.se-qa button .sub { color:var(--fg-4); font-size:9.5px;
  margin-left:auto; padding-left:10px; white-space:nowrap; }
.se-status.err { color:var(--danger); }

.ibtn { background:var(--bg-3); border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10.5px; padding:4px 9px; border-radius:3px;
  cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:5px; line-height:1.4; }
.ibtn:hover { color:var(--fg); border-color:var(--fg-4); background:var(--bg-2); }
.ibtn.pri { background:color-mix(in oklab, var(--pri) 16%, var(--bg-3));
  color:var(--pri); border-color:color-mix(in oklab, var(--pri) 35%, var(--line)); }
.ibtn.pri:hover { background:color-mix(in oklab, var(--pri) 26%, var(--bg-3)); }
.ibtn.danger { color:var(--danger); border-color:color-mix(in oklab, var(--danger) 28%, var(--line)); }
.ibtn.danger:hover { background:color-mix(in oklab, var(--danger) 18%, var(--bg-3)); color:var(--fg); }
.ibtn.recording { background:color-mix(in oklab, var(--danger) 18%, var(--bg-3));
  color:var(--danger); border-color:color-mix(in oklab, var(--danger) 35%, var(--line)); }
.ibtn svg { width:11px; height:11px; }

.se-empty { padding:24px 16px; text-align:center; color:var(--fg-3); font-size:11.5px; }

/* auth-locked modal \u2014 covers the whole panel pane when no session */
.auth-locked { position:absolute; inset:0; z-index:50;
  background:rgba(5,5,7,0.78); backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  padding:18px;
  animation:dtf-modal-bg-in .16s ease-out; }
.auth-locked-card { width:100%; max-width:340px;
  background:linear-gradient(180deg, var(--bg-1), var(--bg-0));
  border:1px solid var(--line); border-radius:8px;
  padding:22px 20px;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  box-shadow:0 24px 60px -16px rgba(0,0,0,0.7);
  animation:dtf-modal-in .18s cubic-bezier(.2,.8,.3,1); }
.auth-locked-card .ic-big {
  width:54px; height:54px; border-radius:50%;
  display:grid; place-items:center; color:var(--accent);
  background:radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--accent) 26%, var(--bg-2)), var(--bg-1));
  border:1px solid color-mix(in oklab, var(--accent) 28%, var(--line));
  box-shadow:0 0 24px -6px color-mix(in oklab, var(--accent) 30%, transparent); }
.auth-locked-card .ic-big svg { width:22px; height:22px; }
.auth-locked-card h2 { margin:0; font-size:18px; font-weight:500; letter-spacing:-0.01em;
  color:var(--fg); text-align:center; line-height:1.2; }
.auth-locked-card h2 em { font-family:var(--serif); font-style:italic; color:var(--accent); font-weight:400; }
.auth-locked-card p { margin:0; font-size:11.5px; color:var(--fg-3); text-align:center;
  line-height:1.5; max-width:280px; }
.auth-locked-card .features { width:100%;
  display:flex; flex-direction:column; gap:5px;
  margin:4px 0 6px;
  font-family:var(--mono); font-size:10.5px; color:var(--fg-2); }
.auth-locked-card .features .row { display:flex; align-items:center; gap:9px;
  padding:6px 9px; background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; }
.auth-locked-card .features .row .ic { width:16px; height:16px; display:grid; place-items:center;
  color:var(--accent); flex-shrink:0; }
.auth-locked-card .features .row .ic svg { width:11px; height:11px; }
.auth-locked-card .features .row .k { color:var(--fg); }
.auth-locked-card .features .row .d { color:var(--fg-3); margin-left:auto; font-size:10px; }
.auth-locked-card .cta {
  width:100%; padding:9px 12px; margin-top:4px;
  background:color-mix(in oklab, var(--accent) 18%, var(--bg-3));
  color:var(--accent);
  border:1px solid color-mix(in oklab, var(--accent) 35%, var(--line));
  border-radius:4px; cursor:pointer;
  font-family:var(--sans); font-size:13px; font-weight:500;
  display:flex; align-items:center; justify-content:center; gap:7px;
  transition:background .12s, color .12s; }
.auth-locked-card .cta:hover:not(:disabled) {
  background:color-mix(in oklab, var(--accent) 28%, var(--bg-3));
  color:var(--fg); }
.auth-locked-card .cta:disabled { opacity:.6; cursor:default; }
.auth-locked-card .cta .spin { width:11px; height:11px; border-radius:50%;
  border:1.5px solid color-mix(in oklab, var(--accent) 22%, transparent);
  border-top-color:var(--accent);
  animation:dtf-spin .9s linear infinite; }
.auth-locked-card .meta { font-family:var(--mono); font-size:9.5px; color:var(--fg-4);
  text-align:center; letter-spacing:.04em; }
.auth-locked-card .status { font-family:var(--mono); font-size:10px; color:var(--accent);
  min-height:14px; text-align:center; }
.auth-locked-card .err { font-family:var(--mono); font-size:10px; color:var(--danger);
  padding:5px 9px; border:1px solid color-mix(in oklab, var(--danger) 28%, var(--line));
  background:color-mix(in oklab, var(--danger) 8%, var(--bg-2));
  border-radius:3px; width:100%; box-sizing:border-box; text-align:center; }

/* lock icon in the rail (collapsed + expanded unauthed) */
.dtf-rail .t.lock-only,
.dtf-panel-rail .ri.lock-only { color:var(--accent); }
.dtf-rail .t.lock-only.active { color:var(--accent);
  box-shadow:inset 2px 0 0 var(--accent); }
`;
  var bt = "se_dt_session";
  function Qt() {
    try {
      let e = sessionStorage.getItem(bt);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function On(e) {
    try {
      sessionStorage.setItem(bt, JSON.stringify(e));
    } catch {}
  }
  function ht() {
    try {
      sessionStorage.removeItem(bt);
    } catch {}
  }
  function In() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  async function er(e, t) {
    let r = new URL(e.adminUrl).origin,
      n = window.location.origin,
      o = `shipeasy-devtools-auth-${Date.now()}`,
      i = new URL(`${e.adminUrl}/devtools-auth`);
    i.searchParams.set("origin", n);
    let a = In();
    a && i.searchParams.set("sdkKey", a);
    let s = window.open(i.toString(), o, "width=460,height=640,noopener=no");
    if (!s) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      s.focus();
    } catch {}
    return (
      t(),
      new Promise((d, c) => {
        let f = !1;
        function p(L, k) {
          f ||
            ((f = !0),
            window.removeEventListener("message", u),
            clearInterval(x),
            clearTimeout(g),
            L ? c(L) : d(k));
        }
        function u(L) {
          if (L.origin !== r) return;
          let k = L.data;
          if (!k || k.type !== "se:devtools-auth" || !k.token || !k.projectId) return;
          let S = { token: k.token, projectId: k.projectId };
          (On(S), p(null, S));
        }
        window.addEventListener("message", u);
        let m = Date.now(),
          x = setInterval(() => {
            Date.now() - m < 1500 ||
              (s.closed && !f && p(new Error("Sign-in window closed before approval.")));
          }, 500),
          g = setTimeout(() => {
            p(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var zn = /^(true|on|1|yes)$/i,
    qn = /^(false|off|0|no)$/i,
    yt = /^se(?:_|-|$)/;
  function Xe(e) {
    return zn.test(e) ? !0 : qn.test(e) ? !1 : null;
  }
  function xt(e) {
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
  function rr(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Ze() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function ke(e, t) {
    let r = Ze(),
      n = r.get(e);
    if (n !== null) return n;
    if (t) {
      let o = r.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function Qe(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [r, n] of e) n === null ? t.searchParams.delete(r) : t.searchParams.set(r, n);
    window.location.assign(t.toString());
  }
  function et() {
    if (typeof window > "u") return !1;
    let e = Ze();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function Pe() {
    return typeof window > "u" ? !1 : Ze().has("se_edit_labels");
  }
  function nr(e) {
    let t = ke(`se_ks_${e}`) ?? ke(`se_gate_${e}`) ?? ke(`se-gate-${e}`);
    return t === null ? null : Xe(t);
  }
  function tt(e, t, r = "session") {
    Qe([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function or(e) {
    let t = ke(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return xt(t);
  }
  function wt(e, t, r = "session") {
    Qe([
      [`se_config_${e}`, t == null ? null : rr(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function ar(e) {
    let t = ke(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function kt(e, t, r = "session") {
    Qe([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function rt() {
    return ke("se_i18n");
  }
  function ir() {
    return ke("se_i18n_draft");
  }
  function _e(e) {
    return ke(`se_i18n_label_${e}`);
  }
  function je(e, t, r = "session") {
    Qe([[`se_i18n_label_${e}`, t]]);
  }
  function sr() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) yt.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function $t(e, t) {
    let r = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let n of [...r.searchParams.keys()]) yt.test(n) && r.searchParams.delete(n);
    e.openDevtools && r.searchParams.set("se", "1");
    for (let [n, o] of Object.entries(e.gates ?? {}))
      r.searchParams.set(`se_ks_${n}`, o ? "true" : "false");
    for (let [n, o] of Object.entries(e.experiments ?? {})) r.searchParams.set(`se_exp_${n}`, o);
    for (let [n, o] of Object.entries(e.configs ?? {})) r.searchParams.set(`se_config_${n}`, rr(o));
    (e.i18nProfile && r.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && r.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [n, o] of Object.entries(e.i18nLabels ?? {}))
      r.searchParams.set(`se_i18n_label_${n}`, o);
    return r.toString();
  }
  function Et() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Ze();
    for (let [r, n] of t)
      if (r.startsWith("se_ks_")) {
        let o = Xe(n);
        o !== null && (e.gates[r.slice(6)] = o);
      } else if (r.startsWith("se_gate_")) {
        let o = Xe(n);
        o !== null && (e.gates[r.slice(8)] = o);
      } else if (r.startsWith("se-gate-")) {
        let o = Xe(n);
        o !== null && (e.gates[r.slice(8)] = o);
      } else
        r.startsWith("se_exp_") || r.startsWith("se-exp-")
          ? (e.experiments[r.slice(7)] = n)
          : r.startsWith("se_config_") || r.startsWith("se-config-")
            ? (e.configs[r.slice(10)] = xt(n))
            : r === "se_i18n"
              ? (e.i18nProfile = n)
              : r === "se_i18n_draft"
                ? (e.i18nDraft = n)
                : r.startsWith("se_i18n_label_") && (e.i18nLabels[r.slice(14)] = n);
    return e;
  }
  function lr(e) {
    if (typeof window > "u") return;
    let t = { ...Et(), ...e, openDevtools: !0 },
      r = $t(t);
    window.location.assign(r);
  }
  function Bn() {
    let e = [];
    if (typeof window > "u") return e;
    for (let [t, r] of new URLSearchParams(window.location.search))
      (t === "se" || yt.test(t)) && e.push([t, r]);
    return e;
  }
  function tr(e) {
    for (let [t, r] of Bn()) e.searchParams.has(t) || e.searchParams.set(t, r);
  }
  function dr() {
    if (typeof window > "u" || typeof document > "u") return () => {};
    let e = window;
    if (e.__seNavGuardInstalled) return () => {};
    e.__seNavGuardInstalled = !0;
    let t = window.location.origin;
    function r(a) {
      if (a.defaultPrevented) return;
      let s = a.composedPath?.() ?? [],
        d = null;
      for (let p of s)
        if (p instanceof HTMLAnchorElement) {
          d = p;
          break;
        }
      if (!d) return;
      let c = d.getAttribute("href");
      if (!c || /^(mailto:|tel:|javascript:|blob:|data:|#)/i.test(c)) return;
      let l;
      try {
        l = new URL(c, window.location.href);
      } catch {
        return;
      }
      if (l.origin !== t) return;
      tr(l);
      let f = l.toString();
      f !== d.href && (d.href = f);
    }
    document.addEventListener("click", r, !0);
    let n = history.pushState.bind(history),
      o = history.replaceState.bind(history);
    function i(a) {
      if (a == null) return a;
      let s;
      try {
        s = new URL(a.toString(), window.location.href);
      } catch {
        return a;
      }
      return s.origin !== t ? a : (tr(s), s.toString());
    }
    return (
      (history.pushState = function (a, s, d) {
        return n(a, s, i(d));
      }),
      (history.replaceState = function (a, s, d) {
        return o(a, s, i(d));
      }),
      () => {
        (document.removeEventListener("click", r, !0),
          (history.pushState = n),
          (history.replaceState = o),
          (e.__seNavGuardInstalled = !1));
      }
    );
  }
  var cr = "shipeasy_hide_admin_links";
  function pr(e, t) {
    return t
      ? t === "*"
        ? !0
        : t.startsWith("*.")
          ? e.endsWith(t.slice(1))
          : e === t || e === `www.${t}`
      : !1;
  }
  var St = { type: "object", properties: {}, additionalProperties: !0 };
  var De = class {
    constructor(t, r, n, o = !1) {
      X(this, "adminUrl", t);
      X(this, "token", r);
      X(this, "projectId", n);
      X(this, "hideAdminLinks", o);
    }
    async project() {
      let t = await this.get(`/api/admin/projects/${encodeURIComponent(this.projectId)}`),
        r = (n) => n === void 0 || n === !0 || n === 1;
      return {
        id: t.id,
        name: t.name,
        domain: t.domain,
        modules: {
          translations: r(t.moduleTranslations),
          configs: r(t.moduleConfigs),
          gates: r(t.moduleGates),
          experiments: r(t.moduleExperiments),
          feedback: r(t.moduleFeedback),
          user: r(t.moduleUser),
          events: r(t.moduleEvents),
        },
      };
    }
    async get(t) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!r.ok) {
        let o = "";
        try {
          let i = await r.json();
          o = i.detail ?? i.error ?? "";
        } catch {
          try {
            o = (await r.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${r.status}${o ? ` \u2014 ${o}` : ""}`);
      }
      let n = await r.json();
      return Array.isArray(n) ? n : (n.data ?? n);
    }
    gates() {
      return this.get("/api/admin/gates");
    }
    async configs() {
      let t = await this.get("/api/admin/configs"),
        r = "prod";
      return await Promise.all(
        t.map(async (o) => {
          try {
            let i = await this.get(`/api/admin/configs/${o.id}`),
              a = i.valueJson !== void 0 ? i.valueJson : (i.values?.[r] ?? {}),
              s = i.schema ?? o.schema ?? St;
            return { id: o.id, name: o.name, updatedAt: o.updatedAt, valueJson: a, schema: s };
          } catch {
            return {
              id: o.id,
              name: o.name,
              updatedAt: o.updatedAt,
              valueJson: {},
              schema: o.schema ?? St,
            };
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
    async put(t, r) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(r),
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
      return await n.json();
    }
    async post(t, r) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(r),
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
      return await n.json();
    }
    bugs() {
      return this.get("/api/admin/bugs");
    }
    bug(t) {
      return this.get(`/api/admin/bugs/${encodeURIComponent(t)}`);
    }
    createBug(t) {
      return this.post("/api/admin/bugs", t);
    }
    featureRequests() {
      return this.get("/api/admin/feature-requests");
    }
    featureRequest(t) {
      return this.get(`/api/admin/feature-requests/${encodeURIComponent(t)}`);
    }
    createFeatureRequest(t) {
      return this.post("/api/admin/feature-requests", t);
    }
    async attachmentBlob(t) {
      let r = await fetch(
        `${this.adminUrl}/api/admin/reports/attachments/${encodeURIComponent(t)}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );
      if (!r.ok) throw new Error(`attachment ${t} \u2192 HTTP ${r.status}`);
      return r.blob();
    }
    async uploadAttachment(t) {
      let r = new FormData();
      (r.append("reportKind", t.reportKind),
        r.append("reportId", t.reportId),
        r.append("kind", t.kind),
        r.append("filename", t.filename),
        r.append("file", t.blob, t.filename));
      let n = await fetch(`${this.adminUrl}/api/admin/reports/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: r,
      });
      if (!n.ok) {
        let o = "";
        try {
          o = (await n.json()).error ?? "";
        } catch {}
        throw new Error(`upload failed \u2192 HTTP ${n.status}${o ? ` \u2014 ${o}` : ""}`);
      }
      return await n.json();
    }
    upsertDraftKey(t, r, n) {
      return this.post(`/api/admin/i18n/drafts/${encodeURIComponent(t)}/keys`, {
        key: r,
        value: n,
      });
    }
    updateKeyById(t, r) {
      return this.put(`/api/admin/i18n/keys/${encodeURIComponent(t)}`, { value: r });
    }
    async keys(t) {
      let n = (s) => {
          let d = new URLSearchParams();
          return (
            t && d.set("profile_id", t),
            d.set("limit", String(500)),
            d.set("offset", String(s)),
            `?${d.toString()}`
          );
        },
        o = async (s) => {
          let d = await this.get(`/api/admin/i18n/keys${n(s)}`);
          if (Array.isArray(d)) return { keys: d, total: d.length };
          let c = d.keys ?? [],
            l = d.total ?? c.length;
          return { keys: c, total: l };
        },
        i = await o(0),
        a = i.keys.slice();
      for (; a.length < i.total && i.keys.length > 0; ) {
        let s = await o(a.length);
        if (s.keys.length === 0) break;
        a.push(...s.keys);
      }
      return a;
    }
  };
  var te = (e, t = 1.75) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
    A = {
      shield: te(
        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
      ),
      flask: te(
        '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 1 3.923 10.5H6.077A6.5 6.5 0 0 1 10 9.3"/>',
      ),
      sliders: te(
        '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
      ),
      power: te('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
      book: te('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
      users: te(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      ),
      activity: te('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
      refresh: te(
        '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
      ),
      settings: te(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      ),
      alert: te(
        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
      ),
      search: te('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      play: te('<polygon points="6 3 20 12 6 21 6 3"/>'),
      playFilled:
        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
      x: te('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
      copy: te(
        '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      ),
      check: te('<path d="M20 6 9 17l-5-5"/>'),
      bug: te(
        '<path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/>',
      ),
      sparkles: te(
        '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
      ),
      camera: te(
        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
      ),
      record: te(
        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
      ),
      upload: te(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      ),
      external: te(
        '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      ),
      arrowLeft: te('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
      file: te(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/>',
      ),
      plus: te('<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>'),
      lock: te(
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      ),
    };
  function $(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function pe(e) {
    let t = Date.now() - Date.parse(e);
    if (Number.isNaN(t)) return "\u2014";
    let r = Math.floor(t / 6e4);
    if (r < 1) return "just now";
    if (r < 60) return `${r}m ago`;
    let n = Math.floor(r / 60);
    return n < 24 ? `${n}h ago` : `${Math.floor(n / 24)}d ago`;
  }
  function nt(e) {
    return e < 1024
      ? `${e} B`
      : e < 1024 * 1024
        ? `${(e / 1024).toFixed(0)} KB`
        : `${(e / 1024 / 1024).toFixed(1)} MB`;
  }
  function $e() {
    let e = '<div class="dtf-load"><div class="topstrip"></div>';
    for (let t = 1; t <= 6; t++) {
      let r = t <= 3 ? " live" : "",
        n = 50 + ((t * 7) % 30),
        o = 36 + ((t * 11) % 24);
      e += `
      <div class="skel-row${r}">
        <div class="ic"></div>
        <div class="body">
          <div class="skel" style="height:9px; width:${n}%"></div>
          <div class="skel" style="height:7px; width:${o}%"></div>
        </div>
        <div class="skel" style="height:10px; width:38px"></div>
        <div class="togsk"></div>
      </div>`;
    }
    return e + "</div>";
  }
  function fe(e) {
    let t = (e.actions ?? [])
      .map((o, i) =>
        o.href
          ? `<a class="a" target="_blank" rel="noopener" href="${$(o.href)}" data-i="${i}">
            <span class="ic">${o.icon ?? "+"}</span><span class="k">${$(o.label)}</span>${o.kbd ? `<span class="kbd">${$(o.kbd)}</span>` : ""}
          </a>`
          : `<button class="a" data-i="${i}">
            <span class="ic">${o.icon ?? "+"}</span><span class="k">${$(o.label)}</span>${o.kbd ? `<span class="kbd">${$(o.kbd)}</span>` : ""}
          </button>`,
      )
      .join("");
    return {
      html: `
    <div class="dtf-empty">
      <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">0</div></div>
      <h3>${e.title}</h3>
      <p>${$(e.message)}</p>
      ${t ? `<div class="actions">${t}</div>` : ""}
    </div>`,
      wire: (o) => {
        o.querySelectorAll(".dtf-empty .actions [data-i]").forEach((i) => {
          let a = Number(i.dataset.i),
            s = e.actions?.[a];
          s?.onClick && i.addEventListener("click", s.onClick);
        });
      },
    };
  }
  function He(e) {
    return `
    <div class="dtf-empty search">
      <div class="glyph"><span>[</span><span class="core"></span><span>]</span></div>
      <h3>No match for<br/><em style="font-family:var(--mono);font-style:normal;font-size:14px;color:var(--fg-3)">"${$(e)}"</em></h3>
      <p>Nothing in your project shares that key.</p>
    </div>`;
  }
  function Ce(e, t = "Copy value") {
    return `<button class="dtf-copy" data-copy="${e}" title="${$(t)}">${A.copy}</button>`;
  }
  function Oe(e, t) {
    e.querySelectorAll(".dtf-copy[data-copy]").forEach((r) => {
      let n = r.dataset.copy;
      r.addEventListener("click", async (o) => {
        o.stopPropagation();
        let i = t[n]?.();
        if (i != null) {
          try {
            await navigator.clipboard.writeText(i);
          } catch {}
          (r.classList.add("done"),
            (r.innerHTML = A.check),
            setTimeout(() => {
              (r.classList.remove("done"), (r.innerHTML = A.copy));
            }, 900));
        }
      });
    });
  }
  var jn = [
    { k: "ctx.route", get: () => `"${window.location.pathname}"` },
    { k: "ctx.user_agent", get: () => `"${(navigator.userAgent ?? "").slice(0, 64)}"` },
    { k: "ctx.viewport", get: () => `${window.innerWidth}x${window.innerHeight}` },
  ];
  function Dn() {
    let e = window.__shipeasy;
    if (!e) return null;
    let t = e.user;
    return t && typeof t == "object" ? t : null;
  }
  function Un(e) {
    return e.trim().charAt(0).toUpperCase() || "?";
  }
  function fr(e, t, r, n) {
    let o = Dn();
    if (!o && Object.keys(r.props).length === 0) {
      let { html: p, wire: u } = fe({
        title: "No <em>identified user</em>",
        message:
          "The host app hasn't called shipeasy.identify() yet. Once it does, the user's properties will show here and you can simulate other users.",
        actions: [],
      });
      ((e.innerHTML = p), u(e));
      return;
    }
    let i = {};
    if (o)
      for (let [p, u] of Object.entries(o)) u == null || typeof u == "object" || (i[p] = String(u));
    for (let [p, u] of Object.entries(r.props)) i[p] = u;
    let a = i.id || i.userId || "\u2014",
      s = i.email || i.user_email || "",
      d = s || a,
      c = Object.entries(i)
        .map(([p, u]) => {
          let m = r.dirty[p] ? '<span class="changed"></span>' : '<span style="width:5px"></span>';
          return `<div class="dtf-prop">
        <span class="k">user.${$(p)}</span>
        <span class="v"><input data-prop="${$(p)}" value="${Nn(u)}"/></span>
        ${m}
      </div>`;
        })
        .join(""),
      l = jn
        .map(
          (p) => `<div class="dtf-prop">
      <span class="k">${$(p.k)}</span>
      <span class="v" style="color:var(--accent)">${$(p.get())}</span>
      <span style="width:5px"></span>
    </div>`,
        )
        .join(""),
      f = Object.values(r.dirty).filter(Boolean).length;
    ((e.innerHTML = `
    <div class="dtf-user">
      <div class="who">
        <div class="av">${$(Un(d))}</div>
        <div class="info">
          <div class="e">${$(s || a)}</div>
          <div class="id">${$(a)}</div>
        </div>
      </div>
      <div class="dtf-group">User properties<span class="c">edit to simulate</span></div>
      <div style="flex:1; overflow-y:auto">
        ${c || '<div class="se-empty">No user properties yet.</div>'}
        <div class="dtf-group">Request context<span class="c">read-only</span></div>
        ${l}
      </div>
      <div class="dtf-evalbar">
        <button class="b" data-action="reeval">${A.play} Re-evaluate ${f > 0 ? "with changes" : ""}</button>
        <button class="b g" data-action="reset">Reset</button>
      </div>
    </div>`),
      e.querySelectorAll("input[data-prop]").forEach((p) => {
        p.addEventListener("input", () => {
          let u = p.dataset.prop;
          ((r.props[u] = p.value), (r.dirty[u] = (o ? String(o[u] ?? "") : "") !== p.value));
        });
      }),
      e.querySelector('[data-action="reeval"]').addEventListener("click", () => n()),
      e.querySelector('[data-action="reset"]').addEventListener("click", () => {
        ((r.props = {}), (r.dirty = {}), n());
      }));
  }
  function Nn(e) {
    return $(e);
  }
  function Kn() {
    return window.__shipeasy ?? null;
  }
  function Fn(e) {
    let t = nr(e.name),
      r = Kn()?.getFlag(e.name),
      n = typeof r == "boolean" ? r : null,
      o = t !== null ? t : (n ?? e.enabled);
    return {
      name: e.name,
      killswitch: e.killswitch,
      enabled: e.enabled,
      rolloutPct: e.rolloutPct,
      override: t,
      effective: o,
      live: n,
      updatedAt: e.updatedAt,
    };
  }
  function Lt(e, t) {
    let r = t === e.name,
      n = e.override !== null,
      o = e.killswitch ? e.effective : !e.effective,
      i = e.killswitch ? A.power : A.shield,
      a = e.killswitch
        ? e.effective
          ? "var(--danger)"
          : "var(--accent)"
        : e.effective
          ? "var(--accent)"
          : "var(--fg-3)",
      s = "";
    e.killswitch
      ? (s = `<span class="val ${e.effective ? "killed" : "kill-live"}">${e.effective ? "KILLED" : "LIVE"}</span>`)
      : (s = `<span class="val ${n ? "over" : e.effective ? "on" : "off"}">${e.effective ? "true" : "false"}</span>`);
    let d = `<div class="dtf-toggle${e.effective ? (n ? " over" : " on") : ""}" data-toggle="${Ue(e.name)}"></div>`,
      c = e.killswitch
        ? e.effective
          ? `killswitch \xB7 KILLED (override: ${n ? "yes" : "no"})`
          : `killswitch \xB7 live \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout`
        : `gate \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout \xB7 updated ${pe(e.updatedAt)}`,
      l = e.killswitch
        ? `
      <div class="crumbs">
        <div><span class="${e.effective ? "deny" : "pass"}">${e.effective ? "\u2717" : "\u2713"}</span> killswitch
          <span style="color:var(--fg-4)">\u2192</span>
          <span class="${e.effective ? "deny" : "pass"}">${e.effective ? "KILLED" : "live"}</span>
        </div>
        <div class="indent meta">propagation: &lt;1s to 60+ regions</div>
      </div>
      <div class="actions">
        <button class="${e.effective ? "primary" : ""}" data-toggle-detail="${Ue(e.name)}">${e.effective ? "\u2713 Restore" : "\u26A0 Pull the switch"}</button>
      </div>`
        : `
      <div class="crumbs">
        <div><span class="${n ? "skip" : e.effective ? "pass" : "deny"}">${n ? "\u21A6" : e.effective ? "\u2713" : "\u2717"}</span> ${$(e.name)}
          <span style="color:var(--fg-4)">\u2192</span>
          <span class="${n ? "skip" : e.effective ? "pass" : "deny"}">
            ${n ? `forced ${e.effective ? "true" : "false"} (real: ${e.live === null ? "unknown" : e.live ? "true" : "false"})` : e.effective ? "true" : "false"}
          </span>
        </div>
        <div class="indent">rollout <span style="color:var(--fg-4)">=</span> ${(e.rolloutPct / 100).toFixed(0)}%</div>
      </div>
      <div class="mini">
        <span class="lbl">live</span><span class="v">${e.live === null ? "\u2014" : e.live ? "true" : "false"}</span>
        <span class="lbl">override</span><span class="v">${n ? (e.override ? "true" : "false") : "none"}</span>
        <span class="lbl">updated</span><span class="v">${pe(e.updatedAt)}</span>
      </div>
      <div class="actions">
        <button class="primary" data-toggle-detail="${Ue(e.name)}">\u2922 Force ${e.effective ? "false" : "true"}</button>
        ${n ? `<button data-clear-detail="${Ue(e.name)}">\u21BA Clear override</button>` : ""}
      </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}${o ? " muted" : ""}" data-row="${Ue(e.name)}">
      <div class="ic"><span style="color:${a}">${i}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${$(e.name)}</span>
          ${Ce("g:" + e.name, "Copy gate name")}
          ${n ? '<span class="override-tag">forced</span>' : ""}
          ${e.live ? '<span class="live-dot" title="firing on this page"></span>' : ""}
        </div>
        <div class="v">${$(c)}</div>
      </div>
      ${s}${d}
    </div>
    <div class="dtf-detail${r ? " open" : ""}">
      <div class="inner"><div class="pad">${l}</div></div>
    </div>`;
  }
  async function ur(e, t, r, n) {
    e.innerHTML = $e();
    let o;
    try {
      o = await t.gates();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load gates: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: d } = fe({
        title: "No <em>gates</em> yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        actions: t.hideAdminLinks
          ? []
          : [{ icon: "+", label: "Create new gate", href: `${t.adminUrl}/dashboard/gates/new` }],
      });
      ((e.innerHTML = s), d(e), n(0));
      return;
    }
    let i = null;
    function a() {
      let s = r.search.trim().toLowerCase(),
        c = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Fn);
      if ((n(c.filter((l) => l.override !== null).length), c.length === 0)) {
        e.innerHTML = He(r.search);
        return;
      }
      if (r.view === "page") {
        let l = c.filter((p) => p.live === !0 || p.killswitch),
          f = c.filter((p) => !l.includes(p));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} firing</span></div>` +
          l.map((p) => Lt(p, i)).join("") +
          (f.length
            ? `<div class="dtf-group">Inactive<span class="c">${f.length} more</span></div>` +
              f.map((p) => Lt(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All flags<span class="c">${c.length}</span></div>` +
          c.map((l) => Lt(l, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (f) => {
          let p = f.target;
          if (p.closest(".dtf-toggle") || p.closest(".dtf-copy")) return;
          let u = l.dataset.row;
          ((i = i === u ? null : u), a());
        });
      }),
        e.querySelectorAll("[data-toggle]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-toggle"),
              u = c.find((m) => m.name === p);
            u && tt(p, !u.effective);
          });
        }),
        e.querySelectorAll("[data-toggle-detail]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-toggle-detail"),
              u = c.find((m) => m.name === p);
            u && tt(p, !u.effective);
          });
        }),
        e.querySelectorAll("[data-clear-detail]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-clear-detail");
            tt(p, null);
          });
        }),
        Oe(e, Object.fromEntries(c.map((l) => ["g:" + l.name, () => l.name]))));
    }
    a();
  }
  function Ue(e) {
    return $(e);
  }
  function Wn() {
    return window.__shipeasy ?? null;
  }
  function Gn(e) {
    let t = ar(e.name),
      r = Wn()?.getExperiment(e.name),
      n = r?.inExperiment ? r.group : null,
      o = ["control", ...e.groups.map((a) => a.name)],
      i = t ?? n ?? "control";
    return {
      name: e.name,
      status: e.status,
      groups: [{ name: "control", weight: 0 }, ...e.groups]
        .map((a, s) => ({ name: s === 0 ? "control" : a.name, weight: a.weight }))
        .filter((a, s, d) => d.findIndex((c) => c.name === a.name) === s),
      override: t,
      liveGroup: n,
      liveEnrolled: r?.inExperiment ?? !1,
      effective: i,
      updatedAt: e.updatedAt,
    };
  }
  function _t(e, t) {
    let r = t === e.name,
      n = e.override !== null,
      o = e.groups
        .map(
          (c) =>
            `<option value="${ot(c.name)}"${c.name === e.effective ? " selected" : ""}>${$(c.name)}</option>`,
        )
        .join(""),
      i = `<select class="sel${n ? " over" : ""}" data-exp="${ot(e.name)}" style="grid-column:3 / span 2; justify-self:end">
    ${o}
  </select>`,
      a = `experiment \xB7 ${e.status} \xB7 ${e.groups.length} variants${e.liveGroup ? ` \xB7 live: ${e.liveGroup}` : ""}`,
      s = e.groups
        .map((c, l) => {
          let f = c.name === e.effective,
            p =
              ["var(--info)", "var(--accent)", "var(--warn)", "var(--danger)", "var(--pri)"][l] ??
              "var(--fg-3)";
          return `<div class="var-row${f ? " assigned" : ""}">
        <span class="sw" style="background:${p}"></span>
        <span>${$(c.name)}</span>
        <span class="pct">${c.weight}%</span>
        <span style="font-size:9.5px;color:var(--fg-4)">${c.name === e.liveGroup ? "real" : c.name === e.override ? "forced" : ""}</span>
      </div>`;
        })
        .join(""),
      d = `
    <div class="crumbs">
      <div><span class="${n ? "skip" : "pass"}">\u25CF</span> ${n ? "forced via URL override" : e.liveGroup ? "assigned via SDK" : "no live assignment"}</div>
    </div>
    ${s}
    <div class="mini">
      <span class="lbl">status</span><span class="v">${e.status}</span>
      <span class="lbl">updated</span><span class="v">${pe(e.updatedAt)}</span>
    </div>
    <div class="actions">
      ${n ? `<button data-clear="${ot(e.name)}">\u21BA Clear override</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}${e.status !== "running" ? " muted" : ""}" data-row="${ot(e.name)}">
      <div class="ic"><span style="color:${e.liveEnrolled ? "var(--accent)" : "var(--fg-3)"}">${A.flask}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${$(e.name)}</span>
          ${Ce("e:" + e.name, "Copy experiment name")}
          ${n ? '<span class="override-tag">forced</span>' : ""}
          ${e.liveEnrolled ? '<span class="live-dot" title="enrolled on this page"></span>' : ""}
        </div>
        <div class="v">${$(a)}</div>
      </div>
      ${i}
    </div>
    <div class="dtf-detail${r ? " open" : ""}">
      <div class="inner"><div class="pad">${d}</div></div>
    </div>`;
  }
  async function gr(e, t, r, n) {
    e.innerHTML = $e();
    let o;
    try {
      o = await t.experiments();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load experiments: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: d } = fe({
        title: "No <em>experiments</em> yet",
        message:
          "Run A/B tests with traffic-bucketed variants. Launch one to start measuring impact.",
        actions: t.hideAdminLinks
          ? []
          : [
              {
                icon: "+",
                label: "Create new experiment",
                href: `${t.adminUrl}/dashboard/experiments/new`,
              },
            ],
      });
      ((e.innerHTML = s), d(e), n(0));
      return;
    }
    let i = null;
    function a() {
      let s = r.search.trim().toLowerCase(),
        c = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Gn);
      if ((n(c.filter((l) => l.override !== null).length), c.length === 0)) {
        e.innerHTML = He(r.search);
        return;
      }
      if (r.view === "page") {
        let l = c.filter((p) => p.liveEnrolled),
          f = c.filter((p) => !p.liveEnrolled);
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} enrolled</span></div>` +
          (l.length
            ? l.map((p) => _t(p, i)).join("")
            : '<div class="se-empty">No experiments enrolled yet on this page.</div>') +
          (f.length
            ? `<div class="dtf-group">Other<span class="c">${f.length}</span></div>` +
              f.map((p) => _t(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All experiments<span class="c">${c.length}</span></div>` +
          c.map((l) => _t(l, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (f) => {
          let p = f.target;
          if (p.closest("select") || p.closest(".dtf-copy")) return;
          let u = l.dataset.row;
          ((i = i === u ? null : u), a());
        });
      }),
        e.querySelectorAll("select[data-exp]").forEach((l) => {
          l.addEventListener("change", () => {
            kt(l.dataset.exp, l.value || null);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (f) => {
            (f.stopPropagation(), kt(l.getAttribute("data-clear"), null));
          });
        }),
        Oe(e, Object.fromEntries(c.map((l) => ["e:" + l.name, () => l.name]))));
    }
    a();
  }
  function ot(e) {
    return $(e);
  }
  function Ie(e, t) {
    let r = typeof e;
    if (r !== typeof t) return !1;
    if (Array.isArray(e)) {
      if (!Array.isArray(t)) return !1;
      let n = e.length;
      if (n !== t.length) return !1;
      for (let o = 0; o < n; o++) if (!Ie(e[o], t[o])) return !1;
      return !0;
    }
    if (r === "object") {
      if (!e || !t) return e === t;
      let n = Object.keys(e),
        o = Object.keys(t);
      if (n.length !== o.length) return !1;
      for (let a of n) if (!Ie(e[a], t[a])) return !1;
      return !0;
    }
    return e === t;
  }
  function ue(e) {
    return encodeURI(Jn(e));
  }
  function Jn(e) {
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  var Vn = { prefixItems: !0, items: !0, allOf: !0, anyOf: !0, oneOf: !0 },
    Yn = {
      $defs: !0,
      definitions: !0,
      properties: !0,
      patternProperties: !0,
      dependentSchemas: !0,
    },
    Xn = {
      id: !0,
      $id: !0,
      $ref: !0,
      $schema: !0,
      $anchor: !0,
      $vocabulary: !0,
      $comment: !0,
      default: !0,
      enum: !0,
      const: !0,
      required: !0,
      type: !0,
      maximum: !0,
      minimum: !0,
      exclusiveMaximum: !0,
      exclusiveMinimum: !0,
      multipleOf: !0,
      maxLength: !0,
      minLength: !0,
      pattern: !0,
      format: !0,
      maxItems: !0,
      minItems: !0,
      uniqueItems: !0,
      maxProperties: !0,
      minProperties: !0,
    },
    Zn =
      typeof self < "u" && self.location && self.location.origin !== "null"
        ? new URL(self.location.origin + self.location.pathname + location.search)
        : new URL("https://github.com/cfworker");
  function xe(e, t = Object.create(null), r = Zn, n = "") {
    if (e && typeof e == "object" && !Array.isArray(e)) {
      let i = e.$id || e.id;
      if (i) {
        let a = new URL(i, r.href);
        a.hash.length > 1 ? (t[a.href] = e) : ((a.hash = ""), n === "" ? (r = a) : xe(e, t, r));
      }
    } else if (e !== !0 && e !== !1) return t;
    let o = r.href + (n ? "#" + n : "");
    if (t[o] !== void 0) throw new Error(`Duplicate schema URI "${o}".`);
    if (((t[o] = e), e === !0 || e === !1)) return t;
    if (
      (e.__absolute_uri__ === void 0 &&
        Object.defineProperty(e, "__absolute_uri__", { enumerable: !1, value: o }),
      e.$ref && e.__absolute_ref__ === void 0)
    ) {
      let i = new URL(e.$ref, r.href);
      ((i.hash = i.hash),
        Object.defineProperty(e, "__absolute_ref__", { enumerable: !1, value: i.href }));
    }
    if (e.$recursiveRef && e.__absolute_recursive_ref__ === void 0) {
      let i = new URL(e.$recursiveRef, r.href);
      ((i.hash = i.hash),
        Object.defineProperty(e, "__absolute_recursive_ref__", { enumerable: !1, value: i.href }));
    }
    if (e.$anchor) {
      let i = new URL("#" + e.$anchor, r.href);
      t[i.href] = e;
    }
    for (let i in e) {
      if (Xn[i]) continue;
      let a = `${n}/${ue(i)}`,
        s = e[i];
      if (Array.isArray(s)) {
        if (Vn[i]) {
          let d = s.length;
          for (let c = 0; c < d; c++) xe(s[c], t, r, `${a}/${c}`);
        }
      } else if (Yn[i]) for (let d in s) xe(s[d], t, r, `${a}/${ue(d)}`);
      else xe(s, t, r, a);
    }
    return t;
  }
  var Qn = /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
    eo = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    to = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i,
    ro =
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    no =
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    oo =
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    ao =
      /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    io = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    so = /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    lo = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    co = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    po = (e) => {
      if (e[0] === '"') return !1;
      let [t, r, ...n] = e.split("@");
      return !t ||
        !r ||
        n.length !== 0 ||
        t.length > 64 ||
        r.length > 253 ||
        t[0] === "." ||
        t.endsWith(".") ||
        t.includes("..") ||
        !/^[a-z0-9.-]+$/i.test(r) ||
        !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(t)
        ? !1
        : r.split(".").every((o) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(o));
    },
    fo = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    uo =
      /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    go = (e) =>
      e.length > 1 &&
      e.length < 80 &&
      (/^P\d+([.,]\d+)?W$/.test(e) ||
        (/^P[\dYMDTHS]*(\d[.,]\d+)?[YMDHS]$/.test(e) &&
          /^P([.,\d]+Y)?([.,\d]+M)?([.,\d]+D)?(T([.,\d]+H)?([.,\d]+M)?([.,\d]+S)?)?$/.test(e)));
  function he(e) {
    return e.test.bind(e);
  }
  var Tt = {
    date: mr,
    time: vr.bind(void 0, !1),
    "date-time": bo,
    duration: go,
    uri: yo,
    "uri-reference": he(no),
    "uri-template": he(oo),
    url: he(ao),
    email: po,
    hostname: he(ro),
    ipv4: he(fo),
    ipv6: he(uo),
    regex: ko,
    uuid: he(io),
    "json-pointer": he(so),
    "json-pointer-uri-fragment": he(lo),
    "relative-json-pointer": he(co),
  };
  function mo(e) {
    return e % 4 === 0 && (e % 100 !== 0 || e % 400 === 0);
  }
  function mr(e) {
    let t = e.match(Qn);
    if (!t) return !1;
    let r = +t[1],
      n = +t[2],
      o = +t[3];
    return n >= 1 && n <= 12 && o >= 1 && o <= (n == 2 && mo(r) ? 29 : eo[n]);
  }
  function vr(e, t) {
    let r = t.match(to);
    if (!r) return !1;
    let n = +r[1],
      o = +r[2],
      i = +r[3],
      a = !!r[5];
    return ((n <= 23 && o <= 59 && i <= 59) || (n == 23 && o == 59 && i == 60)) && (!e || a);
  }
  var vo = /t|\s/i;
  function bo(e) {
    let t = e.split(vo);
    return t.length == 2 && mr(t[0]) && vr(!0, t[1]);
  }
  var ho = /\/|:/,
    xo =
      /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function yo(e) {
    return ho.test(e) && xo.test(e);
  }
  var wo = /[^\\]\\Z/;
  function ko(e) {
    if (wo.test(e)) return !1;
    try {
      return (new RegExp(e, "u"), !0);
    } catch {
      return !1;
    }
  }
  var br;
  (function (e) {
    ((e[(e.Flag = 1)] = "Flag"), (e[(e.Basic = 2)] = "Basic"), (e[(e.Detailed = 4)] = "Detailed"));
  })(br || (br = {}));
  function hr(e) {
    let t = 0,
      r = e.length,
      n = 0,
      o;
    for (; n < r; )
      (t++,
        (o = e.charCodeAt(n++)),
        o >= 55296 && o <= 56319 && n < r && ((o = e.charCodeAt(n)), (o & 64512) == 56320 && n++));
    return t;
  }
  function ne(
    e,
    t,
    r = "2019-09",
    n = xe(t),
    o = !0,
    i = null,
    a = "#",
    s = "#",
    d = Object.create(null),
  ) {
    if (t === !0) return { valid: !0, errors: [] };
    if (t === !1)
      return {
        valid: !1,
        errors: [
          {
            instanceLocation: a,
            keyword: "false",
            keywordLocation: a,
            error: "False boolean schema.",
          },
        ],
      };
    let c = typeof e,
      l;
    switch (c) {
      case "boolean":
      case "number":
      case "string":
        l = c;
        break;
      case "object":
        e === null ? (l = "null") : Array.isArray(e) ? (l = "array") : (l = "object");
        break;
      default:
        throw new Error(`Instances of "${c}" type are not supported.`);
    }
    let {
        $ref: f,
        $recursiveRef: p,
        $recursiveAnchor: u,
        type: m,
        const: x,
        enum: g,
        required: L,
        not: k,
        anyOf: S,
        allOf: h,
        oneOf: C,
        if: y,
        then: T,
        else: P,
        format: G,
        properties: re,
        patternProperties: v,
        additionalProperties: E,
        unevaluatedProperties: U,
        minProperties: J,
        maxProperties: de,
        propertyNames: ge,
        dependentRequired: me,
        dependentSchemas: be,
        dependencies: Y,
        prefixItems: b,
        items: w,
        additionalItems: F,
        unevaluatedItems: q,
        contains: W,
        minContains: B,
        maxContains: I,
        minItems: O,
        maxItems: V,
        uniqueItems: ie,
        minimum: ee,
        maximum: K,
        exclusiveMinimum: Z,
        exclusiveMaximum: oe,
        multipleOf: se,
        minLength: ve,
        maxLength: le,
        pattern: we,
        __absolute_ref__: Me,
        __absolute_recursive_ref__: mt,
      } = t,
      R = [];
    if ((u === !0 && i === null && (i = t), p === "#")) {
      let z = i === null ? n[mt] : i,
        H = `${s}/$recursiveRef`,
        N = ne(e, i === null ? t : i, r, n, o, z, a, H, d);
      N.valid ||
        R.push(
          {
            instanceLocation: a,
            keyword: "$recursiveRef",
            keywordLocation: H,
            error: "A subschema had errors.",
          },
          ...N.errors,
        );
    }
    if (f !== void 0) {
      let H = n[Me || f];
      if (H === void 0) {
        let _ = `Unresolved $ref "${f}".`;
        throw (
          Me && Me !== f && (_ += `  Absolute URI "${Me}".`),
          (_ += `
Known schemas:
- ${Object.keys(n).join(`
- `)}`),
          new Error(_)
        );
      }
      let N = `${s}/$ref`,
        M = ne(e, H, r, n, o, i, a, N, d);
      if (
        (M.valid ||
          R.push(
            {
              instanceLocation: a,
              keyword: "$ref",
              keywordLocation: N,
              error: "A subschema had errors.",
            },
            ...M.errors,
          ),
        r === "4" || r === "7")
      )
        return { valid: R.length === 0, errors: R };
    }
    if (Array.isArray(m)) {
      let z = m.length,
        H = !1;
      for (let N = 0; N < z; N++)
        if (l === m[N] || (m[N] === "integer" && l === "number" && e % 1 === 0 && e === e)) {
          H = !0;
          break;
        }
      H ||
        R.push({
          instanceLocation: a,
          keyword: "type",
          keywordLocation: `${s}/type`,
          error: `Instance type "${l}" is invalid. Expected "${m.join('", "')}".`,
        });
    } else
      m === "integer"
        ? (l !== "number" || e % 1 || e !== e) &&
          R.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${m}".`,
          })
        : m !== void 0 &&
          l !== m &&
          R.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${m}".`,
          });
    if (
      (x !== void 0 &&
        (l === "object" || l === "array"
          ? Ie(e, x) ||
            R.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(x)}.`,
            })
          : e !== x &&
            R.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(x)}.`,
            })),
      g !== void 0 &&
        (l === "object" || l === "array"
          ? g.some((z) => Ie(e, z)) ||
            R.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(g)}.`,
            })
          : g.some((z) => e === z) ||
            R.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(g)}.`,
            })),
      k !== void 0)
    ) {
      let z = `${s}/not`;
      ne(e, k, r, n, o, i, a, z).valid &&
        R.push({
          instanceLocation: a,
          keyword: "not",
          keywordLocation: z,
          error: 'Instance matched "not" schema.',
        });
    }
    let Ae = [];
    if (S !== void 0) {
      let z = `${s}/anyOf`,
        H = R.length,
        N = !1;
      for (let M = 0; M < S.length; M++) {
        let _ = S[M],
          D = Object.create(d),
          j = ne(e, _, r, n, o, u === !0 ? i : null, a, `${z}/${M}`, D);
        (R.push(...j.errors), (N = N || j.valid), j.valid && Ae.push(D));
      }
      N
        ? (R.length = H)
        : R.splice(H, 0, {
            instanceLocation: a,
            keyword: "anyOf",
            keywordLocation: z,
            error: "Instance does not match any subschemas.",
          });
    }
    if (h !== void 0) {
      let z = `${s}/allOf`,
        H = R.length,
        N = !0;
      for (let M = 0; M < h.length; M++) {
        let _ = h[M],
          D = Object.create(d),
          j = ne(e, _, r, n, o, u === !0 ? i : null, a, `${z}/${M}`, D);
        (R.push(...j.errors), (N = N && j.valid), j.valid && Ae.push(D));
      }
      N
        ? (R.length = H)
        : R.splice(H, 0, {
            instanceLocation: a,
            keyword: "allOf",
            keywordLocation: z,
            error: "Instance does not match every subschema.",
          });
    }
    if (C !== void 0) {
      let z = `${s}/oneOf`,
        H = R.length,
        N = C.filter((M, _) => {
          let D = Object.create(d),
            j = ne(e, M, r, n, o, u === !0 ? i : null, a, `${z}/${_}`, D);
          return (R.push(...j.errors), j.valid && Ae.push(D), j.valid);
        }).length;
      N === 1
        ? (R.length = H)
        : R.splice(H, 0, {
            instanceLocation: a,
            keyword: "oneOf",
            keywordLocation: z,
            error: `Instance does not match exactly one subschema (${N} matches).`,
          });
    }
    if (((l === "object" || l === "array") && Object.assign(d, ...Ae), y !== void 0)) {
      let z = `${s}/if`;
      if (ne(e, y, r, n, o, i, a, z, d).valid) {
        if (T !== void 0) {
          let N = ne(e, T, r, n, o, i, a, `${s}/then`, d);
          N.valid ||
            R.push(
              {
                instanceLocation: a,
                keyword: "if",
                keywordLocation: z,
                error: 'Instance does not match "then" schema.',
              },
              ...N.errors,
            );
        }
      } else if (P !== void 0) {
        let N = ne(e, P, r, n, o, i, a, `${s}/else`, d);
        N.valid ||
          R.push(
            {
              instanceLocation: a,
              keyword: "if",
              keywordLocation: z,
              error: 'Instance does not match "else" schema.',
            },
            ...N.errors,
          );
      }
    }
    if (l === "object") {
      if (L !== void 0)
        for (let M of L)
          M in e ||
            R.push({
              instanceLocation: a,
              keyword: "required",
              keywordLocation: `${s}/required`,
              error: `Instance does not have required property "${M}".`,
            });
      let z = Object.keys(e);
      if (
        (J !== void 0 &&
          z.length < J &&
          R.push({
            instanceLocation: a,
            keyword: "minProperties",
            keywordLocation: `${s}/minProperties`,
            error: `Instance does not have at least ${J} properties.`,
          }),
        de !== void 0 &&
          z.length > de &&
          R.push({
            instanceLocation: a,
            keyword: "maxProperties",
            keywordLocation: `${s}/maxProperties`,
            error: `Instance does not have at least ${de} properties.`,
          }),
        ge !== void 0)
      ) {
        let M = `${s}/propertyNames`;
        for (let _ in e) {
          let D = `${a}/${ue(_)}`,
            j = ne(_, ge, r, n, o, i, D, M);
          j.valid ||
            R.push(
              {
                instanceLocation: a,
                keyword: "propertyNames",
                keywordLocation: M,
                error: `Property name "${_}" does not match schema.`,
              },
              ...j.errors,
            );
        }
      }
      if (me !== void 0) {
        let M = `${s}/dependantRequired`;
        for (let _ in me)
          if (_ in e) {
            let D = me[_];
            for (let j of D)
              j in e ||
                R.push({
                  instanceLocation: a,
                  keyword: "dependentRequired",
                  keywordLocation: M,
                  error: `Instance has "${_}" but does not have "${j}".`,
                });
          }
      }
      if (be !== void 0)
        for (let M in be) {
          let _ = `${s}/dependentSchemas`;
          if (M in e) {
            let D = ne(e, be[M], r, n, o, i, a, `${_}/${ue(M)}`, d);
            D.valid ||
              R.push(
                {
                  instanceLocation: a,
                  keyword: "dependentSchemas",
                  keywordLocation: _,
                  error: `Instance has "${M}" but does not match dependant schema.`,
                },
                ...D.errors,
              );
          }
        }
      if (Y !== void 0) {
        let M = `${s}/dependencies`;
        for (let _ in Y)
          if (_ in e) {
            let D = Y[_];
            if (Array.isArray(D))
              for (let j of D)
                j in e ||
                  R.push({
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: M,
                    error: `Instance has "${_}" but does not have "${j}".`,
                  });
            else {
              let j = ne(e, D, r, n, o, i, a, `${M}/${ue(_)}`);
              j.valid ||
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: M,
                    error: `Instance has "${_}" but does not match dependant schema.`,
                  },
                  ...j.errors,
                );
            }
          }
      }
      let H = Object.create(null),
        N = !1;
      if (re !== void 0) {
        let M = `${s}/properties`;
        for (let _ in re) {
          if (!(_ in e)) continue;
          let D = `${a}/${ue(_)}`,
            j = ne(e[_], re[_], r, n, o, i, D, `${M}/${ue(_)}`);
          if (j.valid) d[_] = H[_] = !0;
          else if (
            ((N = o),
            R.push(
              {
                instanceLocation: a,
                keyword: "properties",
                keywordLocation: M,
                error: `Property "${_}" does not match schema.`,
              },
              ...j.errors,
            ),
            N)
          )
            break;
        }
      }
      if (!N && v !== void 0) {
        let M = `${s}/patternProperties`;
        for (let _ in v) {
          let D = new RegExp(_, "u"),
            j = v[_];
          for (let ce in e) {
            if (!D.test(ce)) continue;
            let Xt = `${a}/${ue(ce)}`,
              Zt = ne(e[ce], j, r, n, o, i, Xt, `${M}/${ue(_)}`);
            Zt.valid
              ? (d[ce] = H[ce] = !0)
              : ((N = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "patternProperties",
                    keywordLocation: M,
                    error: `Property "${ce}" matches pattern "${_}" but does not match associated schema.`,
                  },
                  ...Zt.errors,
                ));
          }
        }
      }
      if (!N && E !== void 0) {
        let M = `${s}/additionalProperties`;
        for (let _ in e) {
          if (H[_]) continue;
          let D = `${a}/${ue(_)}`,
            j = ne(e[_], E, r, n, o, i, D, M);
          j.valid
            ? (d[_] = !0)
            : ((N = o),
              R.push(
                {
                  instanceLocation: a,
                  keyword: "additionalProperties",
                  keywordLocation: M,
                  error: `Property "${_}" does not match additional properties schema.`,
                },
                ...j.errors,
              ));
        }
      } else if (!N && U !== void 0) {
        let M = `${s}/unevaluatedProperties`;
        for (let _ in e)
          if (!d[_]) {
            let D = `${a}/${ue(_)}`,
              j = ne(e[_], U, r, n, o, i, D, M);
            j.valid
              ? (d[_] = !0)
              : R.push(
                  {
                    instanceLocation: a,
                    keyword: "unevaluatedProperties",
                    keywordLocation: M,
                    error: `Property "${_}" does not match unevaluated properties schema.`,
                  },
                  ...j.errors,
                );
          }
      }
    } else if (l === "array") {
      (V !== void 0 &&
        e.length > V &&
        R.push({
          instanceLocation: a,
          keyword: "maxItems",
          keywordLocation: `${s}/maxItems`,
          error: `Array has too many items (${e.length} > ${V}).`,
        }),
        O !== void 0 &&
          e.length < O &&
          R.push({
            instanceLocation: a,
            keyword: "minItems",
            keywordLocation: `${s}/minItems`,
            error: `Array has too few items (${e.length} < ${O}).`,
          }));
      let z = e.length,
        H = 0,
        N = !1;
      if (b !== void 0) {
        let M = `${s}/prefixItems`,
          _ = Math.min(b.length, z);
        for (; H < _; H++) {
          let D = ne(e[H], b[H], r, n, o, i, `${a}/${H}`, `${M}/${H}`);
          if (
            ((d[H] = !0),
            !D.valid &&
              ((N = o),
              R.push(
                {
                  instanceLocation: a,
                  keyword: "prefixItems",
                  keywordLocation: M,
                  error: "Items did not match schema.",
                },
                ...D.errors,
              ),
              N))
          )
            break;
        }
      }
      if (w !== void 0) {
        let M = `${s}/items`;
        if (Array.isArray(w)) {
          let _ = Math.min(w.length, z);
          for (; H < _; H++) {
            let D = ne(e[H], w[H], r, n, o, i, `${a}/${H}`, `${M}/${H}`);
            if (
              ((d[H] = !0),
              !D.valid &&
                ((N = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: M,
                    error: "Items did not match schema.",
                  },
                  ...D.errors,
                ),
                N))
            )
              break;
          }
        } else
          for (; H < z; H++) {
            let _ = ne(e[H], w, r, n, o, i, `${a}/${H}`, M);
            if (
              ((d[H] = !0),
              !_.valid &&
                ((N = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: M,
                    error: "Items did not match schema.",
                  },
                  ..._.errors,
                ),
                N))
            )
              break;
          }
        if (!N && F !== void 0) {
          let _ = `${s}/additionalItems`;
          for (; H < z; H++) {
            let D = ne(e[H], F, r, n, o, i, `${a}/${H}`, _);
            ((d[H] = !0),
              D.valid ||
                ((N = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "additionalItems",
                    keywordLocation: _,
                    error: "Items did not match additional items schema.",
                  },
                  ...D.errors,
                )));
          }
        }
      }
      if (W !== void 0)
        if (z === 0 && B === void 0)
          R.push({
            instanceLocation: a,
            keyword: "contains",
            keywordLocation: `${s}/contains`,
            error: "Array is empty. It must contain at least one item matching the schema.",
          });
        else if (B !== void 0 && z < B)
          R.push({
            instanceLocation: a,
            keyword: "minContains",
            keywordLocation: `${s}/minContains`,
            error: `Array has less items (${z}) than minContains (${B}).`,
          });
        else {
          let M = `${s}/contains`,
            _ = R.length,
            D = 0;
          for (let j = 0; j < z; j++) {
            let ce = ne(e[j], W, r, n, o, i, `${a}/${j}`, M);
            ce.valid ? ((d[j] = !0), D++) : R.push(...ce.errors);
          }
          (D >= (B || 0) && (R.length = _),
            B === void 0 && I === void 0 && D === 0
              ? R.splice(_, 0, {
                  instanceLocation: a,
                  keyword: "contains",
                  keywordLocation: M,
                  error: "Array does not contain item matching schema.",
                })
              : B !== void 0 && D < B
                ? R.push({
                    instanceLocation: a,
                    keyword: "minContains",
                    keywordLocation: `${s}/minContains`,
                    error: `Array must contain at least ${B} items matching schema. Only ${D} items were found.`,
                  })
                : I !== void 0 &&
                  D > I &&
                  R.push({
                    instanceLocation: a,
                    keyword: "maxContains",
                    keywordLocation: `${s}/maxContains`,
                    error: `Array may contain at most ${I} items matching schema. ${D} items were found.`,
                  }));
        }
      if (!N && q !== void 0) {
        let M = `${s}/unevaluatedItems`;
        for (H; H < z; H++) {
          if (d[H]) continue;
          let _ = ne(e[H], q, r, n, o, i, `${a}/${H}`, M);
          ((d[H] = !0),
            _.valid ||
              R.push(
                {
                  instanceLocation: a,
                  keyword: "unevaluatedItems",
                  keywordLocation: M,
                  error: "Items did not match unevaluated items schema.",
                },
                ..._.errors,
              ));
        }
      }
      if (ie)
        for (let M = 0; M < z; M++) {
          let _ = e[M],
            D = typeof _ == "object" && _ !== null;
          for (let j = 0; j < z; j++) {
            if (M === j) continue;
            let ce = e[j];
            (_ === ce || (D && typeof ce == "object" && ce !== null && Ie(_, ce))) &&
              (R.push({
                instanceLocation: a,
                keyword: "uniqueItems",
                keywordLocation: `${s}/uniqueItems`,
                error: `Duplicate items at indexes ${M} and ${j}.`,
              }),
              (M = Number.MAX_SAFE_INTEGER),
              (j = Number.MAX_SAFE_INTEGER));
          }
        }
    } else if (l === "number") {
      if (
        (r === "4"
          ? (ee !== void 0 &&
              ((Z === !0 && e <= ee) || e < ee) &&
              R.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${Z ? "or equal to " : ""} ${ee}.`,
              }),
            K !== void 0 &&
              ((oe === !0 && e >= K) || e > K) &&
              R.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${oe ? "or equal to " : ""} ${K}.`,
              }))
          : (ee !== void 0 &&
              e < ee &&
              R.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${ee}.`,
              }),
            K !== void 0 &&
              e > K &&
              R.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${K}.`,
              }),
            Z !== void 0 &&
              e <= Z &&
              R.push({
                instanceLocation: a,
                keyword: "exclusiveMinimum",
                keywordLocation: `${s}/exclusiveMinimum`,
                error: `${e} is less than ${Z}.`,
              }),
            oe !== void 0 &&
              e >= oe &&
              R.push({
                instanceLocation: a,
                keyword: "exclusiveMaximum",
                keywordLocation: `${s}/exclusiveMaximum`,
                error: `${e} is greater than or equal to ${oe}.`,
              })),
        se !== void 0)
      ) {
        let z = e % se;
        Math.abs(0 - z) >= 11920929e-14 &&
          Math.abs(se - z) >= 11920929e-14 &&
          R.push({
            instanceLocation: a,
            keyword: "multipleOf",
            keywordLocation: `${s}/multipleOf`,
            error: `${e} is not a multiple of ${se}.`,
          });
      }
    } else if (l === "string") {
      let z = ve === void 0 && le === void 0 ? 0 : hr(e);
      (ve !== void 0 &&
        z < ve &&
        R.push({
          instanceLocation: a,
          keyword: "minLength",
          keywordLocation: `${s}/minLength`,
          error: `String is too short (${z} < ${ve}).`,
        }),
        le !== void 0 &&
          z > le &&
          R.push({
            instanceLocation: a,
            keyword: "maxLength",
            keywordLocation: `${s}/maxLength`,
            error: `String is too long (${z} > ${le}).`,
          }),
        we !== void 0 &&
          !new RegExp(we, "u").test(e) &&
          R.push({
            instanceLocation: a,
            keyword: "pattern",
            keywordLocation: `${s}/pattern`,
            error: "String does not match pattern.",
          }),
        G !== void 0 &&
          Tt[G] &&
          !Tt[G](e) &&
          R.push({
            instanceLocation: a,
            keyword: "format",
            keywordLocation: `${s}/format`,
            error: `String does not match format "${G}".`,
          }));
    }
    return { valid: R.length === 0, errors: R };
  }
  var at = class {
    constructor(t, r = "2019-09", n = !0) {
      X(this, "schema");
      X(this, "draft");
      X(this, "shortCircuit");
      X(this, "lookup");
      ((this.schema = t), (this.draft = r), (this.shortCircuit = n), (this.lookup = xe(t)));
    }
    validate(t) {
      return ne(t, this.schema, this.draft, this.lookup, this.shortCircuit);
    }
    addSchema(t, r) {
      (r && (t = { ...t, $id: r }), xe(t, this.lookup));
    }
  };
  function it(e) {
    return e.replace(/[&<>"']/g, (t) => {
      switch (t) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return t;
      }
    });
  }
  function Ne(e) {
    return it(e);
  }
  function $o(e) {
    let t = e.properties ?? {};
    return Object.entries(t);
  }
  function Eo(e, t) {
    let r = e.required;
    return Array.isArray(r) && r.includes(t);
  }
  function So(e, t) {
    if (!(e === null || typeof e != "object" || Array.isArray(e))) return e[t];
  }
  function Te(e, t, r) {
    return { ...(e !== null && typeof e == "object" && !Array.isArray(e) ? e : {}), [t]: r };
  }
  function xr(e) {
    return Array.isArray(e.enum) && e.enum.length > 0
      ? "enum"
      : e.type === "array"
        ? "array"
        : e.type === "number" || e.type === "integer"
          ? "number"
          : e.type === "boolean"
            ? "boolean"
            : "string";
  }
  function Lo(e) {
    let t = e.items?.type;
    return t === "number" || t === "integer" ? "number" : t === "boolean" ? "boolean" : "string";
  }
  function _o(e, t, r, n) {
    let o = xr(t),
      i = `<label class="dtf-sf-lbl"><span class="k">${it(e)}</span>${n ? '<span class="req">*</span>' : ""}<span class="t">${o}</span></label>`,
      a = "";
    if (o === "boolean") {
      let d = r === !0;
      a = `<span class="dtf-sf-bool">
      <button type="button" class="t${d ? " on" : ""}" data-bool-true>true</button>
      <button type="button" class="f${d === !1 ? " on" : ""}" data-bool-false>false</button>
    </span>`;
    } else if (o === "number") {
      let d = typeof r == "number" ? String(r) : "";
      a = `<input type="number" value="${Ne(d)}" data-input />`;
    } else if (o === "enum") {
      let d = (t.enum ?? []).map((l) => String(l)),
        c = String(r ?? "");
      a = `<select data-input>${d.map((l) => `<option value="${Ne(l)}"${l === c ? " selected" : ""}>${it(l)}</option>`).join("")}</select>`;
    } else if (o === "array") {
      let c = (Array.isArray(r) ? r : []).map((f) => String(f)).join(", "),
        l = Lo(t);
      a = `<input type="text" value="${Ne(c)}" data-input data-array-items="${l}" placeholder="comma-separated ${l}s" />`;
    } else {
      let d = typeof r == "string" ? r : r == null ? "" : String(r);
      a = `<input type="text" value="${Ne(d)}" data-input />`;
    }
    let s = t.description ? `<div class="dtf-sf-desc">${it(t.description)}</div>` : "";
    return `<div class="dtf-sf-field" data-field="${Ne(e)}">${i}${a}${s}</div>`;
  }
  function To(e, t) {
    let r = e
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    return t === "number"
      ? r.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
      : t === "boolean"
        ? r.map((n) => n === "true")
        : r;
  }
  function yr(e, t, r, n) {
    let o = $o(t);
    if (o.length === 0) {
      e.innerHTML =
        '<div class="dtf-sf-empty">This config has no schema fields. Define fields in the dashboard to enable schema-driven editing.</div>';
      return;
    }
    e.innerHTML = `<div class="dtf-sf">${o.map(([i, a]) => _o(i, a, So(r, i), Eo(t, i))).join("")}</div>`;
    for (let [i, a] of o) {
      let s = e.querySelector(`[data-field="${CSS.escape(i)}"]`);
      if (!s) continue;
      let d = xr(a);
      if (d === "boolean") {
        let l = s.querySelector("[data-bool-true]"),
          f = s.querySelector("[data-bool-false]");
        (l?.addEventListener("click", () => n(Te(r, i, !0))),
          f?.addEventListener("click", () => n(Te(r, i, !1))));
        continue;
      }
      let c = s.querySelector("[data-input]");
      if (c)
        if (d === "number")
          c.addEventListener("input", () => {
            let l = c.value;
            if (l === "") n(Te(r, i, void 0));
            else {
              let f = Number(l);
              Number.isNaN(f) || n(Te(r, i, f));
            }
          });
        else if (d === "array") {
          let l = c.dataset.arrayItems ?? "string";
          c.addEventListener("input", () => {
            let f = To(c.value, l);
            n(Te(r, i, f));
          });
        } else
          (c.addEventListener("input", () => n(Te(r, i, c.value))),
            c.addEventListener("change", () => n(Te(r, i, c.value))));
    }
  }
  function Ro() {
    return window.__shipeasy ?? null;
  }
  function Er(e) {
    return e === null ? "null" : Array.isArray(e) ? "array" : typeof e;
  }
  function wr(e, t) {
    try {
      return JSON.stringify(e) === JSON.stringify(t);
    } catch {
      return e === t;
    }
  }
  function kr(e) {
    let t = Er(e);
    if (t === "object") return `{${Object.keys(e).length} keys}`;
    if (t === "array") return `[${e.length}]`;
    if (t === "string") {
      let r = e;
      return `"${r.length > 22 ? r.slice(0, 22) + "\u2026" : r}"`;
    }
    return t === "null" ? "null" : String(e);
  }
  function Mo(e) {
    let t = or(e.name),
      r = Ro()?.getConfig(e.name),
      n = t !== void 0 ? t : r !== void 0 ? r : e.valueJson;
    return {
      name: e.name,
      real: e.valueJson,
      override: t,
      live: r,
      effective: n,
      updatedAt: e.updatedAt,
      schema: e.schema,
    };
  }
  function Rt(e, t) {
    let r = t === e.name,
      n = e.override !== void 0,
      o = Er(e.effective),
      i = `config \xB7 ${o} \xB7 updated ${pe(e.updatedAt)}`,
      a = `<span class="val${n ? " over" : ""}" style="grid-column:3 / span 2; justify-self:end">${$(kr(e.effective))}</span>`,
      s = `
    <div class="crumbs">
      <div><span class="pass">\u25CF</span> ${$(e.name)}
        <span style="color:var(--fg-4)">=</span>
        <span style="color:var(--fg-2)">${$(kr(e.effective))}</span>
        <span style="color:var(--fg-4)">\xB7 ${o}</span>
      </div>
    </div>
    <div class="mini">
      <span class="lbl">override</span><span class="v">${n ? "yes" : "none"}</span>
      <span class="lbl">updated</span><span class="v">${pe(e.updatedAt)}</span>
    </div>
    <div class="actions">
      <button class="primary" data-edit="${Mt(e.name)}">\u2922 ${n ? "Edit override" : "Override value"}</button>
      ${n ? `<button data-clear="${Mt(e.name)}">\u21BA Reset</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}" data-row="${Mt(e.name)}">
      <div class="ic"><span style="color:var(--accent)">${A.sliders}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${$(e.name)}</span>
          ${Ce("c:" + e.name, "Copy config name")}
          ${n ? '<span class="override-tag">forced</span>' : ""}
        </div>
        <div class="v">${$(i)}</div>
      </div>
      ${a}
    </div>
    <div class="dtf-detail${r ? " open" : ""}">
      <div class="inner"><div class="pad">${s}</div></div>
    </div>`;
  }
  async function Sr(e, t, r, n, o) {
    e.innerHTML = $e();
    let i;
    try {
      i = await t.configs();
    } catch (d) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${$(String(d))}</div>`;
      return;
    }
    if (i.length === 0) {
      let { html: d, wire: c } = fe({
        title: "No <em>configs</em> yet",
        message: "Remote config values you can tweak per-session without redeploying.",
        actions: t.hideAdminLinks
          ? []
          : [
              {
                icon: "+",
                label: "Create new config",
                href: `${t.adminUrl}/dashboard/configs/values/new`,
              },
            ],
      });
      ((e.innerHTML = d), c(e), n(0));
      return;
    }
    let a = null;
    function s() {
      let d = r.search.trim().toLowerCase(),
        l = (d ? i.filter((f) => f.name.toLowerCase().includes(d)) : i).map(Mo);
      if ((n(l.filter((f) => f.override !== void 0).length), l.length === 0)) {
        e.innerHTML = He(r.search);
        return;
      }
      if (r.view === "page") {
        let f = l.filter((u) => u.override !== void 0 || u.live !== void 0),
          p = l.filter((u) => !f.includes(u));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${f.length} loaded</span></div>` +
          (f.length
            ? f.map((u) => Rt(u, a)).join("")
            : '<div class="se-empty">No configs read on this page yet.</div>') +
          (p.length
            ? `<div class="dtf-group">Other<span class="c">${p.length}</span></div>` +
              p.map((u) => Rt(u, a)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All configs<span class="c">${l.length}</span></div>` +
          l.map((f) => Rt(f, a)).join("");
      (e.querySelectorAll(".dtf-row").forEach((f) => {
        f.addEventListener("click", (p) => {
          if (p.target.closest(".dtf-copy")) return;
          let m = f.dataset.row;
          ((a = a === m ? null : m), s());
        });
      }),
        e.querySelectorAll("[data-edit]").forEach((f) => {
          f.addEventListener("click", (p) => {
            p.stopPropagation();
            let u = f.getAttribute("data-edit"),
              m = l.find((x) => x.name === u);
            Po(o, m);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((f) => {
          f.addEventListener("click", (p) => {
            (p.stopPropagation(), wt(f.getAttribute("data-clear"), null));
          });
        }),
        Oe(e, Object.fromEntries(l.map((f) => ["c:" + f.name, () => f.name]))));
    }
    s();
  }
  function $r(e) {
    return e == null || typeof e != "object" ? e : JSON.parse(JSON.stringify(e));
  }
  function Ao(e, t) {
    try {
      let n = new at(t, "2020-12", !1).validate(e ?? {});
      return n.valid
        ? null
        : n.errors
            .slice(0, 3)
            .map((o) => `${o.instanceLocation || "/"}: ${o.error}`)
            .join("; ");
    } catch (r) {
      return r.message;
    }
  }
  function Po(e, t) {
    let r = t.override !== void 0 ? t.override : t.real,
      n = r !== null && typeof r == "object" && !Array.isArray(r) ? r : {},
      o = $r(n),
      i = document.createElement("div");
    ((i.className = "dtf-modal-bg"),
      (i.innerHTML = '<div class="dtf-modal" data-role="modal"></div>'));
    let a = i.querySelector(".dtf-modal");
    e.appendChild(i);
    function s() {
      (i.remove(), document.removeEventListener("keydown", d));
    }
    function d(p) {
      (p.key === "Escape" && s(), p.key === "Enter" && (p.metaKey || p.ctrlKey) && c());
    }
    function c() {
      let p = Ao(o, t.schema);
      if (p) {
        l(p);
        return;
      }
      (wt(t.name, o), s());
    }
    function l(p) {
      let u = a.querySelector("[data-error]");
      u && (u.textContent = p ?? "");
    }
    function f() {
      let p = !wr(o, t.real);
      a.innerHTML = `
      <div class="hd">
        <span class="k">${$(t.name)}</span>
        <span class="type-tag t-object">object</span>
        <button class="x" data-action="close" title="Close (Esc)">${A.x}</button>
      </div>
      <div class="bd">
        <div data-form></div>
        <div class="dtf-sf-error" data-error></div>
      </div>
      <div class="ft">
        <button class="ghost" data-action="reset" ${p ? "" : "disabled"} style="${p ? "" : "opacity:.4"}">\u21BA Reset all</button>
        <span class="sp"></span>
        <button data-action="cancel">Cancel <span style="opacity:.6;margin-left:4px">Esc</span></button>
        <button class="primary" data-action="save">Save override <span style="opacity:.6;margin-left:4px">\u2318\u23CE</span></button>
      </div>`;
      let u = a.querySelector("[data-form]");
      (yr(u, t.schema, o, (m) => {
        ((o = m), l(null));
        let x = !wr(o, t.real),
          g = a.querySelector('[data-action="reset"]');
        g && ((g.disabled = !x), (g.style.opacity = x ? "" : ".4"));
      }),
        a.querySelector('[data-action="close"]').addEventListener("click", s),
        a.querySelector('[data-action="cancel"]').addEventListener("click", s),
        a.querySelector('[data-action="save"]').addEventListener("click", c),
        a.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
          let m =
            t.real !== null && typeof t.real == "object" && !Array.isArray(t.real) ? t.real : {};
          ((o = $r(m)), f());
        }));
    }
    (i.addEventListener("click", (p) => {
      p.target === i && s();
    }),
      document.addEventListener("keydown", d),
      f());
  }
  function Mt(e) {
    return $(e);
  }
  var ct = Cn(Dr(), 1);
  var ze = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function ua(e) {
    if (e.length === 0) return null;
    let t = e.find((r) => r.name === "en:prod");
    return t ? t.id : e[0].id;
  }
  function Q(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  var Ee = "__se_label_target",
    Nt = "__se_label_target_style",
    Kt = !1,
    Ut = null,
    qe = null,
    Gr = null,
    Jr = [];
  function ga() {
    if (document.getElementById(Nt)) return;
    let e = document.createElement("style");
    ((e.id = Nt),
      (e.textContent = `
    .${Ee} {
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
    .${Ee}:hover,
    .${Ee}.__se_label_active {
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
  function Ur() {
    document.getElementById(Nt)?.remove();
  }
  function We(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      r = [],
      n = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let a = o.nodeValue ?? "";
      if (
        !a.includes(ct.LABEL_MARKER_START) ||
        n.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        d = 0;
      ze.lastIndex = 0;
      let c;
      for (; (c = ze.exec(a)) !== null; ) {
        c.index > d && s.appendChild(document.createTextNode(a.slice(d, c.index)));
        let l = c[1],
          f = c[2],
          p = c[3],
          u = document.createElement("span");
        (u.setAttribute("data-label", l), f && u.setAttribute("data-variables", f));
        let m = _e(l),
          x = null;
        if (f)
          try {
            x = JSON.parse(f);
          } catch {
            x = null;
          }
        ((u.textContent = m !== null ? pt(m, x) : p),
          s.appendChild(u),
          (d = c.index + c[0].length));
      }
      (d < a.length && s.appendChild(document.createTextNode(a.slice(d))), r.push([o, s]));
    }
    for (let [a, s] of r) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        d = a.getAttribute("data-label"),
        c = _e(d);
      if (s.includes(ct.LABEL_MARKER_START)) {
        ze.lastIndex = 0;
        let l = ze.exec(s);
        if (l) {
          l[2] && a.setAttribute("data-variables", l[2]);
          let f = l[2] ? ma(l[2]) : null;
          a.textContent = c !== null ? pt(c, f) : l[3];
        }
      } else if (i)
        try {
          let l = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            f = i(d, l);
          c !== null ? (a.textContent = pt(c, l ?? null)) : f && f !== d && (a.textContent = f);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = Ft(a),
        d = new Map();
      for (let l of s) d.set(l.attr, l);
      let c = !1;
      for (let l of Array.from(a.attributes)) {
        let f = l.value;
        if (!f.includes(ct.LABEL_MARKER_START)) continue;
        ze.lastIndex = 0;
        let p = ze.exec(f);
        if (!p) continue;
        let u = p[1],
          m = p[3],
          x = _e(u);
        (a.setAttribute(l.name, x ?? m),
          d.set(l.name, { attr: l.name, key: u, original: m }),
          (c = !0));
      }
      c && Yr(a, Array.from(d.values()));
    }
    return r.length;
  }
  function Nr(e) {
    let t = [],
      r = /\{\{(\w+)\}\}/g,
      n;
    for (; (n = r.exec(e)) !== null; ) t.push(n[1]);
    return t;
  }
  function pt(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (r, n) => {
          let o = t[n];
          return o != null ? String(o) : `{{${n}}}`;
        })
      : e;
  }
  function ma(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  var Kr = "se-popper-host";
  function va() {
    let e = document.getElementById(Kr);
    if (e?.shadowRoot) return e.shadowRoot;
    e || ((e = document.createElement("div")), (e.id = Kr), document.body.appendChild(e));
    let t = e.attachShadow({ mode: "open" }),
      r = document.createElement("style");
    return ((r.textContent = Ye), t.appendChild(r), t);
  }
  function Vr(e) {
    let r = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof r == "string" ? r : null;
  }
  function Ft(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let r = JSON.parse(t);
      if (Array.isArray(r)) return r;
    } catch {}
    return [];
  }
  function Yr(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var ba = "[data-label], [data-label-attrs]";
  function dt() {
    return Array.from(document.querySelectorAll(ba));
  }
  function Se() {
    (qe?.remove(),
      (qe = null),
      document.querySelectorAll(`.${Ee}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function Xr(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let r = Ft(e.target),
        n = r.findIndex((o) => o.attr === e.attr);
      n >= 0 && ((r[n] = { ...r[n], original: t }), Yr(e.target, r));
    }
  }
  async function ha(e, t, r) {
    let n = r.querySelector(".lp-err"),
      o = r.querySelector('[data-action="save"]'),
      i = _e(e.key),
      a = Vr(e.key),
      s = Nr(i ?? a ?? ""),
      d = Nr(t),
      c = s.filter((g) => !d.includes(g)),
      l = d.filter((g) => !s.includes(g));
    if (c.length || l.length) {
      if (n) {
        let g = [];
        (c.length && g.push(`missing {{${c.join("}}, {{")}}}`),
          l.length && g.push(`unknown {{${l.join("}}, {{")}}}`),
          (n.textContent = `Placeholders must match exactly \u2014 ${g.join("; ")}.`));
      }
      return;
    }
    let f = e.variables ?? {},
      p = pt(t, f);
    (Xr(e, p),
      je(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let u = ir(),
      m = rt(),
      x = Gr;
    if (!x || (!u && !m)) {
      Se();
      return;
    }
    ((o.disabled = !0), (o.textContent = "Saving\u2026"), n && (n.textContent = ""));
    try {
      if (u) await x.upsertDraftKey(u, e.key, t);
      else if (m) {
        let g = Jr.find((L) => L.key === e.key && L.profileId === m);
        g && (await x.updateKeyById(g.id, t));
      }
      Se();
    } catch (g) {
      ((o.disabled = !1),
        (o.textContent = "Save"),
        n && (n.textContent = g instanceof Error ? g.message : String(g)));
    }
  }
  function xa(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function ya(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: xa(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    )
      for (let r of Ft(e)) t.push({ kind: "attr", key: r.key, target: e, attr: r.attr });
    return t;
  }
  function Fr(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function wa(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let r = e.key.split(".").pop() || e.key;
    return t.filter((o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === r).length > 1
      ? e.key
      : r;
  }
  function ka(e, t) {
    (Se(), e.classList.add("__se_label_active"));
    let r = ya(e);
    if (r.length === 0) return;
    let o = rt() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let d = `<div class="lp-tabs">${r
      .map((T, P) => {
        let G = wa(T, r),
          re = P === 0 ? "lp-tab active" : "lp-tab",
          v = T.kind === "attr" ? `@<span class="lp-tab-attr">${Q(T.attr ?? "")}</span>` : Q(G);
        return `<button class="${re}" data-surface-idx="${P}">${v}</button>`;
      })
      .join("")}</div>`;
    ((s.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono"></span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    ${d}
    <div class="lp-body"></div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      va().appendChild(s));
    let l = s.querySelector(".lp-key"),
      f = s.querySelector(".lp-body"),
      p = s.querySelector(".lp-err"),
      u = s.querySelector('[data-action="save"]'),
      m = s.querySelector('[data-action="reset"]');
    function x() {
      return r[a];
    }
    function g() {
      let T = x();
      (i.has(a) || i.set(a, Fr(T)), (l.textContent = T.key));
      let P = Vr(T.key),
        re = _e(T.key) ?? P ?? Fr(T),
        v = T.variables ?? {},
        E = Object.entries(v),
        U = E.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${E.map(([me, be]) => `<div class="lp-var"><span class="lp-var-k mono">${Q(`{{${me}}}`)}</span><span class="lp-var-v">${Q(String(be))}</span></div>`).join("")}</div>
        </div>`
          : "",
        J = T.desc ?? "",
        de = T.kind === "attr" ? `attribute \xB7 ${Q(T.attr ?? "")}` : "text content";
      ((f.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${Q(re)}</textarea>
      </div>
      ${U}
      <div class="lp-field">
        <label>Current profile</label>
        <span>${Q(o)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${de}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${J ? "" : "empty"}">${J ? Q(J) : "No description"}</span>
      </div>`),
        (p.textContent = ""),
        (u.disabled = !1),
        (u.textContent = "Save"));
      let ge = f.querySelector(".lp-input");
      (ge.focus(), ge.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((T) => {
      T.addEventListener("click", () => {
        let P = Number(T.dataset.surfaceIdx);
        P !== a &&
          ((a = P),
          s.querySelectorAll(".lp-tab").forEach((G, re) => {
            G.classList.toggle("active", re === a);
          }),
          g());
      });
    }),
      g());
    let L = e.getBoundingClientRect(),
      k = s.offsetHeight,
      S = s.offsetWidth,
      h = 8,
      C = L.bottom + h;
    C + k > window.innerHeight - 8 && (C = Math.max(8, L.top - k - h));
    let y = L.left;
    (y + S > window.innerWidth - 8 && (y = Math.max(8, window.innerWidth - S - 8)),
      (s.style.top = `${C}px`),
      (s.style.left = `${y}px`),
      s.querySelector(".lp-close").addEventListener("click", Se),
      u.addEventListener("click", () => {
        let T = f.querySelector(".lp-input");
        ha(x(), T.value, s);
      }),
      m.addEventListener("click", () => {
        let T = x(),
          P = i.get(a) ?? "";
        (Xr(T, P),
          je(T.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: T.key, value: null } }),
          ),
          Se());
      }),
      s.addEventListener("click", (T) => T.stopPropagation()),
      s.addEventListener("mousedown", (T) => T.stopPropagation()),
      (qe = s));
  }
  function Ge(e, t, r) {
    if (((Kt = e), Ut?.(), (Ut = null), !e)) {
      Se();
      for (let p of dt()) p.classList.remove(Ee);
      Ur();
      return;
    }
    ga();
    for (let p of dt()) p.classList.add(Ee);
    function n(p) {
      return qe !== null && p.composedPath().includes(qe);
    }
    function o(p) {
      for (let u of p.composedPath())
        if (
          u instanceof HTMLElement &&
          (u.hasAttribute("data-label") || u.hasAttribute("data-label-attrs"))
        )
          return u;
      return null;
    }
    let i = [
      "mousedown",
      "mouseup",
      "mouseover",
      "mouseout",
      "pointerdown",
      "pointerup",
      "pointerover",
      "pointerout",
      "touchstart",
      "touchend",
      "dblclick",
      "contextmenu",
      "submit",
      "auxclick",
    ];
    function a(p) {
      return "altKey" in p && typeof p.altKey == "boolean" && p.altKey;
    }
    function s(p) {
      n(p) ||
        (o(p) && (a(p) || (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation())));
    }
    function d(p) {
      if (n(p)) return;
      let u = o(p);
      u &&
        (a(p) || (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation(), ka(u, t)));
    }
    function c(p) {
      qe && (n(p) || o(p) || Se());
    }
    function l(p) {
      p.key === "Escape" && Se();
    }
    let f = new MutationObserver(() => {
      if (Kt) {
        for (let p of dt()) p.classList.add(Ee);
        r();
      }
    });
    f.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let p of i) document.addEventListener(p, s, !0);
    (document.addEventListener("click", d, !0),
      document.addEventListener("mousedown", c, !0),
      document.addEventListener("keydown", l),
      (Ut = () => {
        for (let p of i) document.removeEventListener(p, s, !0);
        (document.removeEventListener("click", d, !0),
          document.removeEventListener("mousedown", c, !0),
          document.removeEventListener("keydown", l),
          f.disconnect());
        for (let p of dt()) p.classList.remove(Ee);
        Ur();
      }));
  }
  function $a(e) {
    let t = { name: "", path: "", children: new Map(), leaves: [] };
    for (let r of e) {
      if (!r.key) continue;
      let n = r.key.split(".").filter((i) => i !== "");
      if (n.length === 0) continue;
      let o = t;
      for (let i = 0; i < n.length - 1; i++) {
        let a = n[i],
          s = o.children.get(a);
        (s ||
          ((s = { name: a, path: o.path ? `${o.path}.${a}` : a, children: new Map(), leaves: [] }),
          o.children.set(a, s)),
          (o = s));
      }
      o.leaves.push(r);
    }
    return t;
  }
  function Zr(e) {
    let t = e.leaves.length;
    for (let r of e.children.values()) t += Zr(r);
    return t;
  }
  function Ea(e, t) {
    let r = t.split("-")[0].toLowerCase();
    return (
      e.find((n) => n.name.toLowerCase().startsWith(`${r}:`)) ??
      e.find((n) => n.name.toLowerCase().startsWith(`${r}-`)) ??
      e.find((n) => n.name.toLowerCase() === r) ??
      null
    );
  }
  function Sa(e) {
    let t = new Set(),
      r = [];
    for (let n of e) {
      let o = n.name.split(/[:_-]/)[0]?.toLowerCase() ?? "";
      !o ||
        t.has(o) ||
        (t.add(o), r.push({ code: o, flag: o.toUpperCase().slice(0, 2), name: n.name }));
    }
    return r.length > 0 ? r : [{ code: "en", flag: "EN", name: "English" }];
  }
  async function Qr(e, t, r, n, o) {
    ((e.innerHTML = '<div class="dtf-load"><div class="topstrip"></div></div>'), (Gr = t));
    let i, a, s;
    try {
      [i, a] = await Promise.all([t.profiles(), t.drafts()]);
      let S = rt() ?? Ea(i, o.locale)?.id ?? ua(i);
      s = await t.keys(S ?? void 0);
    } catch (k) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load labels: ${Q(String(k))}</div>`;
      return;
    }
    if (((Jr = s), s.length === 0)) {
      e.innerHTML = `
      <div class="dtf-empty">
        <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">A</div></div>
        <h3>No <em>translation keys</em> yet</h3>
        <p>Add keys in the admin and group them by namespace (e.g. checkout.title).</p>
      </div>`;
      return;
    }
    let d = e.getRootNode().querySelector("select[data-locale]"),
      c = Sa(i);
    d &&
      ((d.innerHTML = c
        .map(
          (k) =>
            `<option value="${Q(k.code)}"${k.code === o.locale.split("-")[0] ? " selected" : ""}>${Q(k.flag)} \xB7 ${Q(k.name)}</option>`,
        )
        .join("")),
      (d.onchange = () => o.setLocale(d.value)));
    let l = r.search.trim().toLowerCase(),
      f = l ? s.filter((k) => k.key.toLowerCase().includes(l)) : s,
      p = $a(f),
      u = new Map(),
      m = null;
    function x() {
      let k = f.length;
      ((e.innerHTML =
        `<div class="dtf-group">All keys
        <span class="cov-mini" title="${Q(o.locale)} coverage">${k}/${s.length}</span>
        <span class="pulse"><span class="d"></span>${k} ${r.view === "page" ? "rendered" : "total"}</span>
      </div>` + g(p, 0)),
        e.querySelectorAll(".dtf-tree-node[data-tree]").forEach((S) => {
          S.addEventListener("click", () => {
            let h = S.dataset.tree;
            (u.set(h, !(u.get(h) ?? !0)), x());
          });
        }),
        e.querySelectorAll(".dtf-lbl-row[data-key]").forEach((S) => {
          S.addEventListener("click", (h) => {
            if (
              h.target.closest(".dtf-copy") ||
              h.target.closest("textarea") ||
              h.target.closest("button")
            )
              return;
            let C = S.dataset.key;
            ((m = m === C ? null : C), x());
          });
        }),
        e.querySelectorAll("textarea[data-edit-key]").forEach((S) => {
          (S.addEventListener("input", () => {}),
            S.addEventListener("blur", () => {
              let h = S.dataset.editKey,
                C = f.find((y) => y.key === h)?.value ?? "";
              S.value === C ? je(h, null) : je(h, S.value);
            }));
        }));
    }
    function g(k, S) {
      let h = "",
        C = Array.from(k.children.values()).sort((y, T) => y.name.localeCompare(T.name));
      for (let y of C) {
        let T = u.get(y.path) ?? !0,
          P = Zr(y);
        if (
          ((h += `
        <div class="dtf-tree-node" style="padding-left:${12 + S * 14}px" data-tree="${Q(y.path)}">
          <span class="caret">${T ? "\u25BE" : "\u25B8"}</span>
          <span class="seg">${Q(y.name)}</span>
          <span class="dotpath">${Q(y.path)}</span>
          <span class="counts"><span class="t">${P}</span></span>
        </div>`),
          T)
        ) {
          h += g(y, S + 1);
          for (let G of y.leaves) h += L(G, S + 1);
        }
      }
      if (S === 0) for (let y of k.leaves) h += L(y, 0);
      return h;
    }
    function L(k, S) {
      let h = m === k.key,
        C = _e(k.key),
        y = C ?? k.value,
        T = !y,
        P = k.key.split(".").pop() ?? k.key,
        G = T ? "missing" : C !== null ? "edited" : "ok",
        re = T ? "\u2298" : C !== null ? "\u270E" : "\u25CF";
      return `
      <div class="dtf-lbl-row${h ? " expanded" : ""}${T ? " missing" : ""}" style="padding-left:${12 + S * 14}px" data-key="${Q(k.key)}" title="${Q(k.key)}">
        <span class="lbl-pill ${G}" title="${G}">${re}</span>
        <div class="meta">
          <div class="src">
            ${Q(P)}
            <button class="dtf-copy" data-copy-leaf="${Q(k.key)}" title="Copy value">${Wr}</button>
          </div>
          <div class="sub">
            <span class="k" title="${Q(y)}">${T ? '<em style="color:var(--warn)">\u2014 not translated \u2014</em>' : Q(y)}</span>
          </div>
        </div>
        <span style="width:5px"></span>
      </div>
      <div class="dtf-detail${h ? " open" : ""}">
        <div class="inner"><div class="pad lbl-pad">
          <div class="lbl-edit">
            <div class="hd"><span>${Q(o.locale)}</span></div>
            <textarea data-edit-key="${Q(k.key)}" placeholder="Translate to ${Q(o.locale)}\u2026">${Q(y)}</textarea>
          </div>
          <div class="actions">
            ${t.hideAdminLinks ? "" : `<a target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/i18n/keys">\u2197 Open in dashboard</a>`}
          </div>
        </div></div>
      </div>`;
    }
    (x(),
      e.querySelectorAll("[data-copy-leaf]").forEach((k) => {
        k.addEventListener("click", async (S) => {
          S.stopPropagation();
          let h = k.getAttribute("data-copy-leaf"),
            C = f.find((y) => y.key === h)?.value ?? "";
          try {
            await navigator.clipboard.writeText(C);
          } catch {}
          (k.classList.add("done"),
            (k.innerHTML = La),
            setTimeout(() => {
              (k.classList.remove("done"), (k.innerHTML = Wr));
            }, 900));
        });
      }),
      Pe() && (We(), Kt || Ge(!0, n, () => x())));
  }
  var Wr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    La =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function en(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function tn(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, displaySurface: "browser" },
        audio: !1,
        preferCurrentTab: !0,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        systemAudio: "exclude",
        monitorTypeSurfaces: "exclude",
      }),
      r = en(e);
    try {
      let n = document.createElement("video");
      ((n.srcObject = t),
        (n.muted = !0),
        (n.playsInline = !0),
        await new Promise((c, l) => {
          let f = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((n.onloadedmetadata = () => {
            (clearTimeout(f), c());
          }),
            (n.onerror = () => {
              (clearTimeout(f), l(new Error("Capture stream errored")));
            }));
        }),
        await n.play(),
        await new Promise((c) => requestAnimationFrame(() => c(null))),
        await new Promise((c) => requestAnimationFrame(() => c(null))));
      let o = n.videoWidth,
        i = n.videoHeight;
      if (!o || !i) throw new Error("Capture stream returned no frames.");
      let a = document.createElement("canvas");
      ((a.width = o), (a.height = i));
      let s = a.getContext("2d");
      if (!s) throw new Error("Canvas 2d context unavailable");
      return (
        s.drawImage(n, 0, 0, o, i),
        await new Promise((c, l) => {
          a.toBlob((f) => (f ? c(f) : l(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((n) => n.stop()), r());
    }
  }
  async function rn(e, t) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let r = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, displaySurface: "browser" },
        audio: !0,
        preferCurrentTab: !0,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        monitorTypeSurfaces: "exclude",
      }),
      n = en(e);
    await new Promise((c) => requestAnimationFrame(() => c(null)));
    let i =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((c) =>
          MediaRecorder.isTypeSupported(c),
        ) ?? "",
      a = i ? new MediaRecorder(r, { mimeType: i }) : new MediaRecorder(r),
      s = [];
    (a.addEventListener("dataavailable", (c) => {
      c.data && c.data.size > 0 && s.push(c.data);
    }),
      a.start(500),
      r.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), a.state !== "inactive" && a.stop(), t?.());
      }));
    function d() {
      (r.getTracks().forEach((c) => c.stop()), n());
    }
    return {
      stop() {
        return new Promise((c, l) => {
          if (a.state === "inactive") {
            if ((d(), s.length === 0)) {
              l(new Error("No recording data."));
              return;
            }
            c(new Blob(s, { type: i || "video/webm" }));
            return;
          }
          (a.addEventListener(
            "stop",
            () => {
              (d(), c(new Blob(s, { type: i || "video/webm" })));
            },
            { once: !0 },
          ),
            a.addEventListener("error", (f) => l(f), { once: !0 }),
            a.stop());
        });
      },
      cancel() {
        (a.state !== "inactive" && a.stop(), d());
      },
    };
  }
  var nn = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function on(e) {
    let t = URL.createObjectURL(e),
      r = await new Promise((v, E) => {
        let U = new Image();
        ((U.onload = () => v(U)),
          (U.onerror = () => E(new Error("Failed to load screenshot for annotation."))),
          (U.src = t));
      }),
      n = document.createElement("div");
    n.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), n.appendChild(o));
    let i = "pen",
      a = nn[0],
      s = [];
    function d(v) {
      ((i = v),
        o
          .querySelectorAll("[data-tool]")
          .forEach((E) => E.classList.toggle("on", E.dataset.tool === v)));
    }
    function c(v, E, U) {
      let J = document.createElement("button");
      return (
        (J.type = "button"),
        (J.className = "se-annot-btn"),
        (J.dataset.tool = v),
        (J.textContent = E),
        (J.title = U),
        J.addEventListener("click", () => d(v)),
        J
      );
    }
    (o.appendChild(c("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(c("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(c("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(c("text", "T text", "Text (T)")),
      d("pen"));
    let l = document.createElement("span");
    ((l.className = "se-annot-sep"), o.appendChild(l));
    for (let v of nn) {
      let E = document.createElement("button");
      ((E.type = "button"),
        (E.className = "se-annot-swatch"),
        (E.dataset.color = v),
        (E.style.background = v),
        v === a && E.classList.add("on"),
        E.addEventListener("click", () => {
          ((a = v),
            o
              .querySelectorAll("[data-color]")
              .forEach((U) => U.classList.toggle("on", U.dataset.color === v)));
        }),
        o.appendChild(E));
    }
    let f = document.createElement("button");
    ((f.type = "button"),
      (f.className = "se-annot-btn"),
      (f.textContent = "\u21B6 undo"),
      (f.title = "Undo (Ctrl/Cmd+Z)"),
      f.addEventListener("click", () => {
        (s.pop(), C());
      }),
      o.appendChild(f));
    let p = document.createElement("button");
    ((p.type = "button"),
      (p.className = "se-annot-btn"),
      (p.textContent = "clear"),
      p.addEventListener("click", () => {
        ((s.length = 0), C());
      }),
      o.appendChild(p));
    let u = document.createElement("div");
    ((u.className = "se-annot-stage"), n.appendChild(u));
    let m = document.createElement("canvas");
    ((m.width = r.naturalWidth),
      (m.height = r.naturalHeight),
      (m.className = "se-annot-canvas"),
      (m.style.cursor = "crosshair"),
      (m.style.touchAction = "none"),
      u.appendChild(m));
    let x = m.getContext("2d"),
      g = null;
    function L(v) {
      let E = m.getBoundingClientRect(),
        U = m.width / E.width,
        J = m.height / E.height;
      return { x: (v.clientX - E.left) * U, y: (v.clientY - E.top) * J };
    }
    function k() {
      return Math.max(2, Math.round(r.naturalWidth / 400));
    }
    function S() {
      return Math.max(14, Math.round(r.naturalWidth / 60));
    }
    function h(v) {
      if (
        (x.save(),
        (x.strokeStyle = v.color),
        (x.fillStyle = v.color),
        (x.lineWidth = k()),
        (x.lineCap = "round"),
        (x.lineJoin = "round"),
        v.tool === "rect")
      ) {
        let E = Math.min(v.x1, v.x2),
          U = Math.min(v.y1, v.y2),
          J = Math.abs(v.x2 - v.x1),
          de = Math.abs(v.y2 - v.y1);
        x.strokeRect(E, U, J, de);
      } else if (v.tool === "arrow") {
        (x.beginPath(), x.moveTo(v.x1, v.y1), x.lineTo(v.x2, v.y2), x.stroke());
        let E = Math.atan2(v.y2 - v.y1, v.x2 - v.x1),
          U = k() * 5;
        (x.beginPath(),
          x.moveTo(v.x2, v.y2),
          x.lineTo(v.x2 - U * Math.cos(E - Math.PI / 6), v.y2 - U * Math.sin(E - Math.PI / 6)),
          x.lineTo(v.x2 - U * Math.cos(E + Math.PI / 6), v.y2 - U * Math.sin(E + Math.PI / 6)),
          x.closePath(),
          x.fill());
      } else if (v.tool === "pen")
        if (v.points.length < 2) {
          if (v.points.length === 1) {
            let E = v.points[0];
            (x.beginPath(), x.arc(E.x, E.y, k() / 2, 0, Math.PI * 2), x.fill());
          }
        } else {
          (x.beginPath(), x.moveTo(v.points[0].x, v.points[0].y));
          for (let E = 1; E < v.points.length; E++) x.lineTo(v.points[E].x, v.points[E].y);
          x.stroke();
        }
      else if (v.tool === "text" && v.text) {
        let E = S();
        ((x.font = `600 ${E}px ui-sans-serif, system-ui, sans-serif`), (x.textBaseline = "top"));
        let U = E * 0.3,
          de = x.measureText(v.text).width + U * 2,
          ge = E + U * 2;
        ((x.fillStyle = "rgba(0,0,0,0.55)"),
          x.fillRect(v.x1, v.y1, de, ge),
          (x.fillStyle = v.color),
          x.fillText(v.text, v.x1 + U, v.y1 + U));
      }
      x.restore();
    }
    function C(v) {
      (x.clearRect(0, 0, m.width, m.height), x.drawImage(r, 0, 0));
      for (let E of s) h(E);
      v && h(v);
    }
    C();
    let y = null;
    function T(v, E) {
      y && y.blur();
      let U = m.getBoundingClientRect(),
        J = u.getBoundingClientRect(),
        de = U.width / m.width,
        ge = U.height / m.height,
        me = S() * de,
        be = me * 0.3,
        Y = document.createElement("input");
      ((Y.type = "text"),
        (Y.className = "se-annot-text-input"),
        (Y.style.position = "absolute"),
        (Y.style.left = `${U.left - J.left + v * de}px`),
        (Y.style.top = `${U.top - J.top + E * ge}px`),
        (Y.style.color = a),
        (Y.style.background = "rgba(0,0,0,0.55)"),
        (Y.style.border = `1px dashed ${a}`),
        (Y.style.outline = "none"),
        (Y.style.padding = `${be}px`),
        (Y.style.font = `600 ${me}px ui-sans-serif, system-ui, sans-serif`),
        (Y.style.minWidth = `${me * 4}px`),
        (Y.style.lineHeight = "1"),
        (Y.placeholder = "type\u2026"));
      let b = !1;
      function w() {
        if (b) return;
        b = !0;
        let q = Y.value.trim();
        (Y.remove(),
          (y = null),
          q && (s.push({ tool: "text", color: a, x1: v, y1: E, text: q }), C()));
      }
      function F() {
        b || ((b = !0), Y.remove(), (y = null));
      }
      (Y.addEventListener("keydown", (q) => {
        (q.key === "Enter"
          ? (q.preventDefault(), w())
          : q.key === "Escape" && (q.preventDefault(), F()),
          q.stopPropagation());
      }),
        Y.addEventListener("blur", w),
        u.appendChild(Y),
        (y = Y),
        setTimeout(() => Y.focus(), 0));
    }
    let P = null;
    (m.addEventListener("pointermove", (v) => {
      ((g = L(v)),
        P &&
          (P.kind === "pen"
            ? (P.shape.points.push(g), C())
            : C({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: P.x1,
                y1: P.y1,
                x2: g.x,
                y2: g.y,
              })));
    }),
      m.addEventListener("pointerdown", (v) => {
        v.preventDefault();
        let E = L(v);
        if (((g = E), i === "text")) {
          T(E.x, E.y);
          return;
        }
        if (i === "pen") {
          let U = { tool: "pen", color: a, points: [E] };
          (s.push(U), (P = { kind: "pen", shape: U }), m.setPointerCapture(v.pointerId), C());
          return;
        }
        ((P = { kind: "shape", x1: E.x, y1: E.y }), m.setPointerCapture(v.pointerId));
      }),
      m.addEventListener("pointerup", (v) => {
        if (!P) return;
        let E = L(v);
        if (P.kind === "shape") {
          let U = Math.abs(E.x - P.x1),
            J = Math.abs(E.y - P.y1);
          (U > 4 || J > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: P.x1, y1: P.y1, x2: E.x, y2: E.y });
        }
        ((P = null), C());
      }));
    function G(v) {
      if (!(v instanceof HTMLElement)) return !1;
      let E = v.tagName;
      return E === "INPUT" || E === "TEXTAREA" || v.isContentEditable;
    }
    function re(v) {
      if (!n.isConnected) {
        document.removeEventListener("keydown", re, !0);
        return;
      }
      if (G(v.target)) return;
      let E = v.key.toLowerCase();
      if ((v.ctrlKey || v.metaKey) && E === "z") {
        (v.preventDefault(), s.pop(), C());
        return;
      }
      if (!(v.ctrlKey || v.metaKey || v.altKey))
        if (E === "t") {
          (v.preventDefault(), d("text"));
          let U = g ?? { x: m.width / 2, y: m.height / 2 };
          T(U.x, U.y);
        } else E === "p" ? d("pen") : E === "a" ? d("arrow") : E === "r" && d("rect");
    }
    return (
      document.addEventListener("keydown", re, !0),
      {
        root: n,
        async export() {
          (y && y.blur(), await new Promise((E) => requestAnimationFrame(() => E(null))));
          let v = await new Promise((E, U) => {
            m.toBlob((J) => (J ? E(J) : U(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", re, !0), v);
        },
      }
    );
  }
  var _a = {
      open: "badge-run",
      triaged: "badge-run",
      in_progress: "badge-run",
      resolved: "badge-on",
      wont_fix: "badge-off",
    },
    Ta = {
      open: "badge-run",
      considering: "badge-run",
      planned: "badge-draft",
      shipped: "badge-on",
      declined: "badge-off",
    },
    Ra = { critical: "badge-warn", important: "badge-run", nice_to_have: "badge-draft" };
  function Wt(e, t) {
    return `<span class="badge ${t}">${$(e.replace(/_/g, " "))}</span>`;
  }
  async function ln(e, t, r, n) {
    let o = e.getRootNode(),
      i = null,
      a = new Map(),
      s = new Map();
    function d(g) {
      let L = a.get(g);
      return (L || ((L = t.bug(g)), a.set(g, L)), L);
    }
    function c(g) {
      let L = a.get(g);
      return (L || ((L = t.featureRequest(g)), a.set(g, L)), L);
    }
    function l(g) {
      let L = s.get(g);
      return (L || ((L = t.attachmentBlob(g).then((k) => URL.createObjectURL(k))), s.set(g, L)), L);
    }
    n.pendingForm && ((i = n.pendingForm), n.consumePendingForm?.());
    async function f() {
      if (i === "bug") {
        Ha(e, t, r, o, () => {
          ((i = null), f());
        });
        return;
      }
      if (i === "feature") {
        Oa(e, t, () => {
          ((i = null), f());
        });
        return;
      }
      await p();
    }
    async function p() {
      ((e.innerHTML = `
      <div class="se-fb-subtabs">
        <button class="${n.sub === "bugs" ? "active" : ""}" data-sub="bugs">${A.bug} Bugs <span class="c">\u2026</span></button>
        <button class="${n.sub === "features" ? "active" : ""}" data-sub="features">${A.sparkles} Feature requests <span class="c">\u2026</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${n.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${t.hideAdminLinks ? "" : `<a class="ibtn" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/${n.sub === "bugs" ? "bugs" : "feature-requests"}">${A.external} Open dashboard</a>`}
      </div>
      <div class="se-feedback-list" data-list></div>`),
        e.querySelectorAll("[data-sub]").forEach((L) => {
          L.addEventListener("click", () => n.setSub(L.dataset.sub));
        }),
        e.querySelector('[data-action="file"]').addEventListener("click", () => {
          ((i = n.sub === "bugs" ? "bug" : "feature"), f());
        }));
      let g = e.querySelector("[data-list]");
      if (((g.innerHTML = $e()), n.sub === "bugs")) {
        let L;
        try {
          L = await t.bugs();
        } catch (h) {
          g.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(h))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="bugs"] .c');
        k.textContent = String(L.length);
        let S = e.querySelector('[data-sub="features"] .c');
        try {
          let h = await t.featureRequests();
          S.textContent = String(h.length);
        } catch {
          S.textContent = "?";
        }
        u(g, L);
      } else {
        let L;
        try {
          L = await t.featureRequests();
        } catch (h) {
          g.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(h))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="features"] .c');
        k.textContent = String(L.length);
        let S = e.querySelector('[data-sub="bugs"] .c');
        try {
          let h = await t.bugs();
          S.textContent = String(h.length);
        } catch {
          S.textContent = "?";
        }
        m(g, L);
      }
    }
    function u(g, L) {
      if (L.length === 0) {
        let { html: h, wire: C } = fe({
          title: "No <em>bugs</em> filed yet",
          message: "Spotted something off on this page? File a bug with a screenshot or recording.",
          actions: [
            {
              icon: "+",
              label: "File a bug",
              onClick: () => {
                ((i = "bug"), f());
              },
            },
            ...(t.hideAdminLinks
              ? []
              : [{ label: "Open dashboard", href: `${t.adminUrl}/dashboard/bugs` }]),
          ],
        });
        ((g.innerHTML = h), C(g));
        return;
      }
      let k = new Set(),
        S = () => {
          ((g.innerHTML = L.map(
            (h) => `
          <div class="se-feedback-row${k.has(h.id) ? " expanded" : ""}" data-id="${$(h.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(h.title)}</div>
              <div class="row-sub">${$(pe(h.createdAt))}${h.reporterEmail ? " \xB7 " + $(h.reporterEmail) : ""}</div>
            </div>
            ${Wt(h.status, _a[h.status])}
          </div>
          <div class="se-feedback-detail${k.has(h.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${$(h.pageUrl ?? "\u2014")}</span>
                <span class="k">filed</span><span>${$(pe(h.createdAt))}${h.reporterEmail ? " \xB7 " + $(h.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(h.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/bugs/${$(h.id)}">${A.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            g.querySelectorAll("[data-id]").forEach((h) => {
              h.addEventListener("click", () => {
                let C = h.dataset.id;
                (k.has(C) ? k.delete(C) : k.add(C), S());
              });
            }));
          for (let h of k) {
            let C = g.querySelector(`[data-attach-slot="${h}"]`);
            C && x(C, d(h));
          }
        };
      S();
    }
    function m(g, L) {
      if (L.length === 0) {
        let { html: h, wire: C } = fe({
          title: "No <em>feature requests</em> yet",
          message: "Capture asks from the field with importance, status, and a clean trail.",
          actions: [
            {
              icon: "+",
              label: "Request a feature",
              onClick: () => {
                ((i = "feature"), f());
              },
            },
            ...(t.hideAdminLinks
              ? []
              : [{ label: "Open dashboard", href: `${t.adminUrl}/dashboard/feature-requests` }]),
          ],
        });
        ((g.innerHTML = h), C(g));
        return;
      }
      let k = new Set(),
        S = () => {
          ((g.innerHTML = L.map(
            (h) => `
          <div class="se-feedback-row${k.has(h.id) ? " expanded" : ""}" data-id="${$(h.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(h.title)}</div>
              <div class="row-sub">${$(pe(h.createdAt))}${h.reporterEmail ? " \xB7 " + $(h.reporterEmail) : ""}</div>
            </div>
            ${Wt(h.importance, Ra[h.importance])}
            ${Wt(h.status, Ta[h.status])}
          </div>
          <div class="se-feedback-detail${k.has(h.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${$(h.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${$(pe(h.createdAt))}${h.reporterEmail ? " \xB7 " + $(h.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(h.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/feature-requests/${$(h.id)}">${A.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            g.querySelectorAll("[data-id]").forEach((h) => {
              h.addEventListener("click", () => {
                let C = h.dataset.id;
                (k.has(C) ? k.delete(C) : k.add(C), S());
              });
            }));
          for (let h of k) {
            let C = g.querySelector(`[data-attach-slot="${h}"]`);
            C && x(C, c(h));
          }
        };
      S();
    }
    function x(g, L) {
      g.dataset.hydrated !== "1" &&
        ((g.dataset.hydrated = "1"),
        (g.innerHTML = '<div class="se-attach-slot-loading">Loading attachments\u2026</div>'),
        L.then((k) => {
          if (g.isConnected) {
            if (k.attachments.length === 0) {
              g.innerHTML = "";
              return;
            }
            ((g.innerHTML = `<div class="se-attach-grid">${k.attachments.map(Ma).join("")}</div>`),
              g.querySelectorAll("[data-thumb-fetch]").forEach((S) => {
                let h = S.dataset.thumbFetch;
                l(h)
                  .then((C) => {
                    S.isConnected &&
                      ((S.style.backgroundImage = `url('${C}')`), S.classList.add("has-image"));
                  })
                  .catch(() => {});
              }),
              g.querySelectorAll("[data-preview-id]").forEach((S) => {
                S.addEventListener("click", async (h) => {
                  h.stopPropagation();
                  let C = S.dataset.previewId,
                    y = k.attachments.find((T) => T.id === C);
                  if (y)
                    try {
                      let T = await l(C);
                      cn(r, { kind: y.kind, filename: y.filename, url: T, sizeBytes: y.sizeBytes });
                    } catch (T) {
                      console.error(T);
                    }
                });
              }));
          }
        }).catch((k) => {
          g.isConnected &&
            (g.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${$(String(k))}</div>`);
        }));
    }
    await f();
  }
  function dn(e, t) {
    e.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${A.arrowLeft} Back</button>
        <span class="k" style="margin-left:8px">${$(t.title)}</span>
      </div>
      <div class="bd">${t.bodyHtml}</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    </div>`;
    let r = e.querySelector(".dtf-inline-form"),
      n = !1,
      o = () => {
        if (!t.isDirty() || n) return i();
        n = !0;
        let s = document.createElement("div");
        ((s.className = "dtf-discard"),
          (s.innerHTML = `${A.alert}<span>Discard your changes?</span><span style="flex:1"></span>
      <button class="ibtn" data-action="keep">Keep editing</button>
      <button class="ibtn danger" data-action="discard">Discard</button>`),
          r.querySelector(".hd").after(s),
          s.querySelector('[data-action="keep"]').addEventListener("click", () => {
            (s.remove(), (n = !1));
          }),
          s.querySelector('[data-action="discard"]').addEventListener("click", () => i()));
      },
      i = () => {
        (document.removeEventListener("keydown", a), t.onCancel());
      },
      a = (s) => {
        s.key === "Escape" && o();
      };
    return (
      document.addEventListener("keydown", a),
      r.querySelectorAll('[data-action="cancel"]').forEach((s) => {
        s.addEventListener("click", () => o());
      }),
      r.querySelector('[data-action="submit"]').addEventListener("click", async () => {
        await t.onSubmit();
      }),
      { host: r, close: i }
    );
  }
  function Ma(e) {
    let t = $(e.id),
      r = e.kind === "screenshot" || e.kind === "recording",
      n =
        e.kind === "screenshot"
          ? `<div class="preview screenshot" data-preview-id="${t}" data-thumb-fetch="${t}">
           <span class="scrim">click to preview</span>
         </div>`
          : e.kind === "recording"
            ? `<div class="preview recording" data-preview-id="${t}">
             <div class="play">${A.playFilled}</div>
             <span class="scrim">click to play</span>
           </div>`
            : `<div class="preview file">${A.file}<span class="ext">.${$(pn(e.filename))}</span></div>`,
      o = e.kind === "screenshot" ? A.camera : e.kind === "recording" ? A.record : A.file;
    return `
    <div class="se-attach-card readonly">
      ${n}
      <div class="meta">
        <span class="ic">${o}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(nt(e.sizeBytes))}</span>
      </div>
    </div>`;
  }
  function Aa(e) {
    let t = e.previewUrl ? ` style="background-image:url('${e.previewUrl}')"` : "",
      r = e.previewUrl && (e.kind === "screenshot" || e.kind === "recording"),
      n = e.kind === "screenshot" || e.kind === "recording",
      o =
        e.kind === "screenshot"
          ? `<div class="preview screenshot${r ? " has-image" : ""}" data-preview="${$(e.id)}"${t}>
           ${n ? '<span class="scrim">click to preview</span>' : ""}
         </div>`
          : e.kind === "recording"
            ? `<div class="preview recording${r ? " has-image" : ""}" data-preview="${$(e.id)}"${t}>
             <div class="play">${A.playFilled}</div>
             ${e.duration ? `<span class="dur">${Pa(e.duration)}</span>` : ""}
             ${n ? '<span class="scrim">click to play</span>' : ""}
           </div>`
            : `<div class="preview file">${A.file}<span class="ext">.${$(pn(e.filename))}</span></div>`,
      i =
        e.progress != null && e.progress < 100
          ? `<div class="progress"><div class="fill" style="width:${e.progress}%"></div></div>`
          : "",
      a = e.kind === "screenshot" ? A.camera : e.kind === "recording" ? A.record : A.file;
    return `
    <div class="se-attach-card" data-attach="${$(e.id)}">
      ${o}
      ${i}
      <button class="rm" data-remove="${$(e.id)}" title="Remove">${A.x}</button>
      <div class="meta">
        <span class="ic">${a}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(nt(e.blob.size))}</span>
      </div>
    </div>`;
  }
  function cn(e, t) {
    if (!t.url) return;
    let r = document.createElement("div");
    r.className = "dtf-lightbox";
    let n = t.kind === "recording";
    ((r.innerHTML = `
    <div class="frame">
      <button class="x" data-action="close" title="Close (Esc)">${A.x}</button>
      ${n ? `<video src="${t.url}" controls autoplay playsinline></video>` : `<img src="${t.url}" alt="${$(t.filename)}" />`}
      <div class="cap">
        <span>${$(t.filename)}</span>
        <span style="color:var(--fg-4)">\xB7</span>
        <span style="color:var(--fg-4)">${$(nt(t.sizeBytes))}</span>
      </div>
    </div>`),
      e.appendChild(r));
    let o = () => {
        (document.removeEventListener("keydown", i, !0), r.remove());
      },
      i = (a) => {
        a.key === "Escape" && (a.preventDefault(), a.stopPropagation(), o());
      };
    (document.addEventListener("keydown", i, !0),
      r.addEventListener("click", (a) => {
        (a.target === r || a.target.closest('[data-action="close"]')) && o();
      }));
  }
  function pn(e) {
    let t = e.lastIndexOf(".");
    return t > 0 ? e.slice(t + 1) : "file";
  }
  function Pa(e) {
    let t = Math.round(e / 1e3);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }
  function Ha(e, t, r, n, o) {
    let i = [],
      a = null,
      s = () => {
        for (let y of i) y.previewUrl && URL.revokeObjectURL(y.previewUrl);
      },
      d = `
    <div class="se-form">
      <label class="se-field" data-field-wrap="title">
        <span class="se-label">Title <span class="se-req">*</span></span>
        <input class="se-input" data-field="title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field" data-field-wrap="steps">
        <span class="se-label">Steps to reproduce <span class="se-req">*</span></span>
        <textarea class="se-input se-textarea" data-field="steps" rows="4"
          placeholder="1. Go to\u2026&#10;2. Click\u2026"></textarea>
      </label>
      <div class="se-field-row">
        <label class="se-field">
          <span class="se-label">Actual result</span>
          <textarea class="se-input se-textarea" data-field="actual" rows="3"></textarea>
        </label>
        <label class="se-field">
          <span class="se-label">Expected result</span>
          <textarea class="se-input se-textarea" data-field="expected" rows="3"></textarea>
        </label>
      </div>
      <label class="se-field">
        <span class="se-label">Priority</span>
        <select class="se-input" data-field="priority">
          <option value="">\u2014 optional \u2014</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div class="se-field">
        <span class="se-label">Attachments</span>
        <div class="se-actions">
          <button type="button" class="ibtn" data-action="screenshot">${A.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${A.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${A.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`,
      c = { title: "", steps: "", actual: "", expected: "", priority: "" },
      l = dn(e, {
        title: "File a bug",
        bodyHtml: d,
        isDirty: () => !!(c.title || c.steps || c.actual || c.expected || i.length),
        onSubmit: C,
        onCancel: () => {
          (s(), o());
        },
      }),
      f = l.host,
      p = f.querySelector("[data-status]"),
      u = (y, T = !1) => {
        ((p.textContent = y), p.classList.toggle("err", T));
      },
      m = f.querySelector("[data-attach-grid]"),
      x = () => {
        ((m.innerHTML = i.map(Aa).join("")),
          m.querySelectorAll("[data-remove]").forEach((y) => {
            y.addEventListener("click", (T) => {
              T.stopPropagation();
              let P = i.findIndex((G) => G.id === y.dataset.remove);
              if (P >= 0) {
                let [G] = i.splice(P, 1);
                G.previewUrl && URL.revokeObjectURL(G.previewUrl);
              }
              x();
            });
          }),
          m.querySelectorAll("[data-preview]").forEach((y) => {
            y.addEventListener("click", (T) => {
              T.stopPropagation();
              let P = i.find((G) => G.id === y.dataset.preview);
              P &&
                P.previewUrl &&
                cn(r, {
                  kind: P.kind,
                  filename: P.filename,
                  url: P.previewUrl,
                  sizeBytes: P.blob.size,
                });
            });
          }));
      },
      g = (y) => {
        (!y.previewUrl &&
          (y.kind === "screenshot" || y.kind === "recording") &&
          (y.previewUrl = URL.createObjectURL(y.blob)),
          i.push(y),
          x());
      };
    (f.querySelectorAll("[data-field]").forEach((y) => {
      let T = () => {
        c[y.dataset.field] = y.value;
        let P = y.closest("[data-field-wrap]");
        P?.classList.contains("invalid") && y.value.trim() && P.classList.remove("invalid");
      };
      (y.addEventListener("input", T), y.addEventListener("change", T));
    }),
      f.querySelector('[data-action="screenshot"]').addEventListener("click", async () => {
        u("Pick a screen/tab to capture\u2026");
        try {
          let y = await tn(n.host);
          (u(""),
            Ca(r, n, y, (T) => {
              g({
                id: "at_" + Math.random().toString(36).slice(2, 7),
                kind: "screenshot",
                filename: `screenshot-${Date.now()}.png`,
                blob: T,
              });
            }));
        } catch (y) {
          u(y instanceof Error ? y.message : String(y), !0);
        }
      }));
    let L = f.querySelector('[data-action="record"]'),
      k = !1;
    async function S() {
      if (!(!a || k)) {
        k = !0;
        try {
          ((L.disabled = !0), u("Finalizing recording\u2026"));
          let y = await a.stop();
          ((a = null),
            L.classList.remove("recording"),
            (L.innerHTML = `${A.record} Record screen`),
            g({
              id: "at_" + Math.random().toString(36).slice(2, 7),
              kind: "recording",
              filename: `recording-${Date.now()}.webm`,
              blob: y,
            }),
            u(""));
        } catch (y) {
          u(y instanceof Error ? y.message : String(y), !0);
        } finally {
          ((L.disabled = !1), (k = !1));
        }
      }
    }
    L.addEventListener("click", async () => {
      if (a) {
        await S();
        return;
      }
      u("Pick a screen/tab to record\u2026");
      try {
        ((a = await rn(n.host, () => {
          S();
        })),
          L.classList.add("recording"),
          (L.innerHTML = `${A.record} Stop recording`),
          u("Recording\u2026"));
      } catch (y) {
        (u(y instanceof Error ? y.message : String(y), !0), (a = null));
      }
    });
    let h = f.querySelector('[data-action="file-input"]');
    (f.querySelector('[data-action="upload"]').addEventListener("click", () => h.click()),
      h.addEventListener("change", () => {
        let y = h.files?.[0];
        if (!y) return;
        let T = y.type.startsWith("image/"),
          P = y.type.startsWith("video/");
        (g({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: T ? "screenshot" : P ? "recording" : "file",
          filename: y.name,
          blob: y,
        }),
          (h.value = ""));
      }));
    async function C() {
      let y = ["title", "steps"],
        T = null;
      for (let P of y) {
        let G = f.querySelector(`[data-field-wrap="${P}"]`),
          re = f.querySelector(`[data-field="${P}"]`),
          v = !c[P].trim();
        (G?.classList.toggle("invalid", v), v && !T && (T = re));
      }
      if (T) {
        (u(""),
          T.scrollIntoView({ block: "center", behavior: "smooth" }),
          T.focus({ preventScroll: !0 }));
        return;
      }
      u("Submitting\u2026");
      try {
        let P = await t.createBug({
          title: c.title.trim(),
          stepsToReproduce: c.steps,
          actualResult: c.actual,
          expectedResult: c.expected,
          priority: c.priority || void 0,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
        for (let G = 0; G < i.length; G++) {
          let re = i[G];
          (u(`Uploading ${G + 1}/${i.length}\u2026`),
            await t.uploadAttachment({
              reportKind: "bug",
              reportId: P.id,
              kind: re.kind,
              filename: re.filename,
              blob: re.blob,
            }));
        }
        (s(), l.close());
      } catch (P) {
        u(P instanceof Error ? P.message : String(P), !0);
      }
    }
  }
  function Ca(e, t, r, n) {
    let o = document.createElement("div");
    ((o.className = "dtf-modal-bg annotate"),
      (o.innerHTML = `
    <div class="dtf-modal lg annot-modal">
      <div class="hd">
        <span class="k">Annotate screenshot</span>
        <button class="x" data-action="close">${A.x}</button>
      </div>
      <div class="bd annot-bd" data-host>Preparing annotator\u2026</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="close">Cancel</button>
        <button class="primary" data-action="save">Use screenshot</button>
      </div>
    </div>`),
      an(o, t),
      e.appendChild(o));
    let i = () => {
      (an(o, t), sn(o));
    };
    window.addEventListener("resize", i);
    let a = () => {
      (window.removeEventListener("resize", i), o.remove());
    };
    (o.querySelectorAll('[data-action="close"]').forEach((d) => d.addEventListener("click", a)),
      o.addEventListener("click", (d) => {
        d.target === o && a();
      }));
    let s = o.querySelector("[data-host]");
    on(r)
      .then((d) => {
        ((s.innerHTML = ""),
          s.appendChild(d.root),
          sn(o),
          o.querySelector('[data-action="save"]').addEventListener("click", async () => {
            let c = await d.export();
            (a(), n(c));
          }));
      })
      .catch((d) => {
        s.innerHTML = `<div class="err">${$(String(d))}</div>`;
      });
  }
  function an(e, t) {
    let r = t.querySelector(".dtf-panel");
    if (((e.style.left = e.style.right = e.style.top = e.style.bottom = ""), !r)) return;
    let n = r.getBoundingClientRect();
    if (n.width === 0 || n.height === 0) return;
    let o = window.innerWidth,
      i = window.innerHeight,
      a = o - n.right,
      s = n.left,
      d = n.top,
      c = i - n.bottom,
      l = Math.min(a, s, d, c),
      f = 12;
    l === a
      ? (e.style.right = `${Math.max(0, o - n.left + f)}px`)
      : l === s
        ? (e.style.left = `${n.right + f}px`)
        : l === d
          ? (e.style.top = `${n.bottom + f}px`)
          : (e.style.bottom = `${Math.max(0, i - n.top + f)}px`);
  }
  function sn(e) {
    let t = e.querySelector(".se-annot-canvas");
    if (!t || !t.width || !t.height) return;
    let r = e.getBoundingClientRect(),
      n = getComputedStyle(e),
      o = parseFloat(n.paddingLeft) + parseFloat(n.paddingRight),
      i = parseFloat(n.paddingTop) + parseFloat(n.paddingBottom),
      a = 118,
      d = Math.max(120, r.width - o - 30),
      c = Math.max(120, r.height - i - a),
      l = t.width / t.height,
      f = d,
      p = f / l;
    (p > c && ((p = c), (f = p * l)),
      (t.style.width = `${Math.floor(f)}px`),
      (t.style.height = `${Math.floor(p)}px`));
  }
  function Oa(e, t, r) {
    let n = { title: "", description: "", useCase: "", importance: "nice_to_have" },
      i = dn(e, {
        title: "Request a feature",
        bodyHtml: `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" data-field="title" placeholder="One-line summary of the feature" />
      </label>
      <label class="se-field">
        <span class="se-label">What would it do?</span>
        <textarea class="se-input se-textarea" data-field="description" rows="4"
          placeholder="Describe the feature you'd like to see."></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Use case / why does it matter?</span>
        <textarea class="se-input se-textarea" data-field="useCase" rows="3"
          placeholder="Who needs this? What does it unlock?"></textarea>
      </label>
      <label class="se-field">
        <span class="se-label">Importance</span>
        <select class="se-input" data-field="importance">
          <option value="nice_to_have">Nice to have</option>
          <option value="important">Important</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <div class="se-status" data-status></div>
    </div>`,
        isDirty: () => !!(n.title || n.description || n.useCase || n.importance !== "nice_to_have"),
        onSubmit: c,
        onCancel: r,
      }),
      a = i.host,
      s = a.querySelector("[data-status]"),
      d = (l, f = !1) => {
        ((s.textContent = l), s.classList.toggle("err", f));
      };
    a.querySelectorAll("[data-field]").forEach((l) => {
      (l.addEventListener("input", () => {
        n[l.dataset.field] = l.value;
      }),
        l.addEventListener("change", () => {
          n[l.dataset.field] = l.value;
        }));
    });
    async function c() {
      if (!n.title.trim()) {
        d("Title is required", !0);
        return;
      }
      d("Submitting\u2026");
      try {
        (await t.createFeatureRequest({
          title: n.title.trim(),
          description: n.description,
          useCase: n.useCase,
          importance: n.importance,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
          i.close());
      } catch (l) {
        d(l instanceof Error ? l.message : String(l), !0);
      }
    }
  }
  var Ia = 200,
    Je = [];
  function za(e, t) {
    (Je.push({ ts: Date.now(), level: e, message: t }), Je.length > Ia && Je.shift());
  }
  typeof window < "u" &&
    window.addEventListener("se:state:update", (e) => {
      let t = e.detail,
        r = "state update";
      if (t && typeof t == "object")
        try {
          r = JSON.stringify(t).slice(0, 200);
        } catch {}
      za("log", r);
    });
  function qa(e, t) {
    let r = e - t;
    return r < 1e3 ? `${r}ms` : r < 6e4 ? `${(r / 1e3).toFixed(1)}s` : `${Math.floor(r / 6e4)}m`;
  }
  function fn(e) {
    if (Je.length === 0) {
      let { html: n, wire: o } = fe({
        title: "No <em>events</em> yet",
        message:
          "SDK evaluations and overrides will stream here as the page interacts with ShipEasy.",
      });
      ((e.innerHTML = n), o(e));
      return;
    }
    let t = Date.now(),
      r = Je.slice().reverse();
    e.innerHTML =
      `<div class="dtf-group">Live event stream<span class="pulse"><span class="d"></span>${r.length}/buf</span></div>` +
      r
        .map(
          (n) => `
      <div class="dtf-event">
        <span class="ts">${qa(t, n.ts)} ago</span>
        <span class="lvl${n.level === "warn" ? " warn" : n.level === "err" ? " err" : ""}">${n.level === "warn" ? "!" : n.level === "err" ? "\xD7" : "\u203A"}</span>
        <span class="msg">${$(n.message)}</span>
        <span class="ms"></span>
      </div>`,
        )
        .join("");
  }
  var un = "sdk_client_6cecf6208cb443faa86b9ce6c007aee4",
    Ba = "https://cdn.shipeasy.ai",
    gn = "__se_devtools_controls_anon";
  function ja() {
    if (typeof window > "u") return "anon_devtools";
    try {
      let t = localStorage.getItem(gn);
      if (t) return t;
    } catch {}
    let e =
      typeof crypto < "u" && typeof crypto.randomUUID == "function"
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}`;
    try {
      localStorage.setItem(gn, e);
    } catch {}
    return e;
  }
  var Da = { hideAdminLinks: !1 },
    Gt = { ...Da },
    Ve = null,
    Jt = new Set();
  function mn() {
    return Gt;
  }
  function vn(e) {
    return (Jt.add(e), () => Jt.delete(e));
  }
  function bn() {
    return un
      ? Ve ||
          ((Ve = (async () => {
            try {
              let e = await fetch(`${Ba}/sdk/evaluate`, {
                method: "POST",
                headers: { "X-SDK-Key": un, "Content-Type": "application/json" },
                body: JSON.stringify({ user: { anonymous_id: ja() } }),
              });
              if (!e.ok) return;
              let n = { hideAdminLinks: !!((await e.json()).flags ?? {})[cr] },
                o = n.hideAdminLinks !== Gt.hideAdminLinks;
              if (((Gt = n), o)) for (let i of Jt) i();
            } catch {
            } finally {
              Ve = null;
            }
          })()),
          Ve)
      : Promise.resolve();
  }
  var Ua = {
      gates: "gates",
      configs: "configs",
      experiments: "experiments",
      labels: "translations",
      feedback: "feedback",
      user: "user",
      events: "events",
    },
    Re = [
      { k: "user", label: "User", icon: A.users, description: "props \xB7 impersonate" },
      { k: "gates", label: "Gates", icon: A.shield, description: "flags & killswitches" },
      { k: "experiments", label: "Experiments", icon: A.flask, description: "A/B variants" },
      { k: "configs", label: "Configs", icon: A.sliders, description: "remote values" },
      { k: "labels", label: "Translations", icon: A.book, description: "i18n strings" },
      { k: "feedback", label: "Feedback", icon: A.bug, description: "bugs + requests" },
      { k: "events", label: "Events", icon: A.activity, description: "live stream" },
    ],
    Vt = "se_dt_project",
    wn = "se_l_overlay",
    Yt = "se_l_active_panel",
    Na = 24,
    Ka = 56,
    hn = { edge: "right", offsetPct: 50, railIconSize: 32, collapsed: !1 };
  function Fa() {
    try {
      let e = sessionStorage.getItem(Vt);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function ft(e) {
    try {
      e === null ? sessionStorage.removeItem(Vt) : sessionStorage.setItem(Vt, JSON.stringify(e));
    } catch {}
  }
  function Wa() {
    try {
      let e = localStorage.getItem(wn);
      if (e) return { ...hn, ...JSON.parse(e) };
    } catch {}
    return { ...hn };
  }
  function ye(e) {
    try {
      localStorage.setItem(wn, JSON.stringify(e));
    } catch {}
  }
  var Ga = new Set(["user", "gates", "experiments", "configs", "labels", "feedback", "events"]);
  function xn() {
    try {
      let e = sessionStorage.getItem(Yt);
      if (e && Ga.has(e)) return e;
    } catch {}
    return null;
  }
  function Le(e) {
    try {
      e === null ? sessionStorage.removeItem(Yt) : sessionStorage.setItem(Yt, e);
    } catch {}
  }
  function Ja() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  function Va(e, t) {
    return (
      e.translations === t.translations &&
      e.configs === t.configs &&
      e.gates === t.gates &&
      e.experiments === t.experiments &&
      e.feedback === t.feedback
    );
  }
  function yn(e) {
    return !!(e.hideAdminLinks || mn().hideAdminLinks);
  }
  function kn(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let r = t.attachShadow({ mode: "open" }),
      n = document.createElement("style");
    ((n.textContent = Ye), r.appendChild(n));
    let o = document.createElement("div");
    r.appendChild(o);
    let i = Wa(),
      a = xn(),
      s = Qt(),
      d = Fa();
    d && s && d.id !== s.projectId && ((d = null), ft(null));
    let c = {
        user: { view: "all", search: "" },
        gates: { view: "page", search: "" },
        experiments: { view: "page", search: "" },
        configs: { view: "page", search: "" },
        labels: { view: "page", search: "" },
        feedback: { view: "all", search: "" },
        events: { view: "all", search: "" },
      },
      l = "en-US",
      f = "bugs",
      p = null,
      u = { props: {}, dirty: {} },
      m = { user: 0, gates: 0, experiments: 0, configs: 0, labels: 0, feedback: 0, events: 0 };
    function x() {
      return Object.values(m).reduce((b, w) => b + w, 0);
    }
    function g(b) {
      let w = Ua[b];
      return w ? (d ? d.modules[w] : !s) : !0;
    }
    function L(b) {
      let w = window.innerWidth,
        F = window.innerHeight,
        { edge: q, offsetPct: W, collapsed: B } = i,
        I = b.style;
      if (((I.top = I.bottom = I.left = I.right = I.transform = ""), (b.dataset.edge = q), B))
        q === "right"
          ? ((I.right = "10px"), (I.top = `${W}%`), (I.transform = "translateY(-50%)"))
          : q === "left"
            ? ((I.left = "10px"), (I.top = `${W}%`), (I.transform = "translateY(-50%)"))
            : q === "top"
              ? ((I.top = "10px"), (I.left = `${W}%`), (I.transform = "translateX(-50%)"))
              : ((I.bottom = "10px"), (I.left = `${W}%`), (I.transform = "translateX(-50%)"));
      else {
        let V = F - 36;
        q === "right"
          ? ((I.right = "12px"), (I.top = "18px"))
          : q === "left"
            ? ((I.left = "12px"), (I.top = "18px"))
            : q === "top"
              ? ((I.top = "12px"), (I.right = "18px"))
              : ((I.bottom = "12px"), (I.right = "18px"));
      }
    }
    function k(b, w) {
      let F = window.innerWidth,
        q = window.innerHeight,
        W = [
          [F - b, "right"],
          [b, "left"],
          [w, "top"],
          [q - w, "bottom"],
        ];
      W.sort((V, ie) => V[0] - ie[0]);
      let B = W[0][1],
        O = Math.max(
          5,
          Math.min(95, B === "left" || B === "right" ? (w / q) * 100 : (b / F) * 100),
        );
      return { edge: B, offsetPct: O };
    }
    function S() {
      let b = document.createElement("div");
      for (
        b.className = i.collapsed ? "dtf-panel collapsed" : "dtf-panel",
          b.setAttribute("data-edge", i.edge);
        o.firstChild;
      )
        o.removeChild(o.firstChild);
      (o.appendChild(b), L(b), i.collapsed ? C(b) : T(b));
    }
    function h(b) {
      let w = null,
        F = null,
        q = (O) => {
          (I(!0),
            (p = O),
            (f = O === "bug" ? "bugs" : "features"),
            (a = "feedback"),
            Le(a),
            (i = { ...i, collapsed: !1 }),
            ye(i),
            S());
        },
        W = () => {
          if (!w) return;
          let O = b.getBoundingClientRect(),
            V = w.offsetWidth,
            ie = w.offsetHeight,
            ee = 8,
            K,
            Z;
          i.edge === "right"
            ? ((K = O.left - V - ee), (Z = O.top + O.height / 2 - ie / 2))
            : i.edge === "left"
              ? ((K = O.right + ee), (Z = O.top + O.height / 2 - ie / 2))
              : i.edge === "top"
                ? ((K = O.left + O.width / 2 - V / 2), (Z = O.bottom + ee))
                : ((K = O.left + O.width / 2 - V / 2), (Z = O.top - ie - ee));
          let oe = window.innerWidth,
            se = window.innerHeight;
          ((K = Math.max(8, Math.min(oe - V - 8, K))),
            (Z = Math.max(8, Math.min(se - ie - 8, Z))),
            (w.style.left = `${K}px`),
            (w.style.top = `${Z}px`));
        },
        B = () => {
          (F && (window.clearTimeout(F), (F = null)),
            !w &&
              ((w = document.createElement("div")),
              (w.className = "se-qa"),
              (w.innerHTML = `<span class="qa-hd">Quick actions</span><button data-qa="bug">${A.bug}<span>File a bug</span><span class="sub">screenshot \xB7 video</span></button><button data-qa="feature">${A.sparkles}<span>Request a feature</span></button>`),
              r.appendChild(w),
              W(),
              requestAnimationFrame(() => {
                requestAnimationFrame(() => w?.classList.add("show"));
              }),
              w.addEventListener("mouseenter", B),
              w.addEventListener("mouseleave", () => I()),
              w.querySelectorAll("[data-qa]").forEach((O) => {
                O.addEventListener("click", (V) => {
                  (V.stopPropagation(), q(O.dataset.qa));
                });
              })));
        },
        I = (O = !1) => {
          F && (window.clearTimeout(F), (F = null));
          let V = () => {
            w && (w.remove(), (w = null));
          };
          O ? V() : (F = window.setTimeout(V, 160));
        };
      (b.addEventListener("mouseenter", B),
        b.addEventListener("mouseleave", () => I()),
        b.addEventListener("click", () => I(!0)));
    }
    function C(b) {
      let w = i.railIconSize,
        F = s
          ? Re.filter((O) => g(O.k))
              .map((O) => {
                let V = m[O.k] > 0;
                return (
                  `<button class="ri" data-tab="${O.k}" style="width:${w}px;height:${w}px">` +
                  O.icon.replace(
                    "<svg ",
                    `<svg width="${Math.round(w * 0.5)}" height="${Math.round(w * 0.5)}" `,
                  ) +
                  (V ? '<span class="dotw"></span>' : "") +
                  `<span class="tip">${O.label}</span></button>`
                );
              })
              .join("")
          : `<button class="ri lock-only" data-tab="__lock__" style="width:${w}px;height:${w}px" title="">` +
            A.lock.replace(
              "<svg ",
              `<svg width="${Math.round(w * 0.5)}" height="${Math.round(w * 0.5)}" `,
            ) +
            '<span class="tip tip-multi"><b>Devtools locked</b>Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.<span class="hint">Click to connect \u2192</span></span></button>',
        q =
          `<div class="dtf-panel-rail"><div class="mk" title="Drag to reposition \xB7 click to expand" style="width:${w * 0.7}px;height:${w * 0.7}px"></div>` +
          F +
          `<div class="dtf-rail-resize" style="width:${i.edge === "right" || i.edge === "left" ? w : 12}px;height:${i.edge === "right" || i.edge === "left" ? 12 : w}px" title="Drag to resize"></div></div>`;
      b.innerHTML = q;
      let W = b.querySelector(".mk"),
        B = !1;
      (W.addEventListener("mousedown", (O) => {
        (O.preventDefault(), (B = !1));
        let V = O.clientX,
          ie = O.clientY,
          ee = b.getBoundingClientRect(),
          K = O.clientX - (ee.left + ee.width / 2),
          Z = O.clientY - (ee.top + ee.height / 2);
        W.classList.add("dragging");
        let oe = i.edge,
          se = (le) => {
            Math.hypot(le.clientX - V, le.clientY - ie) > 4 && (B = !0);
            let { edge: we } = k(le.clientX, le.clientY),
              Me = we === "left" || we === "right",
              mt = le.clientX - K,
              R = le.clientY - Z,
              Ae = window.innerWidth,
              z = window.innerHeight,
              H = Math.max(5, Math.min(95, Me ? (R / z) * 100 : (mt / Ae) * 100));
            ((i = { ...i, edge: we, offsetPct: H }),
              L(b),
              b.setAttribute("data-edge", we),
              (oe = we));
          },
          ve = () => {
            (W.classList.remove("dragging"),
              document.removeEventListener("mousemove", se),
              document.removeEventListener("mouseup", ve),
              ye(i),
              B && S());
          };
        (document.addEventListener("mousemove", se), document.addEventListener("mouseup", ve));
      }),
        W.addEventListener("click", () => {
          B || ((i = { ...i, collapsed: !1 }), ye(i), S());
        }),
        b.querySelectorAll(".ri").forEach((O) => {
          (O.addEventListener("click", () => {
            let V = O.dataset.tab;
            (V !== "__lock__" && ((a = V), Le(a)), (i = { ...i, collapsed: !1 }), ye(i), S());
          }),
            O.dataset.tab === "feedback" && h(O));
        }));
      let I = b.querySelector(".dtf-rail-resize");
      I.addEventListener("mousedown", (O) => {
        (O.preventDefault(), O.stopPropagation());
        let V = i.edge === "right" || i.edge === "left",
          ie = O.clientX,
          ee = O.clientY,
          K = i.railIconSize;
        I.classList.add("dragging");
        let Z = (se) => {
            let ve = V ? se.clientY - ee : se.clientX - ie,
              le = Math.max(Na, Math.min(Ka, Math.round(K + ve)));
            ((i = { ...i, railIconSize: le }), S());
          },
          oe = () => {
            (I.classList.remove("dragging"),
              document.removeEventListener("mousemove", Z),
              document.removeEventListener("mouseup", oe),
              ye(i));
          };
        (document.addEventListener("mousemove", Z), document.addEventListener("mouseup", oe));
      });
    }
    function y(b) {
      let w = window.location.host;
      b.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${ut(w)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${A.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${A.lock}
            <span class="tip tip-multi">
              <b>Devtools locked</b>
              Sign in to ShipEasy to inspect and override flags, configs, experiments, and translations on this page.
              <span class="hint">Click <em>Connect</em> to start \u2192</span>
            </span>
          </button>
        </div>
        <div class="dtf-pane" style="position:relative">
          <div class="dtf-body" id="dtf-body" aria-hidden="true" inert></div>
          <div class="auth-locked" role="dialog" aria-modal="true">
            <div class="auth-locked-card">
              <div class="ic-big">${A.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${A.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${A.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${A.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${A.book}</span><span class="k">Edit translations in-place</span></div>
              </div>
              <button class="cta" data-action="connect" autofocus>Connect \u2192</button>
              <div class="meta">A new tab will open for you to approve this device.</div>
              <div class="status" data-status></div>
              <div class="err" data-err style="display:none"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="dtf-foot">
        <div class="stat-line">
          <span style="width:5px;height:5px;border-radius:50%;background:var(--fg-4);display:inline-block"></span>
          <span class="stat" style="color:var(--fg-3)">Not connected</span>
        </div>
      </div>`;
      let F = b.querySelector(".dtf-head .mk");
      (F.addEventListener("mousedown", (I) => {
        (I.preventDefault(), F.classList.add("dragging"));
        let O = (ie) => {
            let { edge: ee, offsetPct: K } = k(ie.clientX, ie.clientY);
            ((i = { ...i, edge: ee, offsetPct: K }), L(b));
          },
          V = () => {
            (F.classList.remove("dragging"),
              document.removeEventListener("mousemove", O),
              document.removeEventListener("mouseup", V),
              ye(i));
          };
        (document.addEventListener("mousemove", O), document.addEventListener("mouseup", V));
      }),
        b.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ye(i), S());
        }));
      let q = b.querySelector('[data-action="connect"]'),
        W = b.querySelector("[data-status]"),
        B = b.querySelector("[data-err]");
      q.addEventListener("click", async () => {
        ((q.disabled = !0),
          (q.innerHTML = '<span class="spin"></span> Opening\u2026'),
          (W.textContent = ""),
          (B.style.display = "none"),
          (B.textContent = ""));
        try {
          ((s = await er(e, () => {
            ((W.textContent = "Waiting for approval in the opened tab\u2026"),
              (q.innerHTML = '<span class="spin"></span> Waiting for approval'));
          })),
            (a = Re.find((I) => g(I.k))?.k ?? "gates"),
            Le(a),
            S());
        } catch (I) {
          ((B.textContent = I instanceof Error ? I.message : String(I)),
            (B.style.display = "block"),
            (W.textContent = ""),
            (q.disabled = !1),
            (q.textContent = "Retry connect \u2192"));
        }
      });
    }
    function T(b) {
      if (!s) {
        y(b);
        return;
      }
      let w = a && a !== "__lock__" ? a : (Re.find((K) => g(K.k))?.k ?? "gates");
      a !== w && ((a = w), Le(w));
      let F = Re.find((K) => K.k === w),
        q = d?.name ?? "",
        W = window.location.host,
        B = q || W,
        I = Re.filter((K) => g(K.k))
          .map((K) => {
            let Z = K.k === w,
              oe = m[K.k] > 0;
            return (
              `<button class="t${Z ? " active" : ""}" data-tab="${K.k}" title="${K.label}">` +
              K.icon +
              (oe ? '<span class="dotw"></span>' : "") +
              `<span class="tip">${K.label}</span></button>`
            );
          })
          .join(""),
        O = G(w),
        V =
          x() > 0
            ? '<div class="dtf-overbar">' +
              A.alert +
              `<span><b>${x()} session override${x() > 1 ? "s" : ""}</b> \xB7 cleared on refresh</span><button data-action="clear-overrides">Clear all</button></div>`
            : "",
        ie = O ? re(w) : "";
      b.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${ut(F.label)}</span>
          <span class="sub">${ut(B)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${A.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${A.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${I}</div>
        <div class="dtf-pane">
          ${V}
          ${ie}
          <div class="dtf-body" id="dtf-body"></div>
        </div>
      </div>
      <div class="dtf-foot">
        <div class="stat-line">
          <span class="ok"></span>
          <span class="stat">SDK <b>connected</b></span>
          ${s ? "" : '<span class="sk">unauthed</span>'}
        </div>
        <div class="actions">
          <button class="ibtn" data-action="share" title="Build a URL that applies the current overrides">Copy share URL</button>
          <button class="ibtn" data-action="apply-url" title="Persist current overrides to the URL and reload">Pin to URL</button>
          <span class="grow"></span>
          ${x() > 0 ? '<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>' : ""}
          ${s ? '<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>' : ""}
        </div>
      </div>
    `;
      let ee = b.querySelector(".dtf-head .mk");
      (ee.addEventListener("mousedown", (K) => {
        (K.preventDefault(), ee.classList.add("dragging"));
        let Z = (se) => {
            let { edge: ve, offsetPct: le } = k(se.clientX, se.clientY);
            ((i = { ...i, edge: ve, offsetPct: le }), L(b));
          },
          oe = () => {
            (ee.classList.remove("dragging"),
              document.removeEventListener("mousemove", Z),
              document.removeEventListener("mouseup", oe),
              ye(i));
          };
        (document.addEventListener("mousemove", Z), document.addEventListener("mouseup", oe));
      }),
        b.querySelector('[data-action="refresh"]').addEventListener("click", () => S()),
        b.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ye(i), S());
        }),
        b.querySelectorAll(".dtf-rail .t").forEach((K) => {
          (K.addEventListener("click", () => {
            P(K.dataset.tab);
          }),
            K.dataset.tab === "feedback" && h(K));
        }),
        O && v(b, w),
        b.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
          sr();
        }),
        b.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
          lr();
        }),
        b.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
          let K = $t({ ...Et(), openDevtools: !0 }),
            Z = b.querySelector('[data-action="share"]');
          try {
            await navigator.clipboard.writeText(K);
            let oe = Z.textContent;
            ((Z.textContent = "Copied \u2713"), setTimeout(() => (Z.textContent = oe), 1500));
          } catch {
            prompt("Copy this URL:", K);
          }
        }),
        b.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
          (ht(), ft(null), (s = null), (d = null), S());
        }),
        E());
    }
    function P(b) {
      if (!s || i.collapsed) {
        ((a = b), Le(b), S());
        return;
      }
      if (b === a) return;
      let w = o.querySelector(".dtf-panel");
      if (!w) {
        ((a = b), Le(b), S());
        return;
      }
      ((a = b),
        Le(b),
        w.querySelectorAll(".dtf-rail .t").forEach((B) => {
          B.classList.toggle("active", B.dataset.tab === b);
        }));
      let F = Re.find((B) => B.k === b),
        q = w.querySelector(".dtf-head .ti .title");
      F && q && (q.textContent = F.label);
      let W = w.querySelector(".dtf-pane");
      (W?.querySelector(".dtf-search")?.remove(),
        W &&
          G(b) &&
          (W.querySelector("#dtf-body")?.insertAdjacentHTML("beforebegin", re(b)), v(w, b)),
        E());
    }
    function G(b) {
      return b === "gates" || b === "experiments" || b === "configs" || b === "labels";
    }
    function re(b) {
      let w = c[b];
      return `<div class="dtf-search">
        <div class="input">
          ${A.search}
          <input placeholder="Filter ${b}\u2026" value="${Ya(w.search)}" />
          ${w.search ? '<span class="kbd" data-action="clear-search">esc</span>' : '<span class="kbd">\u2318K</span>'}
        </div>
        <div class="seg">
          <button class="${w.view === "page" ? "active" : ""}" data-view="page">page</button>
          <button class="${w.view === "all" ? "active" : ""}" data-view="all">all</button>
        </div>
        ${b === "labels" ? '<select class="dtf-locale-sel" data-locale></select>' : ""}
      </div>`;
    }
    function v(b, w) {
      let F = b.querySelector(".dtf-search input");
      F &&
        (F.addEventListener("input", () => {
          ((c[w].search = F.value), E());
        }),
        b.querySelectorAll(".dtf-search .seg button").forEach((q) => {
          q.addEventListener("click", () => {
            ((c[w].view = q.dataset.view), S());
          });
        }),
        b.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
          ((c[w].search = ""), S());
        }));
    }
    function E() {
      let b = o.querySelector("#dtf-body");
      if (!b || !s) return;
      let w = new De(e.adminUrl, s.token, s.projectId, yn(e));
      J(w);
      let F = a,
        q = c[F],
        W = (B) => {
          let I = m[F];
          ((m[F] = B), ((I === 0) != (B === 0) || I !== B) && U());
        };
      switch (F) {
        case "user":
          fr(b, w, u, () => S());
          break;
        case "gates":
          ur(b, w, q, W);
          break;
        case "experiments":
          gr(b, w, q, W);
          break;
        case "configs":
          Sr(b, w, q, W, o);
          break;
        case "labels":
          Qr(b, w, q, r, {
            locale: l,
            setLocale: (B) => {
              ((l = B), E());
            },
          });
          break;
        case "feedback":
          ln(b, w, o, {
            sub: f,
            setSub: (B) => {
              ((f = B), E());
            },
            pendingForm: p,
            consumePendingForm: () => {
              p = null;
            },
          });
          break;
        case "events":
          fn(b);
          break;
      }
    }
    function U() {
      S();
    }
    async function J(b) {
      try {
        let w = await b.project(),
          F = window.location.host;
        if (!(Ja() !== null) && w.domain && !pr(F, w.domain)) {
          (ht(), ft(null), (s = null), (d = null), S());
          return;
        }
        let W = d;
        if (((d = w), ft(w), a && !g(a))) {
          let B = Re.find((I) => g(I.k))?.k ?? null;
          ((a = B), Le(B), S());
          return;
        }
        (!W || !Va(W.modules, w.modules)) && S();
      } catch {}
    }
    document.documentElement.appendChild(t);
    let de = () => {
        document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
      },
      ge = new MutationObserver(de);
    if (
      (ge.observe(document.documentElement, { childList: !0 }),
      Pe() && (We(), Ge(!0, r, () => {})),
      xn() || (i = { ...i, collapsed: !0 }),
      S(),
      s)
    ) {
      let b = new De(e.adminUrl, s.token, s.projectId, yn(e));
      J(b);
    }
    bn();
    let me = vn(() => S()),
      be = () => {
        let b = o.querySelector(".dtf-panel");
        b && L(b);
      };
    window.addEventListener("resize", be);
    let Y = () => E();
    return (
      window.addEventListener("se:state:update", Y),
      {
        destroy() {
          (window.removeEventListener("resize", be),
            window.removeEventListener("se:state:update", Y),
            me(),
            ge.disconnect(),
            t.remove());
        },
      }
    );
  }
  function ut(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ya(e) {
    return ut(e);
  }
  var Xa = "https://shipeasy.ai";
  function $n(e) {
    return (
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|$)/i.test(e) ||
      e === "file://" ||
      e === "null"
    );
  }
  function Za() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          let r = new URL(e.src).origin;
          if (!$n(r)) return r;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let r of Array.from(t))
        if (r.src.includes("se-devtools.js"))
          try {
            let n = new URL(r.src).origin;
            if (!$n(n)) return n;
          } catch {}
    }
    return Xa;
  }
  var Be = null,
    gt = null;
  function En(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (Be) {
      if (document.getElementById("shipeasy-devtools")) return;
      Be = null;
    }
    gt || (gt = dr());
    let t = { adminUrl: e.adminUrl ?? Za(), hideAdminLinks: e.hideAdminLinks ?? !1 },
      { destroy: r } = kn(t);
    Be = r;
  }
  function Qa() {
    (Be?.(), (Be = null), gt?.(), (gt = null));
  }
  function Sn(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    et() && En(e);
    let r = t.split("+"),
      n = r[r.length - 1],
      o = r.includes("Shift"),
      i = r.includes("Alt") || r.includes("Option"),
      a = r.includes("Ctrl") || r.includes("Control"),
      s = r.includes("Meta") || r.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(n) ? `Key${n.toUpperCase()}` : null;
    function c(l) {
      (d ? l.code === d : l.key.toLowerCase() === n.toLowerCase()) &&
        l.shiftKey === o &&
        l.altKey === i &&
        l.ctrlKey === a &&
        l.metaKey === s &&
        (Be ? Qa() : En(e));
    }
    return (window.addEventListener("keydown", c), () => window.removeEventListener("keydown", c));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => Sn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      Pe())
    ) {
      let r = !1,
        n = new MutationObserver(() => o()),
        o = () => {
          r ||
            ((r = !0),
            requestAnimationFrame(() => {
              ((r = !1),
                n.disconnect(),
                We(),
                n.observe(document.body, { childList: !0, subtree: !0, attributes: !0 }));
            }));
        },
        i = () => {
          requestAnimationFrame(() => requestAnimationFrame(() => o()));
        };
      document.readyState === "complete" ? i() : window.addEventListener("load", i, { once: !0 });
      let a = () => {
        let d = document.getElementById("shipeasy-devtools");
        if (!d?.shadowRoot) {
          setTimeout(a, 100);
          return;
        }
        Ge(!0, d.shadowRoot, () => o());
      };
      (a(), window.addEventListener("se:i18n:ready", () => o(), { once: !0 }));
      let s = window;
      s.i18n?.on && s.i18n.on("update", () => o());
    }
    window.__se_devtools_ready = !0;
  }
})();
