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
  var Y = (e, t, r) => An(e, typeof t != "symbol" ? t + "" : t, r);
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
          Y(this, "collectUrl");
          Y(this, "sdkKey");
          Y(this, "queue", []);
          Y(this, "exposureSeen", new Set());
          Y(this, "timer", null);
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
      lt = 5;
    function No(e, t, r) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let n = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
        c = !1;
      try {
        new PerformanceObserver((h) => {
          let w = h.getEntries();
          w.length && (n = w[w.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((h) => {
          for (let w of h.getEntries()) {
            let m = w.duration ?? 0;
            (o === null || m > o) && (o = m);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((h) => {
          for (let w of h.getEntries()) w.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let d = window.onerror;
      ((window.onerror = (u, h, w, m, S) => (
        a < lt &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, r, {
            value: 1,
            kind: "exception",
            message: typeof u == "string" ? u.slice(0, 200) : String(S ?? "").slice(0, 200),
            source: typeof h == "string" ? h.slice(0, 200) : "",
            line: w ?? 0,
          })),
        typeof d == "function" ? d(u, h, w, m, S) : !1
      )),
        window.addEventListener("unhandledrejection", (u) => {
          if (a < lt) {
            a += 1;
            let h = u.reason,
              w = h instanceof Error ? h.message : typeof h == "string" ? h : String(h);
            e.pushMetric("__auto_js_error", t, r, {
              value: 1,
              kind: "unhandled_rejection",
              message: w.slice(0, 200),
            });
          }
        }));
      let l = window.fetch;
      window.fetch = async function (...u) {
        let h = typeof performance < "u" ? performance.now() : 0,
          w = typeof u[0] == "string" ? u[0] : u[0].toString(),
          m;
        try {
          m = await l.apply(this, u);
        } catch (S) {
          throw (
            s < lt &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, r, {
                value: 1,
                kind: "network",
                status: 0,
                url: w.slice(0, 200),
              })),
            S
          );
        }
        if (m.status >= 500 && s < lt) {
          s += 1;
          let S = typeof performance < "u" ? performance.now() - h : 0;
          e.pushMetric("__auto_network_error", t, r, {
            value: 1,
            kind: "5xx",
            status: m.status,
            url: w.slice(0, 200),
            duration_ms: Math.round(S),
          });
        }
        return m;
      };
      let f = () => {
        if (!c) {
          c = !0;
          try {
            let h = performance.getEntriesByType("navigation")[0];
            if (h) {
              let m = h.startTime ?? 0;
              (h.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, r, { value: h.loadEventEnd - m }),
                h.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, r, { value: h.responseStart - m }),
                h.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, r, {
                    value: h.domContentLoadedEventEnd - m,
                  }));
            }
            let w = performance.getEntriesByType("paint");
            for (let m of w)
              m.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, r, { value: m.startTime })
                : m.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, r, { value: m.startTime });
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
          Y(this, "sdkKey");
          Y(this, "baseUrl");
          Y(this, "autoGuardrails");
          Y(this, "env");
          Y(this, "evalResult", null);
          Y(this, "anonId");
          Y(this, "userId", "");
          Y(this, "buffer");
          Y(this, "guardrailsInstalled", !1);
          Y(this, "listeners", new Set());
          Y(this, "overrideListenerInstalled", !1);
          Y(this, "onOverrideChange", () => {
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
              c = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: i, params: c };
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
        c = n.includes("Meta") || n.includes("Cmd");
      (e.installBridge(), Ct() && Ot({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let d = Ct();
      function l(p) {
        p.key === o &&
          p.shiftKey === i &&
          p.altKey === a &&
          p.ctrlKey === s &&
          p.metaKey === c &&
          (d
            ? window.__shipeasy_devtools?.toggle()
            : ((d = !0), Ot({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
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
    function dt(e, t) {
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
          c = t[a] ?? zt[a] ?? ca[a];
        if (c) {
          let d = c(s);
          (typeof d != "string" && (i = !1), r.push(d));
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
      if (r?.strings[e]) return dt(r.strings[e], t);
    }
    var fa = {
      t(e, t, r) {
        let n, o;
        typeof t == "string" ? ((n = t), (o = r)) : (o = t);
        let i = Ht(e, o);
        return i !== void 0 ? i : n !== void 0 ? dt(n, o) : e;
      },
      rich(e, t, r, n) {
        let i = Ht(e, n) ?? dt(t, n);
        return pa(i, r ?? {});
      },
      tEl(e, t, r, n) {
        if (ia()) {
          let i = Ht(e, r) ?? dt(t, r);
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
.dtf-inline-form .ft button.ghost { background:transparent; }

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
  var ht = "se_dt_session";
  function Qt() {
    try {
      let e = sessionStorage.getItem(ht);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function On(e) {
    try {
      sessionStorage.setItem(ht, JSON.stringify(e));
    } catch {}
  }
  function bt() {
    try {
      sessionStorage.removeItem(ht);
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
      new Promise((c, d) => {
        let f = !1;
        function p(S, k) {
          f ||
            ((f = !0),
            window.removeEventListener("message", u),
            clearInterval(w),
            clearTimeout(m),
            S ? d(S) : c(k));
        }
        function u(S) {
          if (S.origin !== r) return;
          let k = S.data;
          if (!k || k.type !== "se:devtools-auth" || !k.token || !k.projectId) return;
          let A = { token: k.token, projectId: k.projectId };
          (On(A), p(null, A));
        }
        window.addEventListener("message", u);
        let h = Date.now(),
          w = setInterval(() => {
            Date.now() - h < 1500 ||
              (s.closed && !f && p(new Error("Sign-in window closed before approval.")));
          }, 500),
          m = setTimeout(() => {
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
  function $e(e, t) {
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
  function He() {
    return typeof window > "u" ? !1 : Ze().has("se_edit_labels");
  }
  function nr(e) {
    let t = $e(`se_ks_${e}`) ?? $e(`se_gate_${e}`) ?? $e(`se-gate-${e}`);
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
    let t = $e(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return xt(t);
  }
  function wt(e, t, r = "session") {
    Qe([
      [`se_config_${e}`, t == null ? null : rr(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function ar(e) {
    let t = $e(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function kt(e, t, r = "session") {
    Qe([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function rt() {
    return $e("se_i18n");
  }
  function ir() {
    return $e("se_i18n_draft");
  }
  function Re(e) {
    return $e(`se_i18n_label_${e}`);
  }
  function De(e, t, r = "session") {
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
        c = null;
      for (let p of s)
        if (p instanceof HTMLAnchorElement) {
          c = p;
          break;
        }
      if (!c) return;
      let d = c.getAttribute("href");
      if (!d || /^(mailto:|tel:|javascript:|blob:|data:|#)/i.test(d)) return;
      let l;
      try {
        l = new URL(d, window.location.href);
      } catch {
        return;
      }
      if (l.origin !== t) return;
      tr(l);
      let f = l.toString();
      f !== c.href && (c.href = f);
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
      (history.pushState = function (a, s, c) {
        return n(a, s, i(c));
      }),
      (history.replaceState = function (a, s, c) {
        return o(a, s, i(c));
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
  var nt = class {
    constructor(t, r, n, o = !1) {
      Y(this, "adminUrl", t);
      Y(this, "token", r);
      Y(this, "projectId", n);
      Y(this, "hideAdminLinks", o);
      Y(this, "cache", new Map());
    }
    memo(t, r) {
      let n = this.cache.get(t);
      if (n) return n;
      let o = r();
      return (
        this.cache.set(t, o),
        o.catch(() => {
          this.cache.get(t) === o && this.cache.delete(t);
        }),
        o
      );
    }
    invalidate() {
      this.cache.clear();
    }
    project() {
      return this.memo("project", async () => {
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
      });
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
      return this.memo("gates", () => this.get("/api/admin/gates"));
    }
    configs() {
      return this.memo("configs", async () => {
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
      });
    }
    experiments() {
      return this.memo("experiments", () => this.get("/api/admin/experiments"));
    }
    universes() {
      return this.memo("universes", () => this.get("/api/admin/universes"));
    }
    profiles() {
      return this.memo("profiles", () => this.get("/api/admin/i18n/profiles"));
    }
    drafts() {
      return this.memo("drafts", () => this.get("/api/admin/i18n/drafts"));
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
      return this.memo("bugs", () => this.get("/api/admin/bugs"));
    }
    bug(t) {
      return this.memo(`bug:${t}`, () => this.get(`/api/admin/bugs/${encodeURIComponent(t)}`));
    }
    async createBug(t) {
      let r = await this.post("/api/admin/bugs", t);
      return (this.cache.delete("bugs"), r);
    }
    featureRequests() {
      return this.memo("featureRequests", () => this.get("/api/admin/feature-requests"));
    }
    featureRequest(t) {
      return this.memo(`featureRequest:${t}`, () =>
        this.get(`/api/admin/feature-requests/${encodeURIComponent(t)}`),
      );
    }
    async createFeatureRequest(t) {
      let r = await this.post("/api/admin/feature-requests", t);
      return (this.cache.delete("featureRequests"), r);
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
    async upsertDraftKey(t, r, n) {
      (await this.post(`/api/admin/i18n/drafts/${encodeURIComponent(t)}/keys`, {
        key: r,
        value: n,
      }),
        this.invalidateKeysCache());
    }
    async updateKeyById(t, r) {
      (await this.put(`/api/admin/i18n/keys/${encodeURIComponent(t)}`, { value: r }),
        this.invalidateKeysCache());
    }
    invalidateKeysCache() {
      for (let t of Array.from(this.cache.keys())) t.startsWith("keys:") && this.cache.delete(t);
    }
    keys(t) {
      return this.memo(`keys:${t ?? ""}`, async () => {
        let n = (s) => {
            let c = new URLSearchParams();
            return (
              t && c.set("profile_id", t),
              c.set("limit", String(500)),
              c.set("offset", String(s)),
              `?${c.toString()}`
            );
          },
          o = async (s) => {
            let c = await this.get(`/api/admin/i18n/keys${n(s)}`);
            if (Array.isArray(c)) return { keys: c, total: c.length };
            let d = c.keys ?? [],
              l = c.total ?? d.length;
            return { keys: d, total: l };
          },
          i = await o(0),
          a = i.keys.slice();
        for (; a.length < i.total && i.keys.length > 0; ) {
          let s = await o(a.length);
          if (s.keys.length === 0) break;
          a.push(...s.keys);
        }
        return a;
      });
    }
  };
  var ee = (e, t = 1.75) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
    P = {
      shield: ee(
        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
      ),
      flask: ee(
        '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 1 3.923 10.5H6.077A6.5 6.5 0 0 1 10 9.3"/>',
      ),
      sliders: ee(
        '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
      ),
      power: ee('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
      book: ee('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
      users: ee(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      ),
      activity: ee('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
      refresh: ee(
        '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
      ),
      settings: ee(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      ),
      alert: ee(
        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
      ),
      search: ee('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      play: ee('<polygon points="6 3 20 12 6 21 6 3"/>'),
      playFilled:
        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
      x: ee('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
      copy: ee(
        '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      ),
      check: ee('<path d="M20 6 9 17l-5-5"/>'),
      bug: ee(
        '<path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/>',
      ),
      sparkles: ee(
        '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
      ),
      camera: ee(
        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
      ),
      record: ee(
        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
      ),
      upload: ee(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      ),
      external: ee(
        '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      ),
      arrowLeft: ee('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
      file: ee(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/>',
      ),
      plus: ee('<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>'),
      lock: ee(
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
  function ot(e) {
    return e < 1024
      ? `${e} B`
      : e < 1024 * 1024
        ? `${(e / 1024).toFixed(0)} KB`
        : `${(e / 1024 / 1024).toFixed(1)} MB`;
  }
  function Ee() {
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
  function Ce(e) {
    return `
    <div class="dtf-empty search">
      <div class="glyph"><span>[</span><span class="core"></span><span>]</span></div>
      <h3>No match for<br/><em style="font-family:var(--mono);font-style:normal;font-size:14px;color:var(--fg-3)">"${$(e)}"</em></h3>
      <p>Nothing in your project shares that key.</p>
    </div>`;
  }
  function Oe(e, t = "Copy value") {
    return `<button class="dtf-copy" data-copy="${e}" title="${$(t)}">${P.copy}</button>`;
  }
  function Ie(e, t) {
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
            (r.innerHTML = P.check),
            setTimeout(() => {
              (r.classList.remove("done"), (r.innerHTML = P.copy));
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
      c = s || a,
      d = Object.entries(i)
        .map(([p, u]) => {
          let h = r.dirty[p] ? '<span class="changed"></span>' : '<span style="width:5px"></span>';
          return `<div class="dtf-prop">
        <span class="k">user.${$(p)}</span>
        <span class="v"><input data-prop="${$(p)}" value="${Nn(u)}"/></span>
        ${h}
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
        <div class="av">${$(Un(c))}</div>
        <div class="info">
          <div class="e">${$(s || a)}</div>
          <div class="id">${$(a)}</div>
        </div>
      </div>
      <div class="dtf-group">User properties<span class="c">edit to simulate</span></div>
      <div style="flex:1; overflow-y:auto">
        ${d || '<div class="se-empty">No user properties yet.</div>'}
        <div class="dtf-group">Request context<span class="c">read-only</span></div>
        ${l}
      </div>
      <div class="dtf-evalbar">
        <button class="b" data-action="reeval">${P.play} Re-evaluate ${f > 0 ? "with changes" : ""}</button>
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
      i = e.killswitch ? P.power : P.shield,
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
    let c = `<div class="dtf-toggle${e.effective ? (n ? " over" : " on") : ""}" data-toggle="${Ue(e.name)}"></div>`,
      d = e.killswitch
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
          ${Oe("g:" + e.name, "Copy gate name")}
          ${n ? '<span class="override-tag">forced</span>' : ""}
          ${e.live ? '<span class="live-dot" title="firing on this page"></span>' : ""}
        </div>
        <div class="v">${$(d)}</div>
      </div>
      ${s}${c}
    </div>
    <div class="dtf-detail${r ? " open" : ""}">
      <div class="inner"><div class="pad">${l}</div></div>
    </div>`;
  }
  async function ur(e, t, r, n) {
    e.innerHTML = Ee();
    let o;
    try {
      o = await t.gates();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load gates: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = fe({
        title: "No <em>gates</em> yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        actions: t.hideAdminLinks
          ? []
          : [{ icon: "+", label: "Create new gate", href: `${t.adminUrl}/dashboard/gates/new` }],
      });
      ((e.innerHTML = s), c(e), n(0));
      return;
    }
    let i = null;
    function a() {
      let s = r.search.trim().toLowerCase(),
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Fn);
      if ((n(d.filter((l) => l.override !== null).length), d.length === 0)) {
        e.innerHTML = Ce(r.search);
        return;
      }
      if (r.view === "page") {
        let l = d.filter((p) => p.live === !0 || p.killswitch),
          f = d.filter((p) => !l.includes(p));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} firing</span></div>` +
          l.map((p) => Lt(p, i)).join("") +
          (f.length
            ? `<div class="dtf-group">Inactive<span class="c">${f.length} more</span></div>` +
              f.map((p) => Lt(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All flags<span class="c">${d.length}</span></div>` +
          d.map((l) => Lt(l, i)).join("");
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
              u = d.find((h) => h.name === p);
            u && tt(p, !u.effective);
          });
        }),
        e.querySelectorAll("[data-toggle-detail]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-toggle-detail"),
              u = d.find((h) => h.name === p);
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
        Ie(e, Object.fromEntries(d.map((l) => ["g:" + l.name, () => l.name]))));
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
        .filter((a, s, c) => c.findIndex((d) => d.name === a.name) === s),
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
          (d) =>
            `<option value="${at(d.name)}"${d.name === e.effective ? " selected" : ""}>${$(d.name)}</option>`,
        )
        .join(""),
      i = `<select class="sel${n ? " over" : ""}" data-exp="${at(e.name)}" style="grid-column:3 / span 2; justify-self:end">
    ${o}
  </select>`,
      a = `experiment \xB7 ${e.status} \xB7 ${e.groups.length} variants${e.liveGroup ? ` \xB7 live: ${e.liveGroup}` : ""}`,
      s = e.groups
        .map((d, l) => {
          let f = d.name === e.effective,
            p =
              ["var(--info)", "var(--accent)", "var(--warn)", "var(--danger)", "var(--pri)"][l] ??
              "var(--fg-3)";
          return `<div class="var-row${f ? " assigned" : ""}">
        <span class="sw" style="background:${p}"></span>
        <span>${$(d.name)}</span>
        <span class="pct">${d.weight}%</span>
        <span style="font-size:9.5px;color:var(--fg-4)">${d.name === e.liveGroup ? "real" : d.name === e.override ? "forced" : ""}</span>
      </div>`;
        })
        .join(""),
      c = `
    <div class="crumbs">
      <div><span class="${n ? "skip" : "pass"}">\u25CF</span> ${n ? "forced via URL override" : e.liveGroup ? "assigned via SDK" : "no live assignment"}</div>
    </div>
    ${s}
    <div class="mini">
      <span class="lbl">status</span><span class="v">${e.status}</span>
      <span class="lbl">updated</span><span class="v">${pe(e.updatedAt)}</span>
    </div>
    <div class="actions">
      ${n ? `<button data-clear="${at(e.name)}">\u21BA Clear override</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}${e.status !== "running" ? " muted" : ""}" data-row="${at(e.name)}">
      <div class="ic"><span style="color:${e.liveEnrolled ? "var(--accent)" : "var(--fg-3)"}">${P.flask}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${$(e.name)}</span>
          ${Oe("e:" + e.name, "Copy experiment name")}
          ${n ? '<span class="override-tag">forced</span>' : ""}
          ${e.liveEnrolled ? '<span class="live-dot" title="enrolled on this page"></span>' : ""}
        </div>
        <div class="v">${$(a)}</div>
      </div>
      ${i}
    </div>
    <div class="dtf-detail${r ? " open" : ""}">
      <div class="inner"><div class="pad">${c}</div></div>
    </div>`;
  }
  async function gr(e, t, r, n) {
    e.innerHTML = Ee();
    let o;
    try {
      o = await t.experiments();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load experiments: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = fe({
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
      ((e.innerHTML = s), c(e), n(0));
      return;
    }
    let i = null;
    function a() {
      let s = r.search.trim().toLowerCase(),
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Gn);
      if ((n(d.filter((l) => l.override !== null).length), d.length === 0)) {
        e.innerHTML = Ce(r.search);
        return;
      }
      if (r.view === "page") {
        let l = d.filter((p) => p.liveEnrolled),
          f = d.filter((p) => !p.liveEnrolled);
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
          `<div class="dtf-group">All experiments<span class="c">${d.length}</span></div>` +
          d.map((l) => _t(l, i)).join("");
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
        Ie(e, Object.fromEntries(d.map((l) => ["e:" + l.name, () => l.name]))));
    }
    a();
  }
  function at(e) {
    return $(e);
  }
  function ze(e, t) {
    let r = typeof e;
    if (r !== typeof t) return !1;
    if (Array.isArray(e)) {
      if (!Array.isArray(t)) return !1;
      let n = e.length;
      if (n !== t.length) return !1;
      for (let o = 0; o < n; o++) if (!ze(e[o], t[o])) return !1;
      return !0;
    }
    if (r === "object") {
      if (!e || !t) return e === t;
      let n = Object.keys(e),
        o = Object.keys(t);
      if (n.length !== o.length) return !1;
      for (let a of n) if (!ze(e[a], t[a])) return !1;
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
  function we(e, t = Object.create(null), r = Zn, n = "") {
    if (e && typeof e == "object" && !Array.isArray(e)) {
      let i = e.$id || e.id;
      if (i) {
        let a = new URL(i, r.href);
        a.hash.length > 1 ? (t[a.href] = e) : ((a.hash = ""), n === "" ? (r = a) : we(e, t, r));
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
          let c = s.length;
          for (let d = 0; d < c; d++) we(s[d], t, r, `${a}/${d}`);
        }
      } else if (Yn[i]) for (let c in s) we(s[c], t, r, `${a}/${ue(c)}`);
      else we(s, t, r, a);
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
  function xe(e) {
    return e.test.bind(e);
  }
  var Tt = {
    date: mr,
    time: vr.bind(void 0, !1),
    "date-time": ho,
    duration: go,
    uri: yo,
    "uri-reference": xe(no),
    "uri-template": xe(oo),
    url: xe(ao),
    email: po,
    hostname: xe(ro),
    ipv4: xe(fo),
    ipv6: xe(uo),
    regex: ko,
    uuid: xe(io),
    "json-pointer": xe(so),
    "json-pointer-uri-fragment": xe(lo),
    "relative-json-pointer": xe(co),
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
  function ho(e) {
    let t = e.split(vo);
    return t.length == 2 && mr(t[0]) && vr(!0, t[1]);
  }
  var bo = /\/|:/,
    xo =
      /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function yo(e) {
    return bo.test(e) && xo.test(e);
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
  var hr;
  (function (e) {
    ((e[(e.Flag = 1)] = "Flag"), (e[(e.Basic = 2)] = "Basic"), (e[(e.Detailed = 4)] = "Detailed"));
  })(hr || (hr = {}));
  function br(e) {
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
  function te(
    e,
    t,
    r = "2019-09",
    n = we(t),
    o = !0,
    i = null,
    a = "#",
    s = "#",
    c = Object.create(null),
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
    let d = typeof e,
      l;
    switch (d) {
      case "boolean":
      case "number":
      case "string":
        l = d;
        break;
      case "object":
        e === null ? (l = "null") : Array.isArray(e) ? (l = "array") : (l = "object");
        break;
      default:
        throw new Error(`Instances of "${d}" type are not supported.`);
    }
    let {
        $ref: f,
        $recursiveRef: p,
        $recursiveAnchor: u,
        type: h,
        const: w,
        enum: m,
        required: S,
        not: k,
        anyOf: A,
        allOf: v,
        oneOf: L,
        if: y,
        then: T,
        else: H,
        format: V,
        properties: re,
        patternProperties: g,
        additionalProperties: E,
        unevaluatedProperties: j,
        minProperties: G,
        maxProperties: de,
        propertyNames: ge,
        dependentRequired: me,
        dependentSchemas: be,
        dependencies: X,
        prefixItems: ve,
        items: he,
        additionalItems: b,
        unevaluatedItems: x,
        contains: F,
        minContains: U,
        maxContains: W,
        minItems: K,
        maxItems: O,
        uniqueItems: I,
        minimum: J,
        maximum: ne,
        exclusiveMinimum: oe,
        exclusiveMaximum: N,
        multipleOf: Z,
        minLength: ie,
        maxLength: se,
        pattern: ye,
        __absolute_ref__: le,
        __absolute_recursive_ref__: Te,
      } = t,
      R = [];
    if ((u === !0 && i === null && (i = t), p === "#")) {
      let z = i === null ? n[Te] : i,
        C = `${s}/$recursiveRef`,
        q = te(e, i === null ? t : i, r, n, o, z, a, C, c);
      q.valid ||
        R.push(
          {
            instanceLocation: a,
            keyword: "$recursiveRef",
            keywordLocation: C,
            error: "A subschema had errors.",
          },
          ...q.errors,
        );
    }
    if (f !== void 0) {
      let C = n[le || f];
      if (C === void 0) {
        let _ = `Unresolved $ref "${f}".`;
        throw (
          le && le !== f && (_ += `  Absolute URI "${le}".`),
          (_ += `
Known schemas:
- ${Object.keys(n).join(`
- `)}`),
          new Error(_)
        );
      }
      let q = `${s}/$ref`,
        M = te(e, C, r, n, o, i, a, q, c);
      if (
        (M.valid ||
          R.push(
            {
              instanceLocation: a,
              keyword: "$ref",
              keywordLocation: q,
              error: "A subschema had errors.",
            },
            ...M.errors,
          ),
        r === "4" || r === "7")
      )
        return { valid: R.length === 0, errors: R };
    }
    if (Array.isArray(h)) {
      let z = h.length,
        C = !1;
      for (let q = 0; q < z; q++)
        if (l === h[q] || (h[q] === "integer" && l === "number" && e % 1 === 0 && e === e)) {
          C = !0;
          break;
        }
      C ||
        R.push({
          instanceLocation: a,
          keyword: "type",
          keywordLocation: `${s}/type`,
          error: `Instance type "${l}" is invalid. Expected "${h.join('", "')}".`,
        });
    } else
      h === "integer"
        ? (l !== "number" || e % 1 || e !== e) &&
          R.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${h}".`,
          })
        : h !== void 0 &&
          l !== h &&
          R.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${h}".`,
          });
    if (
      (w !== void 0 &&
        (l === "object" || l === "array"
          ? ze(e, w) ||
            R.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(w)}.`,
            })
          : e !== w &&
            R.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(w)}.`,
            })),
      m !== void 0 &&
        (l === "object" || l === "array"
          ? m.some((z) => ze(e, z)) ||
            R.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(m)}.`,
            })
          : m.some((z) => e === z) ||
            R.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(m)}.`,
            })),
      k !== void 0)
    ) {
      let z = `${s}/not`;
      te(e, k, r, n, o, i, a, z).valid &&
        R.push({
          instanceLocation: a,
          keyword: "not",
          keywordLocation: z,
          error: 'Instance matched "not" schema.',
        });
    }
    let Pe = [];
    if (A !== void 0) {
      let z = `${s}/anyOf`,
        C = R.length,
        q = !1;
      for (let M = 0; M < A.length; M++) {
        let _ = A[M],
          D = Object.create(c),
          B = te(e, _, r, n, o, u === !0 ? i : null, a, `${z}/${M}`, D);
        (R.push(...B.errors), (q = q || B.valid), B.valid && Pe.push(D));
      }
      q
        ? (R.length = C)
        : R.splice(C, 0, {
            instanceLocation: a,
            keyword: "anyOf",
            keywordLocation: z,
            error: "Instance does not match any subschemas.",
          });
    }
    if (v !== void 0) {
      let z = `${s}/allOf`,
        C = R.length,
        q = !0;
      for (let M = 0; M < v.length; M++) {
        let _ = v[M],
          D = Object.create(c),
          B = te(e, _, r, n, o, u === !0 ? i : null, a, `${z}/${M}`, D);
        (R.push(...B.errors), (q = q && B.valid), B.valid && Pe.push(D));
      }
      q
        ? (R.length = C)
        : R.splice(C, 0, {
            instanceLocation: a,
            keyword: "allOf",
            keywordLocation: z,
            error: "Instance does not match every subschema.",
          });
    }
    if (L !== void 0) {
      let z = `${s}/oneOf`,
        C = R.length,
        q = L.filter((M, _) => {
          let D = Object.create(c),
            B = te(e, M, r, n, o, u === !0 ? i : null, a, `${z}/${_}`, D);
          return (R.push(...B.errors), B.valid && Pe.push(D), B.valid);
        }).length;
      q === 1
        ? (R.length = C)
        : R.splice(C, 0, {
            instanceLocation: a,
            keyword: "oneOf",
            keywordLocation: z,
            error: `Instance does not match exactly one subschema (${q} matches).`,
          });
    }
    if (((l === "object" || l === "array") && Object.assign(c, ...Pe), y !== void 0)) {
      let z = `${s}/if`;
      if (te(e, y, r, n, o, i, a, z, c).valid) {
        if (T !== void 0) {
          let q = te(e, T, r, n, o, i, a, `${s}/then`, c);
          q.valid ||
            R.push(
              {
                instanceLocation: a,
                keyword: "if",
                keywordLocation: z,
                error: 'Instance does not match "then" schema.',
              },
              ...q.errors,
            );
        }
      } else if (H !== void 0) {
        let q = te(e, H, r, n, o, i, a, `${s}/else`, c);
        q.valid ||
          R.push(
            {
              instanceLocation: a,
              keyword: "if",
              keywordLocation: z,
              error: 'Instance does not match "else" schema.',
            },
            ...q.errors,
          );
      }
    }
    if (l === "object") {
      if (S !== void 0)
        for (let M of S)
          M in e ||
            R.push({
              instanceLocation: a,
              keyword: "required",
              keywordLocation: `${s}/required`,
              error: `Instance does not have required property "${M}".`,
            });
      let z = Object.keys(e);
      if (
        (G !== void 0 &&
          z.length < G &&
          R.push({
            instanceLocation: a,
            keyword: "minProperties",
            keywordLocation: `${s}/minProperties`,
            error: `Instance does not have at least ${G} properties.`,
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
            B = te(_, ge, r, n, o, i, D, M);
          B.valid ||
            R.push(
              {
                instanceLocation: a,
                keyword: "propertyNames",
                keywordLocation: M,
                error: `Property name "${_}" does not match schema.`,
              },
              ...B.errors,
            );
        }
      }
      if (me !== void 0) {
        let M = `${s}/dependantRequired`;
        for (let _ in me)
          if (_ in e) {
            let D = me[_];
            for (let B of D)
              B in e ||
                R.push({
                  instanceLocation: a,
                  keyword: "dependentRequired",
                  keywordLocation: M,
                  error: `Instance has "${_}" but does not have "${B}".`,
                });
          }
      }
      if (be !== void 0)
        for (let M in be) {
          let _ = `${s}/dependentSchemas`;
          if (M in e) {
            let D = te(e, be[M], r, n, o, i, a, `${_}/${ue(M)}`, c);
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
      if (X !== void 0) {
        let M = `${s}/dependencies`;
        for (let _ in X)
          if (_ in e) {
            let D = X[_];
            if (Array.isArray(D))
              for (let B of D)
                B in e ||
                  R.push({
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: M,
                    error: `Instance has "${_}" but does not have "${B}".`,
                  });
            else {
              let B = te(e, D, r, n, o, i, a, `${M}/${ue(_)}`);
              B.valid ||
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: M,
                    error: `Instance has "${_}" but does not match dependant schema.`,
                  },
                  ...B.errors,
                );
            }
          }
      }
      let C = Object.create(null),
        q = !1;
      if (re !== void 0) {
        let M = `${s}/properties`;
        for (let _ in re) {
          if (!(_ in e)) continue;
          let D = `${a}/${ue(_)}`,
            B = te(e[_], re[_], r, n, o, i, D, `${M}/${ue(_)}`);
          if (B.valid) c[_] = C[_] = !0;
          else if (
            ((q = o),
            R.push(
              {
                instanceLocation: a,
                keyword: "properties",
                keywordLocation: M,
                error: `Property "${_}" does not match schema.`,
              },
              ...B.errors,
            ),
            q)
          )
            break;
        }
      }
      if (!q && g !== void 0) {
        let M = `${s}/patternProperties`;
        for (let _ in g) {
          let D = new RegExp(_, "u"),
            B = g[_];
          for (let ce in e) {
            if (!D.test(ce)) continue;
            let Xt = `${a}/${ue(ce)}`,
              Zt = te(e[ce], B, r, n, o, i, Xt, `${M}/${ue(_)}`);
            Zt.valid
              ? (c[ce] = C[ce] = !0)
              : ((q = o),
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
      if (!q && E !== void 0) {
        let M = `${s}/additionalProperties`;
        for (let _ in e) {
          if (C[_]) continue;
          let D = `${a}/${ue(_)}`,
            B = te(e[_], E, r, n, o, i, D, M);
          B.valid
            ? (c[_] = !0)
            : ((q = o),
              R.push(
                {
                  instanceLocation: a,
                  keyword: "additionalProperties",
                  keywordLocation: M,
                  error: `Property "${_}" does not match additional properties schema.`,
                },
                ...B.errors,
              ));
        }
      } else if (!q && j !== void 0) {
        let M = `${s}/unevaluatedProperties`;
        for (let _ in e)
          if (!c[_]) {
            let D = `${a}/${ue(_)}`,
              B = te(e[_], j, r, n, o, i, D, M);
            B.valid
              ? (c[_] = !0)
              : R.push(
                  {
                    instanceLocation: a,
                    keyword: "unevaluatedProperties",
                    keywordLocation: M,
                    error: `Property "${_}" does not match unevaluated properties schema.`,
                  },
                  ...B.errors,
                );
          }
      }
    } else if (l === "array") {
      (O !== void 0 &&
        e.length > O &&
        R.push({
          instanceLocation: a,
          keyword: "maxItems",
          keywordLocation: `${s}/maxItems`,
          error: `Array has too many items (${e.length} > ${O}).`,
        }),
        K !== void 0 &&
          e.length < K &&
          R.push({
            instanceLocation: a,
            keyword: "minItems",
            keywordLocation: `${s}/minItems`,
            error: `Array has too few items (${e.length} < ${K}).`,
          }));
      let z = e.length,
        C = 0,
        q = !1;
      if (ve !== void 0) {
        let M = `${s}/prefixItems`,
          _ = Math.min(ve.length, z);
        for (; C < _; C++) {
          let D = te(e[C], ve[C], r, n, o, i, `${a}/${C}`, `${M}/${C}`);
          if (
            ((c[C] = !0),
            !D.valid &&
              ((q = o),
              R.push(
                {
                  instanceLocation: a,
                  keyword: "prefixItems",
                  keywordLocation: M,
                  error: "Items did not match schema.",
                },
                ...D.errors,
              ),
              q))
          )
            break;
        }
      }
      if (he !== void 0) {
        let M = `${s}/items`;
        if (Array.isArray(he)) {
          let _ = Math.min(he.length, z);
          for (; C < _; C++) {
            let D = te(e[C], he[C], r, n, o, i, `${a}/${C}`, `${M}/${C}`);
            if (
              ((c[C] = !0),
              !D.valid &&
                ((q = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: M,
                    error: "Items did not match schema.",
                  },
                  ...D.errors,
                ),
                q))
            )
              break;
          }
        } else
          for (; C < z; C++) {
            let _ = te(e[C], he, r, n, o, i, `${a}/${C}`, M);
            if (
              ((c[C] = !0),
              !_.valid &&
                ((q = o),
                R.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: M,
                    error: "Items did not match schema.",
                  },
                  ..._.errors,
                ),
                q))
            )
              break;
          }
        if (!q && b !== void 0) {
          let _ = `${s}/additionalItems`;
          for (; C < z; C++) {
            let D = te(e[C], b, r, n, o, i, `${a}/${C}`, _);
            ((c[C] = !0),
              D.valid ||
                ((q = o),
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
      if (F !== void 0)
        if (z === 0 && U === void 0)
          R.push({
            instanceLocation: a,
            keyword: "contains",
            keywordLocation: `${s}/contains`,
            error: "Array is empty. It must contain at least one item matching the schema.",
          });
        else if (U !== void 0 && z < U)
          R.push({
            instanceLocation: a,
            keyword: "minContains",
            keywordLocation: `${s}/minContains`,
            error: `Array has less items (${z}) than minContains (${U}).`,
          });
        else {
          let M = `${s}/contains`,
            _ = R.length,
            D = 0;
          for (let B = 0; B < z; B++) {
            let ce = te(e[B], F, r, n, o, i, `${a}/${B}`, M);
            ce.valid ? ((c[B] = !0), D++) : R.push(...ce.errors);
          }
          (D >= (U || 0) && (R.length = _),
            U === void 0 && W === void 0 && D === 0
              ? R.splice(_, 0, {
                  instanceLocation: a,
                  keyword: "contains",
                  keywordLocation: M,
                  error: "Array does not contain item matching schema.",
                })
              : U !== void 0 && D < U
                ? R.push({
                    instanceLocation: a,
                    keyword: "minContains",
                    keywordLocation: `${s}/minContains`,
                    error: `Array must contain at least ${U} items matching schema. Only ${D} items were found.`,
                  })
                : W !== void 0 &&
                  D > W &&
                  R.push({
                    instanceLocation: a,
                    keyword: "maxContains",
                    keywordLocation: `${s}/maxContains`,
                    error: `Array may contain at most ${W} items matching schema. ${D} items were found.`,
                  }));
        }
      if (!q && x !== void 0) {
        let M = `${s}/unevaluatedItems`;
        for (C; C < z; C++) {
          if (c[C]) continue;
          let _ = te(e[C], x, r, n, o, i, `${a}/${C}`, M);
          ((c[C] = !0),
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
      if (I)
        for (let M = 0; M < z; M++) {
          let _ = e[M],
            D = typeof _ == "object" && _ !== null;
          for (let B = 0; B < z; B++) {
            if (M === B) continue;
            let ce = e[B];
            (_ === ce || (D && typeof ce == "object" && ce !== null && ze(_, ce))) &&
              (R.push({
                instanceLocation: a,
                keyword: "uniqueItems",
                keywordLocation: `${s}/uniqueItems`,
                error: `Duplicate items at indexes ${M} and ${B}.`,
              }),
              (M = Number.MAX_SAFE_INTEGER),
              (B = Number.MAX_SAFE_INTEGER));
          }
        }
    } else if (l === "number") {
      if (
        (r === "4"
          ? (J !== void 0 &&
              ((oe === !0 && e <= J) || e < J) &&
              R.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${oe ? "or equal to " : ""} ${J}.`,
              }),
            ne !== void 0 &&
              ((N === !0 && e >= ne) || e > ne) &&
              R.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${N ? "or equal to " : ""} ${ne}.`,
              }))
          : (J !== void 0 &&
              e < J &&
              R.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${J}.`,
              }),
            ne !== void 0 &&
              e > ne &&
              R.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${ne}.`,
              }),
            oe !== void 0 &&
              e <= oe &&
              R.push({
                instanceLocation: a,
                keyword: "exclusiveMinimum",
                keywordLocation: `${s}/exclusiveMinimum`,
                error: `${e} is less than ${oe}.`,
              }),
            N !== void 0 &&
              e >= N &&
              R.push({
                instanceLocation: a,
                keyword: "exclusiveMaximum",
                keywordLocation: `${s}/exclusiveMaximum`,
                error: `${e} is greater than or equal to ${N}.`,
              })),
        Z !== void 0)
      ) {
        let z = e % Z;
        Math.abs(0 - z) >= 11920929e-14 &&
          Math.abs(Z - z) >= 11920929e-14 &&
          R.push({
            instanceLocation: a,
            keyword: "multipleOf",
            keywordLocation: `${s}/multipleOf`,
            error: `${e} is not a multiple of ${Z}.`,
          });
      }
    } else if (l === "string") {
      let z = ie === void 0 && se === void 0 ? 0 : br(e);
      (ie !== void 0 &&
        z < ie &&
        R.push({
          instanceLocation: a,
          keyword: "minLength",
          keywordLocation: `${s}/minLength`,
          error: `String is too short (${z} < ${ie}).`,
        }),
        se !== void 0 &&
          z > se &&
          R.push({
            instanceLocation: a,
            keyword: "maxLength",
            keywordLocation: `${s}/maxLength`,
            error: `String is too long (${z} > ${se}).`,
          }),
        ye !== void 0 &&
          !new RegExp(ye, "u").test(e) &&
          R.push({
            instanceLocation: a,
            keyword: "pattern",
            keywordLocation: `${s}/pattern`,
            error: "String does not match pattern.",
          }),
        V !== void 0 &&
          Tt[V] &&
          !Tt[V](e) &&
          R.push({
            instanceLocation: a,
            keyword: "format",
            keywordLocation: `${s}/format`,
            error: `String does not match format "${V}".`,
          }));
    }
    return { valid: R.length === 0, errors: R };
  }
  var it = class {
    constructor(t, r = "2019-09", n = !0) {
      Y(this, "schema");
      Y(this, "draft");
      Y(this, "shortCircuit");
      Y(this, "lookup");
      ((this.schema = t), (this.draft = r), (this.shortCircuit = n), (this.lookup = we(t)));
    }
    validate(t) {
      return te(t, this.schema, this.draft, this.lookup, this.shortCircuit);
    }
    addSchema(t, r) {
      (r && (t = { ...t, $id: r }), we(t, this.lookup));
    }
  };
  function st(e) {
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
    return st(e);
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
  function Me(e, t, r) {
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
      i = `<label class="dtf-sf-lbl"><span class="k">${st(e)}</span>${n ? '<span class="req">*</span>' : ""}<span class="t">${o}</span></label>`,
      a = "";
    if (o === "boolean") {
      let c = r === !0;
      a = `<span class="dtf-sf-bool">
      <button type="button" class="t${c ? " on" : ""}" data-bool-true>true</button>
      <button type="button" class="f${c === !1 ? " on" : ""}" data-bool-false>false</button>
    </span>`;
    } else if (o === "number") {
      let c = typeof r == "number" ? String(r) : "";
      a = `<input type="number" value="${Ne(c)}" data-input />`;
    } else if (o === "enum") {
      let c = (t.enum ?? []).map((l) => String(l)),
        d = String(r ?? "");
      a = `<select data-input>${c.map((l) => `<option value="${Ne(l)}"${l === d ? " selected" : ""}>${st(l)}</option>`).join("")}</select>`;
    } else if (o === "array") {
      let d = (Array.isArray(r) ? r : []).map((f) => String(f)).join(", "),
        l = Lo(t);
      a = `<input type="text" value="${Ne(d)}" data-input data-array-items="${l}" placeholder="comma-separated ${l}s" />`;
    } else {
      let c = typeof r == "string" ? r : r == null ? "" : String(r);
      a = `<input type="text" value="${Ne(c)}" data-input />`;
    }
    let s = t.description ? `<div class="dtf-sf-desc">${st(t.description)}</div>` : "";
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
      let c = xr(a);
      if (c === "boolean") {
        let l = s.querySelector("[data-bool-true]"),
          f = s.querySelector("[data-bool-false]");
        (l?.addEventListener("click", () => n(Me(r, i, !0))),
          f?.addEventListener("click", () => n(Me(r, i, !1))));
        continue;
      }
      let d = s.querySelector("[data-input]");
      if (d)
        if (c === "number")
          d.addEventListener("input", () => {
            let l = d.value;
            if (l === "") n(Me(r, i, void 0));
            else {
              let f = Number(l);
              Number.isNaN(f) || n(Me(r, i, f));
            }
          });
        else if (c === "array") {
          let l = d.dataset.arrayItems ?? "string";
          d.addEventListener("input", () => {
            let f = To(d.value, l);
            n(Me(r, i, f));
          });
        } else
          (d.addEventListener("input", () => n(Me(r, i, d.value))),
            d.addEventListener("change", () => n(Me(r, i, d.value))));
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
      <div class="ic"><span style="color:var(--accent)">${P.sliders}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${$(e.name)}</span>
          ${Oe("c:" + e.name, "Copy config name")}
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
  async function Sr(e, t, r, n) {
    e.innerHTML = Ee();
    let o;
    try {
      o = await t.configs();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = fe({
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
      ((e.innerHTML = s), c(e), n(0));
      return;
    }
    let i = null;
    function a() {
      let s = r.search.trim().toLowerCase(),
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Mo);
      if ((n(d.filter((l) => l.override !== void 0).length), d.length === 0)) {
        e.innerHTML = Ce(r.search);
        return;
      }
      if (r.view === "page") {
        let l = d.filter((p) => p.override !== void 0 || p.live !== void 0),
          f = d.filter((p) => !l.includes(p));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} loaded</span></div>` +
          (l.length
            ? l.map((p) => Rt(p, i)).join("")
            : '<div class="se-empty">No configs read on this page yet.</div>') +
          (f.length
            ? `<div class="dtf-group">Other<span class="c">${f.length}</span></div>` +
              f.map((p) => Rt(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All configs<span class="c">${d.length}</span></div>` +
          d.map((l) => Rt(l, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (f) => {
          if (f.target.closest(".dtf-copy")) return;
          let u = l.dataset.row;
          ((i = i === u ? null : u), a());
        });
      }),
        e.querySelectorAll("[data-edit]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-edit"),
              u = d.find((h) => h.name === p);
            Po(e, u, () => a());
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (f) => {
            (f.stopPropagation(), wt(l.getAttribute("data-clear"), null));
          });
        }),
        Ie(e, Object.fromEntries(d.map((l) => ["c:" + l.name, () => l.name]))));
    }
    a();
  }
  function $r(e) {
    return e == null || typeof e != "object" ? e : JSON.parse(JSON.stringify(e));
  }
  function Ao(e, t) {
    try {
      let n = new it(t, "2020-12", !1).validate(e ?? {});
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
  function Po(e, t, r) {
    let n = t.override !== void 0 ? t.override : t.real,
      o = n !== null && typeof n == "object" && !Array.isArray(n) ? n : {},
      i = $r(o);
    function a() {
      (document.removeEventListener("keydown", s), r());
    }
    function s(f) {
      (f.key === "Escape" && a(), f.key === "Enter" && (f.metaKey || f.ctrlKey) && c());
    }
    function c() {
      let f = Ao(i, t.schema);
      if (f) {
        d(f);
        return;
      }
      (wt(t.name, i), a());
    }
    function d(f) {
      let p = e.querySelector("[data-error]");
      p && (p.textContent = f ?? "");
    }
    function l() {
      let f = !wr(i, t.real);
      e.innerHTML = `
      <div class="dtf-inline-form">
        <div class="hd">
          <button class="back" data-action="close" title="Back (Esc)">${P.arrowLeft} Back</button>
          <span class="k" style="margin-left:8px">${$(t.name)}</span>
          <span class="type-tag t-object">object</span>
        </div>
        <div class="bd">
          <div data-form></div>
          <div class="dtf-sf-error" data-error></div>
        </div>
        <div class="ft">
          <button class="ghost" data-action="reset" ${f ? "" : "disabled"} style="${f ? "" : "opacity:.4"}">\u21BA Reset</button>
          <span class="sp"></span>
          <button data-action="cancel">Cancel</button>
          <button class="primary" data-action="save">Save <span style="opacity:.6;margin-left:4px">\u2318\u23CE</span></button>
        </div>
      </div>`;
      let p = e.querySelector("[data-form]");
      (yr(p, t.schema, i, (u) => {
        ((i = u), d(null));
        let h = !wr(i, t.real),
          w = e.querySelector('[data-action="reset"]');
        w && ((w.disabled = !h), (w.style.opacity = h ? "" : ".4"));
      }),
        e.querySelector('[data-action="close"]').addEventListener("click", a),
        e.querySelector('[data-action="cancel"]').addEventListener("click", a),
        e.querySelector('[data-action="save"]').addEventListener("click", c),
        e.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
          let u =
            t.real !== null && typeof t.real == "object" && !Array.isArray(t.real) ? t.real : {};
          ((i = $r(u)), l());
        }));
    }
    (document.addEventListener("keydown", s), l());
  }
  function Mt(e) {
    return $(e);
  }
  var pt = Cn(Dr(), 1);
  var qe = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
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
  var Se = "__se_label_target",
    Nt = "__se_label_target_style",
    Kt = !1,
    Ut = null,
    Be = null,
    Gr = null,
    Jr = [];
  function ga() {
    if (document.getElementById(Nt)) return;
    let e = document.createElement("style");
    ((e.id = Nt),
      (e.textContent = `
    .${Se} {
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
    .${Se}:hover,
    .${Se}.__se_label_active {
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
        !a.includes(pt.LABEL_MARKER_START) ||
        n.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        c = 0;
      qe.lastIndex = 0;
      let d;
      for (; (d = qe.exec(a)) !== null; ) {
        d.index > c && s.appendChild(document.createTextNode(a.slice(c, d.index)));
        let l = d[1],
          f = d[2],
          p = d[3],
          u = document.createElement("span");
        (u.setAttribute("data-label", l), f && u.setAttribute("data-variables", f));
        let h = Re(l),
          w = null;
        if (f)
          try {
            w = JSON.parse(f);
          } catch {
            w = null;
          }
        ((u.textContent = h !== null ? ft(h, w) : p),
          s.appendChild(u),
          (c = d.index + d[0].length));
      }
      (c < a.length && s.appendChild(document.createTextNode(a.slice(c))), r.push([o, s]));
    }
    for (let [a, s] of r) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        c = a.getAttribute("data-label"),
        d = Re(c);
      if (s.includes(pt.LABEL_MARKER_START)) {
        qe.lastIndex = 0;
        let l = qe.exec(s);
        if (l) {
          l[2] && a.setAttribute("data-variables", l[2]);
          let f = l[2] ? ma(l[2]) : null;
          a.textContent = d !== null ? ft(d, f) : l[3];
        }
      } else if (i)
        try {
          let l = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            f = i(c, l);
          d !== null ? (a.textContent = ft(d, l ?? null)) : f && f !== c && (a.textContent = f);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = Ft(a),
        c = new Map();
      for (let l of s) c.set(l.attr, l);
      let d = !1;
      for (let l of Array.from(a.attributes)) {
        let f = l.value;
        if (!f.includes(pt.LABEL_MARKER_START)) continue;
        qe.lastIndex = 0;
        let p = qe.exec(f);
        if (!p) continue;
        let u = p[1],
          h = p[3],
          w = Re(u);
        (a.setAttribute(l.name, w ?? h),
          c.set(l.name, { attr: l.name, key: u, original: h }),
          (d = !0));
      }
      d && Yr(a, Array.from(c.values()));
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
  function ft(e, t) {
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
  var ha = "[data-label], [data-label-attrs]";
  function ct() {
    return Array.from(document.querySelectorAll(ha));
  }
  function Le() {
    (Be?.remove(),
      (Be = null),
      document.querySelectorAll(`.${Se}.__se_label_active`).forEach((e) => {
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
  async function ba(e, t, r) {
    let n = r.querySelector(".lp-err"),
      o = r.querySelector('[data-action="save"]'),
      i = Re(e.key),
      a = Vr(e.key),
      s = Nr(i ?? a ?? ""),
      c = Nr(t),
      d = s.filter((m) => !c.includes(m)),
      l = c.filter((m) => !s.includes(m));
    if (d.length || l.length) {
      if (n) {
        let m = [];
        (d.length && m.push(`missing {{${d.join("}}, {{")}}}`),
          l.length && m.push(`unknown {{${l.join("}}, {{")}}}`),
          (n.textContent = `Placeholders must match exactly \u2014 ${m.join("; ")}.`));
      }
      return;
    }
    let f = e.variables ?? {},
      p = ft(t, f);
    (Xr(e, p),
      De(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let u = ir(),
      h = rt(),
      w = Gr;
    if (!w || (!u && !h)) {
      Le();
      return;
    }
    ((o.disabled = !0), (o.textContent = "Saving\u2026"), n && (n.textContent = ""));
    try {
      if (u) await w.upsertDraftKey(u, e.key, t);
      else if (h) {
        let m = Jr.find((S) => S.key === e.key && S.profileId === h);
        m && (await w.updateKeyById(m.id, t));
      }
      Le();
    } catch (m) {
      ((o.disabled = !1),
        (o.textContent = "Save"),
        n && (n.textContent = m instanceof Error ? m.message : String(m)));
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
    (Le(), e.classList.add("__se_label_active"));
    let r = ya(e);
    if (r.length === 0) return;
    let o = rt() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let c = `<div class="lp-tabs">${r
      .map((T, H) => {
        let V = wa(T, r),
          re = H === 0 ? "lp-tab active" : "lp-tab",
          g = T.kind === "attr" ? `@<span class="lp-tab-attr">${Q(T.attr ?? "")}</span>` : Q(V);
        return `<button class="${re}" data-surface-idx="${H}">${g}</button>`;
      })
      .join("")}</div>`;
    ((s.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono"></span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    ${c}
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
      h = s.querySelector('[data-action="reset"]');
    function w() {
      return r[a];
    }
    function m() {
      let T = w();
      (i.has(a) || i.set(a, Fr(T)), (l.textContent = T.key));
      let H = Vr(T.key),
        re = Re(T.key) ?? H ?? Fr(T),
        g = T.variables ?? {},
        E = Object.entries(g),
        j = E.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${E.map(([me, be]) => `<div class="lp-var"><span class="lp-var-k mono">${Q(`{{${me}}}`)}</span><span class="lp-var-v">${Q(String(be))}</span></div>`).join("")}</div>
        </div>`
          : "",
        G = T.desc ?? "",
        de = T.kind === "attr" ? `attribute \xB7 ${Q(T.attr ?? "")}` : "text content";
      ((f.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${Q(re)}</textarea>
      </div>
      ${j}
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
        <span class="${G ? "" : "empty"}">${G ? Q(G) : "No description"}</span>
      </div>`),
        (p.textContent = ""),
        (u.disabled = !1),
        (u.textContent = "Save"));
      let ge = f.querySelector(".lp-input");
      (ge.focus(), ge.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((T) => {
      T.addEventListener("click", () => {
        let H = Number(T.dataset.surfaceIdx);
        H !== a &&
          ((a = H),
          s.querySelectorAll(".lp-tab").forEach((V, re) => {
            V.classList.toggle("active", re === a);
          }),
          m());
      });
    }),
      m());
    let S = e.getBoundingClientRect(),
      k = s.offsetHeight,
      A = s.offsetWidth,
      v = 8,
      L = S.bottom + v;
    L + k > window.innerHeight - 8 && (L = Math.max(8, S.top - k - v));
    let y = S.left;
    (y + A > window.innerWidth - 8 && (y = Math.max(8, window.innerWidth - A - 8)),
      (s.style.top = `${L}px`),
      (s.style.left = `${y}px`),
      s.querySelector(".lp-close").addEventListener("click", Le),
      u.addEventListener("click", () => {
        let T = f.querySelector(".lp-input");
        ba(w(), T.value, s);
      }),
      h.addEventListener("click", () => {
        let T = w(),
          H = i.get(a) ?? "";
        (Xr(T, H),
          De(T.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: T.key, value: null } }),
          ),
          Le());
      }),
      s.addEventListener("click", (T) => T.stopPropagation()),
      s.addEventListener("mousedown", (T) => T.stopPropagation()),
      (Be = s));
  }
  function Ge(e, t, r) {
    if (((Kt = e), Ut?.(), (Ut = null), !e)) {
      Le();
      for (let p of ct()) p.classList.remove(Se);
      Ur();
      return;
    }
    ga();
    for (let p of ct()) p.classList.add(Se);
    function n(p) {
      return Be !== null && p.composedPath().includes(Be);
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
    function c(p) {
      if (n(p)) return;
      let u = o(p);
      u &&
        (a(p) || (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation(), ka(u, t)));
    }
    function d(p) {
      Be && (n(p) || o(p) || Le());
    }
    function l(p) {
      p.key === "Escape" && Le();
    }
    let f = new MutationObserver(() => {
      if (Kt) {
        for (let p of ct()) p.classList.add(Se);
        r();
      }
    });
    f.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let p of i) document.addEventListener(p, s, !0);
    (document.addEventListener("click", c, !0),
      document.addEventListener("mousedown", d, !0),
      document.addEventListener("keydown", l),
      (Ut = () => {
        for (let p of i) document.removeEventListener(p, s, !0);
        (document.removeEventListener("click", c, !0),
          document.removeEventListener("mousedown", d, !0),
          document.removeEventListener("keydown", l),
          f.disconnect());
        for (let p of ct()) p.classList.remove(Se);
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
      let A = rt() ?? Ea(i, o.locale)?.id ?? ua(i);
      s = await t.keys(A ?? void 0);
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
    let c = e.getRootNode().querySelector("select[data-locale]"),
      d = Sa(i);
    c &&
      ((c.innerHTML = d
        .map(
          (k) =>
            `<option value="${Q(k.code)}"${k.code === o.locale.split("-")[0] ? " selected" : ""}>${Q(k.flag)} \xB7 ${Q(k.name)}</option>`,
        )
        .join("")),
      (c.onchange = () => o.setLocale(c.value)));
    let l = r.search.trim().toLowerCase(),
      f = l ? s.filter((k) => k.key.toLowerCase().includes(l)) : s,
      p = $a(f),
      u = new Map(),
      h = null;
    function w() {
      let k = f.length;
      ((e.innerHTML =
        `<div class="dtf-group">All keys
        <span class="cov-mini" title="${Q(o.locale)} coverage">${k}/${s.length}</span>
        <span class="pulse"><span class="d"></span>${k} ${r.view === "page" ? "rendered" : "total"}</span>
      </div>` + m(p, 0)),
        e.querySelectorAll(".dtf-tree-node[data-tree]").forEach((A) => {
          A.addEventListener("click", () => {
            let v = A.dataset.tree;
            (u.set(v, !(u.get(v) ?? !0)), w());
          });
        }),
        e.querySelectorAll(".dtf-lbl-row[data-key]").forEach((A) => {
          A.addEventListener("click", (v) => {
            if (
              v.target.closest(".dtf-copy") ||
              v.target.closest("textarea") ||
              v.target.closest("button")
            )
              return;
            let L = A.dataset.key;
            ((h = h === L ? null : L), w());
          });
        }),
        e.querySelectorAll("textarea[data-edit-key]").forEach((A) => {
          (A.addEventListener("input", () => {}),
            A.addEventListener("blur", () => {
              let v = A.dataset.editKey,
                L = f.find((y) => y.key === v)?.value ?? "";
              A.value === L ? De(v, null) : De(v, A.value);
            }));
        }));
    }
    function m(k, A) {
      let v = "",
        L = Array.from(k.children.values()).sort((y, T) => y.name.localeCompare(T.name));
      for (let y of L) {
        let T = u.get(y.path) ?? !0,
          H = Zr(y);
        if (
          ((v += `
        <div class="dtf-tree-node" style="padding-left:${12 + A * 14}px" data-tree="${Q(y.path)}">
          <span class="caret">${T ? "\u25BE" : "\u25B8"}</span>
          <span class="seg">${Q(y.name)}</span>
          <span class="dotpath">${Q(y.path)}</span>
          <span class="counts"><span class="t">${H}</span></span>
        </div>`),
          T)
        ) {
          v += m(y, A + 1);
          for (let V of y.leaves) v += S(V, A + 1);
        }
      }
      if (A === 0) for (let y of k.leaves) v += S(y, 0);
      return v;
    }
    function S(k, A) {
      let v = h === k.key,
        L = Re(k.key),
        y = L ?? k.value,
        T = !y,
        H = k.key.split(".").pop() ?? k.key,
        V = T ? "missing" : L !== null ? "edited" : "ok",
        re = T ? "\u2298" : L !== null ? "\u270E" : "\u25CF";
      return `
      <div class="dtf-lbl-row${v ? " expanded" : ""}${T ? " missing" : ""}" style="padding-left:${12 + A * 14}px" data-key="${Q(k.key)}" title="${Q(k.key)}">
        <span class="lbl-pill ${V}" title="${V}">${re}</span>
        <div class="meta">
          <div class="src">
            ${Q(H)}
            <button class="dtf-copy" data-copy-leaf="${Q(k.key)}" title="Copy value">${Wr}</button>
          </div>
          <div class="sub">
            <span class="k" title="${Q(y)}">${T ? '<em style="color:var(--warn)">\u2014 not translated \u2014</em>' : Q(y)}</span>
          </div>
        </div>
        <span style="width:5px"></span>
      </div>
      <div class="dtf-detail${v ? " open" : ""}">
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
    (w(),
      e.querySelectorAll("[data-copy-leaf]").forEach((k) => {
        k.addEventListener("click", async (A) => {
          A.stopPropagation();
          let v = k.getAttribute("data-copy-leaf"),
            L = f.find((y) => y.key === v)?.value ?? "";
          try {
            await navigator.clipboard.writeText(L);
          } catch {}
          (k.classList.add("done"),
            (k.innerHTML = La),
            setTimeout(() => {
              (k.classList.remove("done"), (k.innerHTML = Wr));
            }, 900));
        });
      }),
      He() && (We(), Kt || Ge(!0, n, () => w())));
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
        await new Promise((d, l) => {
          let f = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((n.onloadedmetadata = () => {
            (clearTimeout(f), d());
          }),
            (n.onerror = () => {
              (clearTimeout(f), l(new Error("Capture stream errored")));
            }));
        }),
        await n.play(),
        await new Promise((d) => requestAnimationFrame(() => d(null))),
        await new Promise((d) => requestAnimationFrame(() => d(null))));
      let o = n.videoWidth,
        i = n.videoHeight;
      if (!o || !i) throw new Error("Capture stream returned no frames.");
      let a = document.createElement("canvas");
      ((a.width = o), (a.height = i));
      let s = a.getContext("2d");
      if (!s) throw new Error("Canvas 2d context unavailable");
      return (
        s.drawImage(n, 0, 0, o, i),
        await new Promise((d, l) => {
          a.toBlob((f) => (f ? d(f) : l(new Error("toBlob failed"))), "image/png");
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
    await new Promise((d) => requestAnimationFrame(() => d(null)));
    let i =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((d) =>
          MediaRecorder.isTypeSupported(d),
        ) ?? "",
      a = i ? new MediaRecorder(r, { mimeType: i }) : new MediaRecorder(r),
      s = [];
    (a.addEventListener("dataavailable", (d) => {
      d.data && d.data.size > 0 && s.push(d.data);
    }),
      a.start(500),
      r.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), a.state !== "inactive" && a.stop(), t?.());
      }));
    function c() {
      (r.getTracks().forEach((d) => d.stop()), n());
    }
    return {
      stop() {
        return new Promise((d, l) => {
          if (a.state === "inactive") {
            if ((c(), s.length === 0)) {
              l(new Error("No recording data."));
              return;
            }
            d(new Blob(s, { type: i || "video/webm" }));
            return;
          }
          (a.addEventListener(
            "stop",
            () => {
              (c(), d(new Blob(s, { type: i || "video/webm" })));
            },
            { once: !0 },
          ),
            a.addEventListener("error", (f) => l(f), { once: !0 }),
            a.stop());
        });
      },
      cancel() {
        (a.state !== "inactive" && a.stop(), c());
      },
    };
  }
  var nn = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function on(e) {
    let t = URL.createObjectURL(e),
      r = await new Promise((g, E) => {
        let j = new Image();
        ((j.onload = () => g(j)),
          (j.onerror = () => E(new Error("Failed to load screenshot for annotation."))),
          (j.src = t));
      }),
      n = document.createElement("div");
    n.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), n.appendChild(o));
    let i = "pen",
      a = nn[0],
      s = [];
    function c(g) {
      ((i = g),
        o
          .querySelectorAll("[data-tool]")
          .forEach((E) => E.classList.toggle("on", E.dataset.tool === g)));
    }
    function d(g, E, j) {
      let G = document.createElement("button");
      return (
        (G.type = "button"),
        (G.className = "se-annot-btn"),
        (G.dataset.tool = g),
        (G.textContent = E),
        (G.title = j),
        G.addEventListener("click", () => c(g)),
        G
      );
    }
    (o.appendChild(d("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(d("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(d("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(d("text", "T text", "Text (T)")),
      c("pen"));
    let l = document.createElement("span");
    ((l.className = "se-annot-sep"), o.appendChild(l));
    for (let g of nn) {
      let E = document.createElement("button");
      ((E.type = "button"),
        (E.className = "se-annot-swatch"),
        (E.dataset.color = g),
        (E.style.background = g),
        g === a && E.classList.add("on"),
        E.addEventListener("click", () => {
          ((a = g),
            o
              .querySelectorAll("[data-color]")
              .forEach((j) => j.classList.toggle("on", j.dataset.color === g)));
        }),
        o.appendChild(E));
    }
    let f = document.createElement("button");
    ((f.type = "button"),
      (f.className = "se-annot-btn"),
      (f.textContent = "\u21B6 undo"),
      (f.title = "Undo (Ctrl/Cmd+Z)"),
      f.addEventListener("click", () => {
        (s.pop(), L());
      }),
      o.appendChild(f));
    let p = document.createElement("button");
    ((p.type = "button"),
      (p.className = "se-annot-btn"),
      (p.textContent = "clear"),
      p.addEventListener("click", () => {
        ((s.length = 0), L());
      }),
      o.appendChild(p));
    let u = document.createElement("div");
    ((u.className = "se-annot-stage"), n.appendChild(u));
    let h = document.createElement("canvas");
    ((h.width = r.naturalWidth),
      (h.height = r.naturalHeight),
      (h.className = "se-annot-canvas"),
      (h.style.cursor = "crosshair"),
      (h.style.touchAction = "none"),
      u.appendChild(h));
    let w = h.getContext("2d"),
      m = null;
    function S(g) {
      let E = h.getBoundingClientRect(),
        j = h.width / E.width,
        G = h.height / E.height;
      return { x: (g.clientX - E.left) * j, y: (g.clientY - E.top) * G };
    }
    function k() {
      return Math.max(2, Math.round(r.naturalWidth / 400));
    }
    function A() {
      return Math.max(14, Math.round(r.naturalWidth / 60));
    }
    function v(g) {
      if (
        (w.save(),
        (w.strokeStyle = g.color),
        (w.fillStyle = g.color),
        (w.lineWidth = k()),
        (w.lineCap = "round"),
        (w.lineJoin = "round"),
        g.tool === "rect")
      ) {
        let E = Math.min(g.x1, g.x2),
          j = Math.min(g.y1, g.y2),
          G = Math.abs(g.x2 - g.x1),
          de = Math.abs(g.y2 - g.y1);
        w.strokeRect(E, j, G, de);
      } else if (g.tool === "arrow") {
        (w.beginPath(), w.moveTo(g.x1, g.y1), w.lineTo(g.x2, g.y2), w.stroke());
        let E = Math.atan2(g.y2 - g.y1, g.x2 - g.x1),
          j = k() * 5;
        (w.beginPath(),
          w.moveTo(g.x2, g.y2),
          w.lineTo(g.x2 - j * Math.cos(E - Math.PI / 6), g.y2 - j * Math.sin(E - Math.PI / 6)),
          w.lineTo(g.x2 - j * Math.cos(E + Math.PI / 6), g.y2 - j * Math.sin(E + Math.PI / 6)),
          w.closePath(),
          w.fill());
      } else if (g.tool === "pen")
        if (g.points.length < 2) {
          if (g.points.length === 1) {
            let E = g.points[0];
            (w.beginPath(), w.arc(E.x, E.y, k() / 2, 0, Math.PI * 2), w.fill());
          }
        } else {
          (w.beginPath(), w.moveTo(g.points[0].x, g.points[0].y));
          for (let E = 1; E < g.points.length; E++) w.lineTo(g.points[E].x, g.points[E].y);
          w.stroke();
        }
      else if (g.tool === "text" && g.text) {
        let E = A();
        ((w.font = `600 ${E}px ui-sans-serif, system-ui, sans-serif`), (w.textBaseline = "top"));
        let j = E * 0.3,
          de = w.measureText(g.text).width + j * 2,
          ge = E + j * 2;
        ((w.fillStyle = "rgba(0,0,0,0.55)"),
          w.fillRect(g.x1, g.y1, de, ge),
          (w.fillStyle = g.color),
          w.fillText(g.text, g.x1 + j, g.y1 + j));
      }
      w.restore();
    }
    function L(g) {
      (w.clearRect(0, 0, h.width, h.height), w.drawImage(r, 0, 0));
      for (let E of s) v(E);
      g && v(g);
    }
    L();
    let y = null;
    function T(g, E) {
      y && y.blur();
      let j = h.getBoundingClientRect(),
        G = u.getBoundingClientRect(),
        de = j.width / h.width,
        ge = j.height / h.height,
        me = A() * de,
        be = me * 0.3,
        X = document.createElement("input");
      ((X.type = "text"),
        (X.className = "se-annot-text-input"),
        (X.style.position = "absolute"),
        (X.style.left = `${j.left - G.left + g * de}px`),
        (X.style.top = `${j.top - G.top + E * ge}px`),
        (X.style.color = a),
        (X.style.background = "rgba(0,0,0,0.55)"),
        (X.style.border = `1px dashed ${a}`),
        (X.style.outline = "none"),
        (X.style.padding = `${be}px`),
        (X.style.font = `600 ${me}px ui-sans-serif, system-ui, sans-serif`),
        (X.style.minWidth = `${me * 4}px`),
        (X.style.lineHeight = "1"),
        (X.placeholder = "type\u2026"));
      let ve = !1;
      function he() {
        if (ve) return;
        ve = !0;
        let x = X.value.trim();
        (X.remove(),
          (y = null),
          x && (s.push({ tool: "text", color: a, x1: g, y1: E, text: x }), L()));
      }
      function b() {
        ve || ((ve = !0), X.remove(), (y = null));
      }
      (X.addEventListener("keydown", (x) => {
        (x.key === "Enter"
          ? (x.preventDefault(), he())
          : x.key === "Escape" && (x.preventDefault(), b()),
          x.stopPropagation());
      }),
        X.addEventListener("blur", he),
        u.appendChild(X),
        (y = X),
        setTimeout(() => X.focus(), 0));
    }
    let H = null;
    (h.addEventListener("pointermove", (g) => {
      ((m = S(g)),
        H &&
          (H.kind === "pen"
            ? (H.shape.points.push(m), L())
            : L({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: H.x1,
                y1: H.y1,
                x2: m.x,
                y2: m.y,
              })));
    }),
      h.addEventListener("pointerdown", (g) => {
        g.preventDefault();
        let E = S(g);
        if (((m = E), i === "text")) {
          T(E.x, E.y);
          return;
        }
        if (i === "pen") {
          let j = { tool: "pen", color: a, points: [E] };
          (s.push(j), (H = { kind: "pen", shape: j }), h.setPointerCapture(g.pointerId), L());
          return;
        }
        ((H = { kind: "shape", x1: E.x, y1: E.y }), h.setPointerCapture(g.pointerId));
      }),
      h.addEventListener("pointerup", (g) => {
        if (!H) return;
        let E = S(g);
        if (H.kind === "shape") {
          let j = Math.abs(E.x - H.x1),
            G = Math.abs(E.y - H.y1);
          (j > 4 || G > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: H.x1, y1: H.y1, x2: E.x, y2: E.y });
        }
        ((H = null), L());
      }));
    function V(g) {
      if (!(g instanceof HTMLElement)) return !1;
      let E = g.tagName;
      return E === "INPUT" || E === "TEXTAREA" || g.isContentEditable;
    }
    function re(g) {
      if (!n.isConnected) {
        document.removeEventListener("keydown", re, !0);
        return;
      }
      if (V(g.target)) return;
      let E = g.key.toLowerCase();
      if ((g.ctrlKey || g.metaKey) && E === "z") {
        (g.preventDefault(), s.pop(), L());
        return;
      }
      if (!(g.ctrlKey || g.metaKey || g.altKey))
        if (E === "t") {
          (g.preventDefault(), c("text"));
          let j = m ?? { x: h.width / 2, y: h.height / 2 };
          T(j.x, j.y);
        } else E === "p" ? c("pen") : E === "a" ? c("arrow") : E === "r" && c("rect");
    }
    return (
      document.addEventListener("keydown", re, !0),
      {
        root: n,
        async export() {
          (y && y.blur(), await new Promise((E) => requestAnimationFrame(() => E(null))));
          let g = await new Promise((E, j) => {
            h.toBlob((G) => (G ? E(G) : j(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", re, !0), g);
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
    function c(m) {
      let S = a.get(m);
      return (S || ((S = t.bug(m)), a.set(m, S)), S);
    }
    function d(m) {
      let S = a.get(m);
      return (S || ((S = t.featureRequest(m)), a.set(m, S)), S);
    }
    function l(m) {
      let S = s.get(m);
      return (S || ((S = t.attachmentBlob(m).then((k) => URL.createObjectURL(k))), s.set(m, S)), S);
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
        <button class="${n.sub === "bugs" ? "active" : ""}" data-sub="bugs">${P.bug} Bugs <span class="c">\u2026</span></button>
        <button class="${n.sub === "features" ? "active" : ""}" data-sub="features">${P.sparkles} Feature requests <span class="c">\u2026</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${n.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${t.hideAdminLinks ? "" : `<a class="ibtn" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/${n.sub === "bugs" ? "bugs" : "feature-requests"}">${P.external} Open dashboard</a>`}
      </div>
      <div class="se-feedback-list" data-list></div>`),
        e.querySelectorAll("[data-sub]").forEach((S) => {
          S.addEventListener("click", () => n.setSub(S.dataset.sub));
        }),
        e.querySelector('[data-action="file"]').addEventListener("click", () => {
          ((i = n.sub === "bugs" ? "bug" : "feature"), f());
        }));
      let m = e.querySelector("[data-list]");
      if (((m.innerHTML = Ee()), n.sub === "bugs")) {
        let S;
        try {
          S = await t.bugs();
        } catch (v) {
          m.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(v))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="bugs"] .c');
        k.textContent = String(S.length);
        let A = e.querySelector('[data-sub="features"] .c');
        try {
          let v = await t.featureRequests();
          A.textContent = String(v.length);
        } catch {
          A.textContent = "?";
        }
        u(m, S);
      } else {
        let S;
        try {
          S = await t.featureRequests();
        } catch (v) {
          m.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(v))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="features"] .c');
        k.textContent = String(S.length);
        let A = e.querySelector('[data-sub="bugs"] .c');
        try {
          let v = await t.bugs();
          A.textContent = String(v.length);
        } catch {
          A.textContent = "?";
        }
        h(m, S);
      }
    }
    function u(m, S) {
      if (S.length === 0) {
        let { html: v, wire: L } = fe({
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
        ((m.innerHTML = v), L(m));
        return;
      }
      let k = new Set(),
        A = () => {
          ((m.innerHTML = S.map(
            (v) => `
          <div class="se-feedback-row${k.has(v.id) ? " expanded" : ""}" data-id="${$(v.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(v.title)}</div>
              <div class="row-sub">${$(pe(v.createdAt))}${v.reporterEmail ? " \xB7 " + $(v.reporterEmail) : ""}</div>
            </div>
            ${Wt(v.status, _a[v.status])}
          </div>
          <div class="se-feedback-detail${k.has(v.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${$(v.pageUrl ?? "\u2014")}</span>
                <span class="k">filed</span><span>${$(pe(v.createdAt))}${v.reporterEmail ? " \xB7 " + $(v.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(v.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/bugs/${$(v.id)}">${P.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            m.querySelectorAll("[data-id]").forEach((v) => {
              v.addEventListener("click", () => {
                let L = v.dataset.id;
                (k.has(L) ? k.delete(L) : k.add(L), A());
              });
            }));
          for (let v of k) {
            let L = m.querySelector(`[data-attach-slot="${v}"]`);
            L && w(L, c(v));
          }
        };
      A();
    }
    function h(m, S) {
      if (S.length === 0) {
        let { html: v, wire: L } = fe({
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
        ((m.innerHTML = v), L(m));
        return;
      }
      let k = new Set(),
        A = () => {
          ((m.innerHTML = S.map(
            (v) => `
          <div class="se-feedback-row${k.has(v.id) ? " expanded" : ""}" data-id="${$(v.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(v.title)}</div>
              <div class="row-sub">${$(pe(v.createdAt))}${v.reporterEmail ? " \xB7 " + $(v.reporterEmail) : ""}</div>
            </div>
            ${Wt(v.importance, Ra[v.importance])}
            ${Wt(v.status, Ta[v.status])}
          </div>
          <div class="se-feedback-detail${k.has(v.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${$(v.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${$(pe(v.createdAt))}${v.reporterEmail ? " \xB7 " + $(v.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(v.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/feature-requests/${$(v.id)}">${P.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            m.querySelectorAll("[data-id]").forEach((v) => {
              v.addEventListener("click", () => {
                let L = v.dataset.id;
                (k.has(L) ? k.delete(L) : k.add(L), A());
              });
            }));
          for (let v of k) {
            let L = m.querySelector(`[data-attach-slot="${v}"]`);
            L && w(L, d(v));
          }
        };
      A();
    }
    function w(m, S) {
      m.dataset.hydrated !== "1" &&
        ((m.dataset.hydrated = "1"),
        (m.innerHTML = '<div class="se-attach-slot-loading">Loading attachments\u2026</div>'),
        S.then((k) => {
          if (m.isConnected) {
            if (k.attachments.length === 0) {
              m.innerHTML = "";
              return;
            }
            ((m.innerHTML = `<div class="se-attach-grid">${k.attachments.map(Ma).join("")}</div>`),
              m.querySelectorAll("[data-thumb-fetch]").forEach((A) => {
                let v = A.dataset.thumbFetch;
                l(v)
                  .then((L) => {
                    A.isConnected &&
                      ((A.style.backgroundImage = `url('${L}')`), A.classList.add("has-image"));
                  })
                  .catch(() => {});
              }),
              m.querySelectorAll("[data-preview-id]").forEach((A) => {
                A.addEventListener("click", async (v) => {
                  v.stopPropagation();
                  let L = A.dataset.previewId,
                    y = k.attachments.find((T) => T.id === L);
                  if (y)
                    try {
                      let T = await l(L);
                      cn(r, { kind: y.kind, filename: y.filename, url: T, sizeBytes: y.sizeBytes });
                    } catch (T) {
                      console.error(T);
                    }
                });
              }));
          }
        }).catch((k) => {
          m.isConnected &&
            (m.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${$(String(k))}</div>`);
        }));
    }
    await f();
  }
  function dn(e, t) {
    e.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${P.arrowLeft} Back</button>
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
          (s.innerHTML = `${P.alert}<span>Discard your changes?</span><span style="flex:1"></span>
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
             <div class="play">${P.playFilled}</div>
             <span class="scrim">click to play</span>
           </div>`
            : `<div class="preview file">${P.file}<span class="ext">.${$(pn(e.filename))}</span></div>`,
      o = e.kind === "screenshot" ? P.camera : e.kind === "recording" ? P.record : P.file;
    return `
    <div class="se-attach-card readonly">
      ${n}
      <div class="meta">
        <span class="ic">${o}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(ot(e.sizeBytes))}</span>
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
             <div class="play">${P.playFilled}</div>
             ${e.duration ? `<span class="dur">${Pa(e.duration)}</span>` : ""}
             ${n ? '<span class="scrim">click to play</span>' : ""}
           </div>`
            : `<div class="preview file">${P.file}<span class="ext">.${$(pn(e.filename))}</span></div>`,
      i =
        e.progress != null && e.progress < 100
          ? `<div class="progress"><div class="fill" style="width:${e.progress}%"></div></div>`
          : "",
      a = e.kind === "screenshot" ? P.camera : e.kind === "recording" ? P.record : P.file;
    return `
    <div class="se-attach-card" data-attach="${$(e.id)}">
      ${o}
      ${i}
      <button class="rm" data-remove="${$(e.id)}" title="Remove">${P.x}</button>
      <div class="meta">
        <span class="ic">${a}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(ot(e.blob.size))}</span>
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
      <button class="x" data-action="close" title="Close (Esc)">${P.x}</button>
      ${n ? `<video src="${t.url}" controls autoplay playsinline></video>` : `<img src="${t.url}" alt="${$(t.filename)}" />`}
      <div class="cap">
        <span>${$(t.filename)}</span>
        <span style="color:var(--fg-4)">\xB7</span>
        <span style="color:var(--fg-4)">${$(ot(t.sizeBytes))}</span>
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
      c = `
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
          <button type="button" class="ibtn" data-action="screenshot">${P.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${P.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${P.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`,
      d = { title: "", steps: "", actual: "", expected: "", priority: "" },
      l = dn(e, {
        title: "File a bug",
        bodyHtml: c,
        isDirty: () => !!(d.title || d.steps || d.actual || d.expected || i.length),
        onSubmit: L,
        onCancel: () => {
          (s(), o());
        },
      }),
      f = l.host,
      p = f.querySelector("[data-status]"),
      u = (y, T = !1) => {
        ((p.textContent = y), p.classList.toggle("err", T));
      },
      h = f.querySelector("[data-attach-grid]"),
      w = () => {
        ((h.innerHTML = i.map(Aa).join("")),
          h.querySelectorAll("[data-remove]").forEach((y) => {
            y.addEventListener("click", (T) => {
              T.stopPropagation();
              let H = i.findIndex((V) => V.id === y.dataset.remove);
              if (H >= 0) {
                let [V] = i.splice(H, 1);
                V.previewUrl && URL.revokeObjectURL(V.previewUrl);
              }
              w();
            });
          }),
          h.querySelectorAll("[data-preview]").forEach((y) => {
            y.addEventListener("click", (T) => {
              T.stopPropagation();
              let H = i.find((V) => V.id === y.dataset.preview);
              H &&
                H.previewUrl &&
                cn(r, {
                  kind: H.kind,
                  filename: H.filename,
                  url: H.previewUrl,
                  sizeBytes: H.blob.size,
                });
            });
          }));
      },
      m = (y) => {
        (!y.previewUrl &&
          (y.kind === "screenshot" || y.kind === "recording") &&
          (y.previewUrl = URL.createObjectURL(y.blob)),
          i.push(y),
          w());
      };
    (f.querySelectorAll("[data-field]").forEach((y) => {
      let T = () => {
        d[y.dataset.field] = y.value;
        let H = y.closest("[data-field-wrap]");
        H?.classList.contains("invalid") && y.value.trim() && H.classList.remove("invalid");
      };
      (y.addEventListener("input", T), y.addEventListener("change", T));
    }),
      f.querySelector('[data-action="screenshot"]').addEventListener("click", async () => {
        u("Pick a screen/tab to capture\u2026");
        try {
          let y = await tn(n.host);
          (u(""),
            Ca(r, n, y, (T) => {
              m({
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
    let S = f.querySelector('[data-action="record"]'),
      k = !1;
    async function A() {
      if (!(!a || k)) {
        k = !0;
        try {
          ((S.disabled = !0), u("Finalizing recording\u2026"));
          let y = await a.stop();
          ((a = null),
            S.classList.remove("recording"),
            (S.innerHTML = `${P.record} Record screen`),
            m({
              id: "at_" + Math.random().toString(36).slice(2, 7),
              kind: "recording",
              filename: `recording-${Date.now()}.webm`,
              blob: y,
            }),
            u(""));
        } catch (y) {
          u(y instanceof Error ? y.message : String(y), !0);
        } finally {
          ((S.disabled = !1), (k = !1));
        }
      }
    }
    S.addEventListener("click", async () => {
      if (a) {
        await A();
        return;
      }
      u("Pick a screen/tab to record\u2026");
      try {
        ((a = await rn(n.host, () => {
          A();
        })),
          S.classList.add("recording"),
          (S.innerHTML = `${P.record} Stop recording`),
          u("Recording\u2026"));
      } catch (y) {
        (u(y instanceof Error ? y.message : String(y), !0), (a = null));
      }
    });
    let v = f.querySelector('[data-action="file-input"]');
    (f.querySelector('[data-action="upload"]').addEventListener("click", () => v.click()),
      v.addEventListener("change", () => {
        let y = v.files?.[0];
        if (!y) return;
        let T = y.type.startsWith("image/"),
          H = y.type.startsWith("video/");
        (m({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: T ? "screenshot" : H ? "recording" : "file",
          filename: y.name,
          blob: y,
        }),
          (v.value = ""));
      }));
    async function L() {
      let y = ["title", "steps"],
        T = null;
      for (let H of y) {
        let V = f.querySelector(`[data-field-wrap="${H}"]`),
          re = f.querySelector(`[data-field="${H}"]`),
          g = !d[H].trim();
        (V?.classList.toggle("invalid", g), g && !T && (T = re));
      }
      if (T) {
        (u(""),
          T.scrollIntoView({ block: "center", behavior: "smooth" }),
          T.focus({ preventScroll: !0 }));
        return;
      }
      u("Submitting\u2026");
      try {
        let H = await t.createBug({
          title: d.title.trim(),
          stepsToReproduce: d.steps,
          actualResult: d.actual,
          expectedResult: d.expected,
          priority: d.priority || void 0,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
        for (let V = 0; V < i.length; V++) {
          let re = i[V];
          (u(`Uploading ${V + 1}/${i.length}\u2026`),
            await t.uploadAttachment({
              reportKind: "bug",
              reportId: H.id,
              kind: re.kind,
              filename: re.filename,
              blob: re.blob,
            }));
        }
        (s(), l.close());
      } catch (H) {
        u(H instanceof Error ? H.message : String(H), !0);
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
        <button class="x" data-action="close">${P.x}</button>
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
    (o.querySelectorAll('[data-action="close"]').forEach((c) => c.addEventListener("click", a)),
      o.addEventListener("click", (c) => {
        c.target === o && a();
      }));
    let s = o.querySelector("[data-host]");
    on(r)
      .then((c) => {
        ((s.innerHTML = ""),
          s.appendChild(c.root),
          sn(o),
          o.querySelector('[data-action="save"]').addEventListener("click", async () => {
            let d = await c.export();
            (a(), n(d));
          }));
      })
      .catch((c) => {
        s.innerHTML = `<div class="err">${$(String(c))}</div>`;
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
      c = n.top,
      d = i - n.bottom,
      l = Math.min(a, s, c, d),
      f = 12;
    l === a
      ? (e.style.right = `${Math.max(0, o - n.left + f)}px`)
      : l === s
        ? (e.style.left = `${n.right + f}px`)
        : l === c
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
      c = Math.max(120, r.width - o - 30),
      d = Math.max(120, r.height - i - a),
      l = t.width / t.height,
      f = c,
      p = f / l;
    (p > d && ((p = d), (f = p * l)),
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
        onSubmit: d,
        onCancel: r,
      }),
      a = i.host,
      s = a.querySelector("[data-status]"),
      c = (l, f = !1) => {
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
    async function d() {
      if (!n.title.trim()) {
        c("Title is required", !0);
        return;
      }
      c("Submitting\u2026");
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
        c(l instanceof Error ? l.message : String(l), !0);
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
  function hn() {
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
    Ae = [
      { k: "user", label: "User", icon: P.users, description: "props \xB7 impersonate" },
      { k: "gates", label: "Gates", icon: P.shield, description: "flags & killswitches" },
      { k: "experiments", label: "Experiments", icon: P.flask, description: "A/B variants" },
      { k: "configs", label: "Configs", icon: P.sliders, description: "remote values" },
      { k: "labels", label: "Translations", icon: P.book, description: "i18n strings" },
      { k: "feedback", label: "Feedback", icon: P.bug, description: "bugs + requests" },
      { k: "events", label: "Events", icon: P.activity, description: "live stream" },
    ],
    Vt = "se_dt_project",
    wn = "se_l_overlay",
    Yt = "se_l_active_panel",
    Na = 24,
    Ka = 56,
    bn = { edge: "right", offsetPct: 50, railIconSize: 32, collapsed: !1 };
  function Fa() {
    try {
      let e = sessionStorage.getItem(Vt);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function ut(e) {
    try {
      e === null ? sessionStorage.removeItem(Vt) : sessionStorage.setItem(Vt, JSON.stringify(e));
    } catch {}
  }
  function Wa() {
    try {
      let e = localStorage.getItem(wn);
      if (e) return { ...bn, ...JSON.parse(e) };
    } catch {}
    return { ...bn };
  }
  function ke(e) {
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
  function _e(e) {
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
      c = Fa();
    c && s && c.id !== s.projectId && ((c = null), ut(null));
    let d = null;
    function l() {
      return s
        ? (!d || d.token !== s.token || d.projectId !== s.projectId
            ? (d = new nt(e.adminUrl, s.token, s.projectId, yn(e)))
            : (d.hideAdminLinks = yn(e)),
          d)
        : null;
    }
    let f = {
        user: { view: "all", search: "" },
        gates: { view: "page", search: "" },
        experiments: { view: "page", search: "" },
        configs: { view: "page", search: "" },
        labels: { view: "page", search: "" },
        feedback: { view: "all", search: "" },
        events: { view: "all", search: "" },
      },
      p = "en-US",
      u = "bugs",
      h = null,
      w = { props: {}, dirty: {} },
      m = { user: 0, gates: 0, experiments: 0, configs: 0, labels: 0, feedback: 0, events: 0 };
    function S() {
      return Object.values(m).reduce((b, x) => b + x, 0);
    }
    function k(b) {
      let x = Ua[b];
      return x ? (c ? c.modules[x] : !s) : !0;
    }
    function A(b) {
      let x = window.innerWidth,
        F = window.innerHeight,
        { edge: U, offsetPct: W, collapsed: K } = i,
        O = b.style;
      if (((O.top = O.bottom = O.left = O.right = O.transform = ""), (b.dataset.edge = U), K))
        U === "right"
          ? ((O.right = "10px"), (O.top = `${W}%`), (O.transform = "translateY(-50%)"))
          : U === "left"
            ? ((O.left = "10px"), (O.top = `${W}%`), (O.transform = "translateY(-50%)"))
            : U === "top"
              ? ((O.top = "10px"), (O.left = `${W}%`), (O.transform = "translateX(-50%)"))
              : ((O.bottom = "10px"), (O.left = `${W}%`), (O.transform = "translateX(-50%)"));
      else {
        let J = F - 36;
        U === "right"
          ? ((O.right = "12px"), (O.top = "18px"))
          : U === "left"
            ? ((O.left = "12px"), (O.top = "18px"))
            : U === "top"
              ? ((O.top = "12px"), (O.right = "18px"))
              : ((O.bottom = "12px"), (O.right = "18px"));
      }
    }
    function v(b, x) {
      let F = window.innerWidth,
        U = window.innerHeight,
        W = [
          [F - b, "right"],
          [b, "left"],
          [x, "top"],
          [U - x, "bottom"],
        ];
      W.sort((J, ne) => J[0] - ne[0]);
      let K = W[0][1],
        I = Math.max(
          5,
          Math.min(95, K === "left" || K === "right" ? (x / U) * 100 : (b / F) * 100),
        );
      return { edge: K, offsetPct: I };
    }
    function L() {
      let b = document.createElement("div");
      for (
        b.className = i.collapsed ? "dtf-panel collapsed" : "dtf-panel",
          b.setAttribute("data-edge", i.edge);
        o.firstChild;
      )
        o.removeChild(o.firstChild);
      (o.appendChild(b), A(b), i.collapsed ? T(b) : V(b));
    }
    function y(b) {
      let x = null,
        F = null,
        U = (I) => {
          (O(!0),
            (h = I),
            (u = I === "bug" ? "bugs" : "features"),
            (a = "feedback"),
            _e(a),
            (i = { ...i, collapsed: !1 }),
            ke(i),
            L());
        },
        W = () => {
          if (!x) return;
          let I = b.getBoundingClientRect(),
            J = x.offsetWidth,
            ne = x.offsetHeight,
            oe = 8,
            N,
            Z;
          i.edge === "right"
            ? ((N = I.left - J - oe), (Z = I.top + I.height / 2 - ne / 2))
            : i.edge === "left"
              ? ((N = I.right + oe), (Z = I.top + I.height / 2 - ne / 2))
              : i.edge === "top"
                ? ((N = I.left + I.width / 2 - J / 2), (Z = I.bottom + oe))
                : ((N = I.left + I.width / 2 - J / 2), (Z = I.top - ne - oe));
          let ie = window.innerWidth,
            se = window.innerHeight;
          ((N = Math.max(8, Math.min(ie - J - 8, N))),
            (Z = Math.max(8, Math.min(se - ne - 8, Z))),
            (x.style.left = `${N}px`),
            (x.style.top = `${Z}px`));
        },
        K = () => {
          (F && (window.clearTimeout(F), (F = null)),
            !x &&
              ((x = document.createElement("div")),
              (x.className = "se-qa"),
              (x.innerHTML = `<span class="qa-hd">Quick actions</span><button data-qa="bug">${P.bug}<span>File a bug</span><span class="sub">screenshot \xB7 video</span></button><button data-qa="feature">${P.sparkles}<span>Request a feature</span></button>`),
              r.appendChild(x),
              W(),
              requestAnimationFrame(() => {
                requestAnimationFrame(() => x?.classList.add("show"));
              }),
              x.addEventListener("mouseenter", K),
              x.addEventListener("mouseleave", () => O()),
              x.querySelectorAll("[data-qa]").forEach((I) => {
                I.addEventListener("click", (J) => {
                  (J.stopPropagation(), U(I.dataset.qa));
                });
              })));
        },
        O = (I = !1) => {
          F && (window.clearTimeout(F), (F = null));
          let J = () => {
            x && (x.remove(), (x = null));
          };
          I ? J() : (F = window.setTimeout(J, 160));
        };
      (b.addEventListener("mouseenter", K),
        b.addEventListener("mouseleave", () => O()),
        b.addEventListener("click", () => O(!0)));
    }
    function T(b) {
      let x = i.railIconSize,
        F = s
          ? Ae.filter((I) => k(I.k))
              .map((I) => {
                let J = m[I.k] > 0;
                return (
                  `<button class="ri" data-tab="${I.k}" style="width:${x}px;height:${x}px">` +
                  I.icon.replace(
                    "<svg ",
                    `<svg width="${Math.round(x * 0.5)}" height="${Math.round(x * 0.5)}" `,
                  ) +
                  (J ? '<span class="dotw"></span>' : "") +
                  `<span class="tip">${I.label}</span></button>`
                );
              })
              .join("")
          : `<button class="ri lock-only" data-tab="__lock__" style="width:${x}px;height:${x}px" title="">` +
            P.lock.replace(
              "<svg ",
              `<svg width="${Math.round(x * 0.5)}" height="${Math.round(x * 0.5)}" `,
            ) +
            '<span class="tip tip-multi"><b>Devtools locked</b>Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.<span class="hint">Click to connect \u2192</span></span></button>',
        U =
          `<div class="dtf-panel-rail"><div class="mk" title="Drag to reposition \xB7 click to expand" style="width:${x * 0.7}px;height:${x * 0.7}px"></div>` +
          F +
          `<div class="dtf-rail-resize" style="width:${i.edge === "right" || i.edge === "left" ? x : 12}px;height:${i.edge === "right" || i.edge === "left" ? 12 : x}px" title="Drag to resize"></div></div>`;
      b.innerHTML = U;
      let W = b.querySelector(".mk"),
        K = !1;
      (W.addEventListener("mousedown", (I) => {
        (I.preventDefault(), (K = !1));
        let J = I.clientX,
          ne = I.clientY,
          oe = b.getBoundingClientRect(),
          N = I.clientX - (oe.left + oe.width / 2),
          Z = I.clientY - (oe.top + oe.height / 2);
        W.classList.add("dragging");
        let ie = i.edge,
          se = (le) => {
            Math.hypot(le.clientX - J, le.clientY - ne) > 4 && (K = !0);
            let { edge: Te } = v(le.clientX, le.clientY),
              R = Te === "left" || Te === "right",
              Pe = le.clientX - N,
              z = le.clientY - Z,
              C = window.innerWidth,
              q = window.innerHeight,
              M = Math.max(5, Math.min(95, R ? (z / q) * 100 : (Pe / C) * 100));
            ((i = { ...i, edge: Te, offsetPct: M }),
              A(b),
              b.setAttribute("data-edge", Te),
              (ie = Te));
          },
          ye = () => {
            (W.classList.remove("dragging"),
              document.removeEventListener("mousemove", se),
              document.removeEventListener("mouseup", ye),
              ke(i),
              K && L());
          };
        (document.addEventListener("mousemove", se), document.addEventListener("mouseup", ye));
      }),
        W.addEventListener("click", () => {
          K || ((i = { ...i, collapsed: !1 }), ke(i), L());
        }),
        b.querySelectorAll(".ri").forEach((I) => {
          (I.addEventListener("click", () => {
            let J = I.dataset.tab;
            (J !== "__lock__" && ((a = J), _e(a)), (i = { ...i, collapsed: !1 }), ke(i), L());
          }),
            I.dataset.tab === "feedback" && y(I));
        }));
      let O = b.querySelector(".dtf-rail-resize");
      O.addEventListener("mousedown", (I) => {
        (I.preventDefault(), I.stopPropagation());
        let J = i.edge === "right" || i.edge === "left",
          ne = I.clientX,
          oe = I.clientY,
          N = i.railIconSize;
        O.classList.add("dragging");
        let Z = (se) => {
            let ye = J ? se.clientY - oe : se.clientX - ne,
              le = Math.max(Na, Math.min(Ka, Math.round(N + ye)));
            ((i = { ...i, railIconSize: le }), L());
          },
          ie = () => {
            (O.classList.remove("dragging"),
              document.removeEventListener("mousemove", Z),
              document.removeEventListener("mouseup", ie),
              ke(i));
          };
        (document.addEventListener("mousemove", Z), document.addEventListener("mouseup", ie));
      });
    }
    function H(b) {
      let x = window.location.host;
      b.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${gt(x)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${P.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${P.lock}
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
              <div class="ic-big">${P.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${P.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${P.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${P.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${P.book}</span><span class="k">Edit translations in-place</span></div>
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
      (F.addEventListener("mousedown", (O) => {
        (O.preventDefault(), F.classList.add("dragging"));
        let I = (ne) => {
            let { edge: oe, offsetPct: N } = v(ne.clientX, ne.clientY);
            ((i = { ...i, edge: oe, offsetPct: N }), A(b));
          },
          J = () => {
            (F.classList.remove("dragging"),
              document.removeEventListener("mousemove", I),
              document.removeEventListener("mouseup", J),
              ke(i));
          };
        (document.addEventListener("mousemove", I), document.addEventListener("mouseup", J));
      }),
        b.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ke(i), L());
        }));
      let U = b.querySelector('[data-action="connect"]'),
        W = b.querySelector("[data-status]"),
        K = b.querySelector("[data-err]");
      U.addEventListener("click", async () => {
        ((U.disabled = !0),
          (U.innerHTML = '<span class="spin"></span> Opening\u2026'),
          (W.textContent = ""),
          (K.style.display = "none"),
          (K.textContent = ""));
        try {
          ((s = await er(e, () => {
            ((W.textContent = "Waiting for approval in the opened tab\u2026"),
              (U.innerHTML = '<span class="spin"></span> Waiting for approval'));
          })),
            (a = Ae.find((O) => k(O.k))?.k ?? "gates"),
            _e(a),
            L());
        } catch (O) {
          ((K.textContent = O instanceof Error ? O.message : String(O)),
            (K.style.display = "block"),
            (W.textContent = ""),
            (U.disabled = !1),
            (U.textContent = "Retry connect \u2192"));
        }
      });
    }
    function V(b) {
      if (!s) {
        H(b);
        return;
      }
      let x = a && a !== "__lock__" ? a : (Ae.find((N) => k(N.k))?.k ?? "gates");
      a !== x && ((a = x), _e(x));
      let F = Ae.find((N) => N.k === x),
        U = c?.name ?? "",
        W = window.location.host,
        K = U || W,
        O = Ae.filter((N) => k(N.k))
          .map((N) => {
            let Z = N.k === x,
              ie = m[N.k] > 0;
            return (
              `<button class="t${Z ? " active" : ""}" data-tab="${N.k}" title="${N.label}">` +
              N.icon +
              (ie ? '<span class="dotw"></span>' : "") +
              `<span class="tip">${N.label}</span></button>`
            );
          })
          .join(""),
        I = g(x),
        J =
          S() > 0
            ? '<div class="dtf-overbar">' +
              P.alert +
              `<span><b>${S()} session override${S() > 1 ? "s" : ""}</b> \xB7 cleared on refresh</span><button data-action="clear-overrides">Clear all</button></div>`
            : "",
        ne = I ? E(x) : "";
      b.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${gt(F.label)}</span>
          <span class="sub">${gt(K)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${P.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${P.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${O}</div>
        <div class="dtf-pane">
          ${J}
          ${ne}
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
          ${S() > 0 ? '<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>' : ""}
          ${s ? '<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>' : ""}
        </div>
      </div>
    `;
      let oe = b.querySelector(".dtf-head .mk");
      (oe.addEventListener("mousedown", (N) => {
        (N.preventDefault(), oe.classList.add("dragging"));
        let Z = (se) => {
            let { edge: ye, offsetPct: le } = v(se.clientX, se.clientY);
            ((i = { ...i, edge: ye, offsetPct: le }), A(b));
          },
          ie = () => {
            (oe.classList.remove("dragging"),
              document.removeEventListener("mousemove", Z),
              document.removeEventListener("mouseup", ie),
              ke(i));
          };
        (document.addEventListener("mousemove", Z), document.addEventListener("mouseup", ie));
      }),
        b.querySelector('[data-action="refresh"]').addEventListener("click", () => {
          (l()?.invalidate(), L());
        }),
        b.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ke(i), L());
        }),
        b.querySelectorAll(".dtf-rail .t").forEach((N) => {
          (N.addEventListener("click", () => {
            re(N.dataset.tab);
          }),
            N.dataset.tab === "feedback" && y(N));
        }),
        I && j(b, x),
        b.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
          sr();
        }),
        b.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
          lr();
        }),
        b.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
          let N = $t({ ...Et(), openDevtools: !0 }),
            Z = b.querySelector('[data-action="share"]');
          try {
            await navigator.clipboard.writeText(N);
            let ie = Z.textContent;
            ((Z.textContent = "Copied \u2713"), setTimeout(() => (Z.textContent = ie), 1500));
          } catch {
            prompt("Copy this URL:", N);
          }
        }),
        b.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
          (bt(), ut(null), (s = null), (c = null), (d = null), L());
        }),
        G());
    }
    function re(b) {
      if (!s || i.collapsed) {
        ((a = b), _e(b), L());
        return;
      }
      if (b === a) return;
      let x = o.querySelector(".dtf-panel");
      if (!x) {
        ((a = b), _e(b), L());
        return;
      }
      ((a = b),
        _e(b),
        x.querySelectorAll(".dtf-rail .t").forEach((K) => {
          K.classList.toggle("active", K.dataset.tab === b);
        }));
      let F = Ae.find((K) => K.k === b),
        U = x.querySelector(".dtf-head .ti .title");
      F && U && (U.textContent = F.label);
      let W = x.querySelector(".dtf-pane");
      (W?.querySelector(".dtf-search")?.remove(),
        W &&
          g(b) &&
          (W.querySelector("#dtf-body")?.insertAdjacentHTML("beforebegin", E(b)), j(x, b)),
        G());
    }
    function g(b) {
      return b === "gates" || b === "experiments" || b === "configs" || b === "labels";
    }
    function E(b) {
      let x = f[b];
      return `<div class="dtf-search">
        <div class="input">
          ${P.search}
          <input placeholder="Filter ${b}\u2026" value="${Ya(x.search)}" />
          ${x.search ? '<span class="kbd" data-action="clear-search">esc</span>' : '<span class="kbd">\u2318K</span>'}
        </div>
        <div class="seg">
          <button class="${x.view === "page" ? "active" : ""}" data-view="page">page</button>
          <button class="${x.view === "all" ? "active" : ""}" data-view="all">all</button>
        </div>
        ${b === "labels" ? '<select class="dtf-locale-sel" data-locale></select>' : ""}
      </div>`;
    }
    function j(b, x) {
      let F = b.querySelector(".dtf-search input");
      F &&
        (F.addEventListener("input", () => {
          ((f[x].search = F.value), G());
        }),
        b.querySelectorAll(".dtf-search .seg button").forEach((U) => {
          U.addEventListener("click", () => {
            ((f[x].view = U.dataset.view), L());
          });
        }),
        b.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
          ((f[x].search = ""), L());
        }));
    }
    function G() {
      let b = o.querySelector("#dtf-body");
      if (!b || !s) return;
      let x = l();
      if (!x) return;
      ge(x);
      let F = a,
        U = f[F],
        W = (K) => {
          let O = m[F];
          ((m[F] = K), ((O === 0) != (K === 0) || O !== K) && de());
        };
      switch (F) {
        case "user":
          fr(b, x, w, () => L());
          break;
        case "gates":
          ur(b, x, U, W);
          break;
        case "experiments":
          gr(b, x, U, W);
          break;
        case "configs":
          Sr(b, x, U, W);
          break;
        case "labels":
          Qr(b, x, U, r, {
            locale: p,
            setLocale: (K) => {
              ((p = K), G());
            },
          });
          break;
        case "feedback":
          ln(b, x, o, {
            sub: u,
            setSub: (K) => {
              ((u = K), G());
            },
            pendingForm: h,
            consumePendingForm: () => {
              h = null;
            },
          });
          break;
        case "events":
          fn(b);
          break;
      }
    }
    function de() {
      L();
    }
    async function ge(b) {
      try {
        let x = await b.project(),
          F = window.location.host;
        if (!(Ja() !== null) && x.domain && !pr(F, x.domain)) {
          (bt(), ut(null), (s = null), (c = null), L());
          return;
        }
        let W = c;
        if (((c = x), ut(x), a && !k(a))) {
          let K = Ae.find((O) => k(O.k))?.k ?? null;
          ((a = K), _e(K), L());
          return;
        }
        (!W || !Va(W.modules, x.modules)) && L();
      } catch {}
    }
    document.documentElement.appendChild(t);
    let me = () => {
        document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
      },
      be = new MutationObserver(me);
    if (
      (be.observe(document.documentElement, { childList: !0 }),
      He() && (We(), Ge(!0, r, () => {})),
      xn() || (i = { ...i, collapsed: !0 }),
      L(),
      s)
    ) {
      let b = l();
      b && ge(b);
    }
    hn();
    let X = vn(() => L()),
      ve = () => {
        let b = o.querySelector(".dtf-panel");
        b && A(b);
      };
    window.addEventListener("resize", ve);
    let he = () => G();
    return (
      window.addEventListener("se:state:update", he),
      {
        destroy() {
          (window.removeEventListener("resize", ve),
            window.removeEventListener("se:state:update", he),
            X(),
            be.disconnect(),
            t.remove());
        },
      }
    );
  }
  function gt(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ya(e) {
    return gt(e);
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
  var je = null,
    mt = null;
  function En(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (je) {
      if (document.getElementById("shipeasy-devtools")) return;
      je = null;
    }
    mt || (mt = dr());
    let t = { adminUrl: e.adminUrl ?? Za(), hideAdminLinks: e.hideAdminLinks ?? !1 },
      { destroy: r } = kn(t);
    je = r;
  }
  function Qa() {
    (je?.(), (je = null), mt?.(), (mt = null));
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
      c = /^[a-zA-Z]$/.test(n) ? `Key${n.toUpperCase()}` : null;
    function d(l) {
      (c ? l.code === c : l.key.toLowerCase() === n.toLowerCase()) &&
        l.shiftKey === o &&
        l.altKey === i &&
        l.ctrlKey === a &&
        l.metaKey === s &&
        (je ? Qa() : En(e));
    }
    return (window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => Sn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      He())
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
        let c = document.getElementById("shipeasy-devtools");
        if (!c?.shadowRoot) {
          setTimeout(a, 100);
          return;
        }
        Ge(!0, c.shadowRoot, () => o());
      };
      (a(), window.addEventListener("se:i18n:ready", () => o(), { once: !0 }));
      let s = window;
      s.i18n?.on && s.i18n.on("update", () => o());
    }
    window.__se_devtools_ready = !0;
  }
})();
