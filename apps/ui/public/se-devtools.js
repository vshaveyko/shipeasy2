"use strict";
(() => {
  var rn = Object.create;
  var ve = Object.defineProperty;
  var on = Object.getOwnPropertyDescriptor;
  var sn = Object.getOwnPropertyNames;
  var an = Object.getPrototypeOf,
    ln = Object.prototype.hasOwnProperty;
  var dn = (e, t, n) =>
    t in e ? ve(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var cn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var un = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of sn(t))
        !ln.call(e, o) &&
          o !== n &&
          ve(e, o, { get: () => t[o], enumerable: !(r = on(t, o)) || r.enumerable });
    return e;
  };
  var pn = (e, t, n) => (
    (n = e != null ? rn(an(e)) : {}),
    un(t || !e || !e.__esModule ? ve(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var $ = (e, t, n) => dn(e, typeof t != "symbol" ? t + "" : t, n);
  var _t = cn((Zr, St) => {
    "use strict";
    var Oe = Object.defineProperty,
      Sn = Object.getOwnPropertyDescriptor,
      _n = Object.getOwnPropertyNames,
      Tn = Object.prototype.hasOwnProperty,
      Mn = (e, t) => {
        for (var n in t) Oe(e, n, { get: t[n], enumerable: !0 });
      },
      Rn = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of _n(t))
            !Tn.call(e, o) &&
              o !== n &&
              Oe(e, o, { get: () => t[o], enumerable: !(r = Sn(t, o)) || r.enumerable });
        return e;
      },
      $n = (e) => Rn(Oe({}, "__esModule", { value: !0 }), e),
      mt = {};
    Mn(mt, {
      FlagsClientBrowser: () => vt,
      LABEL_MARKER_END: () => kt,
      LABEL_MARKER_RE: () => Wn,
      LABEL_MARKER_SEP: () => Et,
      LABEL_MARKER_START: () => wt,
      _resetShipeasyForTests: () => Fn,
      attachDevtools: () => bt,
      configureShipeasy: () => Ie,
      encodeLabelMarker: () => Lt,
      flags: () => xt,
      getShipeasyClient: () => Kn,
      i18n: () => or,
      isDevtoolsRequested: () => $e,
      labelAttrs: () => Gn,
      loadDevtools: () => Ae,
      readConfigOverride: () => Be,
      readExpOverride: () => ht,
      readGateOverride: () => He,
      shipeasy: () => yt,
      version: () => An,
    });
    St.exports = $n(mt);
    var An = "1.0.0",
      Pn = 5e3,
      Cn = 100,
      ut = "__se_anon_id",
      pt = "__se_seen",
      Q = "__se_pending_alias",
      On = class {
        constructor(e, t) {
          $(this, "collectUrl");
          $(this, "sdkKey");
          $(this, "queue", []);
          $(this, "exposureSeen", new Set());
          $(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), Pn)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(pt);
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
              sessionStorage.setItem(pt, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(Q, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(Q);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(Q);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(Q);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(Q));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= Cn && this.flush());
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
      ue = 5;
    function Hn(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
        d = !1;
      try {
        new PerformanceObserver((m) => {
          let f = m.getEntries();
          f.length && (r = f[f.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((m) => {
          for (let f of m.getEntries()) {
            let l = f.duration ?? 0;
            (o === null || l > o) && (o = l);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((m) => {
          for (let f of m.getEntries()) f.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let c = window.onerror;
      ((window.onerror = (b, m, f, l, h) => (
        a < ue &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof b == "string" ? b.slice(0, 200) : String(h ?? "").slice(0, 200),
            source: typeof m == "string" ? m.slice(0, 200) : "",
            line: f ?? 0,
          })),
        typeof c == "function" ? c(b, m, f, l, h) : !1
      )),
        window.addEventListener("unhandledrejection", (b) => {
          if (a < ue) {
            a += 1;
            let m = b.reason,
              f = m instanceof Error ? m.message : typeof m == "string" ? m : String(m);
            e.pushMetric("__auto_js_error", t, n, {
              value: 1,
              kind: "unhandled_rejection",
              message: f.slice(0, 200),
            });
          }
        }));
      let g = window.fetch;
      window.fetch = async function (...b) {
        let m = typeof performance < "u" ? performance.now() : 0,
          f = typeof b[0] == "string" ? b[0] : b[0].toString(),
          l;
        try {
          l = await g.apply(this, b);
        } catch (h) {
          throw (
            s < ue &&
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
        if (l.status >= 500 && s < ue) {
          s += 1;
          let h = typeof performance < "u" ? performance.now() - m : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: l.status,
            url: f.slice(0, 200),
            duration_ms: Math.round(h),
          });
        }
        return l;
      };
      let u = () => {
        if (!d) {
          d = !0;
          try {
            let m = performance.getEntriesByType("navigation")[0];
            if (m) {
              let l = m.startTime ?? 0;
              (m.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, n, { value: m.loadEventEnd - l }),
                m.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, n, { value: m.responseStart - l }),
                m.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, n, {
                    value: m.domContentLoadedEventEnd - l,
                  }));
            }
            let f = performance.getEntriesByType("paint");
            for (let l of f)
              l.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, n, { value: l.startTime })
                : l.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, n, { value: l.startTime });
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
      let w = () => {
        (u(),
          r !== null && e.pushMetric("__auto_lcp", t, n, { value: r }),
          o !== null && e.pushMetric("__auto_inp", t, n, { value: o }),
          i && e.pushMetric("__auto_cls_binary", t, n, { value: 1 }));
        let b = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: b }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && w();
      });
    }
    function Bn() {
      try {
        let t = localStorage.getItem(ut);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(ut, e);
      } catch {}
      return e;
    }
    function In() {
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
    function Dn() {
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
    var vt = class {
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
            (this.anonId = Bn()),
            (this.buffer = new On(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...In(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: Dn() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), Hn(this.buffer, this.userId, this.anonId)),
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
          let t = He(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = Be(e),
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
            i = ht(e);
          if (i !== null) {
            let s = r?.[i],
              d = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: i, params: d };
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
      qn = /^(true|on|1|yes)$/i,
      Nn = /^(false|off|0|no)$/i;
    function Un(e) {
      return qn.test(e) ? !0 : Nn.test(e) ? !1 : null;
    }
    function zn(e) {
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
    function ee(e, t) {
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
    function He(e) {
      let t = ee(`se_ks_${e}`) ?? ee(`se_gate_${e}`) ?? ee(`se-gate-${e}`);
      return t === null ? null : Un(t);
    }
    function Be(e) {
      let t = ee(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return zn(t);
    }
    function ht(e) {
      let t = ee(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function $e() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function Ae(e = {}) {
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
    function bt(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = r[r.length - 1],
        i = r.includes("Shift"),
        a = r.includes("Alt"),
        s = r.includes("Ctrl") || r.includes("Control"),
        d = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), $e() && Ae({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let c = $e();
      function g(w) {
        w.key === o &&
          w.shiftKey === i &&
          w.altKey === a &&
          w.ctrlKey === s &&
          w.metaKey === d &&
          (c
            ? window.__shipeasy_devtools?.toggle()
            : ((c = !0), Ae({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", g);
      let u = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", g), u());
      };
    }
    var P = null;
    function yt(e) {
      let t = Ie({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (xt.notifyMounted(), bt(t, { adminUrl: e.adminUrl }));
    }
    function Ie(e) {
      return P || ((P = new vt(e)), P);
    }
    function Kn() {
      return P;
    }
    function Fn() {
      (P?.destroy(), (P = null));
    }
    function ft() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var Te = !1,
      Pe = new Set(),
      gt = !1;
    function jn() {
      gt ||
        typeof window > "u" ||
        ((gt = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of Pe) e();
        }));
    }
    var xt = {
        configure(e) {
          Ie(e);
        },
        identify(e) {
          return P
            ? P.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = ft();
          return t !== null && e in t.flags
            ? t.flags[e]
            : Te
              ? P
                ? P.getFlag(e)
                : (He(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = ft();
          if (n !== null && e in n.configs) {
            let o = n.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!Te) return;
          if (P) return P.getConfig(e, t);
          let r = Be(e);
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
          return P?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          P?.track(e, t);
        },
        flush() {
          return P?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((Te = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return P ? P.subscribe(e) : (Pe.add(e), jn(), () => Pe.delete(e));
        },
        get ready() {
          return P?.ready ?? !1;
        },
      },
      wt = "\uFFF9",
      Et = "\uFFFA",
      kt = "\uFFFB",
      Wn = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function Lt(e, t) {
      return `${wt}${e}${Et}${t}${kt}`;
    }
    function Gn(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var Jn = null,
      Vn = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      Xn = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function Yn() {
      return globalThis[Vn]?.() ?? null;
    }
    function Zn() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[Xn];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function pe(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let o = t[r];
            return o != null ? String(o) : n;
          })
        : e;
    }
    var Qn = typeof document < "u",
      er = [
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
    function tr() {
      let e = {};
      for (let t of er)
        e[t] = Qn
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var nr = tr(),
      Ce = {},
      Me = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function rr(e, t) {
      let n = [],
        r = 0,
        o,
        i = !0;
      for (Me.lastIndex = 0; (o = Me.exec(e)) !== null; ) {
        o.index > r && n.push(e.slice(r, o.index));
        let a = o[1],
          s = o[2] ?? "",
          d = t[a] ?? Ce[a] ?? nr[a];
        if (d) {
          let c = d(s);
          (typeof c != "string" && (i = !1), n.push(c));
        } else n.push(s);
        r = Me.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), i ? n.join("") : n);
    }
    function Re(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = Yn();
      if (n?.strings[e]) return pe(n.strings[e], t);
    }
    var or = {
      t(e, t, n) {
        let r, o;
        typeof t == "string" ? ((r = t), (o = n)) : (o = t);
        let i = Re(e, o);
        return i !== void 0 ? i : r !== void 0 ? pe(r, o) : e;
      },
      rich(e, t, n, r) {
        let i = Re(e, r) ?? pe(t, r);
        return rr(i, n ?? {});
      },
      tEl(e, t, n, r) {
        if (Zn()) {
          let i = Re(e, n) ?? pe(t, n);
          return Lt(e, i);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && (Ce = { ...Ce, ...e.components }),
          e.createElement && (Jn = e.createElement));
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
      e?.apiKey && !P && yt({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var We = `
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
  var he = "se_dt_session";
  function Ge() {
    try {
      let e = sessionStorage.getItem(he);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function fn(e) {
    try {
      sessionStorage.setItem(he, JSON.stringify(e));
    } catch {}
  }
  function Je() {
    try {
      sessionStorage.removeItem(he);
    } catch {}
  }
  async function Ve(e, t) {
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
        function g(f, l) {
          c ||
            ((c = !0),
            window.removeEventListener("message", u),
            clearInterval(b),
            clearTimeout(m),
            f ? s(f) : a(l));
        }
        function u(f) {
          if (f.origin !== n) return;
          let l = f.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let h = { token: l.token, projectId: l.projectId };
          (fn(h), g(null, h));
        }
        window.addEventListener("message", u);
        let w = Date.now(),
          b = setInterval(() => {
            Date.now() - w < 1500 ||
              (i.closed && !c && g(new Error("Sign-in window closed before approval.")));
          }, 500),
          m = setTimeout(() => {
            g(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var gn = /^(true|on|1|yes)$/i,
    mn = /^(false|off|0|no)$/i,
    Xe = /^se(?:_|-|$)/;
  function ie(e) {
    return gn.test(e) ? !0 : mn.test(e) ? !1 : null;
  }
  function be(e) {
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
  function Ye(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function le() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function D(e, t) {
    let n = le(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let o = n.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function U(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function de() {
    if (typeof window > "u") return !1;
    let e = le();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function z() {
    return typeof window > "u" ? !1 : le().has("se_edit_labels");
  }
  function Y(e) {
    if (!e && typeof document < "u")
      try {
        document.cookie = "se_edit_labels=;path=/;max-age=0;samesite=lax";
      } catch {}
    U([["se_edit_labels", e ? "1" : null]]);
  }
  function ye(e) {
    let t = D(`se_ks_${e}`) ?? D(`se_gate_${e}`) ?? D(`se-gate-${e}`);
    return t === null ? null : ie(t);
  }
  function Ze(e, t, n = "session") {
    U([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function xe(e) {
    let t = D(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return be(t);
  }
  function we(e, t, n = "session") {
    U([
      [`se_config_${e}`, t == null ? null : Ye(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Qe(e) {
    let t = D(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function et(e, t, n = "session") {
    U([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Z() {
    return D("se_i18n");
  }
  function tt(e, t = "session") {
    U([["se_i18n", e]]);
  }
  function Ee() {
    return D("se_i18n_draft");
  }
  function nt(e, t = "session") {
    U([["se_i18n_draft", e]]);
  }
  function K(e) {
    return D(`se_i18n_label_${e}`);
  }
  function ke(e, t, n = "session") {
    U([[`se_i18n_label_${e}`, t]]);
  }
  function rt() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) Xe.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Le(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) Xe.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, Ye(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function Se() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = le();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let o = ie(r);
        o !== null && (e.gates[n.slice(6)] = o);
      } else if (n.startsWith("se_gate_")) {
        let o = ie(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else if (n.startsWith("se-gate-")) {
        let o = ie(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = be(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function ot(e) {
    if (typeof window > "u") return;
    let t = { ...Se(), ...e, openDevtools: !0 },
      n = Le(t);
    window.location.assign(n);
  }
  var ce = class {
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
          let d = new URLSearchParams();
          return (
            t && d.set("profile_id", t),
            d.set("limit", String(500)),
            d.set("offset", String(s)),
            `?${d.toString()}`
          );
        },
        o = async (s) => {
          let d = await this.get(`/api/admin/i18n/keys${r(s)}`);
          if (Array.isArray(d)) return { keys: d, total: d.length };
          let c = d.keys ?? [],
            g = d.total ?? c.length;
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
  function B(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${_e(e.title)}</div>
      <div class="empty-msg">${_e(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${_e(e.ctaLabel)}</a>
    </div>`;
  }
  function _e(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function vn() {
    return window.__shipeasy ?? null;
  }
  function hn(e) {
    let t = ye(e.name),
      n = vn()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function bn(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function st(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = B({
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
          <td class="col-badge">${hn(a)}</td>
          <td class="col-control">${bn(a.name, ye(a.name))}</td>
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
              d = a.dataset.v;
            (Ze(s, d === "default" ? null : d === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function yn(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function at(e) {
    return xe(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function it(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = B({
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
          let d = xe(s.name),
            c = d !== void 0 ? d : s.valueJson;
          return r.has(s.name)
            ? `
            <tr data-config="${s.name}">
              <td colspan="4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="col-name" style="flex:1">${s.name}</span>
                  ${at(s.name)}
                  <button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>
                </div>
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(c, null, 2)}</textarea>
                <div class="edit-row" style="display:flex;gap:6px;margin-top:6px">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${d !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>
              </td>
            </tr>`
            : `
          <tr data-config="${s.name}">
            <td class="col-name">${s.name}</td>
            <td class="col-value">${yn(c)}</td>
            <td class="col-badge">${at(s.name)}</td>
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
      function a(s, d) {
        let c = s.dataset.name,
          g = e.querySelector(`textarea[data-name="${c}"]`);
        if (g)
          try {
            let u = JSON.parse(g.value);
            (we(c, u, d), r.delete(c), o());
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
            (we(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function xn() {
    return window.__shipeasy ?? null;
  }
  function wn(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function En(e) {
    let t = Qe(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function kn(e) {
    let t = xn()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function Ln(e) {
    let t = e.status === "running";
    return `
    <tr>
      <td class="col-name">${e.name}</td>
      <td class="col-badge">${wn(e.status)}</td>
      <td class="col-badge">${t ? kn(e.name) : ""}</td>
      <td class="col-control">${t ? En(e) : ""}</td>
    </tr>`;
  }
  function lt(e, t) {
    return e.length === 0
      ? ""
      : `
    <div class="sec-head">${t}</div>
    <div class="dt-scroll">
      <table class="dt-table">
        <thead><tr>
          <th>Name</th><th>Status</th><th>Live</th><th style="text-align:right">Override</th>
        </tr></thead>
        <tbody>${e.map(Ln).join("")}</tbody>
      </table>
    </div>`;
  }
  function dt(e, t, n, r) {
    let o = n.filter((s) => s.universe === t.name);
    if (o.length === 0) {
      e.innerHTML = B({
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
    ((e.innerHTML = lt(i, "Running") + lt(a, "Other")),
      e.querySelectorAll(".exp-sel").forEach((s) => {
        s.addEventListener("change", () => {
          let d = s.dataset.name;
          et(d, s.value || null);
        });
      }));
  }
  async function ct(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load: ${String(a)}</div>`;
      return;
    }
    if (r.length === 0) {
      e.innerHTML = B({
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
        d = r.find((c) => c.name === o.activeUniverse);
      dt(s, d, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let a = e.querySelector(".tab-body"),
          s = r.find((d) => d.name === o.activeUniverse);
        a && s && dt(a, s, n, t.adminUrl);
      }));
  }
  var fe = pn(_t(), 1);
  var W = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function sr(e) {
    let t = new Map();
    for (let n of e) {
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        i = r.length > 1 ? r.slice(1) : r;
      t.has(o) || t.set(o, { segment: o, children: [] });
      let a = t.get(o);
      for (let s = 0; s < i.length; s++) {
        let d = i[s],
          c = a.children.find((g) => g.segment === d);
        (c || ((c = { segment: d, children: [] }), a.children.push(c)), (a = c));
      }
      ((a.value = n.value), (a.fullKey = n.key));
    }
    for (let n of t.values()) At(n);
    return t;
  }
  function At(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) At(t);
  }
  function A(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Pt(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? K(e.fullKey) : null,
        i = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${A(e.fullKey ?? "")}">
        <span class="tree-seg">${A(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${A(i)}">${A(i)}</span>
      </div>`;
    }
    let r = e.children.map((o) => Pt(o, t + 1)).join("");
    return `
    <div class="tree-branch">
      <div class="tree-row branch" role="button" tabindex="0" style="padding-left:${n}px" data-branch>
        <span class="tree-caret">\u25BE</span>
        <span class="tree-seg">${A(e.segment)}</span>
      </div>
      <div class="tree-children">${r}</div>
    </div>`;
  }
  var q = "__se_label_target",
    qe = "__se_label_target_style",
    F = !1,
    De = null,
    G = null,
    Ct = null,
    Ot = [];
  function ar() {
    if (document.getElementById(qe)) return;
    let e = document.createElement("style");
    ((e.id = qe),
      (e.textContent = `
    .${q} {
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
    .${q}:hover,
    .${q}.__se_label_active {
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
  function Tt() {
    document.getElementById(qe)?.remove();
  }
  function j(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let a = o.nodeValue ?? "";
      if (
        !a.includes(fe.LABEL_MARKER_START) ||
        r.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        d = 0;
      W.lastIndex = 0;
      let c;
      for (; (c = W.exec(a)) !== null; ) {
        c.index > d && s.appendChild(document.createTextNode(a.slice(d, c.index)));
        let g = c[1],
          u = c[2],
          w = c[3],
          b = document.createElement("span");
        (b.setAttribute("data-label", g), u && b.setAttribute("data-variables", u));
        let m = K(g),
          f = null;
        if (u)
          try {
            f = JSON.parse(u);
          } catch {
            f = null;
          }
        ((b.textContent = m !== null ? ge(m, f) : w),
          s.appendChild(b),
          (d = c.index + c[0].length));
      }
      (d < a.length && s.appendChild(document.createTextNode(a.slice(d))), n.push([o, s]));
    }
    for (let [a, s] of n) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        d = a.getAttribute("data-label"),
        c = K(d);
      if (s.includes(fe.LABEL_MARKER_START)) {
        W.lastIndex = 0;
        let g = W.exec(s);
        if (g) {
          g[2] && a.setAttribute("data-variables", g[2]);
          let u = g[2] ? ir(g[2]) : null;
          a.textContent = c !== null ? ge(c, u) : g[3];
        }
      } else if (i)
        try {
          let g = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            u = i(d, g);
          c !== null ? (a.textContent = ge(c, g ?? null)) : u && u !== d && (a.textContent = u);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = Ne(a),
        d = new Map();
      for (let g of s) d.set(g.attr, g);
      let c = !1;
      for (let g of Array.from(a.attributes)) {
        let u = g.value;
        if (!u.includes(fe.LABEL_MARKER_START)) continue;
        W.lastIndex = 0;
        let w = W.exec(u);
        if (!w) continue;
        let b = w[1],
          m = w[3],
          f = K(b);
        (a.setAttribute(g.name, f ?? m),
          d.set(g.name, { attr: g.name, key: b, original: m }),
          (c = !0));
      }
      c && Bt(a, Array.from(d.values()));
    }
    return n.length;
  }
  function Mt(e) {
    let t = [],
      n = /\{\{(\w+)\}\}/g,
      r;
    for (; (r = n.exec(e)) !== null; ) t.push(r[1]);
    return t;
  }
  function ge(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
          let o = t[r];
          return o != null ? String(o) : `{{${r}}}`;
        })
      : e;
  }
  function ir(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  function Ht(e) {
    let n = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof n == "string" ? n : null;
  }
  function Ne(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let n = JSON.parse(t);
      if (Array.isArray(n)) return n;
    } catch {}
    return [];
  }
  function Bt(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var lr = "[data-label], [data-label-attrs]";
  function te() {
    return Array.from(document.querySelectorAll(lr));
  }
  function N() {
    (G?.remove(),
      (G = null),
      document.querySelectorAll(`.${q}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function It(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let n = Ne(e.target),
        r = n.findIndex((o) => o.attr === e.attr);
      r >= 0 && ((n[r] = { ...n[r], original: t }), Bt(e.target, n));
    }
  }
  async function dr(e, t, n) {
    let r = n.querySelector(".lp-err"),
      o = n.querySelector('[data-action="save"]'),
      i = K(e.key),
      a = Ht(e.key),
      s = Mt(i ?? a ?? ""),
      d = Mt(t),
      c = s.filter((l) => !d.includes(l)),
      g = d.filter((l) => !s.includes(l));
    if (c.length || g.length) {
      if (r) {
        let l = [];
        (c.length && l.push(`missing {{${c.join("}}, {{")}}}`),
          g.length && l.push(`unknown {{${g.join("}}, {{")}}}`),
          (r.textContent = `Placeholders must match exactly \u2014 ${l.join("; ")}.`));
      }
      return;
    }
    let u = e.variables ?? {},
      w = ge(t, u);
    (It(e, w),
      ke(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let b = Ee(),
      m = Z(),
      f = Ct;
    if (!f || (!b && !m)) {
      N();
      return;
    }
    ((o.disabled = !0), (o.textContent = "Saving\u2026"), r && (r.textContent = ""));
    try {
      if (b) await f.upsertDraftKey(b, e.key, t);
      else if (m) {
        let l = Ot.find((h) => h.key === e.key && h.profileId === m);
        l && (await f.updateKeyById(l.id, t));
      }
      N();
    } catch (l) {
      ((o.disabled = !1),
        (o.textContent = "Save"),
        r && (r.textContent = l instanceof Error ? l.message : String(l)));
    }
  }
  function Rt(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function cr(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: Rt(e),
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
            variables: Rt(r),
            desc: r.dataset.labelDesc ?? "",
          });
      }
      for (let n of Ne(e)) t.push({ kind: "attr", key: n.key, target: e, attr: n.attr });
    }
    return t;
  }
  function $t(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function ur(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let n = e.key.split(".").pop() || e.key;
    return t.filter((o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === n).length > 1
      ? e.key
      : "Text";
  }
  function pr(e, t) {
    (N(), e.classList.add("__se_label_active"));
    let n = cr(e);
    if (n.length === 0) return;
    let o = Z() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let d =
      n.length > 1
        ? `<div class="lp-tabs">${n
            .map((x, L) => {
              let S = ur(x, n),
                C = x.kind === "attr" ? `<span class="lp-tab-attr">${A(x.attr ?? "")}</span>` : "";
              return `<button class="${L === 0 ? "lp-tab active" : "lp-tab"}" data-surface-idx="${L}">${A(x.kind === "attr" ? "@" : S)}${x.kind === "attr" ? C : ""}</button>`;
            })
            .join("")}</div>`
        : "";
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
      t.appendChild(s));
    let c = s.querySelector(".lp-key"),
      g = s.querySelector(".lp-body"),
      u = s.querySelector(".lp-err"),
      w = s.querySelector('[data-action="save"]'),
      b = s.querySelector('[data-action="reset"]');
    function m() {
      return n[a];
    }
    function f() {
      let x = m();
      (i.has(a) || i.set(a, $t(x)), (c.textContent = x.key));
      let L = Ht(x.key),
        C = K(x.key) ?? L ?? $t(x),
        H = x.variables ?? {},
        p = Object.entries(H),
        v = p.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${p.map(([V, X]) => `<div class="lp-var"><span class="lp-var-k mono">${A(`{{${V}}}`)}</span><span class="lp-var-v">${A(String(X))}</span></div>`).join("")}</div>
        </div>`
          : "",
        E = x.desc ?? "",
        M = x.kind === "attr" ? `attribute \xB7 ${A(x.attr ?? "")}` : "text content";
      ((g.innerHTML = `
      <div class="lp-field">
        <label>Current profile</label>
        <span>${A(o)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${M}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${E ? "" : "empty"}">${E ? A(E) : "No description"}</span>
      </div>
      ${v}
      <div class="lp-field">
        <label>Template</label>
        <textarea class="lp-input" spellcheck="false">${A(C)}</textarea>
      </div>`),
        (u.textContent = ""),
        (w.disabled = !1),
        (w.textContent = "Save"));
      let O = g.querySelector(".lp-input");
      (O.focus(), O.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((x) => {
      x.addEventListener("click", () => {
        let L = Number(x.dataset.surfaceIdx);
        L !== a &&
          ((a = L),
          s.querySelectorAll(".lp-tab").forEach((S, C) => {
            S.classList.toggle("active", C === a);
          }),
          f());
      });
    }),
      f());
    let l = e.getBoundingClientRect(),
      h = s.offsetHeight,
      k = s.offsetWidth,
      T = 8,
      y = l.bottom + T;
    y + h > window.innerHeight - 8 && (y = Math.max(8, l.top - h - T));
    let _ = l.left;
    (_ + k > window.innerWidth - 8 && (_ = Math.max(8, window.innerWidth - k - 8)),
      (s.style.top = `${y}px`),
      (s.style.left = `${_}px`),
      s.querySelector(".lp-close").addEventListener("click", N),
      w.addEventListener("click", () => {
        let x = g.querySelector(".lp-input");
        dr(m(), x.value, s);
      }),
      b.addEventListener("click", () => {
        let x = m(),
          L = i.get(a) ?? "";
        (It(x, L),
          ke(x.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: x.key, value: null } }),
          ),
          N());
      }),
      s.addEventListener("click", (x) => x.stopPropagation()),
      s.addEventListener("mousedown", (x) => x.stopPropagation()),
      (G = s));
  }
  function J(e, t, n) {
    if (((F = e), De?.(), (De = null), !e)) {
      N();
      for (let u of te()) u.classList.remove(q);
      Tt();
      return;
    }
    ar();
    for (let u of te()) u.classList.add(q);
    function r(u) {
      return G !== null && u.composedPath().includes(G);
    }
    function o(u) {
      for (let w of u.composedPath())
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
    function a(u) {
      r(u) || (o(u) && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation()));
    }
    function s(u) {
      if (r(u)) return;
      let w = o(u);
      w && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation(), pr(w, t));
    }
    function d(u) {
      G && (r(u) || o(u) || N());
    }
    function c(u) {
      u.key === "Escape" && N();
    }
    let g = new MutationObserver(() => {
      if (F) {
        for (let u of te()) u.classList.add(q);
        n();
      }
    });
    g.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let u of i) document.addEventListener(u, a, !0);
    (document.addEventListener("click", s, !0),
      document.addEventListener("mousedown", d, !0),
      document.addEventListener("keydown", c),
      (De = () => {
        for (let u of i) document.removeEventListener(u, a, !0);
        (document.removeEventListener("click", s, !0),
          document.removeEventListener("mousedown", d, !0),
          document.removeEventListener("keydown", c),
          g.disconnect());
        for (let u of te()) u.classList.remove(q);
        Tt();
      }));
  }
  async function Dt(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (n.innerHTML = ""),
      (Ct = t));
    let o, i, a;
    try {
      let b = Z() ?? void 0;
      [o, i, a] = await Promise.all([t.profiles(), t.drafts(), t.keys(b)]);
    } catch (b) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(b)}</div>`;
      return;
    }
    Ot = a;
    let s = sr(a),
      d = Array.from(s.keys()),
      c = { activeChunk: d[0] ?? null };
    function g() {
      if (d.length === 0) {
        e.innerHTML = B({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let b = d
          .map(
            (l) =>
              `<button class="tab${l === c.activeChunk ? " active" : ""}" data-chunk="${A(l)}">${A(l)}</button>`,
          )
          .join(""),
        m = c.activeChunk ? s.get(c.activeChunk) : null,
        f = m ? m.children.map((l) => Pt(l, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${b}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${f}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((l) => {
          l.addEventListener("click", () => {
            ((c.activeChunk = l.dataset.chunk), g());
          });
        }),
        e.querySelectorAll(".tree-row.branch[data-branch]").forEach((l) => {
          let h = () => {
            let k = l.parentElement;
            if (!k) return;
            let T = k.classList.toggle("collapsed"),
              y = l.querySelector(".tree-caret");
            y && (y.textContent = T ? "\u25B8" : "\u25BE");
          };
          (l.addEventListener("click", h),
            l.addEventListener("keydown", (k) => {
              (k.key === "Enter" || k.key === " ") && (k.preventDefault(), h());
            }));
        }));
    }
    function u() {
      let b = Z() ?? "",
        m = Ee() ?? "";
      j();
      let f = te().length,
        l = F
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
            (y) =>
              `<option value="${A(y.id)}" ${b === y.id ? "selected" : ""}>${A(y.name)}</option>`,
          ),
        ].join(""),
        T = [
          '<option value="">No draft</option>',
          ...i.map(
            (y) =>
              `<option value="${A(y.id)}" ${m === y.id ? "selected" : ""}>${A(y.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${F ? " on" : ""}" id="se-edit-toggle" title="${A(h)}">
        <span class="dot"></span>
        ${A(l)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${k}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${T}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          z() ? Y(!1) : F ? (J(!1, r, () => u()), u()) : Y(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (y) => {
          let _ = y.target.value || null;
          tt(_);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (y) => {
          let _ = y.target.value || null;
          nt(_);
        }));
    }
    (z() && (j(), F || J(!0, r, () => u())),
      g(),
      u(),
      window.i18n?.on?.("update", () => {
        (j(), u());
      }));
  }
  function ne(e, t) {
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
    function d() {
      (n.removeEventListener("click", c),
        document.removeEventListener("keydown", g),
        n.remove(),
        t.onClose?.());
    }
    function c(u) {
      u.target === n && d();
    }
    function g(u) {
      u.key === "Escape" && d();
    }
    return (
      n.addEventListener("click", c),
      document.addEventListener("keydown", g),
      a.addEventListener("click", d),
      e.appendChild(n),
      { body: s, root: r, close: d }
    );
  }
  function qt(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function Nt(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 }),
      n = qt(e);
    try {
      let r = document.createElement("video");
      ((r.srcObject = t),
        (r.muted = !0),
        (r.playsInline = !0),
        await new Promise((c, g) => {
          let u = setTimeout(() => g(new Error("Capture stream timed out")), 5e3);
          ((r.onloadedmetadata = () => {
            (clearTimeout(u), c());
          }),
            (r.onerror = () => {
              (clearTimeout(u), g(new Error("Capture stream errored")));
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
          a.toBlob((u) => (u ? c(u) : g(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((r) => r.stop()), n());
    }
  }
  async function Ut(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n = qt(e);
    await new Promise((d) => requestAnimationFrame(() => d(null)));
    let o =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((d) =>
          MediaRecorder.isTypeSupported(d),
        ) ?? "",
      i = o ? new MediaRecorder(t, { mimeType: o }) : new MediaRecorder(t),
      a = [];
    (i.addEventListener("dataavailable", (d) => {
      d.data && d.data.size > 0 && a.push(d.data);
    }),
      i.start(500),
      t.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), i.state !== "inactive" && i.stop());
      }));
    function s() {
      (t.getTracks().forEach((d) => d.stop()), n());
    }
    return {
      stop() {
        return new Promise((d, c) => {
          if (i.state === "inactive") {
            if ((s(), a.length === 0)) {
              c(new Error("No recording data."));
              return;
            }
            d(new Blob(a, { type: o || "video/webm" }));
            return;
          }
          (i.addEventListener(
            "stop",
            () => {
              (s(), d(new Blob(a, { type: o || "video/webm" })));
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
  var zt = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Kt(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((p, v) => {
        let E = new Image();
        ((E.onload = () => p(E)),
          (E.onerror = () => v(new Error("Failed to load screenshot for annotation."))),
          (E.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), r.appendChild(o));
    let i = "pen",
      a = zt[0],
      s = [];
    function d(p) {
      ((i = p),
        o
          .querySelectorAll("[data-tool]")
          .forEach((v) => v.classList.toggle("on", v.dataset.tool === p)));
    }
    function c(p, v, E) {
      let M = document.createElement("button");
      return (
        (M.type = "button"),
        (M.className = "se-annot-btn"),
        (M.dataset.tool = p),
        (M.textContent = v),
        (M.title = E),
        M.addEventListener("click", () => d(p)),
        M
      );
    }
    (o.appendChild(c("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(c("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(c("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(c("text", "T text", "Text (T)")),
      d("pen"));
    let g = document.createElement("span");
    ((g.className = "se-annot-sep"), o.appendChild(g));
    for (let p of zt) {
      let v = document.createElement("button");
      ((v.type = "button"),
        (v.className = "se-annot-swatch"),
        (v.dataset.color = p),
        (v.style.background = p),
        p === a && v.classList.add("on"),
        v.addEventListener("click", () => {
          ((a = p),
            o
              .querySelectorAll("[data-color]")
              .forEach((E) => E.classList.toggle("on", E.dataset.color === p)));
        }),
        o.appendChild(v));
    }
    let u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "se-annot-btn"),
      (u.textContent = "\u21B6 undo"),
      (u.title = "Undo (Ctrl/Cmd+Z)"),
      u.addEventListener("click", () => {
        (s.pop(), _());
      }),
      o.appendChild(u));
    let w = document.createElement("button");
    ((w.type = "button"),
      (w.className = "se-annot-btn"),
      (w.textContent = "clear"),
      w.addEventListener("click", () => {
        ((s.length = 0), _());
      }),
      o.appendChild(w));
    let b = document.createElement("div");
    ((b.className = "se-annot-stage"), r.appendChild(b));
    let m = document.createElement("canvas");
    ((m.width = n.naturalWidth),
      (m.height = n.naturalHeight),
      (m.className = "se-annot-canvas"),
      (m.style.cursor = "crosshair"),
      (m.style.touchAction = "none"),
      b.appendChild(m));
    let f = m.getContext("2d"),
      l = null;
    function h(p) {
      let v = m.getBoundingClientRect(),
        E = m.width / v.width,
        M = m.height / v.height;
      return { x: (p.clientX - v.left) * E, y: (p.clientY - v.top) * M };
    }
    function k() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function T() {
      return Math.max(14, Math.round(n.naturalWidth / 60));
    }
    function y(p) {
      if (
        (f.save(),
        (f.strokeStyle = p.color),
        (f.fillStyle = p.color),
        (f.lineWidth = k()),
        (f.lineCap = "round"),
        (f.lineJoin = "round"),
        p.tool === "rect")
      ) {
        let v = Math.min(p.x1, p.x2),
          E = Math.min(p.y1, p.y2),
          M = Math.abs(p.x2 - p.x1),
          O = Math.abs(p.y2 - p.y1);
        f.strokeRect(v, E, M, O);
      } else if (p.tool === "arrow") {
        (f.beginPath(), f.moveTo(p.x1, p.y1), f.lineTo(p.x2, p.y2), f.stroke());
        let v = Math.atan2(p.y2 - p.y1, p.x2 - p.x1),
          E = k() * 5;
        (f.beginPath(),
          f.moveTo(p.x2, p.y2),
          f.lineTo(p.x2 - E * Math.cos(v - Math.PI / 6), p.y2 - E * Math.sin(v - Math.PI / 6)),
          f.lineTo(p.x2 - E * Math.cos(v + Math.PI / 6), p.y2 - E * Math.sin(v + Math.PI / 6)),
          f.closePath(),
          f.fill());
      } else if (p.tool === "pen")
        if (p.points.length < 2) {
          if (p.points.length === 1) {
            let v = p.points[0];
            (f.beginPath(), f.arc(v.x, v.y, k() / 2, 0, Math.PI * 2), f.fill());
          }
        } else {
          (f.beginPath(), f.moveTo(p.points[0].x, p.points[0].y));
          for (let v = 1; v < p.points.length; v++) f.lineTo(p.points[v].x, p.points[v].y);
          f.stroke();
        }
      else if (p.tool === "text" && p.text) {
        let v = T();
        ((f.font = `600 ${v}px ui-sans-serif, system-ui, sans-serif`), (f.textBaseline = "top"));
        let E = v * 0.3,
          O = f.measureText(p.text).width + E * 2,
          V = v + E * 2;
        ((f.fillStyle = "rgba(0,0,0,0.55)"),
          f.fillRect(p.x1, p.y1, O, V),
          (f.fillStyle = p.color),
          f.fillText(p.text, p.x1 + E, p.y1 + E));
      }
      f.restore();
    }
    function _(p) {
      (f.clearRect(0, 0, m.width, m.height), f.drawImage(n, 0, 0));
      for (let v of s) y(v);
      p && y(p);
    }
    _();
    let x = null;
    function L(p, v) {
      x && x.blur();
      let E = m.getBoundingClientRect(),
        M = b.getBoundingClientRect(),
        O = E.width / m.width,
        V = E.height / m.height,
        X = T() * O,
        tn = X * 0.3,
        R = document.createElement("input");
      ((R.type = "text"),
        (R.className = "se-annot-text-input"),
        (R.style.position = "absolute"),
        (R.style.left = `${E.left - M.left + p * O}px`),
        (R.style.top = `${E.top - M.top + v * V}px`),
        (R.style.color = a),
        (R.style.background = "rgba(0,0,0,0.55)"),
        (R.style.border = `1px dashed ${a}`),
        (R.style.outline = "none"),
        (R.style.padding = `${tn}px`),
        (R.style.font = `600 ${X}px ui-sans-serif, system-ui, sans-serif`),
        (R.style.minWidth = `${X * 4}px`),
        (R.style.lineHeight = "1"),
        (R.placeholder = "type\u2026"));
      let ae = !1;
      function je() {
        if (ae) return;
        ae = !0;
        let I = R.value.trim();
        (R.remove(),
          (x = null),
          I && (s.push({ tool: "text", color: a, x1: p, y1: v, text: I }), _()));
      }
      function nn() {
        ae || ((ae = !0), R.remove(), (x = null));
      }
      (R.addEventListener("keydown", (I) => {
        (I.key === "Enter"
          ? (I.preventDefault(), je())
          : I.key === "Escape" && (I.preventDefault(), nn()),
          I.stopPropagation());
      }),
        R.addEventListener("blur", je),
        b.appendChild(R),
        (x = R),
        setTimeout(() => R.focus(), 0));
    }
    let S = null;
    (m.addEventListener("pointermove", (p) => {
      ((l = h(p)),
        S &&
          (S.kind === "pen"
            ? (S.shape.points.push(l), _())
            : _({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: S.x1,
                y1: S.y1,
                x2: l.x,
                y2: l.y,
              })));
    }),
      m.addEventListener("pointerdown", (p) => {
        p.preventDefault();
        let v = h(p);
        if (((l = v), i === "text")) {
          L(v.x, v.y);
          return;
        }
        if (i === "pen") {
          let E = { tool: "pen", color: a, points: [v] };
          (s.push(E), (S = { kind: "pen", shape: E }), m.setPointerCapture(p.pointerId), _());
          return;
        }
        ((S = { kind: "shape", x1: v.x, y1: v.y }), m.setPointerCapture(p.pointerId));
      }),
      m.addEventListener("pointerup", (p) => {
        if (!S) return;
        let v = h(p);
        if (S.kind === "shape") {
          let E = Math.abs(v.x - S.x1),
            M = Math.abs(v.y - S.y1);
          (E > 4 || M > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: S.x1, y1: S.y1, x2: v.x, y2: v.y });
        }
        ((S = null), _());
      }));
    function C(p) {
      if (!(p instanceof HTMLElement)) return !1;
      let v = p.tagName;
      return v === "INPUT" || v === "TEXTAREA" || p.isContentEditable;
    }
    function H(p) {
      if (!r.isConnected) {
        document.removeEventListener("keydown", H, !0);
        return;
      }
      if (C(p.target)) return;
      let v = p.key.toLowerCase();
      if ((p.ctrlKey || p.metaKey) && v === "z") {
        (p.preventDefault(), s.pop(), _());
        return;
      }
      if (!(p.ctrlKey || p.metaKey || p.altKey))
        if (v === "t") {
          (p.preventDefault(), d("text"));
          let E = l ?? { x: m.width / 2, y: m.height / 2 };
          L(E.x, E.y);
        } else v === "p" ? d("pen") : v === "a" ? d("arrow") : v === "r" && d("rect");
    }
    return (
      document.addEventListener("keydown", H, !0),
      {
        root: r,
        async export() {
          (x && x.blur(), await new Promise((v) => requestAnimationFrame(() => v(null))));
          let p = await new Promise((v, E) => {
            m.toBlob((M) => (M ? v(M) : E(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", H, !0), p);
        },
      }
    );
  }
  function re(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function fr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function gr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Ft(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let i;
      try {
        i = await t.bugs();
      } catch (s) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${re(String(s))}</div>`), o());
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
                <div class="row-name">${re(s.title)}</div>
                <div class="row-sub">${gr(s.createdAt)}${s.reporterEmail ? ` \xB7 ${re(s.reporterEmail)}` : ""}</div>
              </div>
              ${fr(s.status)}
            </a>`,
            )
            .join("")),
        o());
    }
    function o() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => mr(t, n, r));
    }
    await r();
  }
  function mr(e, t, n) {
    let r = ne(t, { title: "File a bug", size: "lg" }),
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
      d = r.body.querySelector("#se-b-actual"),
      c = r.body.querySelector("#se-b-expected"),
      g = r.body.querySelector("#se-b-attach"),
      u = r.body.querySelector("#se-b-status"),
      w = r.body.querySelector("#se-b-file"),
      b = r.body.querySelector("#se-b-record");
    function m() {
      if (o.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = o
        .map(
          (l, h) => `
          <div class="se-attach-item">
            <span>${re(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${h}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (o.splice(Number(l.dataset.idx), 1), m());
          });
        }));
    }
    function f(l, h = !1) {
      ((u.textContent = l), (u.style.color = h ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (r.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let l = await Nt(t.host);
        (f(""),
          vr(t, l, (h) => {
            (o.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: h }),
              m());
          }));
      } catch (l) {
        f(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      b.addEventListener("click", async () => {
        if (i) {
          try {
            ((b.disabled = !0), f("Finalizing recording\u2026"));
            let l = await i.stop();
            ((i = null),
              (b.textContent = "\u23FA Record screen"),
              b.classList.remove("danger"),
              o.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              m(),
              f(""));
          } catch (l) {
            f(String(l instanceof Error ? l.message : l), !0);
          } finally {
            b.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((i = await Ut(t.host)),
            (b.textContent = "\u25A0 Stop recording"),
            b.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (l) {
          (f(String(l instanceof Error ? l.message : l), !0), (i = null));
        }
      }),
      r.body.querySelector("#se-b-upload").addEventListener("click", () => w.click()),
      w.addEventListener("change", () => {
        let l = w.files?.[0];
        l && (o.push({ kind: "file", filename: l.name, blob: l }), (w.value = ""), m());
      }),
      r.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (i && i.cancel(), r.close());
      }),
      r.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let l = r.body.querySelector("#se-b-submit"),
          h = a.value.trim();
        if (!h) {
          (f("Title is required", !0), a.focus());
          return;
        }
        ((l.disabled = !0), f("Submitting\u2026"));
        try {
          let k = await e.createBug({
            title: h,
            stepsToReproduce: s.value,
            actualResult: d.value,
            expectedResult: c.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let T = 0; T < o.length; T++) {
            let y = o[T];
            (f(`Uploading attachment ${T + 1}/${o.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: k.id,
                kind: y.kind,
                filename: y.filename,
                blob: y.blob,
              }));
          }
          (r.close(), n());
        } catch (k) {
          (f(String(k instanceof Error ? k.message : k), !0), (l.disabled = !1));
        }
      }));
  }
  function vr(e, t, n) {
    let r = ne(e, { title: "Annotate screenshot", size: "lg" });
    r.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let o = r.body.querySelector("#se-annot-host");
    ((o.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Kt(t)
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
          o.innerHTML = `<div class="err">${re(String(i))}</div>`;
        }));
  }
  function Ue(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function hr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function br(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function yr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function jt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let o;
      try {
        o = await t.featureRequests();
      } catch (a) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${Ue(String(a))}</div>`;
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
                <div class="row-name">${Ue(a.title)}</div>
                <div class="row-sub">${yr(a.createdAt)}${a.reporterEmail ? ` \xB7 ${Ue(a.reporterEmail)}` : ""}</div>
              </div>
              ${br(a.importance)}
              ${hr(a.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => xr(t, n, r)));
    }
    await r();
  }
  function xr(e, t, n) {
    let r = ne(t, { title: "Request a feature", size: "lg" });
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
      d = r.body.querySelector("#se-f-status");
    (r.body.querySelector("#se-f-cancel").addEventListener("click", () => r.close()),
      r.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let c = o.value.trim();
        if (!c) {
          ((d.textContent = "Title is required"), (d.style.color = "var(--se-danger)"), o.focus());
          return;
        }
        let g = r.body.querySelector("#se-f-submit");
        ((g.disabled = !0),
          (d.textContent = "Submitting\u2026"),
          (d.style.color = "var(--se-fg-3)"));
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
        } catch (u) {
          ((d.textContent = String(u instanceof Error ? u.message : u)),
            (d.style.color = "var(--se-danger)"),
            (g.disabled = !1));
        }
      }));
  }
  var wr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    Er =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    kr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Lr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    Sr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    _r =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    Tr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Mr =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    me = {
      gates: { icon: wr, label: "Gates" },
      configs: { icon: Er, label: "Configs" },
      experiments: { icon: kr, label: "Experiments" },
      i18n: { icon: Lr, label: "Translations" },
      bugs: { icon: Sr, label: "Bugs" },
      features: { icon: _r, label: "Feature requests" },
    },
    Yt = "se_l_overlay",
    ze = "se_l_active_panel";
  function Rr() {
    try {
      let e = sessionStorage.getItem(ze);
      if (e && e in me) return e;
    } catch {}
    return null;
  }
  function Wt(e) {
    try {
      e === null ? sessionStorage.removeItem(ze) : sessionStorage.setItem(ze, e);
    } catch {}
  }
  var Ke = 240,
    Gt = 580,
    Fe = 180,
    Jt = 700,
    Vt = { edge: "right", offsetPct: 50, panelWidth: 440, panelHeight: 460 };
  function $r() {
    try {
      let e = localStorage.getItem(Yt);
      if (e) return { ...Vt, ...JSON.parse(e) };
    } catch {}
    return { ...Vt };
  }
  function Xt(e) {
    try {
      localStorage.setItem(Yt, JSON.stringify(e));
    } catch {}
  }
  function Ar(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((d, c) => d[0] - c[0]);
    let i = o[0][1],
      s = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: s };
  }
  function oe(e, t, n, r) {
    let { edge: o, offsetPct: i, panelWidth: a, panelHeight: s } = r,
      d = window.innerWidth,
      c = window.innerHeight,
      g = o === "left" || o === "right",
      u = Math.max(Ke, Math.min(a, d - 80)),
      w = Math.max(Fe, Math.min(s, c - 40)),
      b = (i / 100) * (g ? c : d),
      m = e.getBoundingClientRect(),
      f = g ? m.width || 52 : m.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = g ? "column" : "row"),
      (l.padding = g ? "8px 6px" : "6px 8px"),
      o === "right"
        ? ((l.right = "0"),
          (l.top = `${i}%`),
          (l.transform = "translateY(-50%)"),
          (l.borderRadius = "10px 0 0 10px"),
          (l.borderRight = "none"),
          (l.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : o === "left"
          ? ((l.left = "0"),
            (l.top = `${i}%`),
            (l.transform = "translateY(-50%)"),
            (l.borderRadius = "0 10px 10px 0"),
            (l.borderLeft = "none"),
            (l.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : o === "top"
            ? ((l.top = "0"),
              (l.left = `${i}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "0 0 10px 10px"),
              (l.borderTop = "none"),
              (l.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((l.bottom = "0"),
              (l.left = `${i}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "10px 10px 0 0"),
              (l.borderBottom = "none"),
              (l.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let h = t.style;
    if (
      ((h.top = h.bottom = h.left = h.right = h.transform = ""),
      (h.borderTop = h.borderBottom = h.borderLeft = h.borderRight = ""),
      (h.width = u + "px"),
      (h.height = w + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let T = Math.max(10, Math.min(c - w - 10, b - w / 2));
      ((h.right = f + "px"),
        (h.top = T + "px"),
        (h.borderRadius = "10px 0 0 10px"),
        (h.borderRight = "none"),
        (h.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let T = Math.max(10, Math.min(c - w - 10, b - w / 2));
      ((h.left = f + "px"),
        (h.top = T + "px"),
        (h.borderRadius = "0 10px 10px 0"),
        (h.borderLeft = "none"),
        (h.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let T = Math.max(10, Math.min(d - u - 10, b - u / 2));
      ((h.top = f + "px"),
        (h.left = T + "px"),
        (h.borderRadius = "0 0 10px 10px"),
        (h.borderTop = "none"),
        (h.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let T = Math.max(10, Math.min(d - u - 10, b - u / 2));
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
  function Zt(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${We}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), o.appendChild(i));
    let a = document.createElement("div");
    ((a.className = "panel-inner"), o.appendChild(a));
    let s = $r(),
      d = null,
      c = Ge(),
      g = Rr();
    requestAnimationFrame(() => oe(r, o, i, s));
    let u = document.createElement("div");
    ((u.className = "drag-handle"),
      (u.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (u.innerHTML = Mr),
      r.appendChild(u),
      u.addEventListener("mousedown", (y) => {
        (y.preventDefault(), u.classList.add("dragging"));
        let _ = (L) => {
            let { edge: S, offsetPct: C } = Ar(L.clientX, L.clientY);
            ((s = { ...s, edge: S, offsetPct: C }), oe(r, o, i, s));
          },
          x = () => {
            (u.classList.remove("dragging"),
              document.removeEventListener("mousemove", _),
              document.removeEventListener("mouseup", x),
              Xt(s));
          };
        (document.addEventListener("mousemove", _), document.addEventListener("mouseup", x));
      }));
    let w = new Map();
    for (let [y, { icon: _, label: x }] of Object.entries(me)) {
      let L = document.createElement("button");
      ((L.className = "btn"),
        (L.title = x),
        (L.innerHTML = _),
        L.addEventListener("click", () => l(y)),
        r.appendChild(L),
        w.set(y, L));
    }
    i.addEventListener("mousedown", (y) => {
      (y.preventDefault(), y.stopPropagation(), i.classList.add("dragging"));
      let _ = y.clientX,
        x = y.clientY,
        L = s.panelWidth,
        S = s.panelHeight,
        { edge: C } = s,
        H = (v) => {
          let E = v.clientX - _,
            M = v.clientY - x,
            O = { ...s };
          (C === "right" && (O.panelWidth = Math.max(Ke, Math.min(Gt, L - E))),
            C === "left" && (O.panelWidth = Math.max(Ke, Math.min(Gt, L + E))),
            C === "top" && (O.panelHeight = Math.max(Fe, Math.min(Jt, S + M))),
            C === "bottom" && (O.panelHeight = Math.max(Fe, Math.min(Jt, S - M))),
            (s = O),
            oe(r, o, i, s));
        },
        p = () => {
          (i.classList.remove("dragging"),
            document.removeEventListener("mousemove", H),
            document.removeEventListener("mouseup", p),
            Xt(s));
        };
      (document.addEventListener("mousemove", H), document.addEventListener("mouseup", p));
    });
    let b = () => oe(r, o, i, s);
    window.addEventListener("resize", b);
    function m(y) {
      ((d = y),
        Wt(y),
        w.forEach((_, x) => _.classList.toggle("active", x === y)),
        o.classList.add("open"),
        oe(r, o, i, s),
        k(y));
    }
    function f() {
      (o.classList.remove("open"),
        w.forEach((y) => y.classList.remove("active")),
        (d = null),
        Wt(null));
    }
    function l(y) {
      d === y ? f() : m(y);
    }
    function h(y, _) {
      let x = typeof window < "u" && window.location ? window.location.host : "",
        L = x ? `<span class="sub">${x}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${y}</span>
          <span class="panel-title-label">${_}</span>
          ${L}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${Tr}</button>
      </div>`;
    }
    function k(y) {
      let { icon: _, label: x } = me[y];
      if (!c) {
        T(y);
        return;
      }
      let L = new ce(e.adminUrl, c.token);
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
          (Je(), (c = null), T(y));
        }),
        a.querySelector("#se-clearall").addEventListener("click", () => {
          (rt(), k(y));
        }),
        a.querySelector("#se-apply-url").addEventListener("click", () => {
          ot();
        }),
        a.querySelector("#se-share").addEventListener("click", async () => {
          let p = Le({ ...Se(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(p);
            let v = a.querySelector("#se-share"),
              E = v.textContent;
            ((v.textContent = "Copied \u2713"), setTimeout(() => (v.textContent = E), 1500));
          } catch {
            prompt("Copy this URL:", p);
          }
        }));
      let S = a.querySelector("#se-body"),
        C = a.querySelector("#se-subfoot");
      ({
        gates: () => st(S, L),
        configs: () => it(S, L),
        experiments: () => ct(S, L),
        i18n: () => Dt(S, L, C, n),
        bugs: () => Ft(S, L, n),
        features: () => jt(S, L, n),
      })
        [y]()
        .catch((p) => {
          S.innerHTML = `<div class="err">${String(p)}</div>`;
        });
    }
    function T(y) {
      let { icon: _, label: x } = me[y];
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
            C = a.querySelector("#se-auth-err");
          ((L.disabled = !0),
            (L.textContent = "Opening\u2026"),
            (S.textContent = ""),
            (C.textContent = ""));
          try {
            ((c = await Ve(e, () => {
              ((S.textContent = "Waiting for approval in the opened tab\u2026"),
                (L.textContent = "Waiting\u2026"));
            })),
              k(y));
          } catch (H) {
            ((C.textContent = H instanceof Error ? H.message : String(H)),
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
      z() && (j(), J(!0, n, () => {})),
      g && requestAnimationFrame(() => m(g)),
      {
        destroy() {
          (window.removeEventListener("resize", b), t.remove());
        },
      }
    );
  }
  function Pr() {
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
  var se = null;
  function Qt(e = {}) {
    if (se || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? Pr() },
      { destroy: n } = Zt(t);
    se = n;
  }
  function Cr() {
    (se?.(), (se = null));
  }
  function en(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    de() && Qt(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      a = n.includes("Ctrl") || n.includes("Control"),
      s = n.includes("Meta") || n.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function c(g) {
      (d ? g.code === d : g.key.toLowerCase() === r.toLowerCase()) &&
        g.shiftKey === o &&
        g.altKey === i &&
        g.ctrlKey === a &&
        g.metaKey === s &&
        (se ? Cr() : Qt(e));
    }
    return (window.addEventListener("keydown", c), () => window.removeEventListener("keydown", c));
  }
  function Or() {
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
      e.addEventListener("click", () => Y(!1)),
      document.body
        ? document.body.appendChild(e)
        : document.addEventListener("DOMContentLoaded", () => document.body.appendChild(e), {
            once: !0,
          }));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((en(e), z())) {
      Or();
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
