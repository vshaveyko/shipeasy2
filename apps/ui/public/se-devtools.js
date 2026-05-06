"use strict";
(() => {
  var Qt = Object.create;
  var ge = Object.defineProperty;
  var en = Object.getOwnPropertyDescriptor;
  var tn = Object.getOwnPropertyNames;
  var nn = Object.getPrototypeOf,
    rn = Object.prototype.hasOwnProperty;
  var on = (e, t, n) =>
    t in e ? ge(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var sn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var an = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of tn(t))
        !rn.call(e, o) &&
          o !== n &&
          ge(e, o, { get: () => t[o], enumerable: !(r = en(t, o)) || r.enumerable });
    return e;
  };
  var ln = (e, t, n) => (
    (n = e != null ? Qt(nn(e)) : {}),
    an(t || !e || !e.__esModule ? ge(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var $ = (e, t, n) => on(e, typeof t != "symbol" ? t + "" : t, n);
  var Lt = sn((Jr, kt) => {
    "use strict";
    var Pe = Object.defineProperty,
      wn = Object.getOwnPropertyDescriptor,
      En = Object.getOwnPropertyNames,
      kn = Object.prototype.hasOwnProperty,
      Ln = (e, t) => {
        for (var n in t) Pe(e, n, { get: t[n], enumerable: !0 });
      },
      Sn = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of En(t))
            !kn.call(e, o) &&
              o !== n &&
              Pe(e, o, { get: () => t[o], enumerable: !(r = wn(t, o)) || r.enumerable });
        return e;
      },
      _n = (e) => Sn(Pe({}, "__esModule", { value: !0 }), e),
      ft = {};
    Ln(ft, {
      FlagsClientBrowser: () => gt,
      LABEL_MARKER_END: () => wt,
      LABEL_MARKER_RE: () => zn,
      LABEL_MARKER_SEP: () => xt,
      LABEL_MARKER_START: () => yt,
      _resetShipeasyForTests: () => Nn,
      attachDevtools: () => vt,
      configureShipeasy: () => He,
      encodeLabelMarker: () => Et,
      flags: () => bt,
      getShipeasyClient: () => Dn,
      i18n: () => er,
      isDevtoolsRequested: () => Me,
      labelAttrs: () => Kn,
      loadDevtools: () => Re,
      readConfigOverride: () => Oe,
      readExpOverride: () => mt,
      readGateOverride: () => Ce,
      shipeasy: () => ht,
      version: () => Tn,
    });
    kt.exports = _n(ft);
    var Tn = "1.0.0",
      Mn = 5e3,
      Rn = 100,
      dt = "__se_anon_id",
      ct = "__se_seen",
      Y = "__se_pending_alias",
      An = class {
        constructor(e, t) {
          $(this, "collectUrl");
          $(this, "sdkKey");
          $(this, "queue", []);
          $(this, "exposureSeen", new Set());
          $(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), Mn)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(ct);
              n && (this.exposureSeen = new Set(JSON.parse(n)));
            } catch {}
          }
        }
        destroy() {
          this.timer !== null && (clearInterval(this.timer), (this.timer = null));
        }
        pushExposure(e, t, n, r) {
          let o = `${n || r}:${e}`;
          if (!this.exposureSeen.has(o)) {
            this.exposureSeen.add(o);
            try {
              sessionStorage.setItem(ct, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(Y, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(Y);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(Y);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(Y);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(Y));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= Rn && this.flush());
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
      de = 5;
    function $n(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
        l = !1;
      try {
        new PerformanceObserver((v) => {
          let f = v.getEntries();
          f.length && (r = f[f.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let f of v.getEntries()) {
            let d = f.duration ?? 0;
            (o === null || d > o) && (o = d);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let f of v.getEntries()) f.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let c = window.onerror;
      ((window.onerror = (y, v, f, d, h) => (
        a < de &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof y == "string" ? y.slice(0, 200) : String(h ?? "").slice(0, 200),
            source: typeof v == "string" ? v.slice(0, 200) : "",
            line: f ?? 0,
          })),
        typeof c == "function" ? c(y, v, f, d, h) : !1
      )),
        window.addEventListener("unhandledrejection", (y) => {
          if (a < de) {
            a += 1;
            let v = y.reason,
              f = v instanceof Error ? v.message : typeof v == "string" ? v : String(v);
            e.pushMetric("__auto_js_error", t, n, {
              value: 1,
              kind: "unhandled_rejection",
              message: f.slice(0, 200),
            });
          }
        }));
      let g = window.fetch;
      window.fetch = async function (...y) {
        let v = typeof performance < "u" ? performance.now() : 0,
          f = typeof y[0] == "string" ? y[0] : y[0].toString(),
          d;
        try {
          d = await g.apply(this, y);
        } catch (h) {
          throw (
            s < de &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, n, {
                value: 1,
                kind: "network",
                status: 0,
                url: f.slice(0, 200),
              })),
            h
          );
        }
        if (d.status >= 500 && s < de) {
          s += 1;
          let h = typeof performance < "u" ? performance.now() - v : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: d.status,
            url: f.slice(0, 200),
            duration_ms: Math.round(h),
          });
        }
        return d;
      };
      let p = () => {
        if (!l) {
          l = !0;
          try {
            let v = performance.getEntriesByType("navigation")[0];
            if (v) {
              let d = v.startTime ?? 0;
              (v.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, n, { value: v.loadEventEnd - d }),
                v.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, n, { value: v.responseStart - d }),
                v.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, n, {
                    value: v.domContentLoadedEventEnd - d,
                  }));
            }
            let f = performance.getEntriesByType("paint");
            for (let d of f)
              d.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, n, { value: d.startTime })
                : d.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, n, { value: d.startTime });
          } catch {}
        }
      };
      document.readyState === "complete"
        ? setTimeout(p, 0)
        : window.addEventListener(
            "load",
            () => {
              setTimeout(p, 0);
            },
            { once: !0 },
          );
      let w = () => {
        (p(),
          r !== null && e.pushMetric("__auto_lcp", t, n, { value: r }),
          o !== null && e.pushMetric("__auto_inp", t, n, { value: o }),
          i && e.pushMetric("__auto_cls_binary", t, n, { value: 1 }));
        let y = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: y }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && w();
      });
    }
    function Pn() {
      try {
        let t = localStorage.getItem(dt);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(dt, e);
      } catch {}
      return e;
    }
    function Cn() {
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
    function On() {
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
    var gt = class {
        constructor(e) {
          $(this, "sdkKey");
          $(this, "baseUrl");
          $(this, "autoGuardrails");
          $(this, "env");
          $(this, "evalResult", null);
          $(this, "anonId");
          $(this, "userId", "");
          $(this, "buffer");
          $(this, "guardrailsInstalled", !1);
          $(this, "listeners", new Set());
          $(this, "overrideListenerInstalled", !1);
          $(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = Pn()),
            (this.buffer = new An(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...Cn(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: On() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), $n(this.buffer, this.userId, this.anonId)),
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
          let t = Ce(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = Oe(e),
            r = n !== void 0 ? n : this.evalResult.configs?.[e];
          if (r !== void 0) {
            if (!t) return r;
            try {
              return t(r);
            } catch (o) {
              console.warn(`[shipeasy] getConfig('${e}') decode failed:`, String(o));
              return;
            }
          }
        }
        getExperiment(e, t, n, r) {
          let o = { inExperiment: !1, group: "control", params: t },
            i = mt(e);
          if (i !== null) {
            let s = r?.[i],
              l = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: i, params: l };
          }
          let a = this.evalResult?.experiments[e];
          if (!a || !a.inExperiment) return o;
          if ((this.buffer.pushExposure(e, a.group, this.userId, this.anonId), !n))
            return { inExperiment: !0, group: a.group, params: a.params };
          try {
            return { inExperiment: !0, group: a.group, params: n(a.params) };
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
      Hn = /^(true|on|1|yes)$/i,
      Bn = /^(false|off|0|no)$/i;
    function In(e) {
      return Hn.test(e) ? !0 : Bn.test(e) ? !1 : null;
    }
    function qn(e) {
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
    function Z(e, t) {
      if (typeof window > "u" || !window.location) return null;
      let n = new URLSearchParams(window.location.search),
        r = n.get(e);
      if (r !== null) return r;
      if (t) {
        let o = n.get(t);
        if (o !== null) return o;
      }
      return null;
    }
    function Ce(e) {
      let t = Z(`se_ks_${e}`) ?? Z(`se_gate_${e}`) ?? Z(`se-gate-${e}`);
      return t === null ? null : In(t);
    }
    function Oe(e) {
      let t = Z(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return qn(t);
    }
    function mt(e) {
      let t = Z(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function Me() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function Re(e = {}) {
      if (typeof window > "u") return;
      let n = window.__shipeasy_devtools_global;
      if (!n) return;
      n.init(e);
      let r = window;
      if (!r.__shipeasy_devtools) {
        let o = !0;
        r.__shipeasy_devtools = {
          toggle() {
            o ? (n.destroy(), (o = !1)) : (n.init(e), (o = !0));
          },
        };
      }
    }
    function vt(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = r[r.length - 1],
        i = r.includes("Shift"),
        a = r.includes("Alt"),
        s = r.includes("Ctrl") || r.includes("Control"),
        l = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), Me() && Re({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let c = Me();
      function g(w) {
        w.key === o &&
          w.shiftKey === i &&
          w.altKey === a &&
          w.ctrlKey === s &&
          w.metaKey === l &&
          (c
            ? window.__shipeasy_devtools?.toggle()
            : ((c = !0), Re({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", g);
      let p = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", g), p());
      };
    }
    var C = null;
    function ht(e) {
      let t = He({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (bt.notifyMounted(), vt(t, { adminUrl: e.adminUrl }));
    }
    function He(e) {
      return C || ((C = new gt(e)), C);
    }
    function Dn() {
      return C;
    }
    function Nn() {
      (C?.destroy(), (C = null));
    }
    function ut() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var Se = !1,
      Ae = new Set(),
      pt = !1;
    function Un() {
      pt ||
        typeof window > "u" ||
        ((pt = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of Ae) e();
        }));
    }
    var bt = {
        configure(e) {
          He(e);
        },
        identify(e) {
          return C
            ? C.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = ut();
          return t !== null && e in t.flags
            ? t.flags[e]
            : Se
              ? C
                ? C.getFlag(e)
                : (Ce(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = ut();
          if (n !== null && e in n.configs) {
            let o = n.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!Se) return;
          if (C) return C.getConfig(e, t);
          let r = Oe(e);
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
          return C?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          C?.track(e, t);
        },
        flush() {
          return C?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((Se = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return C ? C.subscribe(e) : (Ae.add(e), Un(), () => Ae.delete(e));
        },
        get ready() {
          return C?.ready ?? !1;
        },
      },
      yt = "\uFFF9",
      xt = "\uFFFA",
      wt = "\uFFFB",
      zn = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function Et(e, t) {
      return `${yt}${e}${xt}${t}${wt}`;
    }
    function Kn(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var Fn = null,
      jn = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      Wn = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function Gn() {
      return globalThis[jn]?.() ?? null;
    }
    function Jn() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[Wn];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function ce(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let o = t[r];
            return o != null ? String(o) : n;
          })
        : e;
    }
    var Vn = typeof document < "u",
      Xn = [
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
    function Yn() {
      let e = {};
      for (let t of Xn)
        e[t] = Vn
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var Zn = Yn(),
      $e = {},
      _e = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function Qn(e, t) {
      let n = [],
        r = 0,
        o,
        i = !0;
      for (_e.lastIndex = 0; (o = _e.exec(e)) !== null; ) {
        o.index > r && n.push(e.slice(r, o.index));
        let a = o[1],
          s = o[2] ?? "",
          l = t[a] ?? $e[a] ?? Zn[a];
        if (l) {
          let c = l(s);
          (typeof c != "string" && (i = !1), n.push(c));
        } else n.push(s);
        r = _e.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), i ? n.join("") : n);
    }
    function Te(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = Gn();
      if (n?.strings[e]) return ce(n.strings[e], t);
    }
    var er = {
      t(e, t, n) {
        let r, o;
        typeof t == "string" ? ((r = t), (o = n)) : (o = t);
        let i = Te(e, o);
        return i !== void 0 ? i : r !== void 0 ? ce(r, o) : e;
      },
      rich(e, t, n, r) {
        let i = Te(e, r) ?? ce(t, r);
        return Qn(i, n ?? {});
      },
      tEl(e, t, n, r) {
        if (Jn()) {
          let i = Te(e, n) ?? ce(t, n);
          return Et(e, i);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && ($e = { ...$e, ...e.components }),
          e.createElement && (Fn = e.createElement));
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
      e?.apiKey && !C && ht({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var Fe = `
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

/* Tabular layout \u2014 for gates / configs / experiments lists where columns
   should align across rows. Wrapping table in .dt-scroll keeps the panel
   chrome (header, footer) fixed while the table body scrolls when content
   exceeds panel width or height. */
.dt-scroll {
  overflow: auto;
  width: 100%;
  max-height: 100%;
}
.dt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.dt-table th,
.dt-table td {
  padding: 7px 8px;
  vertical-align: middle;
  border-bottom: 1px solid var(--se-line);
  text-align: left;
}
.dt-table tr:last-child td { border-bottom: none; }
.dt-table tbody tr:hover { background: var(--se-bg-1); }
.dt-table th {
  font-family: var(--se-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--se-fg-4);
  padding-top: 6px;
  padding-bottom: 6px;
  background: var(--se-bg-1);
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}
.dt-table td.col-name {
  font-family: var(--se-mono);
  font-size: 11.5px;
  color: var(--se-fg-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 200px;
}
.dt-table td.col-sub {
  font-family: var(--se-mono);
  font-size: 10.5px;
  color: var(--se-fg-4);
  white-space: nowrap;
  text-align: right;
}
.dt-table td.col-value {
  font-family: var(--se-mono);
  font-size: 11px;
  color: var(--se-fg-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.dt-table td.col-control { text-align: right; white-space: nowrap; }
.dt-table td.col-badge   { text-align: center; white-space: nowrap; }
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
/* Leaf rows render as a 2-column grid so the key segment and value align
   like table columns across every row, regardless of segment length. The
   indent (depth padding) is applied via inline padding-left on the row. */
.tree-row.leaf {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 12px;
}
.tree-row.leaf > .tree-seg {
  color: var(--se-fg-2);
  font-family: var(--se-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tree-row.leaf > .tree-val {
  text-align: right;
  color: var(--se-fg-3);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
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
  transition: transform 0.12s;
}
.tree-row.branch[data-branch] {
  cursor: pointer;
  user-select: none;
}
.tree-row.branch[data-branch]:focus-visible {
  outline: 2px solid var(--se-accent);
  outline-offset: -2px;
}
.tree-branch.collapsed > .tree-children { display: none; }

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
.lp-tabs {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  background: var(--se-bg-1);
  border-bottom: 1px solid var(--se-line);
  overflow-x: auto;
  scrollbar-width: none;
}
.lp-tabs::-webkit-scrollbar { display: none; }
.lp-tab {
  all: unset;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  padding: 7px 9px;
  color: var(--se-fg-3);
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: color 0.12s, border-color 0.12s;
}
.lp-tab:hover { color: var(--se-fg-2); }
.lp-tab.active { color: var(--se-fg); border-bottom-color: var(--se-accent); }
.lp-tab .lp-tab-attr {
  font-family: var(--se-mono);
  font-size: 10px;
  color: var(--se-fg-4);
  margin-left: 4px;
}
.lp-tab.active .lp-tab-attr { color: var(--se-accent); }
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
.lp-vars {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  background: var(--se-bg-2);
  border: 1px solid var(--se-line-2);
  border-radius: var(--se-r-sm);
}
.lp-var {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 11px;
  line-height: 1.4;
}
.lp-var-k {
  color: var(--se-accent, var(--se-fg-2));
  flex-shrink: 0;
}
.lp-var-k::after { content: ":"; color: var(--se-fg-4); margin-left: 1px; }
.lp-var-v {
  color: var(--se-fg);
  word-break: break-word;
  white-space: pre-wrap;
}
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
  var me = "se_dt_session";
  function je() {
    try {
      let e = sessionStorage.getItem(me);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function dn(e) {
    try {
      sessionStorage.setItem(me, JSON.stringify(e));
    } catch {}
  }
  function We() {
    try {
      sessionStorage.removeItem(me);
    } catch {}
  }
  async function Ge(e, t) {
    let n = new URL(e.adminUrl).origin,
      r = window.location.origin,
      o = `shipeasy-devtools-auth-${Date.now()}`,
      i = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(r)}`,
        o,
        "width=460,height=640,noopener=no",
      );
    if (!i) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      i.focus();
    } catch {}
    return (
      t(),
      new Promise((a, s) => {
        let c = !1;
        function g(f, d) {
          c ||
            ((c = !0),
            window.removeEventListener("message", p),
            clearInterval(y),
            clearTimeout(v),
            f ? s(f) : a(d));
        }
        function p(f) {
          if (f.origin !== n) return;
          let d = f.data;
          if (!d || d.type !== "se:devtools-auth" || !d.token || !d.projectId) return;
          let h = { token: d.token, projectId: d.projectId };
          (dn(h), g(null, h));
        }
        window.addEventListener("message", p);
        let w = Date.now(),
          y = setInterval(() => {
            Date.now() - w < 1500 ||
              (i.closed && !c && g(new Error("Sign-in window closed before approval.")));
          }, 500),
          v = setTimeout(() => {
            g(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var cn = /^(true|on|1|yes)$/i,
    un = /^(false|off|0|no)$/i,
    Je = /^se(?:_|-|$)/;
  function se(e) {
    return cn.test(e) ? !0 : un.test(e) ? !1 : null;
  }
  function ve(e) {
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
  function Ve(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function ae() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function D(e, t) {
    let n = ae(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let o = n.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function z(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function ie() {
    if (typeof window > "u") return !1;
    let e = ae();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function K() {
    return typeof window > "u" ? !1 : ae().has("se_edit_labels");
  }
  function V(e) {
    z([["se_edit_labels", e ? "1" : null]]);
  }
  function he(e) {
    let t = D(`se_ks_${e}`) ?? D(`se_gate_${e}`) ?? D(`se-gate-${e}`);
    return t === null ? null : se(t);
  }
  function Xe(e, t, n = "session") {
    z([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function be(e) {
    let t = D(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return ve(t);
  }
  function ye(e, t, n = "session") {
    z([
      [`se_config_${e}`, t == null ? null : Ve(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Ye(e) {
    let t = D(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function Ze(e, t, n = "session") {
    z([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function X() {
    return D("se_i18n");
  }
  function Qe(e, t = "session") {
    z([["se_i18n", e]]);
  }
  function xe() {
    return D("se_i18n_draft");
  }
  function et(e, t = "session") {
    z([["se_i18n_draft", e]]);
  }
  function W(e) {
    return D(`se_i18n_label_${e}`);
  }
  function we(e, t, n = "session") {
    z([[`se_i18n_label_${e}`, t]]);
  }
  function tt() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) Je.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Ee(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) Je.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, Ve(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function ke() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = ae();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let o = se(r);
        o !== null && (e.gates[n.slice(6)] = o);
      } else if (n.startsWith("se_gate_")) {
        let o = se(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else if (n.startsWith("se-gate-")) {
        let o = se(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = ve(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function nt(e) {
    if (typeof window > "u") return;
    let t = { ...ke(), ...e, openDevtools: !0 },
      n = Ee(t);
    window.location.assign(n);
  }
  var le = class {
    constructor(t, n) {
      $(this, "adminUrl", t);
      $(this, "token", n);
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
              a = i.valueJson !== void 0 ? i.valueJson : (i.values?.[n] ?? null);
            return { ...o, valueJson: a };
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
    async put(t, n) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
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
      return await r.json();
    }
    async post(t, n) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
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
        let o = "";
        try {
          o = (await r.json()).error ?? "";
        } catch {}
        throw new Error(`upload failed \u2192 HTTP ${r.status}${o ? ` \u2014 ${o}` : ""}`);
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
      let r = (s) => {
          let l = new URLSearchParams();
          return (
            t && l.set("profile_id", t),
            l.set("limit", String(500)),
            l.set("offset", String(s)),
            `?${l.toString()}`
          );
        },
        o = async (s) => {
          let l = await this.get(`/api/admin/i18n/keys${r(s)}`);
          if (Array.isArray(l)) return { keys: l, total: l.length };
          let c = l.keys ?? [],
            g = l.total ?? c.length;
          return { keys: c, total: g };
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
  function I(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${Le(e.title)}</div>
      <div class="empty-msg">${Le(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${Le(e.ctaLabel)}</a>
    </div>`;
  }
  function Le(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function pn() {
    return window.__shipeasy ?? null;
  }
  function fn(e) {
    let t = he(e.name),
      n = pn()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function gn(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function rt(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = I({
        icon: "\u26F3",
        title: "No gates yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        ctaLabel: "Create new gate",
        ctaHref: `${t.adminUrl}/dashboard/gates/new`,
      });
      return;
    }
    function r() {
      let i = n
        .map(
          (a) => `
        <tr>
          <td class="col-name">${a.name}</td>
          <td class="col-sub">${(a.rolloutPct / 100).toFixed(a.rolloutPct % 100 === 0 ? 0 : 2)}%</td>
          <td class="col-badge">${fn(a)}</td>
          <td class="col-control">${gn(a.name, he(a.name))}</td>
        </tr>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="dt-scroll">
        <table class="dt-table">
          <thead><tr>
            <th>Name</th><th style="text-align:right">Rollout</th><th>Live</th><th style="text-align:right">Override</th>
          </tr></thead>
          <tbody>${i}</tbody>
        </table>
      </div>`),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let s = a.closest("[data-gate]").dataset.gate,
              l = a.dataset.v;
            (Xe(s, l === "default" ? null : l === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function mn(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function ot(e) {
    return be(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function st(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = I({
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
      let i = n
        .map((s) => {
          let l = be(s.name),
            c = l !== void 0 ? l : s.valueJson;
          return r.has(s.name)
            ? `
            <tr data-config="${s.name}">
              <td colspan="4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="col-name" style="flex:1">${s.name}</span>
                  ${ot(s.name)}
                  <button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>
                </div>
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(c, null, 2)}</textarea>
                <div class="edit-row" style="display:flex;gap:6px;margin-top:6px">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${l !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>
              </td>
            </tr>`
            : `
          <tr data-config="${s.name}">
            <td class="col-name">${s.name}</td>
            <td class="col-value">${mn(c)}</td>
            <td class="col-badge">${ot(s.name)}</td>
            <td class="col-control"><button class="ibtn edit-btn" data-name="${s.name}">edit</button></td>
          </tr>`;
        })
        .join("");
      ((e.innerHTML = `
      <div class="dt-scroll">
        <table class="dt-table">
          <thead><tr>
            <th>Name</th><th>Value</th><th>Override</th><th></th>
          </tr></thead>
          <tbody>${i}</tbody>
        </table>
      </div>`),
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
      function a(s, l) {
        let c = s.dataset.name,
          g = e.querySelector(`textarea[data-name="${c}"]`);
        if (g)
          try {
            let p = JSON.parse(g.value);
            (ye(c, p, l), r.delete(c), o());
          } catch {
            g.style.borderColor = "#f87171";
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
            (ye(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function vn() {
    return window.__shipeasy ?? null;
  }
  function hn(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function bn(e) {
    let t = Ye(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function yn(e) {
    let t = vn()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function xn(e) {
    let t = e.status === "running";
    return `
    <tr>
      <td class="col-name">${e.name}</td>
      <td class="col-badge">${hn(e.status)}</td>
      <td class="col-badge">${t ? yn(e.name) : ""}</td>
      <td class="col-control">${t ? bn(e) : ""}</td>
    </tr>`;
  }
  function at(e, t) {
    return e.length === 0
      ? ""
      : `
    <div class="sec-head">${t}</div>
    <div class="dt-scroll">
      <table class="dt-table">
        <thead><tr>
          <th>Name</th><th>Status</th><th>Live</th><th style="text-align:right">Override</th>
        </tr></thead>
        <tbody>${e.map(xn).join("")}</tbody>
      </table>
    </div>`;
  }
  function it(e, t, n, r) {
    let o = n.filter((s) => s.universe === t.name);
    if (o.length === 0) {
      e.innerHTML = I({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${r}/dashboard/experiments/new`,
      });
      return;
    }
    let i = o.filter((s) => s.status === "running"),
      a = o.filter((s) => s.status !== "running");
    ((e.innerHTML = at(i, "Running") + at(a, "Other")),
      e.querySelectorAll(".exp-sel").forEach((s) => {
        s.addEventListener("change", () => {
          let l = s.dataset.name;
          Ze(l, s.value || null);
        });
      }));
  }
  async function lt(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load: ${String(a)}</div>`;
      return;
    }
    if (r.length === 0) {
      e.innerHTML = I({
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
      let a = r
        .map(
          (c) => `
          <button class="tab${c.name === o.activeUniverse ? " active" : ""}"
                  data-universe="${c.name}">${c.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${a}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((c) => {
          c.addEventListener("click", () => {
            ((o.activeUniverse = c.dataset.universe), i());
          });
        }));
      let s = e.querySelector(".tab-body"),
        l = r.find((c) => c.name === o.activeUniverse);
      it(s, l, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let a = e.querySelector(".tab-body"),
          s = r.find((l) => l.name === o.activeUniverse);
        a && s && it(a, s, n, t.adminUrl);
      }));
  }
  var B = ln(Lt(), 1);
  function tr(e) {
    let t = new Map();
    for (let n of e) {
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        i = r.length > 1 ? r.slice(1) : r;
      t.has(o) || t.set(o, { segment: o, children: [] });
      let a = t.get(o);
      for (let s = 0; s < i.length; s++) {
        let l = i[s],
          c = a.children.find((g) => g.segment === l);
        (c || ((c = { segment: l, children: [] }), a.children.push(c)), (a = c));
      }
      ((a.value = n.value), (a.fullKey = n.key));
    }
    for (let n of t.values()) Mt(n);
    return t;
  }
  function Mt(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Mt(t);
  }
  function P(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Rt(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? W(e.fullKey) : null,
        i = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${P(e.fullKey ?? "")}">
        <span class="tree-seg">${P(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${P(i)}">${P(i)}</span>
      </div>`;
    }
    let r = e.children.map((o) => Rt(o, t + 1)).join("");
    return `
    <div class="tree-branch">
      <div class="tree-row branch" role="button" tabindex="0" style="padding-left:${n}px" data-branch>
        <span class="tree-caret">\u25BE</span>
        <span class="tree-seg">${P(e.segment)}</span>
      </div>
      <div class="tree-children">${r}</div>
    </div>`;
  }
  var N = "__se_label_target",
    Ie = "__se_label_target_style",
    F = !1,
    Be = null,
    G = null,
    At = null,
    $t = [];
  function nr() {
    if (document.getElementById(Ie)) return;
    let e = document.createElement("style");
    ((e.id = Ie),
      (e.textContent = `
    .${N} {
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
    .${N}:hover,
    .${N}.__se_label_active {
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
  function St() {
    document.getElementById(Ie)?.remove();
  }
  function j(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let a = o.nodeValue ?? "";
      if (
        !a.includes(B.LABEL_MARKER_START) ||
        r.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        l = 0;
      B.LABEL_MARKER_RE.lastIndex = 0;
      let c;
      for (; (c = B.LABEL_MARKER_RE.exec(a)) !== null; ) {
        c.index > l && s.appendChild(document.createTextNode(a.slice(l, c.index)));
        let g = document.createElement("span");
        g.setAttribute("data-label", c[1]);
        let p = W(c[1]);
        ((g.textContent = p ?? c[2]), s.appendChild(g), (l = c.index + c[0].length));
      }
      (l < a.length && s.appendChild(document.createTextNode(a.slice(l))), n.push([o, s]));
    }
    for (let [a, s] of n) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        l = a.getAttribute("data-label"),
        c = W(l);
      if (s.includes(B.LABEL_MARKER_START)) {
        B.LABEL_MARKER_RE.lastIndex = 0;
        let g = B.LABEL_MARKER_RE.exec(s);
        g && (a.textContent = c ?? g[2]);
      } else if (i)
        try {
          let g = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            p = i(l, g);
          p && p !== l ? (a.textContent = c ?? p) : c && (a.textContent = c);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = qe(a),
        l = new Map();
      for (let g of s) l.set(g.attr, g);
      let c = !1;
      for (let g of Array.from(a.attributes)) {
        let p = g.value;
        if (!p.includes(B.LABEL_MARKER_START)) continue;
        B.LABEL_MARKER_RE.lastIndex = 0;
        let w = B.LABEL_MARKER_RE.exec(p);
        if (!w) continue;
        let y = w[1],
          v = w[2],
          f = W(y);
        (a.setAttribute(g.name, f ?? v),
          l.set(g.name, { attr: g.name, key: y, original: v }),
          (c = !0));
      }
      c && Pt(a, Array.from(l.values()));
    }
    return (rr(), n.length);
  }
  function rr() {
    let t = window.__SE_BOOTSTRAP?.i18n?.strings;
    if (!t) return;
    let n = new Map();
    for (let [s, l] of Object.entries(t))
      typeof l != "string" || l.length === 0 || (n.has(l) ? n.set(l, null) : n.set(l, s));
    let r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "INPUT"]),
      o = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT),
      i = [],
      a;
    for (; (a = o.nextNode()); ) {
      let s = a.parentElement;
      if (
        !s ||
        r.has(s.tagName) ||
        s.closest("[data-label], #shipeasy-devtools, #se-edit-labels-exit")
      )
        continue;
      let l = (a.nodeValue ?? "").trim();
      if (!l) continue;
      let c = n.get(l);
      c &&
        (s.textContent ?? "").trim() === l &&
        (s.hasAttribute("data-label") || i.push({ node: a, key: c }));
    }
    for (let { node: s, key: l } of i) {
      let c = s.parentNode;
      if (!c) continue;
      let g = document.createElement("span");
      (g.setAttribute("data-label", l), (g.textContent = s.nodeValue ?? ""));
      let p = W(l);
      (p !== null && (g.textContent = p), c.replaceChild(g, s));
    }
  }
  function qe(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let n = JSON.parse(t);
      if (Array.isArray(n)) return n;
    } catch {}
    return [];
  }
  function Pt(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var or = "[data-label], [data-label-attrs]";
  function Q() {
    return Array.from(document.querySelectorAll(or));
  }
  function U() {
    (G?.remove(),
      (G = null),
      document.querySelectorAll(`.${N}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function Ct(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let n = qe(e.target),
        r = n.findIndex((o) => o.attr === e.attr);
      r >= 0 && ((n[r] = { ...n[r], original: t }), Pt(e.target, n));
    }
  }
  async function sr(e, t, n) {
    (Ct(e, t),
      we(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let r = xe(),
      o = X(),
      i = At;
    if (!i || (!r && !o)) {
      U();
      return;
    }
    let a = n.querySelector('[data-action="save"]'),
      s = n.querySelector(".lp-err");
    ((a.disabled = !0), (a.textContent = "Saving\u2026"), s && (s.textContent = ""));
    try {
      if (r) await i.upsertDraftKey(r, e.key, t);
      else if (o) {
        let l = $t.find((c) => c.key === e.key && c.profileId === o);
        l && (await i.updateKeyById(l.id, t));
      }
      U();
    } catch (l) {
      ((a.disabled = !1),
        (a.textContent = "Save"),
        s && (s.textContent = l instanceof Error ? l.message : String(l)));
    }
  }
  function _t(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function ar(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: _t(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    ) {
      if (!e.hasAttribute("data-label")) {
        let n = Array.from(e.querySelectorAll("[data-label]"));
        for (let r of n)
          t.push({
            kind: "text",
            key: r.dataset.label ?? "",
            target: r,
            variables: _t(r),
            desc: r.dataset.labelDesc ?? "",
          });
      }
      for (let n of qe(e)) t.push({ kind: "attr", key: n.key, target: e, attr: n.attr });
    }
    return t;
  }
  function Tt(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function ir(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let n = e.key.split(".").pop() || e.key;
    return t.filter((o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === n).length > 1
      ? e.key
      : "Text";
  }
  function lr(e, t) {
    (U(), e.classList.add("__se_label_active"));
    let n = ar(e);
    if (n.length === 0) return;
    let o = X() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let l =
      n.length > 1
        ? `<div class="lp-tabs">${n
            .map((x, L) => {
              let S = ir(x, n),
                A = x.kind === "attr" ? `<span class="lp-tab-attr">${P(x.attr ?? "")}</span>` : "";
              return `<button class="${L === 0 ? "lp-tab active" : "lp-tab"}" data-surface-idx="${L}">${P(x.kind === "attr" ? "@" : S)}${x.kind === "attr" ? A : ""}</button>`;
            })
            .join("")}</div>`
        : "";
    ((s.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono"></span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    ${l}
    <div class="lp-body"></div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      t.appendChild(s));
    let c = s.querySelector(".lp-key"),
      g = s.querySelector(".lp-body"),
      p = s.querySelector(".lp-err"),
      w = s.querySelector('[data-action="save"]'),
      y = s.querySelector('[data-action="reset"]');
    function v() {
      return n[a];
    }
    function f() {
      let x = v();
      (i.has(a) || i.set(a, Tt(x)), (c.textContent = x.key));
      let L = x.variables ? Object.entries(x.variables) : [],
        S = L.length
          ? `<div class="lp-field">
          <label>Variables</label>
          <div class="lp-vars">${L.map(([m, E]) => `<div class="lp-var"><span class="lp-var-k mono">${P(m)}</span><span class="lp-var-v">${P(String(E))}</span></div>`).join("")}</div>
        </div>`
          : "",
        A = x.desc ?? "",
        O = x.kind === "attr" ? `attribute \xB7 ${P(x.attr ?? "")}` : "text content";
      ((g.innerHTML = `
      <div class="lp-field">
        <label>Current profile</label>
        <span>${P(o)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${O}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${A ? "" : "empty"}">${A ? P(A) : "No description"}</span>
      </div>
      ${S}
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${P(Tt(x))}</textarea>
      </div>`),
        (p.textContent = ""),
        (w.disabled = !1),
        (w.textContent = "Save"));
      let u = g.querySelector(".lp-input");
      (u.focus(), u.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((x) => {
      x.addEventListener("click", () => {
        let L = Number(x.dataset.surfaceIdx);
        L !== a &&
          ((a = L),
          s.querySelectorAll(".lp-tab").forEach((S, A) => {
            S.classList.toggle("active", A === a);
          }),
          f());
      });
    }),
      f());
    let d = e.getBoundingClientRect(),
      h = s.offsetHeight,
      k = s.offsetWidth,
      T = 8,
      b = d.bottom + T;
    b + h > window.innerHeight - 8 && (b = Math.max(8, d.top - h - T));
    let _ = d.left;
    (_ + k > window.innerWidth - 8 && (_ = Math.max(8, window.innerWidth - k - 8)),
      (s.style.top = `${b}px`),
      (s.style.left = `${_}px`),
      s.querySelector(".lp-close").addEventListener("click", U),
      w.addEventListener("click", () => {
        let x = g.querySelector(".lp-input");
        sr(v(), x.value, s);
      }),
      y.addEventListener("click", () => {
        let x = v(),
          L = i.get(a) ?? "";
        (Ct(x, L),
          we(x.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: x.key, value: null } }),
          ),
          U());
      }),
      s.addEventListener("click", (x) => x.stopPropagation()),
      s.addEventListener("mousedown", (x) => x.stopPropagation()),
      (G = s));
  }
  function J(e, t, n) {
    if (((F = e), Be?.(), (Be = null), !e)) {
      U();
      for (let p of Q()) p.classList.remove(N);
      St();
      return;
    }
    nr();
    for (let p of Q()) p.classList.add(N);
    function r(p) {
      return G !== null && p.composedPath().includes(G);
    }
    function o(p) {
      for (let w of p.composedPath())
        if (
          w instanceof HTMLElement &&
          (w.hasAttribute("data-label") || w.hasAttribute("data-label-attrs"))
        )
          return w;
      return null;
    }
    let i = [
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
    function a(p) {
      r(p) || (o(p) && (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation()));
    }
    function s(p) {
      if (r(p)) return;
      let w = o(p);
      w && (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation(), lr(w, t));
    }
    function l(p) {
      G && (r(p) || o(p) || U());
    }
    function c(p) {
      p.key === "Escape" && U();
    }
    let g = new MutationObserver(() => {
      if (F) {
        for (let p of Q()) p.classList.add(N);
        n();
      }
    });
    g.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let p of i) document.addEventListener(p, a, !0);
    (document.addEventListener("click", s, !0),
      document.addEventListener("mousedown", l, !0),
      document.addEventListener("keydown", c),
      (Be = () => {
        for (let p of i) document.removeEventListener(p, a, !0);
        (document.removeEventListener("click", s, !0),
          document.removeEventListener("mousedown", l, !0),
          document.removeEventListener("keydown", c),
          g.disconnect());
        for (let p of Q()) p.classList.remove(N);
        St();
      }));
  }
  async function Ot(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (n.innerHTML = ""),
      (At = t));
    let o, i, a;
    try {
      let y = X() ?? void 0;
      [o, i, a] = await Promise.all([t.profiles(), t.drafts(), t.keys(y)]);
    } catch (y) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(y)}</div>`;
      return;
    }
    $t = a;
    let s = tr(a),
      l = Array.from(s.keys()),
      c = { activeChunk: l[0] ?? null };
    function g() {
      if (l.length === 0) {
        e.innerHTML = I({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let y = l
          .map(
            (d) =>
              `<button class="tab${d === c.activeChunk ? " active" : ""}" data-chunk="${P(d)}">${P(d)}</button>`,
          )
          .join(""),
        v = c.activeChunk ? s.get(c.activeChunk) : null,
        f = v ? v.children.map((d) => Rt(d, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${y}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${f}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((d) => {
          d.addEventListener("click", () => {
            ((c.activeChunk = d.dataset.chunk), g());
          });
        }),
        e.querySelectorAll(".tree-row.branch[data-branch]").forEach((d) => {
          let h = () => {
            let k = d.parentElement;
            if (!k) return;
            let T = k.classList.toggle("collapsed"),
              b = d.querySelector(".tree-caret");
            b && (b.textContent = T ? "\u25B8" : "\u25BE");
          };
          (d.addEventListener("click", h),
            d.addEventListener("keydown", (k) => {
              (k.key === "Enter" || k.key === " ") && (k.preventDefault(), h());
            }));
        }));
    }
    function p() {
      let y = X() ?? "",
        v = xe() ?? "";
      j();
      let f = Q().length,
        d = F
          ? `Editing ${f} label${f === 1 ? "" : "s"}`
          : f > 0
            ? `Edit labels (${f})`
            : "Edit labels",
        h = F
          ? "Disable in-page label editing"
          : f === 0
            ? "Enable in-page label editing \u2014 reloads page with ?se_edit_labels=1 to scan all translation strings"
            : "Toggle in-page label editing (reloads page)",
        k = [
          '<option value="">Default</option>',
          ...o.map(
            (b) =>
              `<option value="${P(b.id)}" ${y === b.id ? "selected" : ""}>${P(b.name)}</option>`,
          ),
        ].join(""),
        T = [
          '<option value="">No draft</option>',
          ...i.map(
            (b) =>
              `<option value="${P(b.id)}" ${v === b.id ? "selected" : ""}>${P(b.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${F ? " on" : ""}" id="se-edit-toggle" title="${P(h)}">
        <span class="dot"></span>
        ${P(d)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${k}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${T}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          K() ? V(!1) : F ? (J(!1, r, () => p()), p()) : V(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (b) => {
          let _ = b.target.value || null;
          Qe(_);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (b) => {
          let _ = b.target.value || null;
          et(_);
        }));
    }
    (K() && (j(), F || J(!0, r, () => p())),
      g(),
      p(),
      window.i18n?.on?.("update", () => {
        (j(), p());
      }));
  }
  function ee(e, t) {
    let n = document.createElement("div");
    n.className = "se-modal-overlay";
    let r = document.createElement("div");
    ((r.className = `se-modal se-modal-${t.size ?? "md"}`), n.appendChild(r));
    let o = document.createElement("div");
    o.className = "se-modal-head";
    let i = document.createElement("div");
    ((i.className = "se-modal-title"), (i.textContent = t.title));
    let a = document.createElement("button");
    ((a.className = "se-modal-close"),
      (a.type = "button"),
      a.setAttribute("aria-label", "Close"),
      (a.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'),
      o.appendChild(i),
      o.appendChild(a),
      r.appendChild(o));
    let s = document.createElement("div");
    ((s.className = "se-modal-body"), r.appendChild(s));
    function l() {
      (n.removeEventListener("click", c),
        document.removeEventListener("keydown", g),
        n.remove(),
        t.onClose?.());
    }
    function c(p) {
      p.target === n && l();
    }
    function g(p) {
      p.key === "Escape" && l();
    }
    return (
      n.addEventListener("click", c),
      document.addEventListener("keydown", g),
      a.addEventListener("click", l),
      e.appendChild(n),
      { body: s, root: r, close: l }
    );
  }
  function Ht(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function Bt(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 }),
      n = Ht(e);
    try {
      let r = document.createElement("video");
      ((r.srcObject = t),
        (r.muted = !0),
        (r.playsInline = !0),
        await new Promise((c, g) => {
          let p = setTimeout(() => g(new Error("Capture stream timed out")), 5e3);
          ((r.onloadedmetadata = () => {
            (clearTimeout(p), c());
          }),
            (r.onerror = () => {
              (clearTimeout(p), g(new Error("Capture stream errored")));
            }));
        }),
        await r.play(),
        await new Promise((c) => requestAnimationFrame(() => c(null))),
        await new Promise((c) => requestAnimationFrame(() => c(null))));
      let o = r.videoWidth,
        i = r.videoHeight;
      if (!o || !i) throw new Error("Capture stream returned no frames.");
      let a = document.createElement("canvas");
      ((a.width = o), (a.height = i));
      let s = a.getContext("2d");
      if (!s) throw new Error("Canvas 2d context unavailable");
      return (
        s.drawImage(r, 0, 0, o, i),
        await new Promise((c, g) => {
          a.toBlob((p) => (p ? c(p) : g(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((r) => r.stop()), n());
    }
  }
  async function It(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n = Ht(e);
    await new Promise((l) => requestAnimationFrame(() => l(null)));
    let o =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((l) =>
          MediaRecorder.isTypeSupported(l),
        ) ?? "",
      i = o ? new MediaRecorder(t, { mimeType: o }) : new MediaRecorder(t),
      a = [];
    (i.addEventListener("dataavailable", (l) => {
      l.data && l.data.size > 0 && a.push(l.data);
    }),
      i.start(500),
      t.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), i.state !== "inactive" && i.stop());
      }));
    function s() {
      (t.getTracks().forEach((l) => l.stop()), n());
    }
    return {
      stop() {
        return new Promise((l, c) => {
          if (i.state === "inactive") {
            if ((s(), a.length === 0)) {
              c(new Error("No recording data."));
              return;
            }
            l(new Blob(a, { type: o || "video/webm" }));
            return;
          }
          (i.addEventListener(
            "stop",
            () => {
              (s(), l(new Blob(a, { type: o || "video/webm" })));
            },
            { once: !0 },
          ),
            i.addEventListener("error", (g) => c(g), { once: !0 }),
            i.stop());
        });
      },
      cancel() {
        (i.state !== "inactive" && i.stop(), s());
      },
    };
  }
  var qt = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Dt(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((u, m) => {
        let E = new Image();
        ((E.onload = () => u(E)),
          (E.onerror = () => m(new Error("Failed to load screenshot for annotation."))),
          (E.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), r.appendChild(o));
    let i = "pen",
      a = qt[0],
      s = [];
    function l(u) {
      ((i = u),
        o
          .querySelectorAll("[data-tool]")
          .forEach((m) => m.classList.toggle("on", m.dataset.tool === u)));
    }
    function c(u, m, E) {
      let M = document.createElement("button");
      return (
        (M.type = "button"),
        (M.className = "se-annot-btn"),
        (M.dataset.tool = u),
        (M.textContent = m),
        (M.title = E),
        M.addEventListener("click", () => l(u)),
        M
      );
    }
    (o.appendChild(c("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(c("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(c("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(c("text", "T text", "Text (T)")),
      l("pen"));
    let g = document.createElement("span");
    ((g.className = "se-annot-sep"), o.appendChild(g));
    for (let u of qt) {
      let m = document.createElement("button");
      ((m.type = "button"),
        (m.className = "se-annot-swatch"),
        (m.dataset.color = u),
        (m.style.background = u),
        u === a && m.classList.add("on"),
        m.addEventListener("click", () => {
          ((a = u),
            o
              .querySelectorAll("[data-color]")
              .forEach((E) => E.classList.toggle("on", E.dataset.color === u)));
        }),
        o.appendChild(m));
    }
    let p = document.createElement("button");
    ((p.type = "button"),
      (p.className = "se-annot-btn"),
      (p.textContent = "\u21B6 undo"),
      (p.title = "Undo (Ctrl/Cmd+Z)"),
      p.addEventListener("click", () => {
        (s.pop(), _());
      }),
      o.appendChild(p));
    let w = document.createElement("button");
    ((w.type = "button"),
      (w.className = "se-annot-btn"),
      (w.textContent = "clear"),
      w.addEventListener("click", () => {
        ((s.length = 0), _());
      }),
      o.appendChild(w));
    let y = document.createElement("div");
    ((y.className = "se-annot-stage"), r.appendChild(y));
    let v = document.createElement("canvas");
    ((v.width = n.naturalWidth),
      (v.height = n.naturalHeight),
      (v.className = "se-annot-canvas"),
      (v.style.cursor = "crosshair"),
      (v.style.touchAction = "none"),
      y.appendChild(v));
    let f = v.getContext("2d"),
      d = null;
    function h(u) {
      let m = v.getBoundingClientRect(),
        E = v.width / m.width,
        M = v.height / m.height;
      return { x: (u.clientX - m.left) * E, y: (u.clientY - m.top) * M };
    }
    function k() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function T() {
      return Math.max(14, Math.round(n.naturalWidth / 60));
    }
    function b(u) {
      if (
        (f.save(),
        (f.strokeStyle = u.color),
        (f.fillStyle = u.color),
        (f.lineWidth = k()),
        (f.lineCap = "round"),
        (f.lineJoin = "round"),
        u.tool === "rect")
      ) {
        let m = Math.min(u.x1, u.x2),
          E = Math.min(u.y1, u.y2),
          M = Math.abs(u.x2 - u.x1),
          H = Math.abs(u.y2 - u.y1);
        f.strokeRect(m, E, M, H);
      } else if (u.tool === "arrow") {
        (f.beginPath(), f.moveTo(u.x1, u.y1), f.lineTo(u.x2, u.y2), f.stroke());
        let m = Math.atan2(u.y2 - u.y1, u.x2 - u.x1),
          E = k() * 5;
        (f.beginPath(),
          f.moveTo(u.x2, u.y2),
          f.lineTo(u.x2 - E * Math.cos(m - Math.PI / 6), u.y2 - E * Math.sin(m - Math.PI / 6)),
          f.lineTo(u.x2 - E * Math.cos(m + Math.PI / 6), u.y2 - E * Math.sin(m + Math.PI / 6)),
          f.closePath(),
          f.fill());
      } else if (u.tool === "pen")
        if (u.points.length < 2) {
          if (u.points.length === 1) {
            let m = u.points[0];
            (f.beginPath(), f.arc(m.x, m.y, k() / 2, 0, Math.PI * 2), f.fill());
          }
        } else {
          (f.beginPath(), f.moveTo(u.points[0].x, u.points[0].y));
          for (let m = 1; m < u.points.length; m++) f.lineTo(u.points[m].x, u.points[m].y);
          f.stroke();
        }
      else if (u.tool === "text" && u.text) {
        let m = T();
        ((f.font = `600 ${m}px ui-sans-serif, system-ui, sans-serif`), (f.textBaseline = "top"));
        let E = m * 0.3,
          H = f.measureText(u.text).width + E * 2,
          pe = m + E * 2;
        ((f.fillStyle = "rgba(0,0,0,0.55)"),
          f.fillRect(u.x1, u.y1, H, pe),
          (f.fillStyle = u.color),
          f.fillText(u.text, u.x1 + E, u.y1 + E));
      }
      f.restore();
    }
    function _(u) {
      (f.clearRect(0, 0, v.width, v.height), f.drawImage(n, 0, 0));
      for (let m of s) b(m);
      u && b(u);
    }
    _();
    let x = null;
    function L(u, m) {
      x && x.blur();
      let E = v.getBoundingClientRect(),
        M = y.getBoundingClientRect(),
        H = E.width / v.width,
        pe = E.height / v.height,
        fe = T() * H,
        Yt = fe * 0.3,
        R = document.createElement("input");
      ((R.type = "text"),
        (R.className = "se-annot-text-input"),
        (R.style.position = "absolute"),
        (R.style.left = `${E.left - M.left + u * H}px`),
        (R.style.top = `${E.top - M.top + m * pe}px`),
        (R.style.color = a),
        (R.style.background = "rgba(0,0,0,0.55)"),
        (R.style.border = `1px dashed ${a}`),
        (R.style.outline = "none"),
        (R.style.padding = `${Yt}px`),
        (R.style.font = `600 ${fe}px ui-sans-serif, system-ui, sans-serif`),
        (R.style.minWidth = `${fe * 4}px`),
        (R.style.lineHeight = "1"),
        (R.placeholder = "type\u2026"));
      let oe = !1;
      function Ke() {
        if (oe) return;
        oe = !0;
        let q = R.value.trim();
        (R.remove(),
          (x = null),
          q && (s.push({ tool: "text", color: a, x1: u, y1: m, text: q }), _()));
      }
      function Zt() {
        oe || ((oe = !0), R.remove(), (x = null));
      }
      (R.addEventListener("keydown", (q) => {
        (q.key === "Enter"
          ? (q.preventDefault(), Ke())
          : q.key === "Escape" && (q.preventDefault(), Zt()),
          q.stopPropagation());
      }),
        R.addEventListener("blur", Ke),
        y.appendChild(R),
        (x = R),
        setTimeout(() => R.focus(), 0));
    }
    let S = null;
    (v.addEventListener("pointermove", (u) => {
      ((d = h(u)),
        S &&
          (S.kind === "pen"
            ? (S.shape.points.push(d), _())
            : _({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: S.x1,
                y1: S.y1,
                x2: d.x,
                y2: d.y,
              })));
    }),
      v.addEventListener("pointerdown", (u) => {
        u.preventDefault();
        let m = h(u);
        if (((d = m), i === "text")) {
          L(m.x, m.y);
          return;
        }
        if (i === "pen") {
          let E = { tool: "pen", color: a, points: [m] };
          (s.push(E), (S = { kind: "pen", shape: E }), v.setPointerCapture(u.pointerId), _());
          return;
        }
        ((S = { kind: "shape", x1: m.x, y1: m.y }), v.setPointerCapture(u.pointerId));
      }),
      v.addEventListener("pointerup", (u) => {
        if (!S) return;
        let m = h(u);
        if (S.kind === "shape") {
          let E = Math.abs(m.x - S.x1),
            M = Math.abs(m.y - S.y1);
          (E > 4 || M > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: S.x1, y1: S.y1, x2: m.x, y2: m.y });
        }
        ((S = null), _());
      }));
    function A(u) {
      if (!(u instanceof HTMLElement)) return !1;
      let m = u.tagName;
      return m === "INPUT" || m === "TEXTAREA" || u.isContentEditable;
    }
    function O(u) {
      if (!r.isConnected) {
        document.removeEventListener("keydown", O, !0);
        return;
      }
      if (A(u.target)) return;
      let m = u.key.toLowerCase();
      if ((u.ctrlKey || u.metaKey) && m === "z") {
        (u.preventDefault(), s.pop(), _());
        return;
      }
      if (!(u.ctrlKey || u.metaKey || u.altKey))
        if (m === "t") {
          (u.preventDefault(), l("text"));
          let E = d ?? { x: v.width / 2, y: v.height / 2 };
          L(E.x, E.y);
        } else m === "p" ? l("pen") : m === "a" ? l("arrow") : m === "r" && l("rect");
    }
    return (
      document.addEventListener("keydown", O, !0),
      {
        root: r,
        async export() {
          (x && x.blur(), await new Promise((m) => requestAnimationFrame(() => m(null))));
          let u = await new Promise((m, E) => {
            v.toBlob((M) => (M ? m(M) : E(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", O, !0), u);
        },
      }
    );
  }
  function te(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function dr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function cr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Nt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let i;
      try {
        i = await t.bugs();
      } catch (s) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${te(String(s))}</div>`), o());
        return;
      }
      e.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-bug">+ File a bug</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/bugs">Open dashboard \u2197</a>
      </div>
      <div class="se-feedback-list" id="se-bugs-list"></div>
    `;
      let a = e.querySelector("#se-bugs-list");
      (i.length === 0
        ? (a.innerHTML =
            '<div class="empty">No bugs filed yet. Spotted one? Hit \u201CFile a bug\u201D.</div>')
        : (a.innerHTML = i
            .map(
              (s) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/bugs/${s.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${te(s.title)}</div>
                <div class="row-sub">${cr(s.createdAt)}${s.reporterEmail ? ` \xB7 ${te(s.reporterEmail)}` : ""}</div>
              </div>
              ${dr(s.status)}
            </a>`,
            )
            .join("")),
        o());
    }
    function o() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => ur(t, n, r));
    }
    await r();
  }
  function ur(e, t, n) {
    let r = ee(t, { title: "File a bug", size: "lg" }),
      o = [],
      i = null;
    r.body.innerHTML = `
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
    let a = r.body.querySelector("#se-b-title"),
      s = r.body.querySelector("#se-b-steps"),
      l = r.body.querySelector("#se-b-actual"),
      c = r.body.querySelector("#se-b-expected"),
      g = r.body.querySelector("#se-b-attach"),
      p = r.body.querySelector("#se-b-status"),
      w = r.body.querySelector("#se-b-file"),
      y = r.body.querySelector("#se-b-record");
    function v() {
      if (o.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = o
        .map(
          (d, h) => `
          <div class="se-attach-item">
            <span>${te(d.filename)} <span class="dim">(${(d.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${h}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((d) => {
          d.addEventListener("click", () => {
            (o.splice(Number(d.dataset.idx), 1), v());
          });
        }));
    }
    function f(d, h = !1) {
      ((p.textContent = d), (p.style.color = h ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (r.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let d = await Bt(t.host);
        (f(""),
          pr(t, d, (h) => {
            (o.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: h }),
              v());
          }));
      } catch (d) {
        f(String(d instanceof Error ? d.message : d), !0);
      }
    }),
      y.addEventListener("click", async () => {
        if (i) {
          try {
            ((y.disabled = !0), f("Finalizing recording\u2026"));
            let d = await i.stop();
            ((i = null),
              (y.textContent = "\u23FA Record screen"),
              y.classList.remove("danger"),
              o.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: d }),
              v(),
              f(""));
          } catch (d) {
            f(String(d instanceof Error ? d.message : d), !0);
          } finally {
            y.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((i = await It(t.host)),
            (y.textContent = "\u25A0 Stop recording"),
            y.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (d) {
          (f(String(d instanceof Error ? d.message : d), !0), (i = null));
        }
      }),
      r.body.querySelector("#se-b-upload").addEventListener("click", () => w.click()),
      w.addEventListener("change", () => {
        let d = w.files?.[0];
        d && (o.push({ kind: "file", filename: d.name, blob: d }), (w.value = ""), v());
      }),
      r.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (i && i.cancel(), r.close());
      }),
      r.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let d = r.body.querySelector("#se-b-submit"),
          h = a.value.trim();
        if (!h) {
          (f("Title is required", !0), a.focus());
          return;
        }
        ((d.disabled = !0), f("Submitting\u2026"));
        try {
          let k = await e.createBug({
            title: h,
            stepsToReproduce: s.value,
            actualResult: l.value,
            expectedResult: c.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let T = 0; T < o.length; T++) {
            let b = o[T];
            (f(`Uploading attachment ${T + 1}/${o.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: k.id,
                kind: b.kind,
                filename: b.filename,
                blob: b.blob,
              }));
          }
          (r.close(), n());
        } catch (k) {
          (f(String(k instanceof Error ? k.message : k), !0), (d.disabled = !1));
        }
      }));
  }
  function pr(e, t, n) {
    let r = ee(e, { title: "Annotate screenshot", size: "lg" });
    r.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let o = r.body.querySelector("#se-annot-host");
    ((o.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Dt(t)
        .then((i) => {
          ((o.innerHTML = ""),
            o.appendChild(i.root),
            r.body.querySelector("#se-a-cancel").addEventListener("click", () => r.close()),
            r.body.querySelector("#se-a-save").addEventListener("click", async () => {
              let a = await i.export();
              (r.close(), n(a));
            }));
        })
        .catch((i) => {
          o.innerHTML = `<div class="err">${te(String(i))}</div>`;
        }));
  }
  function De(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function fr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function gr(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function mr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Ut(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let o;
      try {
        o = await t.featureRequests();
      } catch (a) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${De(String(a))}</div>`;
        return;
      }
      e.innerHTML = `
      <div class="se-feedback-head">
        <button class="ibtn pri" id="se-file-fr">+ Request a feature</button>
        <a class="ibtn" target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/feature-requests">Open dashboard \u2197</a>
      </div>
      <div class="se-feedback-list" id="se-fr-list"></div>
    `;
      let i = e.querySelector("#se-fr-list");
      (o.length === 0
        ? (i.innerHTML = '<div class="empty">No feature requests yet.</div>')
        : (i.innerHTML = o
            .map(
              (a) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/feature-requests/${a.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${De(a.title)}</div>
                <div class="row-sub">${mr(a.createdAt)}${a.reporterEmail ? ` \xB7 ${De(a.reporterEmail)}` : ""}</div>
              </div>
              ${gr(a.importance)}
              ${fr(a.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => vr(t, n, r)));
    }
    await r();
  }
  function vr(e, t, n) {
    let r = ee(t, { title: "Request a feature", size: "lg" });
    r.body.innerHTML = `
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
    let o = r.body.querySelector("#se-f-title"),
      i = r.body.querySelector("#se-f-desc"),
      a = r.body.querySelector("#se-f-use"),
      s = r.body.querySelector("#se-f-imp"),
      l = r.body.querySelector("#se-f-status");
    (r.body.querySelector("#se-f-cancel").addEventListener("click", () => r.close()),
      r.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let c = o.value.trim();
        if (!c) {
          ((l.textContent = "Title is required"), (l.style.color = "var(--se-danger)"), o.focus());
          return;
        }
        let g = r.body.querySelector("#se-f-submit");
        ((g.disabled = !0),
          (l.textContent = "Submitting\u2026"),
          (l.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: c,
            description: i.value,
            useCase: a.value,
            importance: s.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            r.close(),
            n());
        } catch (p) {
          ((l.textContent = String(p instanceof Error ? p.message : p)),
            (l.style.color = "var(--se-danger)"),
            (g.disabled = !1));
        }
      }));
  }
  var hr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    br =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    yr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    xr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    wr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Er =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    kr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Lr =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    ue = {
      gates: { icon: hr, label: "Gates" },
      configs: { icon: br, label: "Configs" },
      experiments: { icon: yr, label: "Experiments" },
      i18n: { icon: xr, label: "Translations" },
      bugs: { icon: wr, label: "Bugs" },
      features: { icon: Er, label: "Feature requests" },
    },
    Gt = "se_l_overlay",
    Ne = "se_l_active_panel";
  function Sr() {
    try {
      let e = sessionStorage.getItem(Ne);
      if (e && e in ue) return e;
    } catch {}
    return null;
  }
  function zt(e) {
    try {
      e === null ? sessionStorage.removeItem(Ne) : sessionStorage.setItem(Ne, e);
    } catch {}
  }
  var Ue = 240,
    Kt = 580,
    ze = 180,
    Ft = 700,
    jt = { edge: "right", offsetPct: 50, panelWidth: 440, panelHeight: 460 };
  function _r() {
    try {
      let e = localStorage.getItem(Gt);
      if (e) return { ...jt, ...JSON.parse(e) };
    } catch {}
    return { ...jt };
  }
  function Wt(e) {
    try {
      localStorage.setItem(Gt, JSON.stringify(e));
    } catch {}
  }
  function Tr(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((l, c) => l[0] - c[0]);
    let i = o[0][1],
      s = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: s };
  }
  function ne(e, t, n, r) {
    let { edge: o, offsetPct: i, panelWidth: a, panelHeight: s } = r,
      l = window.innerWidth,
      c = window.innerHeight,
      g = o === "left" || o === "right",
      p = Math.max(Ue, Math.min(a, l - 80)),
      w = Math.max(ze, Math.min(s, c - 40)),
      y = (i / 100) * (g ? c : l),
      v = e.getBoundingClientRect(),
      f = g ? v.width || 52 : v.height || 52,
      d = e.style;
    ((d.top = d.bottom = d.left = d.right = d.transform = ""),
      (d.borderTop = d.borderBottom = d.borderLeft = d.borderRight = ""),
      (d.flexDirection = g ? "column" : "row"),
      (d.padding = g ? "8px 6px" : "6px 8px"),
      o === "right"
        ? ((d.right = "0"),
          (d.top = `${i}%`),
          (d.transform = "translateY(-50%)"),
          (d.borderRadius = "10px 0 0 10px"),
          (d.borderRight = "none"),
          (d.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : o === "left"
          ? ((d.left = "0"),
            (d.top = `${i}%`),
            (d.transform = "translateY(-50%)"),
            (d.borderRadius = "0 10px 10px 0"),
            (d.borderLeft = "none"),
            (d.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : o === "top"
            ? ((d.top = "0"),
              (d.left = `${i}%`),
              (d.transform = "translateX(-50%)"),
              (d.borderRadius = "0 0 10px 10px"),
              (d.borderTop = "none"),
              (d.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((d.bottom = "0"),
              (d.left = `${i}%`),
              (d.transform = "translateX(-50%)"),
              (d.borderRadius = "10px 10px 0 0"),
              (d.borderBottom = "none"),
              (d.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let h = t.style;
    if (
      ((h.top = h.bottom = h.left = h.right = h.transform = ""),
      (h.borderTop = h.borderBottom = h.borderLeft = h.borderRight = ""),
      (h.width = p + "px"),
      (h.height = w + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let T = Math.max(10, Math.min(c - w - 10, y - w / 2));
      ((h.right = f + "px"),
        (h.top = T + "px"),
        (h.borderRadius = "10px 0 0 10px"),
        (h.borderRight = "none"),
        (h.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let T = Math.max(10, Math.min(c - w - 10, y - w / 2));
      ((h.left = f + "px"),
        (h.top = T + "px"),
        (h.borderRadius = "0 10px 10px 0"),
        (h.borderLeft = "none"),
        (h.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let T = Math.max(10, Math.min(l - p - 10, y - p / 2));
      ((h.top = f + "px"),
        (h.left = T + "px"),
        (h.borderRadius = "0 0 10px 10px"),
        (h.borderTop = "none"),
        (h.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let T = Math.max(10, Math.min(l - p - 10, y - p / 2));
      ((h.bottom = f + "px"),
        (h.left = T + "px"),
        (h.borderRadius = "10px 10px 0 0"),
        (h.borderBottom = "none"),
        (h.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let k = n.style;
    ((k.top = k.bottom = k.left = k.right = k.width = k.height = ""),
      (n.dataset.dir = g ? "ew" : "ns"),
      g
        ? ((k.width = "10px"),
          (k.top = "0"),
          (k.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          o === "right" ? (k.left = "0") : (k.right = "0"))
        : ((k.height = "10px"),
          (k.left = "0"),
          (k.right = "0"),
          (n.style.cursor = "ns-resize"),
          o === "top" ? (k.bottom = "0") : (k.top = "0")));
  }
  function Jt(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${Fe}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), o.appendChild(i));
    let a = document.createElement("div");
    ((a.className = "panel-inner"), o.appendChild(a));
    let s = _r(),
      l = null,
      c = je(),
      g = Sr();
    requestAnimationFrame(() => ne(r, o, i, s));
    let p = document.createElement("div");
    ((p.className = "drag-handle"),
      (p.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (p.innerHTML = Lr),
      r.appendChild(p),
      p.addEventListener("mousedown", (b) => {
        (b.preventDefault(), p.classList.add("dragging"));
        let _ = (L) => {
            let { edge: S, offsetPct: A } = Tr(L.clientX, L.clientY);
            ((s = { ...s, edge: S, offsetPct: A }), ne(r, o, i, s));
          },
          x = () => {
            (p.classList.remove("dragging"),
              document.removeEventListener("mousemove", _),
              document.removeEventListener("mouseup", x),
              Wt(s));
          };
        (document.addEventListener("mousemove", _), document.addEventListener("mouseup", x));
      }));
    let w = new Map();
    for (let [b, { icon: _, label: x }] of Object.entries(ue)) {
      let L = document.createElement("button");
      ((L.className = "btn"),
        (L.title = x),
        (L.innerHTML = _),
        L.addEventListener("click", () => d(b)),
        r.appendChild(L),
        w.set(b, L));
    }
    i.addEventListener("mousedown", (b) => {
      (b.preventDefault(), b.stopPropagation(), i.classList.add("dragging"));
      let _ = b.clientX,
        x = b.clientY,
        L = s.panelWidth,
        S = s.panelHeight,
        { edge: A } = s,
        O = (m) => {
          let E = m.clientX - _,
            M = m.clientY - x,
            H = { ...s };
          (A === "right" && (H.panelWidth = Math.max(Ue, Math.min(Kt, L - E))),
            A === "left" && (H.panelWidth = Math.max(Ue, Math.min(Kt, L + E))),
            A === "top" && (H.panelHeight = Math.max(ze, Math.min(Ft, S + M))),
            A === "bottom" && (H.panelHeight = Math.max(ze, Math.min(Ft, S - M))),
            (s = H),
            ne(r, o, i, s));
        },
        u = () => {
          (i.classList.remove("dragging"),
            document.removeEventListener("mousemove", O),
            document.removeEventListener("mouseup", u),
            Wt(s));
        };
      (document.addEventListener("mousemove", O), document.addEventListener("mouseup", u));
    });
    let y = () => ne(r, o, i, s);
    window.addEventListener("resize", y);
    function v(b) {
      ((l = b),
        zt(b),
        w.forEach((_, x) => _.classList.toggle("active", x === b)),
        o.classList.add("open"),
        ne(r, o, i, s),
        k(b));
    }
    function f() {
      (o.classList.remove("open"),
        w.forEach((b) => b.classList.remove("active")),
        (l = null),
        zt(null));
    }
    function d(b) {
      l === b ? f() : v(b);
    }
    function h(b, _) {
      let x = typeof window < "u" && window.location ? window.location.host : "",
        L = x ? `<span class="sub">${x}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${b}</span>
          <span class="panel-title-label">${_}</span>
          ${L}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${kr}</button>
      </div>`;
    }
    function k(b) {
      let { icon: _, label: x } = ue[b];
      if (!c) {
        T(b);
        return;
      }
      let L = new le(e.adminUrl, c.token);
      ((a.innerHTML = `
      ${h(_, x)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        a.querySelector("#se-close").addEventListener("click", f),
        a.querySelector("#se-signout").addEventListener("click", () => {
          (We(), (c = null), T(b));
        }),
        a.querySelector("#se-clearall").addEventListener("click", () => {
          (tt(), k(b));
        }),
        a.querySelector("#se-apply-url").addEventListener("click", () => {
          nt();
        }),
        a.querySelector("#se-share").addEventListener("click", async () => {
          let u = Ee({ ...ke(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(u);
            let m = a.querySelector("#se-share"),
              E = m.textContent;
            ((m.textContent = "Copied \u2713"), setTimeout(() => (m.textContent = E), 1500));
          } catch {
            prompt("Copy this URL:", u);
          }
        }));
      let S = a.querySelector("#se-body"),
        A = a.querySelector("#se-subfoot");
      ({
        gates: () => rt(S, L),
        configs: () => st(S, L),
        experiments: () => lt(S, L),
        i18n: () => Ot(S, L, A, n),
        bugs: () => Nt(S, L, n),
        features: () => Ut(S, L, n),
      })
        [b]()
        .catch((u) => {
          S.innerHTML = `<div class="err">${String(u)}</div>`;
        });
    }
    function T(b) {
      let { icon: _, label: x } = ue[b];
      ((a.innerHTML = `
      ${h(_, x)}
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
        a.querySelector("#se-close").addEventListener("click", f),
        a.querySelector("#se-connect").addEventListener("click", async () => {
          let L = a.querySelector("#se-connect"),
            S = a.querySelector("#se-auth-status"),
            A = a.querySelector("#se-auth-err");
          ((L.disabled = !0),
            (L.textContent = "Opening\u2026"),
            (S.textContent = ""),
            (A.textContent = ""));
          try {
            ((c = await Ge(e, () => {
              ((S.textContent = "Waiting for approval in the opened tab\u2026"),
                (L.textContent = "Waiting\u2026"));
            })),
              k(b));
          } catch (O) {
            ((A.textContent = O instanceof Error ? O.message : String(O)),
              (S.textContent = ""),
              (L.disabled = !1),
              (L.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      setTimeout(() => {
        document.getElementById("shipeasy-devtools") || document.body.appendChild(t);
      }, 100),
      K() && (j(), J(!0, n, () => {})),
      g && requestAnimationFrame(() => v(g)),
      {
        destroy() {
          (window.removeEventListener("resize", y), t.remove());
        },
      }
    );
  }
  function Mr() {
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
  var re = null;
  function Vt(e = {}) {
    if (re || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? Mr() },
      { destroy: n } = Jt(t);
    re = n;
  }
  function Rr() {
    (re?.(), (re = null));
  }
  function Xt(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    ie() && Vt(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      a = n.includes("Ctrl") || n.includes("Control"),
      s = n.includes("Meta") || n.includes("Cmd"),
      l = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function c(g) {
      (l ? g.code === l : g.key.toLowerCase() === r.toLowerCase()) &&
        g.shiftKey === o &&
        g.altKey === i &&
        g.ctrlKey === a &&
        g.metaKey === s &&
        (re ? Rr() : Vt(e));
    }
    return (window.addEventListener("keydown", c), () => window.removeEventListener("keydown", c));
  }
  function Ar() {
    if (document.getElementById("se-edit-labels-exit")) return;
    let e = document.createElement("button");
    ((e.id = "se-edit-labels-exit"),
      (e.type = "button"),
      (e.textContent = "\u2715 Stop editing labels"),
      (e.title = "Exit in-page label editing"),
      Object.assign(e.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: "2147483646",
        padding: "8px 12px",
        background: "#0f172a",
        color: "#f8fafc",
        border: "1px solid rgba(248, 250, 252, 0.18)",
        borderRadius: "999px",
        font: "600 12px ui-sans-serif, system-ui, -apple-system, sans-serif",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
      }),
      e.addEventListener("mouseenter", () => {
        e.style.background = "#1e293b";
      }),
      e.addEventListener("mouseleave", () => {
        e.style.background = "#0f172a";
      }),
      e.addEventListener("click", () => V(!1)),
      document.body
        ? document.body.appendChild(e)
        : document.addEventListener("DOMContentLoaded", () => document.body.appendChild(e), {
            once: !0,
          }));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((Xt(e), K())) {
      Ar();
      let t = !1,
        n = new MutationObserver(() => r()),
        r = () => {
          t ||
            ((t = !0),
            requestAnimationFrame(() => {
              ((t = !1),
                n.disconnect(),
                j(),
                n.observe(document.body, { childList: !0, subtree: !0, attributes: !0 }));
            }));
        };
      r();
      let o = () => {
        let a = document.getElementById("shipeasy-devtools");
        if (!a?.shadowRoot) {
          setTimeout(o, 100);
          return;
        }
        J(!0, a.shadowRoot, () => r());
      };
      (o(), window.addEventListener("se:i18n:ready", () => r(), { once: !0 }));
      let i = window;
      i.i18n?.on && i.i18n.on("update", () => r());
    }
    window.__se_devtools_ready = !0;
  }
})();
