"use strict";
(() => {
  var Un = Object.create;
  var Ge = Object.defineProperty;
  var Nn = Object.getOwnPropertyDescriptor;
  var Kn = Object.getOwnPropertyNames;
  var Fn = Object.getPrototypeOf,
    Gn = Object.prototype.hasOwnProperty;
  var Wn = (e, t, n) =>
    t in e ? Ge(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var Jn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var Vn = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let a of Kn(t))
        !Gn.call(e, a) &&
          a !== n &&
          Ge(e, a, { get: () => t[a], enumerable: !(r = Nn(t, a)) || r.enumerable });
    return e;
  };
  var Yn = (e, t, n) => (
    (n = e != null ? Un(Fn(e)) : {}),
    Vn(t || !e || !e.__esModule ? Ge(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var D = (e, t, n) => Wn(e, typeof t != "symbol" ? t + "" : t, n);
  var on = Jn((ro, an) => {
    "use strict";
    var ut = Object.defineProperty,
      fr = Object.getOwnPropertyDescriptor,
      gr = Object.getOwnPropertyNames,
      vr = Object.prototype.hasOwnProperty,
      mr = (e, t) => {
        for (var n in t) ut(e, n, { get: t[n], enumerable: !0 });
      },
      br = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let a of gr(t))
            !vr.call(e, a) &&
              a !== n &&
              ut(e, a, { get: () => t[a], enumerable: !(r = fr(t, a)) || r.enumerable });
        return e;
      },
      hr = (e) => br(ut({}, "__esModule", { value: !0 }), e),
      Jt = {};
    mr(Jt, {
      FlagsClientBrowser: () => Vt,
      LABEL_MARKER_END: () => nn,
      LABEL_MARKER_RE: () => Hr,
      LABEL_MARKER_SEP: () => tn,
      LABEL_MARKER_START: () => en,
      _resetShipeasyForTests: () => Pr,
      attachDevtools: () => Xt,
      configureShipeasy: () => vt,
      encodeLabelMarker: () => rn,
      flags: () => Qt,
      getShipeasyClient: () => Ar,
      i18n: () => Gr,
      isDevtoolsRequested: () => lt,
      labelAttrs: () => Or,
      loadDevtools: () => dt,
      readConfigOverride: () => gt,
      readExpOverride: () => Yt,
      readGateOverride: () => ft,
      shipeasy: () => Zt,
      version: () => xr,
    });
    an.exports = hr(Jt);
    var xr = "1.0.0",
      yr = 5e3,
      wr = 100,
      Kt = "__se_anon_id",
      Ft = "__se_seen",
      xe = "__se_pending_alias",
      kr = class {
        constructor(e, t) {
          D(this, "collectUrl");
          D(this, "sdkKey");
          D(this, "queue", []);
          D(this, "exposureSeen", new Set());
          D(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), yr)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(Ft);
              n && (this.exposureSeen = new Set(JSON.parse(n)));
            } catch {}
          }
        }
        destroy() {
          this.timer !== null && (clearInterval(this.timer), (this.timer = null));
        }
        pushExposure(e, t, n, r) {
          let a = `${n || r}:${e}`;
          if (!this.exposureSeen.has(a)) {
            this.exposureSeen.add(a);
            try {
              sessionStorage.setItem(Ft, JSON.stringify([...this.exposureSeen]));
            } catch {}
            this.enqueue({
              type: "exposure",
              experiment: e,
              group: t,
              user_id: n,
              anonymous_id: r,
              ts: Date.now(),
            });
          }
        }
        pushMetric(e, t, n, r) {
          this.enqueue({
            type: "metric",
            event_name: e,
            user_id: t,
            anonymous_id: n,
            ts: Date.now(),
            ...(r ? { properties: r } : {}),
          });
        }
        async alias(e, t) {
          let n = { anonymousId: e, userId: t, ts: Date.now() };
          try {
            localStorage.setItem(xe, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(xe);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(xe);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(xe);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(xe));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= wr && this.flush());
        }
        flush(e = !1) {
          if (!this.queue.length) return;
          let t = this.queue.splice(0),
            n = JSON.stringify({ events: t });
          if (e && typeof navigator < "u" && navigator.sendBeacon) {
            navigator.sendBeacon(this.collectUrl, new Blob([n], { type: "text/plain" }));
            return;
          }
          fetch(this.collectUrl, {
            method: "POST",
            headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
            body: n,
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
      qe = 5;
    function Er(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        a = null,
        o = !1,
        s = 0,
        i = 0,
        c = !1;
      try {
        new PerformanceObserver((p) => {
          let v = p.getEntries();
          v.length && (r = v[v.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((p) => {
          for (let v of p.getEntries()) {
            let w = v.duration ?? 0;
            (a === null || w > a) && (a = w);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((p) => {
          for (let v of p.getEntries()) v.value > 0.1 && (o = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let f = window.onerror;
      ((window.onerror = (g, p, v, w, R) => (
        s < qe &&
          ((s += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof g == "string" ? g.slice(0, 200) : String(R ?? "").slice(0, 200),
            source: typeof p == "string" ? p.slice(0, 200) : "",
            line: v ?? 0,
          })),
        typeof f == "function" ? f(g, p, v, w, R) : !1
      )),
        window.addEventListener("unhandledrejection", (g) => {
          if (s < qe) {
            s += 1;
            let p = g.reason,
              v = p instanceof Error ? p.message : typeof p == "string" ? p : String(p);
            e.pushMetric("__auto_js_error", t, n, {
              value: 1,
              kind: "unhandled_rejection",
              message: v.slice(0, 200),
            });
          }
        }));
      let l = window.fetch;
      window.fetch = async function (...g) {
        let p = typeof performance < "u" ? performance.now() : 0,
          v = typeof g[0] == "string" ? g[0] : g[0].toString(),
          w;
        try {
          w = await l.apply(this, g);
        } catch (R) {
          throw (
            i < qe &&
              ((i += 1),
              e.pushMetric("__auto_network_error", t, n, {
                value: 1,
                kind: "network",
                status: 0,
                url: v.slice(0, 200),
              })),
            R
          );
        }
        if (w.status >= 500 && i < qe) {
          i += 1;
          let R = typeof performance < "u" ? performance.now() - p : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: w.status,
            url: v.slice(0, 200),
            duration_ms: Math.round(R),
          });
        }
        return w;
      };
      let u = () => {
        if (!c) {
          c = !0;
          try {
            let p = performance.getEntriesByType("navigation")[0];
            if (p) {
              let w = p.startTime ?? 0;
              (p.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, n, { value: p.loadEventEnd - w }),
                p.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, n, { value: p.responseStart - w }),
                p.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, n, {
                    value: p.domContentLoadedEventEnd - w,
                  }));
            }
            let v = performance.getEntriesByType("paint");
            for (let w of v)
              w.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, n, { value: w.startTime })
                : w.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, n, { value: w.startTime });
          } catch {}
        }
      };
      document.readyState === "complete"
        ? setTimeout(u, 0)
        : window.addEventListener(
            "load",
            () => {
              setTimeout(u, 0);
            },
            { once: !0 },
          );
      let d = () => {
        (u(),
          r !== null && e.pushMetric("__auto_lcp", t, n, { value: r }),
          a !== null && e.pushMetric("__auto_inp", t, n, { value: a }),
          o && e.pushMetric("__auto_cls_binary", t, n, { value: 1 }));
        let g = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: g }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && d();
      });
    }
    function Lr() {
      try {
        let t = localStorage.getItem(Kt);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(Kt, e);
      } catch {}
      return e;
    }
    function Sr() {
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
    function $r() {
      if (typeof window > "u") return {};
      let e = {};
      try {
        let t = new URLSearchParams(window.location.search);
        for (let [n, r] of t)
          !r ||
            r === "default" ||
            r === "none" ||
            ((n.startsWith("se_exp_") || n.startsWith("se-exp-")) && (e[n.slice(7)] = r));
      } catch {}
      return e;
    }
    var Vt = class {
        constructor(e) {
          D(this, "sdkKey");
          D(this, "baseUrl");
          D(this, "autoGuardrails");
          D(this, "env");
          D(this, "evalResult", null);
          D(this, "anonId");
          D(this, "userId", "");
          D(this, "buffer");
          D(this, "guardrailsInstalled", !1);
          D(this, "listeners", new Set());
          D(this, "overrideListenerInstalled", !1);
          D(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = Lr()),
            (this.buffer = new kr(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...Sr(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: $r() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), Er(this.buffer, this.userId, this.anonId)),
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
          let t = ft(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = gt(e),
            r = n !== void 0 ? n : this.evalResult.configs?.[e];
          if (r !== void 0) {
            if (!t) return r;
            try {
              return t(r);
            } catch (a) {
              console.warn(`[shipeasy] getConfig('${e}') decode failed:`, String(a));
              return;
            }
          }
        }
        getExperiment(e, t, n, r) {
          let a = { inExperiment: !1, group: "control", params: t },
            o = Yt(e);
          if (o !== null) {
            let i = r?.[o],
              c = i ? { ...t, ...i } : t;
            return { inExperiment: !0, group: o, params: c };
          }
          let s = this.evalResult?.experiments[e];
          if (!s || !s.inExperiment) return a;
          if ((this.buffer.pushExposure(e, s.group, this.userId, this.anonId), !n))
            return { inExperiment: !0, group: s.group, params: s.params };
          try {
            return { inExperiment: !0, group: s.group, params: n(s.params) };
          } catch (i) {
            return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(i)), a);
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
              let n = this.getExperiment(t, {});
              return { inExperiment: n.inExperiment, group: n.group };
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
      _r = /^(true|on|1|yes)$/i,
      Tr = /^(false|off|0|no)$/i;
    function Mr(e) {
      return _r.test(e) ? !0 : Tr.test(e) ? !1 : null;
    }
    function Rr(e) {
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
    function ye(e, t) {
      if (typeof window > "u" || !window.location) return null;
      let n = new URLSearchParams(window.location.search),
        r = n.get(e);
      if (r !== null) return r;
      if (t) {
        let a = n.get(t);
        if (a !== null) return a;
      }
      return null;
    }
    function ft(e) {
      let t = ye(`se_ks_${e}`) ?? ye(`se_gate_${e}`) ?? ye(`se-gate-${e}`);
      return t === null ? null : Mr(t);
    }
    function gt(e) {
      let t = ye(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return Rr(t);
    }
    function Yt(e) {
      let t = ye(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function lt() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function dt(e = {}) {
      if (typeof window > "u") return;
      let n = window.__shipeasy_devtools_global;
      if (!n) return;
      n.init(e);
      let r = window;
      if (!r.__shipeasy_devtools) {
        let a = !0;
        r.__shipeasy_devtools = {
          toggle() {
            a ? (n.destroy(), (a = !1)) : (n.init(e), (a = !0));
          },
        };
      }
    }
    function Xt(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        a = r[r.length - 1],
        o = r.includes("Shift"),
        s = r.includes("Alt"),
        i = r.includes("Ctrl") || r.includes("Control"),
        c = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), lt() && dt({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let f = lt();
      function l(d) {
        d.key === a &&
          d.shiftKey === o &&
          d.altKey === s &&
          d.ctrlKey === i &&
          d.metaKey === c &&
          (f
            ? window.__shipeasy_devtools?.toggle()
            : ((f = !0), dt({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", l);
      let u = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", l), u());
      };
    }
    var N = null;
    function Zt(e) {
      let t = vt({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (Qt.notifyMounted(), Xt(t, { adminUrl: e.adminUrl }));
    }
    function vt(e) {
      return N || ((N = new Vt(e)), N);
    }
    function Ar() {
      return N;
    }
    function Pr() {
      (N?.destroy(), (N = null));
    }
    function Gt() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var ot = !1,
      ct = new Set(),
      Wt = !1;
    function Cr() {
      Wt ||
        typeof window > "u" ||
        ((Wt = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of ct) e();
        }));
    }
    var Qt = {
        configure(e) {
          vt(e);
        },
        identify(e) {
          return N
            ? N.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = Gt();
          return t !== null && e in t.flags
            ? t.flags[e]
            : ot
              ? N
                ? N.getFlag(e)
                : (ft(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = Gt();
          if (n !== null && e in n.configs) {
            let a = n.configs[e];
            if (!t) return a;
            try {
              return t(a);
            } catch {
              return;
            }
          }
          if (!ot) return;
          if (N) return N.getConfig(e, t);
          let r = gt(e);
          if (r !== void 0) {
            if (!t) return r;
            try {
              return t(r);
            } catch {
              return;
            }
          }
        },
        getExperiment(e, t, n, r) {
          return N?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          N?.track(e, t);
        },
        flush() {
          return N?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((ot = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return N ? N.subscribe(e) : (ct.add(e), Cr(), () => ct.delete(e));
        },
        get ready() {
          return N?.ready ?? !1;
        },
      },
      en = "\uFFF9",
      tn = "\uFFFA",
      nn = "\uFFFB",
      Hr = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function rn(e, t) {
      return `${en}${e}${tn}${t}${nn}`;
    }
    function Or(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var Ir = null,
      qr = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      Br = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function zr() {
      return globalThis[qr]?.() ?? null;
    }
    function jr() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[Br];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function Be(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let a = t[r];
            return a != null ? String(a) : n;
          })
        : e;
    }
    var Dr = typeof document < "u",
      Ur = [
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
    function Nr() {
      let e = {};
      for (let t of Ur)
        e[t] = Dr
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var Kr = Nr(),
      pt = {},
      it = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function Fr(e, t) {
      let n = [],
        r = 0,
        a,
        o = !0;
      for (it.lastIndex = 0; (a = it.exec(e)) !== null; ) {
        a.index > r && n.push(e.slice(r, a.index));
        let s = a[1],
          i = a[2] ?? "",
          c = t[s] ?? pt[s] ?? Kr[s];
        if (c) {
          let f = c(i);
          (typeof f != "string" && (o = !1), n.push(f));
        } else n.push(i);
        r = it.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), o ? n.join("") : n);
    }
    function st(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = zr();
      if (n?.strings[e]) return Be(n.strings[e], t);
    }
    var Gr = {
      t(e, t, n) {
        let r, a;
        typeof t == "string" ? ((r = t), (a = n)) : (a = t);
        let o = st(e, a);
        return o !== void 0 ? o : r !== void 0 ? Be(r, a) : e;
      },
      rich(e, t, n, r) {
        let o = st(e, r) ?? Be(t, r);
        return Fr(o, n ?? {});
      },
      tEl(e, t, n, r) {
        if (jr()) {
          let o = st(e, n) ?? Be(t, n);
          return rn(e, o);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && (pt = { ...pt, ...e.components }),
          e.createElement && (Ir = e.createElement));
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
          n = () => {
            window.i18n && (t = window.i18n.on("update", e));
          };
        return (
          window.addEventListener("se:i18n:ready", n, { once: !0 }),
          () => {
            (window.removeEventListener("se:i18n:ready", n), t());
          }
        );
      },
    };
    if (typeof window < "u") {
      let e = window.__SE_BOOTSTRAP;
      e?.apiKey && !N && Zt({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var _e = `
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
  min-height:360px;
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
  border:1px solid var(--line); box-shadow:0 6px 20px -8px rgba(0,0,0,0.55);
  border-radius:8px; overflow:visible; width:auto; height:auto; max-height:none; padding:0;
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

.dtf-body { flex:1; overflow-y:auto;
  scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
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
  display:flex; flex-direction:column; align-items:center; }
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
.dtf-load { padding:8px 0 0; position:relative; }
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
.se-input { background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; padding:6px 8px; color:var(--fg);
  font-family:var(--sans); font-size:12px; line-height:1.4;
  outline:none; box-sizing:border-box; }
.se-input:focus { border-color:color-mix(in oklab, var(--accent) 45%, var(--line)); }
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
.se-status { font-family:var(--mono); font-size:10px; color:var(--fg-3);
  min-height:14px; }
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
  var We = "se_dt_session";
  function St() {
    try {
      let e = sessionStorage.getItem(We);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Xn(e) {
    try {
      sessionStorage.setItem(We, JSON.stringify(e));
    } catch {}
  }
  function Je() {
    try {
      sessionStorage.removeItem(We);
    } catch {}
  }
  function Zn() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  async function $t(e, t) {
    let n = new URL(e.adminUrl).origin,
      r = window.location.origin,
      a = `shipeasy-devtools-auth-${Date.now()}`,
      o = new URL(`${e.adminUrl}/devtools-auth`);
    o.searchParams.set("origin", r);
    let s = Zn();
    s && o.searchParams.set("sdkKey", s);
    let i = window.open(o.toString(), a, "width=460,height=640,noopener=no");
    if (!i) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      i.focus();
    } catch {}
    return (
      t(),
      new Promise((c, f) => {
        let u = !1;
        function d(R, m) {
          u ||
            ((u = !0),
            window.removeEventListener("message", g),
            clearInterval(v),
            clearTimeout(w),
            R ? f(R) : c(m));
        }
        function g(R) {
          if (R.origin !== n) return;
          let m = R.data;
          if (!m || m.type !== "se:devtools-auth" || !m.token || !m.projectId) return;
          let $ = { token: m.token, projectId: m.projectId };
          (Xn($), d(null, $));
        }
        window.addEventListener("message", g);
        let p = Date.now(),
          v = setInterval(() => {
            Date.now() - p < 1500 ||
              (i.closed && !u && d(new Error("Sign-in window closed before approval.")));
          }, 500),
          w = setTimeout(() => {
            d(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Qn = /^(true|on|1|yes)$/i,
    er = /^(false|off|0|no)$/i,
    Ye = /^se(?:_|-|$)/;
  function Te(e) {
    return Qn.test(e) ? !0 : er.test(e) ? !1 : null;
  }
  function Ve(e) {
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
  function Tt(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Me() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function Q(e, t) {
    let n = Me(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let a = n.get(t);
      if (a !== null) return a;
    }
    return null;
  }
  function Re(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function Ae() {
    if (typeof window > "u") return !1;
    let e = Me();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function se() {
    return typeof window > "u" ? !1 : Me().has("se_edit_labels");
  }
  function Mt(e) {
    let t = Q(`se_ks_${e}`) ?? Q(`se_gate_${e}`) ?? Q(`se-gate-${e}`);
    return t === null ? null : Te(t);
  }
  function Pe(e, t, n = "session") {
    Re([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function Rt(e) {
    let t = Q(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return Ve(t);
  }
  function Xe(e, t, n = "session") {
    Re([
      [`se_config_${e}`, t == null ? null : Tt(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function At(e) {
    let t = Q(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function Ze(e, t, n = "session") {
    Re([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Ce() {
    return Q("se_i18n");
  }
  function Pt() {
    return Q("se_i18n_draft");
  }
  function oe(e) {
    return Q(`se_i18n_label_${e}`);
  }
  function ve(e, t, n = "session") {
    Re([[`se_i18n_label_${e}`, t]]);
  }
  function Ct() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) Ye.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Qe(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) Ye.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, a] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, a ? "true" : "false");
    for (let [r, a] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, a);
    for (let [r, a] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, Tt(a));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, a] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, a);
    return n.toString();
  }
  function et() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Me();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let a = Te(r);
        a !== null && (e.gates[n.slice(6)] = a);
      } else if (n.startsWith("se_gate_")) {
        let a = Te(r);
        a !== null && (e.gates[n.slice(8)] = a);
      } else if (n.startsWith("se-gate-")) {
        let a = Te(r);
        a !== null && (e.gates[n.slice(8)] = a);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = Ve(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function Ht(e) {
    if (typeof window > "u") return;
    let t = { ...et(), ...e, openDevtools: !0 },
      n = Qe(t);
    window.location.assign(n);
  }
  function tr() {
    let e = [];
    if (typeof window > "u") return e;
    for (let [t, n] of new URLSearchParams(window.location.search))
      (t === "se" || Ye.test(t)) && e.push([t, n]);
    return e;
  }
  function _t(e) {
    for (let [t, n] of tr()) e.searchParams.has(t) || e.searchParams.set(t, n);
  }
  function Ot() {
    if (typeof window > "u" || typeof document > "u") return () => {};
    let e = window;
    if (e.__seNavGuardInstalled) return () => {};
    e.__seNavGuardInstalled = !0;
    let t = window.location.origin;
    function n(s) {
      if (s.defaultPrevented) return;
      let i = s.composedPath?.() ?? [],
        c = null;
      for (let d of i)
        if (d instanceof HTMLAnchorElement) {
          c = d;
          break;
        }
      if (!c) return;
      let f = c.getAttribute("href");
      if (!f || /^(mailto:|tel:|javascript:|blob:|data:|#)/i.test(f)) return;
      let l;
      try {
        l = new URL(f, window.location.href);
      } catch {
        return;
      }
      if (l.origin !== t) return;
      _t(l);
      let u = l.toString();
      u !== c.href && (c.href = u);
    }
    document.addEventListener("click", n, !0);
    let r = history.pushState.bind(history),
      a = history.replaceState.bind(history);
    function o(s) {
      if (s == null) return s;
      let i;
      try {
        i = new URL(s.toString(), window.location.href);
      } catch {
        return s;
      }
      return i.origin !== t ? s : (_t(i), i.toString());
    }
    return (
      (history.pushState = function (s, i, c) {
        return r(s, i, o(c));
      }),
      (history.replaceState = function (s, i, c) {
        return a(s, i, o(c));
      }),
      () => {
        (document.removeEventListener("click", n, !0),
          (history.pushState = r),
          (history.replaceState = a),
          (e.__seNavGuardInstalled = !1));
      }
    );
  }
  var me = class {
    constructor(t, n, r, a = !1) {
      D(this, "adminUrl", t);
      D(this, "token", n);
      D(this, "projectId", r);
      D(this, "hideAdminLinks", a);
    }
    async project() {
      let t = await this.get(`/api/admin/projects/${encodeURIComponent(this.projectId)}`),
        n = (r) => r === void 0 || r === !0 || r === 1;
      return {
        id: t.id,
        name: t.name,
        domain: t.domain,
        modules: {
          translations: n(t.moduleTranslations),
          configs: n(t.moduleConfigs),
          gates: n(t.moduleGates),
          experiments: n(t.moduleExperiments),
          feedback: n(t.moduleFeedback),
          user: n(t.moduleUser),
          events: n(t.moduleEvents),
        },
      };
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let a = "";
        try {
          let o = await n.json();
          a = o.detail ?? o.error ?? "";
        } catch {
          try {
            a = (await n.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${n.status}${a ? ` \u2014 ${a}` : ""}`);
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
        t.map(async (a) => {
          try {
            let o = await this.get(`/api/admin/configs/${a.id}`),
              s = o.valueJson !== void 0 ? o.valueJson : (o.values?.[n] ?? null);
            return { ...a, valueJson: s };
          } catch {
            return { ...a, valueJson: null };
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
    async put(t, n) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (!r.ok) {
        let a = "";
        try {
          let o = await r.json();
          a = o.detail ?? o.error ?? "";
        } catch {
          try {
            a = (await r.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${r.status}${a ? ` \u2014 ${a}` : ""}`);
      }
      return await r.json();
    }
    async post(t, n) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (!r.ok) {
        let a = "";
        try {
          let o = await r.json();
          a = o.detail ?? o.error ?? "";
        } catch {
          try {
            a = (await r.text()).slice(0, 200);
          } catch {}
        }
        throw new Error(`${t} \u2192 HTTP ${r.status}${a ? ` \u2014 ${a}` : ""}`);
      }
      return await r.json();
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
      let r = await fetch(`${this.adminUrl}/api/admin/reports/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: n,
      });
      if (!r.ok) {
        let a = "";
        try {
          a = (await r.json()).error ?? "";
        } catch {}
        throw new Error(`upload failed \u2192 HTTP ${r.status}${a ? ` \u2014 ${a}` : ""}`);
      }
      return await r.json();
    }
    upsertDraftKey(t, n, r) {
      return this.post(`/api/admin/i18n/drafts/${encodeURIComponent(t)}/keys`, {
        key: n,
        value: r,
      });
    }
    updateKeyById(t, n) {
      return this.put(`/api/admin/i18n/keys/${encodeURIComponent(t)}`, { value: n });
    }
    async keys(t) {
      let r = (i) => {
          let c = new URLSearchParams();
          return (
            t && c.set("profile_id", t),
            c.set("limit", String(500)),
            c.set("offset", String(i)),
            `?${c.toString()}`
          );
        },
        a = async (i) => {
          let c = await this.get(`/api/admin/i18n/keys${r(i)}`);
          if (Array.isArray(c)) return { keys: c, total: c.length };
          let f = c.keys ?? [],
            l = c.total ?? f.length;
          return { keys: f, total: l };
        },
        o = await a(0),
        s = o.keys.slice();
      for (; s.length < o.total && o.keys.length > 0; ) {
        let i = await a(s.length);
        if (i.keys.length === 0) break;
        s.push(...i.keys);
      }
      return s;
    }
  };
  var j = (e, t = 1.75) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
    E = {
      shield: j(
        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
      ),
      flask: j(
        '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 1 3.923 10.5H6.077A6.5 6.5 0 0 1 10 9.3"/>',
      ),
      sliders: j(
        '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
      ),
      power: j('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
      book: j('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
      users: j(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      ),
      activity: j('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
      refresh: j(
        '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
      ),
      settings: j(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      ),
      alert: j(
        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
      ),
      search: j('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      play: j('<polygon points="6 3 20 12 6 21 6 3"/>'),
      playFilled:
        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
      x: j('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
      copy: j(
        '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      ),
      check: j('<path d="M20 6 9 17l-5-5"/>'),
      bug: j(
        '<path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/>',
      ),
      sparkles: j(
        '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
      ),
      camera: j(
        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
      ),
      record: j(
        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
      ),
      upload: j(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      ),
      external: j(
        '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      ),
      arrowLeft: j('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
      file: j(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/>',
      ),
      plus: j('<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>'),
      lock: j(
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      ),
    };
  function x(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function J(e) {
    let t = Date.now() - Date.parse(e);
    if (Number.isNaN(t)) return "\u2014";
    let n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  function It(e) {
    return e < 1024
      ? `${e} B`
      : e < 1024 * 1024
        ? `${(e / 1024).toFixed(0)} KB`
        : `${(e / 1024 / 1024).toFixed(1)} MB`;
  }
  function ee() {
    let e = '<div class="dtf-load"><div class="topstrip"></div>';
    for (let t = 1; t <= 6; t++) {
      let n = t <= 3 ? " live" : "",
        r = 50 + ((t * 7) % 30),
        a = 36 + ((t * 11) % 24);
      e += `
      <div class="skel-row${n}">
        <div class="ic"></div>
        <div class="body">
          <div class="skel" style="height:9px; width:${r}%"></div>
          <div class="skel" style="height:7px; width:${a}%"></div>
        </div>
        <div class="skel" style="height:10px; width:38px"></div>
        <div class="togsk"></div>
      </div>`;
    }
    return e + "</div>";
  }
  function V(e) {
    let t = (e.actions ?? [])
      .map((a, o) =>
        a.href
          ? `<a class="a" target="_blank" rel="noopener" href="${x(a.href)}" data-i="${o}">
            <span class="ic">${a.icon ?? "+"}</span><span class="k">${x(a.label)}</span>${a.kbd ? `<span class="kbd">${x(a.kbd)}</span>` : ""}
          </a>`
          : `<button class="a" data-i="${o}">
            <span class="ic">${a.icon ?? "+"}</span><span class="k">${x(a.label)}</span>${a.kbd ? `<span class="kbd">${x(a.kbd)}</span>` : ""}
          </button>`,
      )
      .join("");
    return {
      html: `
    <div class="dtf-empty">
      <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">0</div></div>
      <h3>${e.title}</h3>
      <p>${x(e.message)}</p>
      ${t ? `<div class="actions">${t}</div>` : ""}
    </div>`,
      wire: (a) => {
        a.querySelectorAll(".dtf-empty .actions [data-i]").forEach((o) => {
          let s = Number(o.dataset.i),
            i = e.actions?.[s];
          i?.onClick && o.addEventListener("click", i.onClick);
        });
      },
    };
  }
  function le(e) {
    return `
    <div class="dtf-empty search">
      <div class="glyph"><span>[</span><span class="core"></span><span>]</span></div>
      <h3>No match for<br/><em style="font-family:var(--mono);font-style:normal;font-size:14px;color:var(--fg-3)">"${x(e)}"</em></h3>
      <p>Nothing in your project shares that key.</p>
    </div>`;
  }
  function de(e, t = "Copy value") {
    return `<button class="dtf-copy" data-copy="${e}" title="${x(t)}">${E.copy}</button>`;
  }
  function ce(e, t) {
    e.querySelectorAll(".dtf-copy[data-copy]").forEach((n) => {
      let r = n.dataset.copy;
      n.addEventListener("click", async (a) => {
        a.stopPropagation();
        let o = t[r]?.();
        if (o != null) {
          try {
            await navigator.clipboard.writeText(o);
          } catch {}
          (n.classList.add("done"),
            (n.innerHTML = E.check),
            setTimeout(() => {
              (n.classList.remove("done"), (n.innerHTML = E.copy));
            }, 900));
        }
      });
    });
  }
  var nr = [
    { k: "ctx.route", get: () => `"${window.location.pathname}"` },
    { k: "ctx.user_agent", get: () => `"${(navigator.userAgent ?? "").slice(0, 64)}"` },
    { k: "ctx.viewport", get: () => `${window.innerWidth}x${window.innerHeight}` },
  ];
  function rr() {
    let e = window.__shipeasy;
    if (!e) return null;
    let t = e.user;
    return t && typeof t == "object" ? t : null;
  }
  function ar(e) {
    return e.trim().charAt(0).toUpperCase() || "?";
  }
  function qt(e, t, n, r) {
    let a = rr();
    if (!a && Object.keys(n.props).length === 0) {
      let { html: d, wire: g } = V({
        title: "No <em>identified user</em>",
        message:
          "The host app hasn't called shipeasy.identify() yet. Once it does, the user's properties will show here and you can simulate other users.",
        actions: [],
      });
      ((e.innerHTML = d), g(e));
      return;
    }
    let o = {};
    if (a)
      for (let [d, g] of Object.entries(a)) g == null || typeof g == "object" || (o[d] = String(g));
    for (let [d, g] of Object.entries(n.props)) o[d] = g;
    let s = o.id || o.userId || "\u2014",
      i = o.email || o.user_email || "",
      c = i || s,
      f = Object.entries(o)
        .map(([d, g]) => {
          let p = n.dirty[d] ? '<span class="changed"></span>' : '<span style="width:5px"></span>';
          return `<div class="dtf-prop">
        <span class="k">user.${x(d)}</span>
        <span class="v"><input data-prop="${x(d)}" value="${or(g)}"/></span>
        ${p}
      </div>`;
        })
        .join(""),
      l = nr
        .map(
          (d) => `<div class="dtf-prop">
      <span class="k">${x(d.k)}</span>
      <span class="v" style="color:var(--accent)">${x(d.get())}</span>
      <span style="width:5px"></span>
    </div>`,
        )
        .join(""),
      u = Object.values(n.dirty).filter(Boolean).length;
    ((e.innerHTML = `
    <div class="dtf-user">
      <div class="who">
        <div class="av">${x(ar(c))}</div>
        <div class="info">
          <div class="e">${x(i || s)}</div>
          <div class="id">${x(s)}</div>
        </div>
      </div>
      <div class="dtf-group">User properties<span class="c">edit to simulate</span></div>
      <div style="flex:1; overflow-y:auto">
        ${f || '<div class="se-empty">No user properties yet.</div>'}
        <div class="dtf-group">Request context<span class="c">read-only</span></div>
        ${l}
      </div>
      <div class="dtf-evalbar">
        <button class="b" data-action="reeval">${E.play} Re-evaluate ${u > 0 ? "with changes" : ""}</button>
        <button class="b g" data-action="reset">Reset</button>
      </div>
    </div>`),
      e.querySelectorAll("input[data-prop]").forEach((d) => {
        d.addEventListener("input", () => {
          let g = d.dataset.prop;
          ((n.props[g] = d.value), (n.dirty[g] = (a ? String(a[g] ?? "") : "") !== d.value));
        });
      }),
      e.querySelector('[data-action="reeval"]').addEventListener("click", () => r()),
      e.querySelector('[data-action="reset"]').addEventListener("click", () => {
        ((n.props = {}), (n.dirty = {}), r());
      }));
  }
  function or(e) {
    return x(e);
  }
  function ir() {
    return window.__shipeasy ?? null;
  }
  function sr(e) {
    let t = Mt(e.name),
      n = ir()?.getFlag(e.name),
      r = typeof n == "boolean" ? n : null,
      a = t !== null ? t : (r ?? e.enabled);
    return {
      name: e.name,
      killswitch: e.killswitch,
      enabled: e.enabled,
      rolloutPct: e.rolloutPct,
      override: t,
      effective: a,
      live: r,
      updatedAt: e.updatedAt,
    };
  }
  function tt(e, t) {
    let n = t === e.name,
      r = e.override !== null,
      a = e.killswitch ? e.effective : !e.effective,
      o = e.killswitch ? E.power : E.shield,
      s = e.killswitch
        ? e.effective
          ? "var(--danger)"
          : "var(--accent)"
        : e.effective
          ? "var(--accent)"
          : "var(--fg-3)",
      i = "";
    e.killswitch
      ? (i = `<span class="val ${e.effective ? "killed" : "kill-live"}">${e.effective ? "KILLED" : "LIVE"}</span>`)
      : (i = `<span class="val ${r ? "over" : e.effective ? "on" : "off"}">${e.effective ? "true" : "false"}</span>`);
    let c = `<div class="dtf-toggle${e.effective ? (r ? " over" : " on") : ""}" data-toggle="${be(e.name)}"></div>`,
      f = e.killswitch
        ? e.effective
          ? `killswitch \xB7 KILLED (override: ${r ? "yes" : "no"})`
          : `killswitch \xB7 live \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout`
        : `gate \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout \xB7 updated ${J(e.updatedAt)}`,
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
        <button class="${e.effective ? "primary" : ""}" data-toggle-detail="${be(e.name)}">${e.effective ? "\u2713 Restore" : "\u26A0 Pull the switch"}</button>
      </div>`
        : `
      <div class="crumbs">
        <div><span class="${r ? "skip" : e.effective ? "pass" : "deny"}">${r ? "\u21A6" : e.effective ? "\u2713" : "\u2717"}</span> ${x(e.name)}
          <span style="color:var(--fg-4)">\u2192</span>
          <span class="${r ? "skip" : e.effective ? "pass" : "deny"}">
            ${r ? `forced ${e.effective ? "true" : "false"} (real: ${e.live === null ? "unknown" : e.live ? "true" : "false"})` : e.effective ? "true" : "false"}
          </span>
        </div>
        <div class="indent">rollout <span style="color:var(--fg-4)">=</span> ${(e.rolloutPct / 100).toFixed(0)}%</div>
      </div>
      <div class="mini">
        <span class="lbl">live</span><span class="v">${e.live === null ? "\u2014" : e.live ? "true" : "false"}</span>
        <span class="lbl">override</span><span class="v">${r ? (e.override ? "true" : "false") : "none"}</span>
        <span class="lbl">updated</span><span class="v">${J(e.updatedAt)}</span>
      </div>
      <div class="actions">
        <button class="primary" data-toggle-detail="${be(e.name)}">\u2922 Force ${e.effective ? "false" : "true"}</button>
        ${r ? `<button data-clear-detail="${be(e.name)}">\u21BA Clear override</button>` : ""}
      </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}${a ? " muted" : ""}" data-row="${be(e.name)}">
      <div class="ic"><span style="color:${s}">${o}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${x(e.name)}</span>
          ${de("g:" + e.name, "Copy gate name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
          ${e.live ? '<span class="live-dot" title="firing on this page"></span>' : ""}
        </div>
        <div class="v">${x(f)}</div>
      </div>
      ${i}${c}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${l}</div></div>
    </div>`;
  }
  async function Bt(e, t, n, r) {
    e.innerHTML = ee();
    let a;
    try {
      a = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load gates: ${x(String(i))}</div>`;
      return;
    }
    if (a.length === 0) {
      let { html: i, wire: c } = V({
        title: "No <em>gates</em> yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        actions: t.hideAdminLinks
          ? []
          : [{ icon: "+", label: "Create new gate", href: `${t.adminUrl}/dashboard/gates/new` }],
      });
      ((e.innerHTML = i), c(e), r(0));
      return;
    }
    let o = null;
    function s() {
      let i = n.search.trim().toLowerCase(),
        f = (i ? a.filter((l) => l.name.toLowerCase().includes(i)) : a).map(sr);
      if ((r(f.filter((l) => l.override !== null).length), f.length === 0)) {
        e.innerHTML = le(n.search);
        return;
      }
      if (n.view === "page") {
        let l = f.filter((d) => d.live === !0 || d.killswitch),
          u = f.filter((d) => !l.includes(d));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} firing</span></div>` +
          l.map((d) => tt(d, o)).join("") +
          (u.length
            ? `<div class="dtf-group">Inactive<span class="c">${u.length} more</span></div>` +
              u.map((d) => tt(d, o)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All flags<span class="c">${f.length}</span></div>` +
          f.map((l) => tt(l, o)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (u) => {
          let d = u.target;
          if (d.closest(".dtf-toggle") || d.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((o = o === g ? null : g), s());
        });
      }),
        e.querySelectorAll("[data-toggle]").forEach((l) => {
          l.addEventListener("click", (u) => {
            u.stopPropagation();
            let d = l.getAttribute("data-toggle"),
              g = f.find((p) => p.name === d);
            g && Pe(d, !g.effective);
          });
        }),
        e.querySelectorAll("[data-toggle-detail]").forEach((l) => {
          l.addEventListener("click", (u) => {
            u.stopPropagation();
            let d = l.getAttribute("data-toggle-detail"),
              g = f.find((p) => p.name === d);
            g && Pe(d, !g.effective);
          });
        }),
        e.querySelectorAll("[data-clear-detail]").forEach((l) => {
          l.addEventListener("click", (u) => {
            u.stopPropagation();
            let d = l.getAttribute("data-clear-detail");
            Pe(d, null);
          });
        }),
        ce(e, Object.fromEntries(f.map((l) => ["g:" + l.name, () => l.name]))));
    }
    s();
  }
  function be(e) {
    return x(e);
  }
  function lr() {
    return window.__shipeasy ?? null;
  }
  function dr(e) {
    let t = At(e.name),
      n = lr()?.getExperiment(e.name),
      r = n?.inExperiment ? n.group : null,
      a = ["control", ...e.groups.map((s) => s.name)],
      o = t ?? r ?? "control";
    return {
      name: e.name,
      status: e.status,
      groups: [{ name: "control", weight: 0 }, ...e.groups]
        .map((s, i) => ({ name: i === 0 ? "control" : s.name, weight: s.weight }))
        .filter((s, i, c) => c.findIndex((f) => f.name === s.name) === i),
      override: t,
      liveGroup: r,
      liveEnrolled: n?.inExperiment ?? !1,
      effective: o,
      updatedAt: e.updatedAt,
    };
  }
  function nt(e, t) {
    let n = t === e.name,
      r = e.override !== null,
      a = e.groups
        .map(
          (f) =>
            `<option value="${He(f.name)}"${f.name === e.effective ? " selected" : ""}>${x(f.name)}</option>`,
        )
        .join(""),
      o = `<select class="sel${r ? " over" : ""}" data-exp="${He(e.name)}" style="grid-column:3 / span 2; justify-self:end">
    ${a}
  </select>`,
      s = `experiment \xB7 ${e.status} \xB7 ${e.groups.length} variants${e.liveGroup ? ` \xB7 live: ${e.liveGroup}` : ""}`,
      i = e.groups
        .map((f, l) => {
          let u = f.name === e.effective,
            d =
              ["var(--info)", "var(--accent)", "var(--warn)", "var(--danger)", "var(--pri)"][l] ??
              "var(--fg-3)";
          return `<div class="var-row${u ? " assigned" : ""}">
        <span class="sw" style="background:${d}"></span>
        <span>${x(f.name)}</span>
        <span class="pct">${f.weight}%</span>
        <span style="font-size:9.5px;color:var(--fg-4)">${f.name === e.liveGroup ? "real" : f.name === e.override ? "forced" : ""}</span>
      </div>`;
        })
        .join(""),
      c = `
    <div class="crumbs">
      <div><span class="${r ? "skip" : "pass"}">\u25CF</span> ${r ? "forced via URL override" : e.liveGroup ? "assigned via SDK" : "no live assignment"}</div>
    </div>
    ${i}
    <div class="mini">
      <span class="lbl">status</span><span class="v">${e.status}</span>
      <span class="lbl">updated</span><span class="v">${J(e.updatedAt)}</span>
    </div>
    <div class="actions">
      ${r ? `<button data-clear="${He(e.name)}">\u21BA Clear override</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}${e.status !== "running" ? " muted" : ""}" data-row="${He(e.name)}">
      <div class="ic"><span style="color:${e.liveEnrolled ? "var(--accent)" : "var(--fg-3)"}">${E.flask}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${x(e.name)}</span>
          ${de("e:" + e.name, "Copy experiment name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
          ${e.liveEnrolled ? '<span class="live-dot" title="enrolled on this page"></span>' : ""}
        </div>
        <div class="v">${x(s)}</div>
      </div>
      ${o}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${c}</div></div>
    </div>`;
  }
  async function zt(e, t, n, r) {
    e.innerHTML = ee();
    let a;
    try {
      a = await t.experiments();
    } catch (i) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load experiments: ${x(String(i))}</div>`;
      return;
    }
    if (a.length === 0) {
      let { html: i, wire: c } = V({
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
      ((e.innerHTML = i), c(e), r(0));
      return;
    }
    let o = null;
    function s() {
      let i = n.search.trim().toLowerCase(),
        f = (i ? a.filter((l) => l.name.toLowerCase().includes(i)) : a).map(dr);
      if ((r(f.filter((l) => l.override !== null).length), f.length === 0)) {
        e.innerHTML = le(n.search);
        return;
      }
      if (n.view === "page") {
        let l = f.filter((d) => d.liveEnrolled),
          u = f.filter((d) => !d.liveEnrolled);
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} enrolled</span></div>` +
          (l.length
            ? l.map((d) => nt(d, o)).join("")
            : '<div class="se-empty">No experiments enrolled yet on this page.</div>') +
          (u.length
            ? `<div class="dtf-group">Other<span class="c">${u.length}</span></div>` +
              u.map((d) => nt(d, o)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All experiments<span class="c">${f.length}</span></div>` +
          f.map((l) => nt(l, o)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (u) => {
          let d = u.target;
          if (d.closest("select") || d.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((o = o === g ? null : g), s());
        });
      }),
        e.querySelectorAll("select[data-exp]").forEach((l) => {
          l.addEventListener("change", () => {
            Ze(l.dataset.exp, l.value || null);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (u) => {
            (u.stopPropagation(), Ze(l.getAttribute("data-clear"), null));
          });
        }),
        ce(e, Object.fromEntries(f.map((l) => ["e:" + l.name, () => l.name]))));
    }
    s();
  }
  function He(e) {
    return x(e);
  }
  function cr() {
    return window.__shipeasy ?? null;
  }
  function ie(e) {
    return e === null ? "null" : Array.isArray(e) ? "array" : typeof e;
  }
  function Oe(e, t) {
    try {
      return JSON.stringify(e) === JSON.stringify(t);
    } catch {
      return e === t;
    }
  }
  function at(e) {
    let t = ie(e);
    if (t === "object") return `{${Object.keys(e).length} keys}`;
    if (t === "array") return `[${e.length}]`;
    if (t === "string") {
      let n = e;
      return `"${n.length > 22 ? n.slice(0, 22) + "\u2026" : n}"`;
    }
    return t === "null" ? "null" : String(e);
  }
  function pr(e) {
    let t = Rt(e.name),
      n = cr()?.getConfig(e.name),
      r = t !== void 0 ? t : n !== void 0 ? n : e.valueJson;
    return {
      name: e.name,
      real: e.valueJson,
      override: t,
      live: n,
      effective: r,
      updatedAt: e.updatedAt,
    };
  }
  function rt(e, t) {
    let n = t === e.name,
      r = e.override !== void 0,
      a = ie(e.effective),
      o = `config \xB7 ${a} \xB7 updated ${J(e.updatedAt)}`,
      s = `<span class="val${r ? " over" : ""}" style="grid-column:3 / span 2; justify-self:end">${x(at(e.effective))}</span>`,
      i = `
    <div class="crumbs">
      <div><span class="pass">\u25CF</span> ${x(e.name)}
        <span style="color:var(--fg-4)">=</span>
        <span style="color:var(--fg-2)">${x(at(e.effective))}</span>
        <span style="color:var(--fg-4)">\xB7 ${a}</span>
      </div>
    </div>
    <div class="mini">
      <span class="lbl">override</span><span class="v">${r ? "yes" : "none"}</span>
      <span class="lbl">updated</span><span class="v">${J(e.updatedAt)}</span>
    </div>
    <div class="actions">
      <button class="primary" data-edit="${te(e.name)}">\u2922 ${r ? "Edit override" : "Override value"}</button>
      ${r ? `<button data-clear="${te(e.name)}">\u21BA Reset</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}" data-row="${te(e.name)}">
      <div class="ic"><span style="color:var(--accent)">${E.sliders}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${x(e.name)}</span>
          ${de("c:" + e.name, "Copy config name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
        </div>
        <div class="v">${x(o)}</div>
      </div>
      ${s}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${i}</div></div>
    </div>`;
  }
  async function jt(e, t, n, r, a) {
    e.innerHTML = ee();
    let o;
    try {
      o = await t.configs();
    } catch (c) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${x(String(c))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: c, wire: f } = V({
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
      ((e.innerHTML = c), f(e), r(0));
      return;
    }
    let s = null;
    function i() {
      let c = n.search.trim().toLowerCase(),
        l = (c ? o.filter((u) => u.name.toLowerCase().includes(c)) : o).map(pr);
      if ((r(l.filter((u) => u.override !== void 0).length), l.length === 0)) {
        e.innerHTML = le(n.search);
        return;
      }
      if (n.view === "page") {
        let u = l.filter((g) => g.override !== void 0 || g.live !== void 0),
          d = l.filter((g) => !u.includes(g));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${u.length} loaded</span></div>` +
          (u.length
            ? u.map((g) => rt(g, s)).join("")
            : '<div class="se-empty">No configs read on this page yet.</div>') +
          (d.length
            ? `<div class="dtf-group">Other<span class="c">${d.length}</span></div>` +
              d.map((g) => rt(g, s)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All configs<span class="c">${l.length}</span></div>` +
          l.map((u) => rt(u, s)).join("");
      (e.querySelectorAll(".dtf-row").forEach((u) => {
        u.addEventListener("click", (d) => {
          if (d.target.closest(".dtf-copy")) return;
          let p = u.dataset.row;
          ((s = s === p ? null : p), i());
        });
      }),
        e.querySelectorAll("[data-edit]").forEach((u) => {
          u.addEventListener("click", (d) => {
            d.stopPropagation();
            let g = u.getAttribute("data-edit"),
              p = l.find((v) => v.name === g);
            ur(a, p);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((u) => {
          u.addEventListener("click", (d) => {
            (d.stopPropagation(), Xe(u.getAttribute("data-clear"), null));
          });
        }),
        ce(e, Object.fromEntries(l.map((u) => ["c:" + u.name, () => u.name]))));
    }
    i();
  }
  function Ie(e) {
    return e == null || typeof e != "object" ? e : JSON.parse(JSON.stringify(e));
  }
  function he(e, t, n) {
    if (t.length === 0) return n;
    let [r, ...a] = t,
      o = e;
    if (Array.isArray(o)) {
      let i = o.slice();
      return ((i[r] = he(o[r], a, n)), i);
    }
    let s = { ...o };
    return ((s[String(r)] = he(o[String(r)], a, n)), s);
  }
  function ur(e, t) {
    let n = t.override !== void 0 ? t.override : t.real,
      r = Ie(n),
      a = document.createElement("div");
    ((a.className = "dtf-modal-bg"),
      (a.innerHTML = '<div class="dtf-modal" data-role="modal"></div>'));
    let o = a.querySelector(".dtf-modal");
    e.appendChild(a);
    function s() {
      (a.remove(), document.removeEventListener("keydown", i));
    }
    function i(l) {
      (l.key === "Escape" && s(), l.key === "Enter" && (l.metaKey || l.ctrlKey) && c());
    }
    function c() {
      (Xe(t.name, r), s());
    }
    function f() {
      let l = !Oe(r, t.real),
        u = ie(r);
      o.innerHTML = `
      <div class="hd">
        <span class="k">${x(t.name)}</span>
        <span class="type-tag t-${u}">${u}</span>
        <button class="x" data-action="close" title="Close (Esc)">${E.x}</button>
      </div>
      <div class="bd">
        ${u === "object" || u === "array" ? '<div class="json-tree" id="tree"></div>' : `<div class="row"><span class="lbl">${u}</span><span data-leaf></span></div>`}
      </div>
      <div class="ft">
        <button class="ghost" data-action="reset" ${l ? "" : "disabled"} style="${l ? "" : "opacity:.4"}">\u21BA Reset all</button>
        <span class="sp"></span>
        <button data-action="cancel">Cancel <span style="opacity:.6;margin-left:4px">Esc</span></button>
        <button class="primary" data-action="save">Save override <span style="opacity:.6;margin-left:4px">\u2318\u23CE</span></button>
      </div>`;
      let d = o.querySelector("#tree");
      d &&
        Dt(d, r, t.real, (p) => {
          ((r = p), f());
        });
      let g = o.querySelector("[data-leaf]");
      (g &&
        ((g.innerHTML = Ut(r, t.real)),
        Nt(g, r, t.real, (p) => {
          ((r = p), f());
        })),
        o.querySelector('[data-action="close"]').addEventListener("click", s),
        o.querySelector('[data-action="cancel"]').addEventListener("click", s),
        o.querySelector('[data-action="save"]').addEventListener("click", c),
        o.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
          ((r = Ie(t.real)), f());
        }));
    }
    (a.addEventListener("click", (l) => {
      l.target === a && s();
    }),
      document.addEventListener("keydown", i),
      f());
  }
  function Dt(e, t, n, r) {
    let o = ie(t) === "array" ? t.map((i, c) => [c, i]) : Object.entries(t);
    e.innerHTML = '<div class="json-children"></div>';
    let s = e.querySelector(".json-children");
    for (let [i, c] of o) {
      let f = ie(c),
        l = n?.[i];
      if (f === "object" || f === "array") {
        let u = document.createElement("div"),
          d = !Oe(c, l);
        ((u.innerHTML = `
        <div class="json-row branch${d ? " dirty" : ""}">
          <span class="caret">\u25BE</span>
          <span class="key branch-key">${x(String(i))}</span>
          <span class="type t-${f}">${f}</span>
          <span class="summary">${x(at(c))}</span>
          ${d ? '<button class="reset" title="reset subtree">\u21BA</button>' : ""}
        </div>
        <div class="json-children-host"></div>`),
          s.appendChild(u));
        let g = u.querySelector(".json-children-host"),
          p = u.querySelector(".json-row"),
          v = !0,
          w = () => {
            ((g.innerHTML = ""),
              v &&
                Dt(g, c, l, (R) => {
                  r(he(t, [i], R));
                }));
          };
        (w(),
          p.addEventListener("click", () => {
            ((v = !v), (p.querySelector(".caret").textContent = v ? "\u25BE" : "\u25B8"), w());
          }),
          u.querySelector(".reset")?.addEventListener("click", (R) => {
            (R.stopPropagation(), r(he(t, [i], Ie(l))));
          }));
      } else {
        let u = !Oe(c, l),
          d = document.createElement("div");
        ((d.className = `json-row leaf${u ? " dirty" : ""}`),
          (d.innerHTML = `
        <span class="caret"></span>
        <span class="key">${x(String(i))}</span>
        <span class="type t-${f}">${f}</span>
        ${Ut(c, l)}`),
          s.appendChild(d),
          Nt(d, c, l, (g) => r(he(t, [i], g))));
      }
    }
  }
  function Ut(e, t) {
    let n = ie(e),
      r = !Oe(e, t);
    return n === "boolean"
      ? `<span class="ctl${r ? " changed" : ""}">
      <span class="bool">
        <button class="t${e === !0 ? " on" : ""}" data-bool="true">true</button>
        <button class="f${e === !1 ? " on" : ""}" data-bool="false">false</button>
      </span>
      <button class="reset" title="reset to ${te(String(t))}">\u21BA</button>
    </span>`
      : n === "number"
        ? `<span class="ctl${r ? " changed" : ""}">
      <input type="number" value="${te(String(e))}"/>
      <button class="reset" title="reset to ${te(String(t))}">\u21BA</button>
    </span>`
        : n === "string"
          ? `<span class="ctl${r ? " changed" : ""}">
      <input type="text" value="${te(String(e))}"/>
      <button class="reset" title="reset to ${te(String(t))}">\u21BA</button>
    </span>`
          : `<span class="summary">${x(String(e))}</span>`;
  }
  function Nt(e, t, n, r) {
    let a = ie(t);
    if (a === "boolean")
      e.querySelectorAll("[data-bool]").forEach((o) => {
        o.addEventListener("click", () => r(o.dataset.bool === "true"));
      });
    else if (a === "number") {
      let o = e.querySelector("input");
      o.addEventListener("input", () => {
        let s = o.value === "" ? t : Number(o.value);
        Number.isNaN(s) || r(s);
      });
    } else if (a === "string") {
      let o = e.querySelector("input");
      o.addEventListener("input", () => r(o.value));
    }
    e.querySelector(".reset")?.addEventListener("click", (o) => {
      (o.stopPropagation(), r(Ie(n)));
    });
  }
  function te(e) {
    return x(e);
  }
  var je = Yn(on(), 1);
  var pe = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function Wr(e) {
    if (e.length === 0) return null;
    let t = e.find((n) => n.name === "en:prod");
    return t ? t.id : e[0].id;
  }
  function z(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  var ne = "__se_label_target",
    bt = "__se_label_target_style",
    ht = !1,
    mt = null,
    ue = null,
    un = null,
    fn = [];
  function Jr() {
    if (document.getElementById(bt)) return;
    let e = document.createElement("style");
    ((e.id = bt),
      (e.textContent = `
    .${ne} {
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
    .${ne}:hover,
    .${ne}.__se_label_active {
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
  function sn() {
    document.getElementById(bt)?.remove();
  }
  function we(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      a;
    for (; (a = t.nextNode()); ) {
      let s = a.nodeValue ?? "";
      if (
        !s.includes(je.LABEL_MARKER_START) ||
        r.has(a.parentElement?.tagName ?? "") ||
        a.parentElement?.closest?.("[data-label]")
      )
        continue;
      let i = document.createDocumentFragment(),
        c = 0;
      pe.lastIndex = 0;
      let f;
      for (; (f = pe.exec(s)) !== null; ) {
        f.index > c && i.appendChild(document.createTextNode(s.slice(c, f.index)));
        let l = f[1],
          u = f[2],
          d = f[3],
          g = document.createElement("span");
        (g.setAttribute("data-label", l), u && g.setAttribute("data-variables", u));
        let p = oe(l),
          v = null;
        if (u)
          try {
            v = JSON.parse(u);
          } catch {
            v = null;
          }
        ((g.textContent = p !== null ? De(p, v) : d),
          i.appendChild(g),
          (c = f.index + f[0].length));
      }
      (c < s.length && i.appendChild(document.createTextNode(s.slice(c))), n.push([a, i]));
    }
    for (let [s, i] of n) s.parentNode?.replaceChild(i, s);
    let o = window._sei18n_t;
    for (let s of Array.from(document.querySelectorAll("[data-label]"))) {
      let i = s.textContent ?? "",
        c = s.getAttribute("data-label"),
        f = oe(c);
      if (i.includes(je.LABEL_MARKER_START)) {
        pe.lastIndex = 0;
        let l = pe.exec(i);
        if (l) {
          l[2] && s.setAttribute("data-variables", l[2]);
          let u = l[2] ? Vr(l[2]) : null;
          s.textContent = f !== null ? De(f, u) : l[3];
        }
      } else if (o)
        try {
          let l = s.dataset.variables ? JSON.parse(s.dataset.variables) : void 0,
            u = o(c, l);
          f !== null ? (s.textContent = De(f, l ?? null)) : u && u !== c && (s.textContent = u);
        } catch {}
    }
    for (let s of Array.from(document.querySelectorAll("*"))) {
      let i = xt(s),
        c = new Map();
      for (let l of i) c.set(l.attr, l);
      let f = !1;
      for (let l of Array.from(s.attributes)) {
        let u = l.value;
        if (!u.includes(je.LABEL_MARKER_START)) continue;
        pe.lastIndex = 0;
        let d = pe.exec(u);
        if (!d) continue;
        let g = d[1],
          p = d[3],
          v = oe(g);
        (s.setAttribute(l.name, v ?? p),
          c.set(l.name, { attr: l.name, key: g, original: p }),
          (f = !0));
      }
      f && vn(s, Array.from(c.values()));
    }
    return n.length;
  }
  function ln(e) {
    let t = [],
      n = /\{\{(\w+)\}\}/g,
      r;
    for (; (r = n.exec(e)) !== null; ) t.push(r[1]);
    return t;
  }
  function De(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
          let a = t[r];
          return a != null ? String(a) : `{{${r}}}`;
        })
      : e;
  }
  function Vr(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  var dn = "se-popper-host";
  function Yr() {
    let e = document.getElementById(dn);
    if (e?.shadowRoot) return e.shadowRoot;
    e || ((e = document.createElement("div")), (e.id = dn), document.body.appendChild(e));
    let t = e.attachShadow({ mode: "open" }),
      n = document.createElement("style");
    return ((n.textContent = _e), t.appendChild(n), t);
  }
  function gn(e) {
    let n = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof n == "string" ? n : null;
  }
  function xt(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let n = JSON.parse(t);
      if (Array.isArray(n)) return n;
    } catch {}
    return [];
  }
  function vn(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var Xr = "[data-label], [data-label-attrs]";
  function ze() {
    return Array.from(document.querySelectorAll(Xr));
  }
  function re() {
    (ue?.remove(),
      (ue = null),
      document.querySelectorAll(`.${ne}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function mn(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let n = xt(e.target),
        r = n.findIndex((a) => a.attr === e.attr);
      r >= 0 && ((n[r] = { ...n[r], original: t }), vn(e.target, n));
    }
  }
  async function Zr(e, t, n) {
    let r = n.querySelector(".lp-err"),
      a = n.querySelector('[data-action="save"]'),
      o = oe(e.key),
      s = gn(e.key),
      i = ln(o ?? s ?? ""),
      c = ln(t),
      f = i.filter((w) => !c.includes(w)),
      l = c.filter((w) => !i.includes(w));
    if (f.length || l.length) {
      if (r) {
        let w = [];
        (f.length && w.push(`missing {{${f.join("}}, {{")}}}`),
          l.length && w.push(`unknown {{${l.join("}}, {{")}}}`),
          (r.textContent = `Placeholders must match exactly \u2014 ${w.join("; ")}.`));
      }
      return;
    }
    let u = e.variables ?? {},
      d = De(t, u);
    (mn(e, d),
      ve(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let g = Pt(),
      p = Ce(),
      v = un;
    if (!v || (!g && !p)) {
      re();
      return;
    }
    ((a.disabled = !0), (a.textContent = "Saving\u2026"), r && (r.textContent = ""));
    try {
      if (g) await v.upsertDraftKey(g, e.key, t);
      else if (p) {
        let w = fn.find((R) => R.key === e.key && R.profileId === p);
        w && (await v.updateKeyById(w.id, t));
      }
      re();
    } catch (w) {
      ((a.disabled = !1),
        (a.textContent = "Save"),
        r && (r.textContent = w instanceof Error ? w.message : String(w)));
    }
  }
  function Qr(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function ea(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: Qr(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    )
      for (let n of xt(e)) t.push({ kind: "attr", key: n.key, target: e, attr: n.attr });
    return t;
  }
  function cn(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function ta(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let n = e.key.split(".").pop() || e.key;
    return t.filter((a) => a.kind === "text" && (a.key.split(".").pop() || a.key) === n).length > 1
      ? e.key
      : n;
  }
  function na(e, t) {
    (re(), e.classList.add("__se_label_active"));
    let n = ea(e);
    if (n.length === 0) return;
    let a = Ce() ?? "default",
      o = new Map(),
      s = 0,
      i = document.createElement("div");
    i.className = "label-popper";
    let c = `<div class="lp-tabs">${n
      .map((T, C) => {
        let W = ta(T, n),
          G = C === 0 ? "lp-tab active" : "lp-tab",
          b = T.kind === "attr" ? `@<span class="lp-tab-attr">${z(T.attr ?? "")}</span>` : z(W);
        return `<button class="${G}" data-surface-idx="${C}">${b}</button>`;
      })
      .join("")}</div>`;
    ((i.innerHTML = `
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
      Yr().appendChild(i));
    let l = i.querySelector(".lp-key"),
      u = i.querySelector(".lp-body"),
      d = i.querySelector(".lp-err"),
      g = i.querySelector('[data-action="save"]'),
      p = i.querySelector('[data-action="reset"]');
    function v() {
      return n[s];
    }
    function w() {
      let T = v();
      (o.has(s) || o.set(s, cn(T)), (l.textContent = T.key));
      let C = gn(T.key),
        G = oe(T.key) ?? C ?? cn(T),
        b = T.variables ?? {},
        y = Object.entries(b),
        _ = y.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${y.map(([P, q]) => `<div class="lp-var"><span class="lp-var-k mono">${z(`{{${P}}}`)}</span><span class="lp-var-v">${z(String(q))}</span></div>`).join("")}</div>
        </div>`
          : "",
        h = T.desc ?? "",
        k = T.kind === "attr" ? `attribute \xB7 ${z(T.attr ?? "")}` : "text content";
      ((u.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${z(G)}</textarea>
      </div>
      ${_}
      <div class="lp-field">
        <label>Current profile</label>
        <span>${z(a)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${k}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${h ? "" : "empty"}">${h ? z(h) : "No description"}</span>
      </div>`),
        (d.textContent = ""),
        (g.disabled = !1),
        (g.textContent = "Save"));
      let B = u.querySelector(".lp-input");
      (B.focus(), B.select());
    }
    (i.querySelectorAll(".lp-tab").forEach((T) => {
      T.addEventListener("click", () => {
        let C = Number(T.dataset.surfaceIdx);
        C !== s &&
          ((s = C),
          i.querySelectorAll(".lp-tab").forEach((W, G) => {
            W.classList.toggle("active", G === s);
          }),
          w());
      });
    }),
      w());
    let R = e.getBoundingClientRect(),
      m = i.offsetHeight,
      $ = i.offsetWidth,
      A = 8,
      O = R.bottom + A;
    O + m > window.innerHeight - 8 && (O = Math.max(8, R.top - m - A));
    let M = R.left;
    (M + $ > window.innerWidth - 8 && (M = Math.max(8, window.innerWidth - $ - 8)),
      (i.style.top = `${O}px`),
      (i.style.left = `${M}px`),
      i.querySelector(".lp-close").addEventListener("click", re),
      g.addEventListener("click", () => {
        let T = u.querySelector(".lp-input");
        Zr(v(), T.value, i);
      }),
      p.addEventListener("click", () => {
        let T = v(),
          C = o.get(s) ?? "";
        (mn(T, C),
          ve(T.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: T.key, value: null } }),
          ),
          re());
      }),
      i.addEventListener("click", (T) => T.stopPropagation()),
      i.addEventListener("mousedown", (T) => T.stopPropagation()),
      (ue = i));
  }
  function ke(e, t, n) {
    if (((ht = e), mt?.(), (mt = null), !e)) {
      re();
      for (let d of ze()) d.classList.remove(ne);
      sn();
      return;
    }
    Jr();
    for (let d of ze()) d.classList.add(ne);
    function r(d) {
      return ue !== null && d.composedPath().includes(ue);
    }
    function a(d) {
      for (let g of d.composedPath())
        if (
          g instanceof HTMLElement &&
          (g.hasAttribute("data-label") || g.hasAttribute("data-label-attrs"))
        )
          return g;
      return null;
    }
    let o = [
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
    function s(d) {
      return "altKey" in d && typeof d.altKey == "boolean" && d.altKey;
    }
    function i(d) {
      r(d) ||
        (a(d) && (s(d) || (d.preventDefault(), d.stopPropagation(), d.stopImmediatePropagation())));
    }
    function c(d) {
      if (r(d)) return;
      let g = a(d);
      g &&
        (s(d) || (d.preventDefault(), d.stopPropagation(), d.stopImmediatePropagation(), na(g, t)));
    }
    function f(d) {
      ue && (r(d) || a(d) || re());
    }
    function l(d) {
      d.key === "Escape" && re();
    }
    let u = new MutationObserver(() => {
      if (ht) {
        for (let d of ze()) d.classList.add(ne);
        n();
      }
    });
    u.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let d of o) document.addEventListener(d, i, !0);
    (document.addEventListener("click", c, !0),
      document.addEventListener("mousedown", f, !0),
      document.addEventListener("keydown", l),
      (mt = () => {
        for (let d of o) document.removeEventListener(d, i, !0);
        (document.removeEventListener("click", c, !0),
          document.removeEventListener("mousedown", f, !0),
          document.removeEventListener("keydown", l),
          u.disconnect());
        for (let d of ze()) d.classList.remove(ne);
        sn();
      }));
  }
  function ra(e) {
    let t = { name: "", path: "", children: new Map(), leaves: [] };
    for (let n of e) {
      if (!n.key) continue;
      let r = n.key.split(".").filter((o) => o !== "");
      if (r.length === 0) continue;
      let a = t;
      for (let o = 0; o < r.length - 1; o++) {
        let s = r[o],
          i = a.children.get(s);
        (i ||
          ((i = { name: s, path: a.path ? `${a.path}.${s}` : s, children: new Map(), leaves: [] }),
          a.children.set(s, i)),
          (a = i));
      }
      a.leaves.push(n);
    }
    return t;
  }
  function bn(e) {
    let t = e.leaves.length;
    for (let n of e.children.values()) t += bn(n);
    return t;
  }
  function aa(e, t) {
    let n = t.split("-")[0].toLowerCase();
    return (
      e.find((r) => r.name.toLowerCase().startsWith(`${n}:`)) ??
      e.find((r) => r.name.toLowerCase().startsWith(`${n}-`)) ??
      e.find((r) => r.name.toLowerCase() === n) ??
      null
    );
  }
  function oa(e) {
    let t = new Set(),
      n = [];
    for (let r of e) {
      let a = r.name.split(/[:_-]/)[0]?.toLowerCase() ?? "";
      !a ||
        t.has(a) ||
        (t.add(a), n.push({ code: a, flag: a.toUpperCase().slice(0, 2), name: r.name }));
    }
    return n.length > 0 ? n : [{ code: "en", flag: "EN", name: "English" }];
  }
  async function hn(e, t, n, r, a) {
    ((e.innerHTML = '<div class="dtf-load"><div class="topstrip"></div></div>'), (un = t));
    let o, s, i;
    try {
      [o, s] = await Promise.all([t.profiles(), t.drafts()]);
      let $ = Ce() ?? aa(o, a.locale)?.id ?? Wr(o);
      i = await t.keys($ ?? void 0);
    } catch (m) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load labels: ${z(String(m))}</div>`;
      return;
    }
    if (((fn = i), i.length === 0)) {
      e.innerHTML = `
      <div class="dtf-empty">
        <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">A</div></div>
        <h3>No <em>translation keys</em> yet</h3>
        <p>Add keys in the admin and group them by namespace (e.g. checkout.title).</p>
      </div>`;
      return;
    }
    let c = e.getRootNode().querySelector("select[data-locale]"),
      f = oa(o);
    c &&
      ((c.innerHTML = f
        .map(
          (m) =>
            `<option value="${z(m.code)}"${m.code === a.locale.split("-")[0] ? " selected" : ""}>${z(m.flag)} \xB7 ${z(m.name)}</option>`,
        )
        .join("")),
      (c.onchange = () => a.setLocale(c.value)));
    let l = n.search.trim().toLowerCase(),
      u = l ? i.filter((m) => m.key.toLowerCase().includes(l)) : i,
      d = ra(u),
      g = new Map(),
      p = null;
    function v() {
      let m = u.length;
      ((e.innerHTML =
        `<div class="dtf-group">All keys
        <span class="cov-mini" title="${z(a.locale)} coverage">${m}/${i.length}</span>
        <span class="pulse"><span class="d"></span>${m} ${n.view === "page" ? "rendered" : "total"}</span>
      </div>` + w(d, 0)),
        e.querySelectorAll(".dtf-tree-node[data-tree]").forEach(($) => {
          $.addEventListener("click", () => {
            let A = $.dataset.tree;
            (g.set(A, !(g.get(A) ?? !0)), v());
          });
        }),
        e.querySelectorAll(".dtf-lbl-row[data-key]").forEach(($) => {
          $.addEventListener("click", (A) => {
            if (
              A.target.closest(".dtf-copy") ||
              A.target.closest("textarea") ||
              A.target.closest("button")
            )
              return;
            let O = $.dataset.key;
            ((p = p === O ? null : O), v());
          });
        }),
        e.querySelectorAll("textarea[data-edit-key]").forEach(($) => {
          ($.addEventListener("input", () => {}),
            $.addEventListener("blur", () => {
              let A = $.dataset.editKey,
                O = u.find((M) => M.key === A)?.value ?? "";
              $.value === O ? ve(A, null) : ve(A, $.value);
            }));
        }));
    }
    function w(m, $) {
      let A = "",
        O = Array.from(m.children.values()).sort((M, T) => M.name.localeCompare(T.name));
      for (let M of O) {
        let T = g.get(M.path) ?? !0,
          C = bn(M);
        if (
          ((A += `
        <div class="dtf-tree-node" style="padding-left:${12 + $ * 14}px" data-tree="${z(M.path)}">
          <span class="caret">${T ? "\u25BE" : "\u25B8"}</span>
          <span class="seg">${z(M.name)}</span>
          <span class="dotpath">${z(M.path)}</span>
          <span class="counts"><span class="t">${C}</span></span>
        </div>`),
          T)
        ) {
          A += w(M, $ + 1);
          for (let W of M.leaves) A += R(W, $ + 1);
        }
      }
      if ($ === 0) for (let M of m.leaves) A += R(M, 0);
      return A;
    }
    function R(m, $) {
      let A = p === m.key,
        O = oe(m.key),
        M = O ?? m.value,
        T = !M,
        C = m.key.split(".").pop() ?? m.key,
        W = T ? "missing" : O !== null ? "edited" : "ok",
        G = T ? "\u2298" : O !== null ? "\u270E" : "\u25CF";
      return `
      <div class="dtf-lbl-row${A ? " expanded" : ""}${T ? " missing" : ""}" style="padding-left:${12 + $ * 14}px" data-key="${z(m.key)}" title="${z(m.key)}">
        <span class="lbl-pill ${W}" title="${W}">${G}</span>
        <div class="meta">
          <div class="src">
            ${z(C)}
            <button class="dtf-copy" data-copy-leaf="${z(m.key)}" title="Copy value">${pn}</button>
          </div>
          <div class="sub">
            <span class="k" title="${z(M)}">${T ? '<em style="color:var(--warn)">\u2014 not translated \u2014</em>' : z(M)}</span>
          </div>
        </div>
        <span style="width:5px"></span>
      </div>
      <div class="dtf-detail${A ? " open" : ""}">
        <div class="inner"><div class="pad lbl-pad">
          <div class="lbl-edit">
            <div class="hd"><span>${z(a.locale)}</span></div>
            <textarea data-edit-key="${z(m.key)}" placeholder="Translate to ${z(a.locale)}\u2026">${z(M)}</textarea>
          </div>
          <div class="actions">
            ${t.hideAdminLinks ? "" : `<a target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/i18n/keys">\u2197 Open in dashboard</a>`}
          </div>
        </div></div>
      </div>`;
    }
    (v(),
      e.querySelectorAll("[data-copy-leaf]").forEach((m) => {
        m.addEventListener("click", async ($) => {
          $.stopPropagation();
          let A = m.getAttribute("data-copy-leaf"),
            O = u.find((M) => M.key === A)?.value ?? "";
          try {
            await navigator.clipboard.writeText(O);
          } catch {}
          (m.classList.add("done"),
            (m.innerHTML = ia),
            setTimeout(() => {
              (m.classList.remove("done"), (m.innerHTML = pn));
            }, 900));
        });
      }),
      se() && (we(), ht || ke(!0, r, () => v())));
  }
  var pn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    ia =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function xn(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function yn(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 }),
      n = xn(e);
    try {
      let r = document.createElement("video");
      ((r.srcObject = t),
        (r.muted = !0),
        (r.playsInline = !0),
        await new Promise((f, l) => {
          let u = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((r.onloadedmetadata = () => {
            (clearTimeout(u), f());
          }),
            (r.onerror = () => {
              (clearTimeout(u), l(new Error("Capture stream errored")));
            }));
        }),
        await r.play(),
        await new Promise((f) => requestAnimationFrame(() => f(null))),
        await new Promise((f) => requestAnimationFrame(() => f(null))));
      let a = r.videoWidth,
        o = r.videoHeight;
      if (!a || !o) throw new Error("Capture stream returned no frames.");
      let s = document.createElement("canvas");
      ((s.width = a), (s.height = o));
      let i = s.getContext("2d");
      if (!i) throw new Error("Canvas 2d context unavailable");
      return (
        i.drawImage(r, 0, 0, a, o),
        await new Promise((f, l) => {
          s.toBlob((u) => (u ? f(u) : l(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((r) => r.stop()), n());
    }
  }
  async function wn(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n = xn(e);
    await new Promise((c) => requestAnimationFrame(() => c(null)));
    let a =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((c) =>
          MediaRecorder.isTypeSupported(c),
        ) ?? "",
      o = a ? new MediaRecorder(t, { mimeType: a }) : new MediaRecorder(t),
      s = [];
    (o.addEventListener("dataavailable", (c) => {
      c.data && c.data.size > 0 && s.push(c.data);
    }),
      o.start(500),
      t.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), o.state !== "inactive" && o.stop());
      }));
    function i() {
      (t.getTracks().forEach((c) => c.stop()), n());
    }
    return {
      stop() {
        return new Promise((c, f) => {
          if (o.state === "inactive") {
            if ((i(), s.length === 0)) {
              f(new Error("No recording data."));
              return;
            }
            c(new Blob(s, { type: a || "video/webm" }));
            return;
          }
          (o.addEventListener(
            "stop",
            () => {
              (i(), c(new Blob(s, { type: a || "video/webm" })));
            },
            { once: !0 },
          ),
            o.addEventListener("error", (l) => f(l), { once: !0 }),
            o.stop());
        });
      },
      cancel() {
        (o.state !== "inactive" && o.stop(), i());
      },
    };
  }
  var kn = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function En(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((b, y) => {
        let _ = new Image();
        ((_.onload = () => b(_)),
          (_.onerror = () => y(new Error("Failed to load screenshot for annotation."))),
          (_.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let a = document.createElement("div");
    ((a.className = "se-annot-toolbar"), r.appendChild(a));
    let o = "pen",
      s = kn[0],
      i = [];
    function c(b) {
      ((o = b),
        a
          .querySelectorAll("[data-tool]")
          .forEach((y) => y.classList.toggle("on", y.dataset.tool === b)));
    }
    function f(b, y, _) {
      let h = document.createElement("button");
      return (
        (h.type = "button"),
        (h.className = "se-annot-btn"),
        (h.dataset.tool = b),
        (h.textContent = y),
        (h.title = _),
        h.addEventListener("click", () => c(b)),
        h
      );
    }
    (a.appendChild(f("pen", "\u270E draw", "Freehand draw (P)")),
      a.appendChild(f("arrow", "\u2197 arrow", "Arrow (A)")),
      a.appendChild(f("rect", "\u25AD rect", "Rectangle (R)")),
      a.appendChild(f("text", "T text", "Text (T)")),
      c("pen"));
    let l = document.createElement("span");
    ((l.className = "se-annot-sep"), a.appendChild(l));
    for (let b of kn) {
      let y = document.createElement("button");
      ((y.type = "button"),
        (y.className = "se-annot-swatch"),
        (y.dataset.color = b),
        (y.style.background = b),
        b === s && y.classList.add("on"),
        y.addEventListener("click", () => {
          ((s = b),
            a
              .querySelectorAll("[data-color]")
              .forEach((_) => _.classList.toggle("on", _.dataset.color === b)));
        }),
        a.appendChild(y));
    }
    let u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "se-annot-btn"),
      (u.textContent = "\u21B6 undo"),
      (u.title = "Undo (Ctrl/Cmd+Z)"),
      u.addEventListener("click", () => {
        (i.pop(), O());
      }),
      a.appendChild(u));
    let d = document.createElement("button");
    ((d.type = "button"),
      (d.className = "se-annot-btn"),
      (d.textContent = "clear"),
      d.addEventListener("click", () => {
        ((i.length = 0), O());
      }),
      a.appendChild(d));
    let g = document.createElement("div");
    ((g.className = "se-annot-stage"), r.appendChild(g));
    let p = document.createElement("canvas");
    ((p.width = n.naturalWidth),
      (p.height = n.naturalHeight),
      (p.className = "se-annot-canvas"),
      (p.style.cursor = "crosshair"),
      (p.style.touchAction = "none"),
      g.appendChild(p));
    let v = p.getContext("2d"),
      w = null;
    function R(b) {
      let y = p.getBoundingClientRect(),
        _ = p.width / y.width,
        h = p.height / y.height;
      return { x: (b.clientX - y.left) * _, y: (b.clientY - y.top) * h };
    }
    function m() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function $() {
      return Math.max(14, Math.round(n.naturalWidth / 60));
    }
    function A(b) {
      if (
        (v.save(),
        (v.strokeStyle = b.color),
        (v.fillStyle = b.color),
        (v.lineWidth = m()),
        (v.lineCap = "round"),
        (v.lineJoin = "round"),
        b.tool === "rect")
      ) {
        let y = Math.min(b.x1, b.x2),
          _ = Math.min(b.y1, b.y2),
          h = Math.abs(b.x2 - b.x1),
          k = Math.abs(b.y2 - b.y1);
        v.strokeRect(y, _, h, k);
      } else if (b.tool === "arrow") {
        (v.beginPath(), v.moveTo(b.x1, b.y1), v.lineTo(b.x2, b.y2), v.stroke());
        let y = Math.atan2(b.y2 - b.y1, b.x2 - b.x1),
          _ = m() * 5;
        (v.beginPath(),
          v.moveTo(b.x2, b.y2),
          v.lineTo(b.x2 - _ * Math.cos(y - Math.PI / 6), b.y2 - _ * Math.sin(y - Math.PI / 6)),
          v.lineTo(b.x2 - _ * Math.cos(y + Math.PI / 6), b.y2 - _ * Math.sin(y + Math.PI / 6)),
          v.closePath(),
          v.fill());
      } else if (b.tool === "pen")
        if (b.points.length < 2) {
          if (b.points.length === 1) {
            let y = b.points[0];
            (v.beginPath(), v.arc(y.x, y.y, m() / 2, 0, Math.PI * 2), v.fill());
          }
        } else {
          (v.beginPath(), v.moveTo(b.points[0].x, b.points[0].y));
          for (let y = 1; y < b.points.length; y++) v.lineTo(b.points[y].x, b.points[y].y);
          v.stroke();
        }
      else if (b.tool === "text" && b.text) {
        let y = $();
        ((v.font = `600 ${y}px ui-sans-serif, system-ui, sans-serif`), (v.textBaseline = "top"));
        let _ = y * 0.3,
          k = v.measureText(b.text).width + _ * 2,
          B = y + _ * 2;
        ((v.fillStyle = "rgba(0,0,0,0.55)"),
          v.fillRect(b.x1, b.y1, k, B),
          (v.fillStyle = b.color),
          v.fillText(b.text, b.x1 + _, b.y1 + _));
      }
      v.restore();
    }
    function O(b) {
      (v.clearRect(0, 0, p.width, p.height), v.drawImage(n, 0, 0));
      for (let y of i) A(y);
      b && A(b);
    }
    O();
    let M = null;
    function T(b, y) {
      M && M.blur();
      let _ = p.getBoundingClientRect(),
        h = g.getBoundingClientRect(),
        k = _.width / p.width,
        B = _.height / p.height,
        P = $() * k,
        q = P * 0.3,
        L = document.createElement("input");
      ((L.type = "text"),
        (L.className = "se-annot-text-input"),
        (L.style.position = "absolute"),
        (L.style.left = `${_.left - h.left + b * k}px`),
        (L.style.top = `${_.top - h.top + y * B}px`),
        (L.style.color = s),
        (L.style.background = "rgba(0,0,0,0.55)"),
        (L.style.border = `1px dashed ${s}`),
        (L.style.outline = "none"),
        (L.style.padding = `${q}px`),
        (L.style.font = `600 ${P}px ui-sans-serif, system-ui, sans-serif`),
        (L.style.minWidth = `${P * 4}px`),
        (L.style.lineHeight = "1"),
        (L.placeholder = "type\u2026"));
      let S = !1;
      function I() {
        if (S) return;
        S = !0;
        let K = L.value.trim();
        (L.remove(),
          (M = null),
          K && (i.push({ tool: "text", color: s, x1: b, y1: y, text: K }), O()));
      }
      function U() {
        S || ((S = !0), L.remove(), (M = null));
      }
      (L.addEventListener("keydown", (K) => {
        (K.key === "Enter"
          ? (K.preventDefault(), I())
          : K.key === "Escape" && (K.preventDefault(), U()),
          K.stopPropagation());
      }),
        L.addEventListener("blur", I),
        g.appendChild(L),
        (M = L),
        setTimeout(() => L.focus(), 0));
    }
    let C = null;
    (p.addEventListener("pointermove", (b) => {
      ((w = R(b)),
        C &&
          (C.kind === "pen"
            ? (C.shape.points.push(w), O())
            : O({
                tool: o === "text" ? "rect" : o,
                color: s,
                x1: C.x1,
                y1: C.y1,
                x2: w.x,
                y2: w.y,
              })));
    }),
      p.addEventListener("pointerdown", (b) => {
        b.preventDefault();
        let y = R(b);
        if (((w = y), o === "text")) {
          T(y.x, y.y);
          return;
        }
        if (o === "pen") {
          let _ = { tool: "pen", color: s, points: [y] };
          (i.push(_), (C = { kind: "pen", shape: _ }), p.setPointerCapture(b.pointerId), O());
          return;
        }
        ((C = { kind: "shape", x1: y.x, y1: y.y }), p.setPointerCapture(b.pointerId));
      }),
      p.addEventListener("pointerup", (b) => {
        if (!C) return;
        let y = R(b);
        if (C.kind === "shape") {
          let _ = Math.abs(y.x - C.x1),
            h = Math.abs(y.y - C.y1);
          (_ > 4 || h > 4) &&
            (o === "arrow" || o === "rect") &&
            i.push({ tool: o, color: s, x1: C.x1, y1: C.y1, x2: y.x, y2: y.y });
        }
        ((C = null), O());
      }));
    function W(b) {
      if (!(b instanceof HTMLElement)) return !1;
      let y = b.tagName;
      return y === "INPUT" || y === "TEXTAREA" || b.isContentEditable;
    }
    function G(b) {
      if (!r.isConnected) {
        document.removeEventListener("keydown", G, !0);
        return;
      }
      if (W(b.target)) return;
      let y = b.key.toLowerCase();
      if ((b.ctrlKey || b.metaKey) && y === "z") {
        (b.preventDefault(), i.pop(), O());
        return;
      }
      if (!(b.ctrlKey || b.metaKey || b.altKey))
        if (y === "t") {
          (b.preventDefault(), c("text"));
          let _ = w ?? { x: p.width / 2, y: p.height / 2 };
          T(_.x, _.y);
        } else y === "p" ? c("pen") : y === "a" ? c("arrow") : y === "r" && c("rect");
    }
    return (
      document.addEventListener("keydown", G, !0),
      {
        root: r,
        async export() {
          (M && M.blur(), await new Promise((y) => requestAnimationFrame(() => y(null))));
          let b = await new Promise((y, _) => {
            p.toBlob((h) => (h ? y(h) : _(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", G, !0), b);
        },
      }
    );
  }
  var sa = {
      open: "badge-run",
      triaged: "badge-run",
      in_progress: "badge-run",
      resolved: "badge-on",
      wont_fix: "badge-off",
    },
    la = {
      open: "badge-run",
      considering: "badge-run",
      planned: "badge-draft",
      shipped: "badge-on",
      declined: "badge-off",
    },
    da = { critical: "badge-warn", important: "badge-run", nice_to_have: "badge-draft" };
  function yt(e, t) {
    return `<span class="badge ${t}">${x(e.replace(/_/g, " "))}</span>`;
  }
  async function Ln(e, t, n, r) {
    let a = e.getRootNode(),
      o = null;
    async function s() {
      if (o === "bug") {
        fa(e, t, n, a, () => {
          ((o = null), s());
        });
        return;
      }
      if (o === "feature") {
        va(e, t, () => {
          ((o = null), s());
        });
        return;
      }
      await i();
    }
    async function i() {
      ((e.innerHTML = `
      <div class="se-fb-subtabs">
        <button class="${r.sub === "bugs" ? "active" : ""}" data-sub="bugs">${E.bug} Bugs <span class="c">\u2026</span></button>
        <button class="${r.sub === "features" ? "active" : ""}" data-sub="features">${E.sparkles} Feature requests <span class="c">\u2026</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${r.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${t.hideAdminLinks ? "" : `<a class="ibtn" target="_blank" rel="noopener" href="${x(t.adminUrl)}/dashboard/${r.sub === "bugs" ? "bugs" : "feature-requests"}">${E.external} Open dashboard</a>`}
      </div>
      <div class="se-feedback-list" data-list></div>`),
        e.querySelectorAll("[data-sub]").forEach((u) => {
          u.addEventListener("click", () => r.setSub(u.dataset.sub));
        }),
        e.querySelector('[data-action="file"]').addEventListener("click", () => {
          ((o = r.sub === "bugs" ? "bug" : "feature"), s());
        }));
      let l = e.querySelector("[data-list]");
      if (((l.innerHTML = ee()), r.sub === "bugs")) {
        let u;
        try {
          u = await t.bugs();
        } catch (p) {
          l.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${x(String(p))}</div>`;
          return;
        }
        let d = e.querySelector('[data-sub="bugs"] .c');
        d.textContent = String(u.length);
        let g = e.querySelector('[data-sub="features"] .c');
        try {
          let p = await t.featureRequests();
          g.textContent = String(p.length);
        } catch {
          g.textContent = "?";
        }
        c(l, u);
      } else {
        let u;
        try {
          u = await t.featureRequests();
        } catch (p) {
          l.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${x(String(p))}</div>`;
          return;
        }
        let d = e.querySelector('[data-sub="features"] .c');
        d.textContent = String(u.length);
        let g = e.querySelector('[data-sub="bugs"] .c');
        try {
          let p = await t.bugs();
          g.textContent = String(p.length);
        } catch {
          g.textContent = "?";
        }
        f(l, u);
      }
    }
    function c(l, u) {
      if (u.length === 0) {
        let { html: p, wire: v } = V({
          title: "No <em>bugs</em> filed yet",
          message: "Spotted something off on this page? File a bug with a screenshot or recording.",
          actions: [
            {
              icon: "+",
              label: "File a bug",
              onClick: () => {
                ((o = "bug"), s());
              },
            },
            ...(t.hideAdminLinks
              ? []
              : [{ label: "Open dashboard", href: `${t.adminUrl}/dashboard/bugs` }]),
          ],
        });
        ((l.innerHTML = p), v(l));
        return;
      }
      let d = new Set(),
        g = () => {
          ((l.innerHTML = u
            .map(
              (p) => `
          <div class="se-feedback-row${d.has(p.id) ? " expanded" : ""}" data-id="${x(p.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${x(p.title)}</div>
              <div class="row-sub">${x(J(p.createdAt))}${p.reporterEmail ? " \xB7 " + x(p.reporterEmail) : ""}</div>
            </div>
            ${yt(p.status, sa[p.status])}
          </div>
          <div class="se-feedback-detail${d.has(p.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${x(p.pageUrl ?? "\u2014")}</span>
                <span class="k">filed</span><span>${x(J(p.createdAt))}${p.reporterEmail ? " \xB7 " + x(p.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${x(t.adminUrl)}/dashboard/bugs/${x(p.id)}">${E.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
            )
            .join("")),
            l.querySelectorAll("[data-id]").forEach((p) => {
              p.addEventListener("click", () => {
                let v = p.dataset.id;
                (d.has(v) ? d.delete(v) : d.add(v), g());
              });
            }));
        };
      g();
    }
    function f(l, u) {
      if (u.length === 0) {
        let { html: p, wire: v } = V({
          title: "No <em>feature requests</em> yet",
          message: "Capture asks from the field with importance, status, and a clean trail.",
          actions: [
            {
              icon: "+",
              label: "Request a feature",
              onClick: () => {
                ((o = "feature"), s());
              },
            },
            ...(t.hideAdminLinks
              ? []
              : [{ label: "Open dashboard", href: `${t.adminUrl}/dashboard/feature-requests` }]),
          ],
        });
        ((l.innerHTML = p), v(l));
        return;
      }
      let d = new Set(),
        g = () => {
          ((l.innerHTML = u
            .map(
              (p) => `
          <div class="se-feedback-row${d.has(p.id) ? " expanded" : ""}" data-id="${x(p.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${x(p.title)}</div>
              <div class="row-sub">${x(J(p.createdAt))}${p.reporterEmail ? " \xB7 " + x(p.reporterEmail) : ""}</div>
            </div>
            ${yt(p.importance, da[p.importance])}
            ${yt(p.status, la[p.status])}
          </div>
          <div class="se-feedback-detail${d.has(p.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${x(p.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${x(J(p.createdAt))}${p.reporterEmail ? " \xB7 " + x(p.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${x(t.adminUrl)}/dashboard/feature-requests/${x(p.id)}">${E.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
            )
            .join("")),
            l.querySelectorAll("[data-id]").forEach((p) => {
              p.addEventListener("click", () => {
                let v = p.dataset.id;
                (d.has(v) ? d.delete(v) : d.add(v), g());
              });
            }));
        };
      g();
    }
    await s();
  }
  function Sn(e, t) {
    e.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${E.arrowLeft} Back</button>
        <span class="k" style="margin-left:8px">${x(t.title)}</span>
      </div>
      <div class="bd">${t.bodyHtml}</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    </div>`;
    let n = e.querySelector(".dtf-inline-form"),
      r = !1,
      a = () => {
        if (!t.isDirty() || r) return o();
        r = !0;
        let i = document.createElement("div");
        ((i.className = "dtf-discard"),
          (i.innerHTML = `${E.alert}<span>Discard your changes?</span><span style="flex:1"></span>
      <button class="ibtn" data-action="keep">Keep editing</button>
      <button class="ibtn danger" data-action="discard">Discard</button>`),
          n.querySelector(".hd").after(i),
          i.querySelector('[data-action="keep"]').addEventListener("click", () => {
            (i.remove(), (r = !1));
          }),
          i.querySelector('[data-action="discard"]').addEventListener("click", () => o()));
      },
      o = () => {
        (document.removeEventListener("keydown", s), t.onCancel());
      },
      s = (i) => {
        i.key === "Escape" && a();
      };
    return (
      document.addEventListener("keydown", s),
      n.querySelectorAll('[data-action="cancel"]').forEach((i) => {
        i.addEventListener("click", () => a());
      }),
      n.querySelector('[data-action="submit"]').addEventListener("click", async () => {
        await t.onSubmit();
      }),
      { host: n, close: o }
    );
  }
  function ca(e) {
    let t =
        e.kind === "screenshot"
          ? '<div class="preview screenshot"></div>'
          : e.kind === "recording"
            ? `<div class="preview recording">
             <div class="play">${E.playFilled}</div>
             ${e.duration ? `<span class="dur">${ua(e.duration)}</span>` : ""}
           </div>`
            : `<div class="preview file">${E.file}<span class="ext">.${x(pa(e.filename))}</span></div>`,
      n =
        e.progress != null && e.progress < 100
          ? `<div class="progress"><div class="fill" style="width:${e.progress}%"></div></div>`
          : "",
      r = e.kind === "screenshot" ? E.camera : e.kind === "recording" ? E.record : E.file;
    return `
    <div class="se-attach-card" data-attach="${x(e.id)}">
      ${t}
      ${n}
      <button class="rm" data-remove="${x(e.id)}" title="Remove">${E.x}</button>
      <div class="meta">
        <span class="ic">${r}</span>
        <span class="name" title="${x(e.filename)}">${x(e.filename)}</span>
        <span class="size">${x(It(e.blob.size))}</span>
      </div>
    </div>`;
  }
  function pa(e) {
    let t = e.lastIndexOf(".");
    return t > 0 ? e.slice(t + 1) : "file";
  }
  function ua(e) {
    let t = Math.round(e / 1e3);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }
  function fa(e, t, n, r, a) {
    let o = [],
      s = null,
      i = `
    <div class="se-form">
      <label class="se-field">
        <span class="se-label">Title</span>
        <input class="se-input" data-field="title" placeholder="Short summary of the bug" />
      </label>
      <label class="se-field">
        <span class="se-label">Steps to reproduce</span>
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
      <div class="se-field">
        <span class="se-label">Attachments</span>
        <div class="se-actions">
          <button type="button" class="ibtn" data-action="screenshot">${E.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${E.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${E.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`,
      c = { title: "", steps: "", actual: "", expected: "" },
      f = Sn(e, {
        title: "File a bug",
        bodyHtml: i,
        isDirty: () => !!(c.title || c.steps || c.actual || c.expected || o.length),
        onSubmit: R,
        onCancel: a,
      }),
      l = f.host,
      u = l.querySelector("[data-status]"),
      d = (m, $ = !1) => {
        ((u.textContent = m), u.classList.toggle("err", $));
      },
      g = l.querySelector("[data-attach-grid]"),
      p = () => {
        ((g.innerHTML = o.map(ca).join("")),
          g.querySelectorAll("[data-remove]").forEach((m) => {
            m.addEventListener("click", ($) => {
              $.stopPropagation();
              let A = o.findIndex((O) => O.id === m.dataset.remove);
              (A >= 0 && o.splice(A, 1), p());
            });
          }));
      };
    (l.querySelectorAll("[data-field]").forEach((m) => {
      m.addEventListener("input", () => {
        c[m.dataset.field] = m.value;
      });
    }),
      l.querySelector('[data-action="screenshot"]').addEventListener("click", async () => {
        d("Pick a screen/tab to capture\u2026");
        try {
          let m = await yn(r.host);
          (d(""),
            ga(n, r, m, ($) => {
              (o.push({
                id: "at_" + Math.random().toString(36).slice(2, 7),
                kind: "screenshot",
                filename: `screenshot-${Date.now()}.png`,
                blob: $,
              }),
                p());
            }));
        } catch (m) {
          d(m instanceof Error ? m.message : String(m), !0);
        }
      }));
    let v = l.querySelector('[data-action="record"]');
    v.addEventListener("click", async () => {
      if (s) {
        try {
          ((v.disabled = !0), d("Finalizing recording\u2026"));
          let m = await s.stop();
          ((s = null),
            v.classList.remove("recording"),
            (v.innerHTML = `${E.record} Record screen`),
            o.push({
              id: "at_" + Math.random().toString(36).slice(2, 7),
              kind: "recording",
              filename: `recording-${Date.now()}.webm`,
              blob: m,
            }),
            p(),
            d(""));
        } catch (m) {
          d(m instanceof Error ? m.message : String(m), !0);
        } finally {
          v.disabled = !1;
        }
        return;
      }
      d("Pick a screen/tab to record\u2026");
      try {
        ((s = await wn(r.host)),
          v.classList.add("recording"),
          (v.innerHTML = `${E.record} Stop recording`),
          d("Recording\u2026"));
      } catch (m) {
        (d(m instanceof Error ? m.message : String(m), !0), (s = null));
      }
    });
    let w = l.querySelector('[data-action="file-input"]');
    (l.querySelector('[data-action="upload"]').addEventListener("click", () => w.click()),
      w.addEventListener("change", () => {
        let m = w.files?.[0];
        m &&
          (o.push({
            id: "at_" + Math.random().toString(36).slice(2, 7),
            kind: "file",
            filename: m.name,
            blob: m,
          }),
          (w.value = ""),
          p());
      }));
    async function R() {
      if (!c.title.trim()) {
        d("Title is required", !0);
        return;
      }
      d("Submitting\u2026");
      try {
        let m = await t.createBug({
          title: c.title.trim(),
          stepsToReproduce: c.steps,
          actualResult: c.actual,
          expectedResult: c.expected,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
        for (let $ = 0; $ < o.length; $++) {
          let A = o[$];
          (d(`Uploading ${$ + 1}/${o.length}\u2026`),
            await t.uploadAttachment({
              reportKind: "bug",
              reportId: m.id,
              kind: A.kind,
              filename: A.filename,
              blob: A.blob,
            }));
        }
        f.close();
      } catch (m) {
        d(m instanceof Error ? m.message : String(m), !0);
      }
    }
  }
  function ga(e, t, n, r) {
    let a = document.createElement("div");
    ((a.className = "dtf-modal-bg"),
      (a.innerHTML = `
    <div class="dtf-modal lg">
      <div class="hd">
        <span class="k">Annotate screenshot</span>
        <button class="x" data-action="close">${E.x}</button>
      </div>
      <div class="bd" data-host>Preparing annotator\u2026</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="close">Cancel</button>
        <button class="primary" data-action="save">Use screenshot</button>
      </div>
    </div>`),
      e.appendChild(a));
    let o = () => a.remove();
    (a.querySelectorAll('[data-action="close"]').forEach((i) => i.addEventListener("click", o)),
      a.addEventListener("click", (i) => {
        i.target === a && o();
      }));
    let s = a.querySelector("[data-host]");
    En(n)
      .then((i) => {
        ((s.innerHTML = ""),
          s.appendChild(i.root),
          a.querySelector('[data-action="save"]').addEventListener("click", async () => {
            let c = await i.export();
            (o(), r(c));
          }));
      })
      .catch((i) => {
        s.innerHTML = `<div class="err">${x(String(i))}</div>`;
      });
  }
  function va(e, t, n) {
    let r = { title: "", description: "", useCase: "", importance: "nice_to_have" },
      o = Sn(e, {
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
        isDirty: () => !!(r.title || r.description || r.useCase || r.importance !== "nice_to_have"),
        onSubmit: f,
        onCancel: n,
      }),
      s = o.host,
      i = s.querySelector("[data-status]"),
      c = (l, u = !1) => {
        ((i.textContent = l), i.classList.toggle("err", u));
      };
    s.querySelectorAll("[data-field]").forEach((l) => {
      (l.addEventListener("input", () => {
        r[l.dataset.field] = l.value;
      }),
        l.addEventListener("change", () => {
          r[l.dataset.field] = l.value;
        }));
    });
    async function f() {
      if (!r.title.trim()) {
        c("Title is required", !0);
        return;
      }
      c("Submitting\u2026");
      try {
        (await t.createFeatureRequest({
          title: r.title.trim(),
          description: r.description,
          useCase: r.useCase,
          importance: r.importance,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
          o.close());
      } catch (l) {
        c(l instanceof Error ? l.message : String(l), !0);
      }
    }
  }
  var ma = 200,
    Ee = [];
  function ba(e, t) {
    (Ee.push({ ts: Date.now(), level: e, message: t }), Ee.length > ma && Ee.shift());
  }
  typeof window < "u" &&
    window.addEventListener("se:state:update", (e) => {
      let t = e.detail,
        n = "state update";
      if (t && typeof t == "object")
        try {
          n = JSON.stringify(t).slice(0, 200);
        } catch {}
      ba("log", n);
    });
  function ha(e, t) {
    let n = e - t;
    return n < 1e3 ? `${n}ms` : n < 6e4 ? `${(n / 1e3).toFixed(1)}s` : `${Math.floor(n / 6e4)}m`;
  }
  function $n(e) {
    if (Ee.length === 0) {
      let { html: r, wire: a } = V({
        title: "No <em>events</em> yet",
        message:
          "SDK evaluations and overrides will stream here as the page interacts with ShipEasy.",
      });
      ((e.innerHTML = r), a(e));
      return;
    }
    let t = Date.now(),
      n = Ee.slice().reverse();
    e.innerHTML =
      `<div class="dtf-group">Live event stream<span class="pulse"><span class="d"></span>${n.length}/buf</span></div>` +
      n
        .map(
          (r) => `
      <div class="dtf-event">
        <span class="ts">${ha(t, r.ts)} ago</span>
        <span class="lvl${r.level === "warn" ? " warn" : r.level === "err" ? " err" : ""}">${r.level === "warn" ? "!" : r.level === "err" ? "\xD7" : "\u203A"}</span>
        <span class="msg">${x(r.message)}</span>
        <span class="ms"></span>
      </div>`,
        )
        .join("");
  }
  var _n = "shipeasy_hide_admin_links";
  function Tn(e, t) {
    return t
      ? t === "*"
        ? !0
        : t.startsWith("*.")
          ? e.endsWith(t.slice(1))
          : e === t || e === `www.${t}`
      : !1;
  }
  var Mn = "sdk_client_6cecf6208cb443faa86b9ce6c007aee4",
    xa = "https://cdn.shipeasy.ai",
    ya = { hideAdminLinks: !1 },
    wt = { ...ya },
    Le = null,
    kt = new Set();
  function Rn() {
    return wt;
  }
  function An(e) {
    return (kt.add(e), () => kt.delete(e));
  }
  function Pn() {
    return Mn
      ? Le ||
          ((Le = (async () => {
            try {
              let e = await fetch(`${xa}/sdk/evaluate`, {
                method: "POST",
                headers: { "X-SDK-Key": Mn, "Content-Type": "application/json" },
                body: JSON.stringify({ user: {} }),
              });
              if (!e.ok) return;
              let r = { hideAdminLinks: !!((await e.json()).flags ?? {})[_n] },
                a = r.hideAdminLinks !== wt.hideAdminLinks;
              if (((wt = r), a)) for (let o of kt) o();
            } catch {
            } finally {
              Le = null;
            }
          })()),
          Le)
      : Promise.resolve();
  }
  var wa = {
      gates: "gates",
      configs: "configs",
      experiments: "experiments",
      labels: "translations",
      feedback: "feedback",
      user: "user",
      events: "events",
    },
    fe = [
      { k: "user", label: "User", icon: E.users, description: "props \xB7 impersonate" },
      { k: "gates", label: "Gates", icon: E.shield, description: "flags & killswitches" },
      { k: "experiments", label: "Experiments", icon: E.flask, description: "A/B variants" },
      { k: "configs", label: "Configs", icon: E.sliders, description: "remote values" },
      { k: "labels", label: "Translations", icon: E.book, description: "i18n strings" },
      { k: "feedback", label: "Feedback", icon: E.bug, description: "bugs + requests" },
      { k: "events", label: "Events", icon: E.activity, description: "live stream" },
    ],
    Et = "se_dt_project",
    In = "se_l_overlay",
    Lt = "se_l_active_panel",
    ka = 24,
    Ea = 56,
    Cn = { edge: "right", offsetPct: 50, railIconSize: 32, collapsed: !1 };
  function La() {
    try {
      let e = sessionStorage.getItem(Et);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Ue(e) {
    try {
      e === null ? sessionStorage.removeItem(Et) : sessionStorage.setItem(Et, JSON.stringify(e));
    } catch {}
  }
  function Sa() {
    try {
      let e = localStorage.getItem(In);
      if (e) return { ...Cn, ...JSON.parse(e) };
    } catch {}
    return { ...Cn };
  }
  function ae(e) {
    try {
      localStorage.setItem(In, JSON.stringify(e));
    } catch {}
  }
  var $a = new Set(["user", "gates", "experiments", "configs", "labels", "feedback", "events"]);
  function Hn() {
    try {
      let e = sessionStorage.getItem(Lt);
      if (e && $a.has(e)) return e;
    } catch {}
    return null;
  }
  function Se(e) {
    try {
      e === null ? sessionStorage.removeItem(Lt) : sessionStorage.setItem(Lt, e);
    } catch {}
  }
  function _a() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  function Ta(e, t) {
    return (
      e.translations === t.translations &&
      e.configs === t.configs &&
      e.gates === t.gates &&
      e.experiments === t.experiments &&
      e.feedback === t.feedback
    );
  }
  function On(e) {
    return !!(e.hideAdminLinks || Rn().hideAdminLinks);
  }
  function qn(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" }),
      r = document.createElement("style");
    ((r.textContent = _e), n.appendChild(r));
    let a = document.createElement("div");
    n.appendChild(a);
    let o = Sa(),
      s = Hn(),
      i = St(),
      c = La();
    c && i && c.id !== i.projectId && ((c = null), Ue(null));
    let f = {
        user: { view: "all", search: "" },
        gates: { view: "page", search: "" },
        experiments: { view: "page", search: "" },
        configs: { view: "page", search: "" },
        labels: { view: "page", search: "" },
        feedback: { view: "all", search: "" },
        events: { view: "all", search: "" },
      },
      l = "en-US",
      u = "bugs",
      d = { props: {}, dirty: {} },
      g = { user: 0, gates: 0, experiments: 0, configs: 0, labels: 0, feedback: 0, events: 0 };
    function p() {
      return Object.values(g).reduce((h, k) => h + k, 0);
    }
    function v(h) {
      let k = wa[h];
      return k ? (c ? c.modules[k] : !i) : !0;
    }
    function w(h) {
      let k = window.innerWidth,
        B = window.innerHeight,
        { edge: P, offsetPct: q, collapsed: L } = o,
        S = h.style;
      if (((S.top = S.bottom = S.left = S.right = S.transform = ""), (h.dataset.edge = P), L))
        P === "right"
          ? ((S.right = "10px"), (S.top = `${q}%`), (S.transform = "translateY(-50%)"))
          : P === "left"
            ? ((S.left = "10px"), (S.top = `${q}%`), (S.transform = "translateY(-50%)"))
            : P === "top"
              ? ((S.top = "10px"), (S.left = `${q}%`), (S.transform = "translateX(-50%)"))
              : ((S.bottom = "10px"), (S.left = `${q}%`), (S.transform = "translateX(-50%)"));
      else {
        let U = B - 36;
        P === "right"
          ? ((S.right = "12px"), (S.top = "18px"))
          : P === "left"
            ? ((S.left = "12px"), (S.top = "18px"))
            : P === "top"
              ? ((S.top = "12px"), (S.right = "18px"))
              : ((S.bottom = "12px"), (S.right = "18px"));
      }
    }
    function R(h, k) {
      let B = window.innerWidth,
        P = window.innerHeight,
        q = [
          [B - h, "right"],
          [h, "left"],
          [k, "top"],
          [P - k, "bottom"],
        ];
      q.sort((U, K) => U[0] - K[0]);
      let L = q[0][1],
        I = Math.max(
          5,
          Math.min(95, L === "left" || L === "right" ? (k / P) * 100 : (h / B) * 100),
        );
      return { edge: L, offsetPct: I };
    }
    function m() {
      let h = document.createElement("div");
      for (
        h.className = o.collapsed ? "dtf-panel collapsed" : "dtf-panel",
          h.setAttribute("data-edge", o.edge);
        a.firstChild;
      )
        a.removeChild(a.firstChild);
      (a.appendChild(h), w(h), o.collapsed ? $(h) : O(h));
    }
    function $(h) {
      let k = o.railIconSize,
        B = i
          ? fe
              .filter((I) => v(I.k))
              .map((I) => {
                let U = g[I.k] > 0;
                return (
                  `<button class="ri" data-tab="${I.k}" style="width:${k}px;height:${k}px">` +
                  I.icon.replace(
                    "<svg ",
                    `<svg width="${Math.round(k * 0.5)}" height="${Math.round(k * 0.5)}" `,
                  ) +
                  (U ? '<span class="dotw"></span>' : "") +
                  `<span class="tip">${I.label}</span></button>`
                );
              })
              .join("")
          : `<button class="ri lock-only" data-tab="__lock__" style="width:${k}px;height:${k}px" title="">` +
            E.lock.replace(
              "<svg ",
              `<svg width="${Math.round(k * 0.5)}" height="${Math.round(k * 0.5)}" `,
            ) +
            '<span class="tip tip-multi"><b>Devtools locked</b>Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.<span class="hint">Click to connect \u2192</span></span></button>',
        P =
          `<div class="dtf-panel-rail"><div class="mk" title="Drag to reposition \xB7 click to expand" style="width:${k * 0.7}px;height:${k * 0.7}px"></div>` +
          B +
          `<div class="dtf-rail-resize" style="width:${o.edge === "right" || o.edge === "left" ? k : 12}px;height:${o.edge === "right" || o.edge === "left" ? 12 : k}px" title="Drag to resize"></div></div>`;
      h.innerHTML = P;
      let q = h.querySelector(".mk"),
        L = !1;
      (q.addEventListener("mousedown", (I) => {
        (I.preventDefault(), (L = !1));
        let U = I.clientX,
          K = I.clientY;
        q.classList.add("dragging");
        let Z = (H) => {
            Math.hypot(H.clientX - U, H.clientY - K) > 4 && (L = !0);
            let { edge: F, offsetPct: Y } = R(H.clientX, H.clientY);
            ((o = { ...o, edge: F, offsetPct: Y }), w(h), h.setAttribute("data-edge", F));
          },
          X = () => {
            (q.classList.remove("dragging"),
              document.removeEventListener("mousemove", Z),
              document.removeEventListener("mouseup", X),
              ae(o));
          };
        (document.addEventListener("mousemove", Z), document.addEventListener("mouseup", X));
      }),
        q.addEventListener("click", () => {
          L || ((o = { ...o, collapsed: !1 }), ae(o), m());
        }),
        h.querySelectorAll(".ri").forEach((I) => {
          I.addEventListener("click", () => {
            let U = I.dataset.tab;
            (U !== "__lock__" && ((s = U), Se(s)), (o = { ...o, collapsed: !1 }), ae(o), m());
          });
        }));
      let S = h.querySelector(".dtf-rail-resize");
      S.addEventListener("mousedown", (I) => {
        (I.preventDefault(), I.stopPropagation());
        let U = o.edge === "right" || o.edge === "left",
          K = I.clientX,
          Z = I.clientY,
          X = o.railIconSize;
        S.classList.add("dragging");
        let H = (Y) => {
            let $e = U ? Y.clientY - Z : Y.clientX - K,
              Fe = Math.max(ka, Math.min(Ea, Math.round(X + $e)));
            ((o = { ...o, railIconSize: Fe }), m());
          },
          F = () => {
            (S.classList.remove("dragging"),
              document.removeEventListener("mousemove", H),
              document.removeEventListener("mouseup", F),
              ae(o));
          };
        (document.addEventListener("mousemove", H), document.addEventListener("mouseup", F));
      });
    }
    function A(h) {
      let k = window.location.host;
      h.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${Ne(k)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${E.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${E.lock}
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
              <div class="ic-big">${E.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${E.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${E.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${E.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${E.book}</span><span class="k">Edit translations in-place</span></div>
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
      let B = h.querySelector(".dtf-head .mk");
      (B.addEventListener("mousedown", (S) => {
        (S.preventDefault(), B.classList.add("dragging"));
        let I = (K) => {
            let { edge: Z, offsetPct: X } = R(K.clientX, K.clientY);
            ((o = { ...o, edge: Z, offsetPct: X }), w(h));
          },
          U = () => {
            (B.classList.remove("dragging"),
              document.removeEventListener("mousemove", I),
              document.removeEventListener("mouseup", U),
              ae(o));
          };
        (document.addEventListener("mousemove", I), document.addEventListener("mouseup", U));
      }),
        h.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((o = { ...o, collapsed: !0 }), ae(o), m());
        }));
      let P = h.querySelector('[data-action="connect"]'),
        q = h.querySelector("[data-status]"),
        L = h.querySelector("[data-err]");
      P.addEventListener("click", async () => {
        ((P.disabled = !0),
          (P.innerHTML = '<span class="spin"></span> Opening\u2026'),
          (q.textContent = ""),
          (L.style.display = "none"),
          (L.textContent = ""));
        try {
          ((i = await $t(e, () => {
            ((q.textContent = "Waiting for approval in the opened tab\u2026"),
              (P.innerHTML = '<span class="spin"></span> Waiting for approval'));
          })),
            (s = fe.find((S) => v(S.k))?.k ?? "gates"),
            Se(s),
            m());
        } catch (S) {
          ((L.textContent = S instanceof Error ? S.message : String(S)),
            (L.style.display = "block"),
            (q.textContent = ""),
            (P.disabled = !1),
            (P.textContent = "Retry connect \u2192"));
        }
      });
    }
    function O(h) {
      if (!i) {
        A(h);
        return;
      }
      let k = s && s !== "__lock__" ? s : (fe.find((H) => v(H.k))?.k ?? "gates");
      s !== k && ((s = k), Se(k));
      let B = fe.find((H) => H.k === k),
        P = c?.name ?? "",
        q = window.location.host,
        L = P || q,
        S = fe
          .filter((H) => v(H.k))
          .map((H) => {
            let F = H.k === k,
              Y = g[H.k] > 0;
            return (
              `<button class="t${F ? " active" : ""}" data-tab="${H.k}" title="${H.label}">` +
              H.icon +
              (Y ? '<span class="dotw"></span>' : "") +
              `<span class="tip">${H.label}</span></button>`
            );
          })
          .join(""),
        I = ["gates", "experiments", "configs", "labels"].includes(k),
        U = f[k],
        K =
          p() > 0
            ? '<div class="dtf-overbar">' +
              E.alert +
              `<span><b>${p()} session override${p() > 1 ? "s" : ""}</b> \xB7 cleared on refresh</span><button data-action="clear-overrides">Clear all</button></div>`
            : "",
        Z = I
          ? `<div class="dtf-search">
          <div class="input">
            ${E.search}
            <input placeholder="Filter ${k}\u2026" value="${Ma(U.search)}" />
            ${U.search ? '<span class="kbd" data-action="clear-search">esc</span>' : '<span class="kbd">\u2318K</span>'}
          </div>
          <div class="seg">
            <button class="${U.view === "page" ? "active" : ""}" data-view="page">page</button>
            <button class="${U.view === "all" ? "active" : ""}" data-view="all">all</button>
          </div>
          ${k === "labels" ? '<select class="dtf-locale-sel" data-locale></select>' : ""}
        </div>`
          : "";
      h.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${Ne(B.label)}</span>
          <span class="sub">${Ne(L)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${E.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${E.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${S}</div>
        <div class="dtf-pane">
          ${K}
          ${Z}
          <div class="dtf-body" id="dtf-body"></div>
        </div>
      </div>
      <div class="dtf-foot">
        <div class="stat-line">
          <span class="ok"></span>
          <span class="stat">SDK <b>connected</b></span>
          ${i ? "" : '<span class="sk">unauthed</span>'}
        </div>
        <div class="actions">
          <button class="ibtn" data-action="share" title="Build a URL that applies the current overrides">Copy share URL</button>
          <button class="ibtn" data-action="apply-url" title="Persist current overrides to the URL and reload">Pin to URL</button>
          <span class="grow"></span>
          ${p() > 0 ? '<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>' : ""}
          ${i ? '<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>' : ""}
        </div>
      </div>
    `;
      let X = h.querySelector(".dtf-head .mk");
      if (
        (X.addEventListener("mousedown", (H) => {
          (H.preventDefault(), X.classList.add("dragging"));
          let F = ($e) => {
              let { edge: Fe, offsetPct: Dn } = R($e.clientX, $e.clientY);
              ((o = { ...o, edge: Fe, offsetPct: Dn }), w(h));
            },
            Y = () => {
              (X.classList.remove("dragging"),
                document.removeEventListener("mousemove", F),
                document.removeEventListener("mouseup", Y),
                ae(o));
            };
          (document.addEventListener("mousemove", F), document.addEventListener("mouseup", Y));
        }),
        h.querySelector('[data-action="refresh"]').addEventListener("click", () => m()),
        h.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((o = { ...o, collapsed: !0 }), ae(o), m());
        }),
        h.querySelectorAll(".dtf-rail .t").forEach((H) => {
          H.addEventListener("click", () => {
            ((s = H.dataset.tab), Se(s), m());
          });
        }),
        I)
      ) {
        let H = h.querySelector(".dtf-search input");
        (H.addEventListener("input", () => {
          ((f[k].search = H.value), M());
        }),
          h.querySelectorAll(".dtf-search .seg button").forEach((F) => {
            F.addEventListener("click", () => {
              ((f[k].view = F.dataset.view), m());
            });
          }),
          h.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
            ((f[k].search = ""), m());
          }));
      }
      (h.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
        Ct();
      }),
        h.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
          Ht();
        }),
        h.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
          let H = Qe({ ...et(), openDevtools: !0 }),
            F = h.querySelector('[data-action="share"]');
          try {
            await navigator.clipboard.writeText(H);
            let Y = F.textContent;
            ((F.textContent = "Copied \u2713"), setTimeout(() => (F.textContent = Y), 1500));
          } catch {
            prompt("Copy this URL:", H);
          }
        }),
        h.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
          (Je(), Ue(null), (i = null), (c = null), m());
        }),
        M());
    }
    function M() {
      let h = a.querySelector("#dtf-body");
      if (!h || !i) return;
      let k = new me(e.adminUrl, i.token, i.projectId, On(e));
      C(k);
      let B = s,
        P = f[B],
        q = (L) => {
          let S = g[B];
          ((g[B] = L), ((S === 0) != (L === 0) || S !== L) && T());
        };
      switch (B) {
        case "user":
          qt(h, k, d, () => m());
          break;
        case "gates":
          Bt(h, k, P, q);
          break;
        case "experiments":
          zt(h, k, P, q);
          break;
        case "configs":
          jt(h, k, P, q, a);
          break;
        case "labels":
          hn(h, k, P, n, {
            locale: l,
            setLocale: (L) => {
              ((l = L), M());
            },
          });
          break;
        case "feedback":
          Ln(h, k, a, {
            sub: u,
            setSub: (L) => {
              ((u = L), M());
            },
          });
          break;
        case "events":
          $n(h);
          break;
      }
    }
    function T() {
      m();
    }
    async function C(h) {
      try {
        let k = await h.project(),
          B = window.location.host;
        if (!(_a() !== null) && k.domain && !Tn(B, k.domain)) {
          (Je(), Ue(null), (i = null), (c = null), m());
          return;
        }
        let q = c;
        if (((c = k), Ue(k), s && !v(s))) {
          let L = fe.find((S) => v(S.k))?.k ?? null;
          ((s = L), Se(L), m());
          return;
        }
        (!q || !Ta(q.modules, k.modules)) && m();
      } catch {}
    }
    document.documentElement.appendChild(t);
    let W = () => {
        document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
      },
      G = new MutationObserver(W);
    if (
      (G.observe(document.documentElement, { childList: !0 }),
      se() && (we(), ke(!0, n, () => {})),
      Hn() || (o = { ...o, collapsed: !0 }),
      m(),
      i)
    ) {
      let h = new me(e.adminUrl, i.token, i.projectId, On(e));
      C(h);
    }
    Pn();
    let b = An(() => m()),
      y = () => {
        let h = a.querySelector(".dtf-panel");
        h && w(h);
      };
    window.addEventListener("resize", y);
    let _ = () => M();
    return (
      window.addEventListener("se:state:update", _),
      {
        destroy() {
          (window.removeEventListener("resize", y),
            window.removeEventListener("se:state:update", _),
            b(),
            G.disconnect(),
            t.remove());
        },
      }
    );
  }
  function Ne(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Ma(e) {
    return Ne(e);
  }
  var Ra = "https://shipeasy.ai";
  function Bn(e) {
    return (
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|$)/i.test(e) ||
      e === "file://" ||
      e === "null"
    );
  }
  function Aa() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          let n = new URL(e.src).origin;
          if (!Bn(n)) return n;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let n of Array.from(t))
        if (n.src.includes("se-devtools.js"))
          try {
            let r = new URL(n.src).origin;
            if (!Bn(r)) return r;
          } catch {}
    }
    return Ra;
  }
  var ge = null,
    Ke = null;
  function zn(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (ge) {
      if (document.getElementById("shipeasy-devtools")) return;
      ge = null;
    }
    Ke || (Ke = Ot());
    let t = { adminUrl: e.adminUrl ?? Aa(), hideAdminLinks: e.hideAdminLinks ?? !1 },
      { destroy: n } = qn(t);
    ge = n;
  }
  function Pa() {
    (ge?.(), (ge = null), Ke?.(), (Ke = null));
  }
  function jn(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    Ae() && zn(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      a = n.includes("Shift"),
      o = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      i = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function f(l) {
      (c ? l.code === c : l.key.toLowerCase() === r.toLowerCase()) &&
        l.shiftKey === a &&
        l.altKey === o &&
        l.ctrlKey === s &&
        l.metaKey === i &&
        (ge ? Pa() : zn(e));
    }
    return (window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => jn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      se())
    ) {
      let n = !1,
        r = new MutationObserver(() => a()),
        a = () => {
          n ||
            ((n = !0),
            requestAnimationFrame(() => {
              ((n = !1),
                r.disconnect(),
                we(),
                r.observe(document.body, { childList: !0, subtree: !0, attributes: !0 }));
            }));
        },
        o = () => {
          requestAnimationFrame(() => requestAnimationFrame(() => a()));
        };
      document.readyState === "complete" ? o() : window.addEventListener("load", o, { once: !0 });
      let s = () => {
        let c = document.getElementById("shipeasy-devtools");
        if (!c?.shadowRoot) {
          setTimeout(s, 100);
          return;
        }
        ke(!0, c.shadowRoot, () => a());
      };
      (s(), window.addEventListener("se:i18n:ready", () => a(), { once: !0 }));
      let i = window;
      i.i18n?.on && i.i18n.on("update", () => a());
    }
    window.__se_devtools_ready = !0;
  }
})();
