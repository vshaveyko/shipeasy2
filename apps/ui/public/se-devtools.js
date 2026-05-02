"use strict";
(() => {
  var Bt = Object.create;
  var oe = Object.defineProperty;
  var Dt = Object.getOwnPropertyDescriptor;
  var qt = Object.getOwnPropertyNames;
  var It = Object.getPrototypeOf,
    Ut = Object.prototype.hasOwnProperty;
  var Nt = (e, t, n) =>
    t in e ? oe(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var Kt = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var zt = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of qt(t))
        !Ut.call(e, o) &&
          o !== n &&
          oe(e, o, { get: () => t[o], enumerable: !(r = Dt(t, o)) || r.enumerable });
    return e;
  };
  var Ft = (e, t, n) => (
    (n = e != null ? Bt(It(e)) : {}),
    zt(t || !e || !e.__esModule ? oe(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var S = (e, t, n) => Nt(e, typeof t != "symbol" ? t + "" : t, n);
  var ft = Kt((yr, pt) => {
    "use strict";
    var we = Object.defineProperty,
      on = Object.getOwnPropertyDescriptor,
      sn = Object.getOwnPropertyNames,
      an = Object.prototype.hasOwnProperty,
      ln = (e, t) => {
        for (var n in t) we(e, n, { get: t[n], enumerable: !0 });
      },
      dn = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of sn(t))
            !an.call(e, o) &&
              o !== n &&
              we(e, o, { get: () => t[o], enumerable: !(r = on(t, o)) || r.enumerable });
        return e;
      },
      cn = (e) => dn(we({}, "__esModule", { value: !0 }), e),
      tt = {};
    ln(tt, {
      FlagsClientBrowser: () => nt,
      LABEL_MARKER_END: () => dt,
      LABEL_MARKER_RE: () => _n,
      LABEL_MARKER_SEP: () => lt,
      LABEL_MARKER_START: () => it,
      _resetShipeasyForTests: () => Ln,
      attachDevtools: () => ot,
      configureShipeasy: () => Le,
      encodeLabelMarker: () => ct,
      flags: () => at,
      getShipeasyClient: () => kn,
      i18n: () => An,
      isDevtoolsRequested: () => be,
      labelAttrs: () => ut,
      loadDevtools: () => xe,
      readConfigOverride: () => ke,
      readExpOverride: () => rt,
      readGateOverride: () => Ee,
      shipeasy: () => st,
      version: () => un,
    });
    pt.exports = cn(tt);
    var un = "1.0.0",
      pn = 5e3,
      fn = 100,
      Xe = "__se_anon_id",
      Ye = "__se_seen",
      z = "__se_pending_alias",
      gn = class {
        constructor(e, t) {
          S(this, "collectUrl");
          S(this, "sdkKey");
          S(this, "queue", []);
          S(this, "exposureSeen", new Set());
          S(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), pn)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(Ye);
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
              sessionStorage.setItem(Ye, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(z, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(z);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(z);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(z);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(z));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= fn && this.flush());
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
      ne = 5;
    function vn(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        o = null,
        a = !1,
        s = 0,
        i = 0,
        d = !1;
      try {
        new PerformanceObserver((v) => {
          let p = v.getEntries();
          p.length && (r = p[p.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let p of v.getEntries()) {
            let l = p.duration ?? 0;
            (o === null || l > o) && (o = l);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let p of v.getEntries()) p.value > 0.1 && (a = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let c = window.onerror;
      ((window.onerror = (y, v, p, l, b) => (
        s < ne &&
          ((s += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof y == "string" ? y.slice(0, 200) : String(b ?? "").slice(0, 200),
            source: typeof v == "string" ? v.slice(0, 200) : "",
            line: p ?? 0,
          })),
        typeof c == "function" ? c(y, v, p, l, b) : !1
      )),
        window.addEventListener("unhandledrejection", (y) => {
          if (s < ne) {
            s += 1;
            let v = y.reason,
              p = v instanceof Error ? v.message : typeof v == "string" ? v : String(v);
            e.pushMetric("__auto_js_error", t, n, {
              value: 1,
              kind: "unhandled_rejection",
              message: p.slice(0, 200),
            });
          }
        }));
      let g = window.fetch;
      window.fetch = async function (...y) {
        let v = typeof performance < "u" ? performance.now() : 0,
          p = typeof y[0] == "string" ? y[0] : y[0].toString(),
          l;
        try {
          l = await g.apply(this, y);
        } catch (b) {
          throw (
            i < ne &&
              ((i += 1),
              e.pushMetric("__auto_network_error", t, n, {
                value: 1,
                kind: "network",
                status: 0,
                url: p.slice(0, 200),
              })),
            b
          );
        }
        if (l.status >= 500 && i < ne) {
          i += 1;
          let b = typeof performance < "u" ? performance.now() - v : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: l.status,
            url: p.slice(0, 200),
            duration_ms: Math.round(b),
          });
        }
        return l;
      };
      let u = () => {
        if (!d) {
          d = !0;
          try {
            let v = performance.getEntriesByType("navigation")[0];
            if (v) {
              let l = v.startTime ?? 0;
              (v.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, n, { value: v.loadEventEnd - l }),
                v.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, n, { value: v.responseStart - l }),
                v.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, n, {
                    value: v.domContentLoadedEventEnd - l,
                  }));
            }
            let p = performance.getEntriesByType("paint");
            for (let l of p)
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
          a && e.pushMetric("__auto_cls_binary", t, n, { value: 1 }));
        let y = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: y }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && w();
      });
    }
    function mn() {
      try {
        let t = localStorage.getItem(Xe);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(Xe, e);
      } catch {}
      return e;
    }
    function hn() {
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
    function bn() {
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
    var nt = class {
        constructor(e) {
          S(this, "sdkKey");
          S(this, "baseUrl");
          S(this, "autoGuardrails");
          S(this, "env");
          S(this, "evalResult", null);
          S(this, "anonId");
          S(this, "userId", "");
          S(this, "buffer");
          S(this, "guardrailsInstalled", !1);
          S(this, "listeners", new Set());
          S(this, "overrideListenerInstalled", !1);
          S(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = mn()),
            (this.buffer = new gn(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...hn(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: bn() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), vn(this.buffer, this.userId, this.anonId)),
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
          let t = Ee(e);
          return t !== null ? t : (this.evalResult?.flags[e] ?? !1);
        }
        getConfig(e, t) {
          let n = ke(e),
            r = n !== void 0 ? n : this.evalResult?.configs?.[e];
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
            a = rt(e);
          if (a !== null) {
            let i = r?.[a],
              d = i ? { ...t, ...i } : t;
            return { inExperiment: !0, group: a, params: d };
          }
          let s = this.evalResult?.experiments[e];
          if (!s || !s.inExperiment) return o;
          if ((this.buffer.pushExposure(e, s.group, this.userId, this.anonId), !n))
            return { inExperiment: !0, group: s.group, params: s.params };
          try {
            return { inExperiment: !0, group: s.group, params: n(s.params) };
          } catch (i) {
            return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(i)), o);
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
      xn = /^(true|on|1|yes)$/i,
      yn = /^(false|off|0|no)$/i;
    function wn(e) {
      return xn.test(e) ? !0 : yn.test(e) ? !1 : null;
    }
    function En(e) {
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
    function F(e, t) {
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
    function Ee(e) {
      let t = F(`se_ks_${e}`) ?? F(`se_gate_${e}`) ?? F(`se-gate-${e}`);
      return t === null ? null : wn(t);
    }
    function ke(e) {
      let t = F(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return En(t);
    }
    function rt(e) {
      let t = F(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function be() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function xe(e = {}) {
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
    function ot(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = r[r.length - 1],
        a = r.includes("Shift"),
        s = r.includes("Alt"),
        i = r.includes("Ctrl") || r.includes("Control"),
        d = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), be() && xe({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let c = be();
      function g(w) {
        w.key === o &&
          w.shiftKey === a &&
          w.altKey === s &&
          w.ctrlKey === i &&
          w.metaKey === d &&
          (c
            ? window.__shipeasy_devtools?.toggle()
            : ((c = !0), xe({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", g);
      let u = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", g), u());
      };
    }
    var _ = null;
    function st(e) {
      let t = Le({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (at.notifyMounted(), ot(t, { adminUrl: e.adminUrl }));
    }
    function Le(e) {
      return _ || ((_ = new nt(e)), _);
    }
    function kn() {
      return _;
    }
    function Ln() {
      (_?.destroy(), (_ = null));
    }
    function Ze() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var me = !1,
      ye = new Set(),
      Qe = !1;
    function Sn() {
      Qe ||
        typeof window > "u" ||
        ((Qe = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of ye) e();
        }));
    }
    var at = {
        configure(e) {
          Le(e);
        },
        identify(e) {
          return _
            ? _.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = Ze();
          return t !== null && e in t.flags
            ? t.flags[e]
            : me
              ? _
                ? _.getFlag(e)
                : (Ee(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = Ze();
          if (n !== null && e in n.configs) {
            let o = n.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!me) return;
          if (_) return _.getConfig(e, t);
          let r = ke(e);
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
          return _?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          _?.track(e, t);
        },
        flush() {
          return _?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((me = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return _ ? _.subscribe(e) : (ye.add(e), Sn(), () => ye.delete(e));
        },
        get ready() {
          return _?.ready ?? !1;
        },
      },
      it = "\uFFF9",
      lt = "\uFFFA",
      dt = "\uFFFB",
      _n = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function ct(e, t) {
      return `${it}${e}${lt}${t}${dt}`;
    }
    function ut(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var he = null,
      Mn = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      Tn = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function et() {
      return globalThis[Mn]?.() ?? null;
    }
    function Rn() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[Tn];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function $n(e, t) {
      return t ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => String(t[r] ?? `{{${r}}}`)) : e;
    }
    var An = {
      t(e, t) {
        if (typeof window < "u" && window.i18n) return window.i18n.t(e, t);
        let n = et();
        return n?.strings[e] ? $n(n.strings[e], t) : e;
      },
      tEl(e, t, n, r) {
        let a =
            (typeof window < "u" && !!window.i18n) || !!et()?.strings[e] ? this.t(e, n) : void 0,
          s = a && a !== e ? a : t;
        return Rn() ? ct(e, s) : he ? he("span", ut(e, n, r), s) : s;
      },
      configure(e) {
        he = e.createElement;
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
      e?.apiKey && !_ && st({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var Pe = `
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
  var se = "se_dt_session";
  function Oe() {
    try {
      let e = sessionStorage.getItem(se);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function jt(e) {
    try {
      sessionStorage.setItem(se, JSON.stringify(e));
    } catch {}
  }
  function Ce() {
    try {
      sessionStorage.removeItem(se);
    } catch {}
  }
  async function He(e, t) {
    let n = new URL(e.adminUrl).origin,
      r = window.location.origin,
      o = `shipeasy-devtools-auth-${Date.now()}`,
      a = window.open(
        `${e.adminUrl}/devtools-auth?origin=${encodeURIComponent(r)}`,
        o,
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
        function g(p, l) {
          c ||
            ((c = !0),
            window.removeEventListener("message", u),
            clearInterval(y),
            clearTimeout(v),
            p ? i(p) : s(l));
        }
        function u(p) {
          if (p.origin !== n) return;
          let l = p.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let b = { token: l.token, projectId: l.projectId };
          (jt(b), g(null, b));
        }
        window.addEventListener("message", u);
        let w = Date.now(),
          y = setInterval(() => {
            Date.now() - w < 1500 ||
              (a.closed && !c && g(new Error("Sign-in window closed before approval.")));
          }, 500),
          v = setTimeout(() => {
            g(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Wt = /^(true|on|1|yes)$/i,
    Gt = /^(false|off|0|no)$/i,
    Be = /^se(?:_|-|$)/;
  function Z(e) {
    return Wt.test(e) ? !0 : Gt.test(e) ? !1 : null;
  }
  function ae(e) {
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
  function De(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Q() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function P(e, t) {
    let n = Q(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let o = n.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function B(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function qe() {
    if (typeof window > "u") return !1;
    let e = Q();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function N() {
    return typeof window > "u" ? !1 : Q().has("se_edit_labels");
  }
  function ie(e) {
    B([["se_edit_labels", e ? "1" : null]]);
  }
  function le(e) {
    let t = P(`se_ks_${e}`) ?? P(`se_gate_${e}`) ?? P(`se-gate-${e}`);
    return t === null ? null : Z(t);
  }
  function Ie(e, t, n = "session") {
    B([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function de(e) {
    let t = P(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return ae(t);
  }
  function ce(e, t, n = "session") {
    B([
      [`se_config_${e}`, t == null ? null : De(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Ue(e) {
    let t = P(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function Ne(e, t, n = "session") {
    B([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function K() {
    return P("se_i18n");
  }
  function Ke(e, t = "session") {
    B([["se_i18n", e]]);
  }
  function ue() {
    return P("se_i18n_draft");
  }
  function ze(e, t = "session") {
    B([["se_i18n_draft", e]]);
  }
  function ee(e) {
    return P(`se_i18n_label_${e}`);
  }
  function pe(e, t, n = "session") {
    B([[`se_i18n_label_${e}`, t]]);
  }
  function Fe() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) Be.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function fe(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) Be.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, De(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function ge() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Q();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let o = Z(r);
        o !== null && (e.gates[n.slice(6)] = o);
      } else if (n.startsWith("se_gate_")) {
        let o = Z(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else if (n.startsWith("se-gate-")) {
        let o = Z(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = ae(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function je(e) {
    if (typeof window > "u") return;
    let t = { ...ge(), ...e, openDevtools: !0 },
      n = fe(t);
    window.location.assign(n);
  }
  var te = class {
    constructor(t, n) {
      S(this, "adminUrl", t);
      S(this, "token", n);
    }
    async get(t) {
      let n = await fetch(`${this.adminUrl}${t}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!n.ok) {
        let o = "";
        try {
          let a = await n.json();
          o = a.detail ?? a.error ?? "";
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
            let a = await this.get(`/api/admin/configs/${o.id}`),
              s = a.valueJson !== void 0 ? a.valueJson : (a.values?.[n] ?? null);
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
    async put(t, n) {
      let r = await fetch(`${this.adminUrl}${t}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(n),
      });
      if (!r.ok) {
        let o = "";
        try {
          let a = await r.json();
          o = a.detail ?? a.error ?? "";
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
          let a = await r.json();
          o = a.detail ?? a.error ?? "";
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
      let n = t ? `?profile_id=${encodeURIComponent(t)}` : "",
        r = await this.get(`/api/admin/i18n/keys${n}`);
      return Array.isArray(r) ? r : r && Array.isArray(r.keys) ? r.keys : [];
    }
  };
  function A(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${ve(e.title)}</div>
      <div class="empty-msg">${ve(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${ve(e.ctaLabel)}</a>
    </div>`;
  }
  function ve(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Jt() {
    return window.__shipeasy ?? null;
  }
  function Vt(e) {
    let t = le(e.name),
      n = Jt()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Xt(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function We(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(a)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = A({
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
          (a) => `
        <div class="row">
          <div>
            <div class="row-name">${a.name}</div>
            <div class="row-sub">${(a.rolloutPct / 100).toFixed(a.rolloutPct % 100 === 0 ? 0 : 2)}% rollout</div>
          </div>
          ${Vt(a)}
          ${Xt(a.name, le(a.name))}
        </div>`,
        )
        .join("")),
        e.querySelectorAll(".tog-btn").forEach((a) => {
          a.addEventListener("click", () => {
            let s = a.closest("[data-gate]").dataset.gate,
              i = a.dataset.v;
            (Ie(s, i === "default" ? null : i === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function Yt(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function Zt(e) {
    return de(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function Ge(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(a)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = A({
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
          let i = de(s.name),
            d = i !== void 0 ? i : s.valueJson,
            c = r.has(s.name);
          return `
          <div class="row" style="flex-direction:column;align-items:stretch;gap:4px" data-config="${s.name}">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="row-name">${s.name}</div>
              ${Zt(s.name)}
              ${c ? `<button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>` : `<button class="ibtn edit-btn" data-name="${s.name}">edit</button>`}
            </div>
            ${
              c
                ? `
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(d, null, 2)}</textarea>
                <div class="edit-row">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${i !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>`
                : `<div class="mono val-display">${Yt(d)}</div>`
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
      function a(s, i) {
        let d = s.dataset.name,
          c = e.querySelector(`textarea[data-name="${d}"]`);
        if (c)
          try {
            let g = JSON.parse(c.value);
            (ce(d, g, i), r.delete(d), o());
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
            (ce(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function Qt() {
    return window.__shipeasy ?? null;
  }
  function en(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function tn(e) {
    let t = Ue(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function nn(e) {
    let t = Qt()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function rn(e) {
    return `
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="row-name">${e.name}</div>
      </div>
      ${en(e.status)}
      ${e.status === "running" ? nn(e.name) : ""}
      ${e.status === "running" ? tn(e) : ""}
    </div>`;
  }
  function Je(e, t, n, r) {
    let o = n.filter((d) => d.universe === t.name);
    if (o.length === 0) {
      e.innerHTML = A({
        icon: "\u{1F9EA}",
        title: `No experiments in \u201C${t.name}\u201D yet`,
        message: "Launch an experiment in this universe to start measuring impact.",
        ctaLabel: "Create new experiment",
        ctaHref: `${r}/dashboard/experiments/new`,
      });
      return;
    }
    let a = o.filter((d) => d.status === "running"),
      s = o.filter((d) => d.status !== "running"),
      i = (d, c) => (d.length === 0 ? "" : `<div class="sec-head">${c}</div>${d.map(rn).join("")}`);
    ((e.innerHTML = i(a, "Running") + i(s, "Other")),
      e.querySelectorAll(".exp-sel").forEach((d) => {
        d.addEventListener("change", () => {
          let c = d.dataset.name;
          Ne(c, d.value || null);
        });
      }));
  }
  async function Ve(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (s) {
      e.innerHTML = `<div class="err">Failed to load: ${String(s)}</div>`;
      return;
    }
    if (r.length === 0) {
      e.innerHTML = A({
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
    function a() {
      let s = r
        .map(
          (c) => `
          <button class="tab${c.name === o.activeUniverse ? " active" : ""}"
                  data-universe="${c.name}">${c.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${s}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((c) => {
          c.addEventListener("click", () => {
            ((o.activeUniverse = c.dataset.universe), a());
          });
        }));
      let i = e.querySelector(".tab-body"),
        d = r.find((c) => c.name === o.activeUniverse);
      Je(i, d, n, t.adminUrl);
    }
    (a(),
      window.addEventListener("se:state:update", () => {
        let s = e.querySelector(".tab-body"),
          i = r.find((d) => d.name === o.activeUniverse);
        s && i && Je(s, i, n, t.adminUrl);
      }));
  }
  var R = Ft(ft(), 1);
  function Pn(e) {
    let t = new Map();
    for (let n of e) {
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        a = r.length > 1 ? r.slice(1) : r;
      t.has(o) || t.set(o, { segment: o, children: [] });
      let s = t.get(o);
      for (let i = 0; i < a.length; i++) {
        let d = a[i],
          c = s.children.find((g) => g.segment === d);
        (c || ((c = { segment: d, children: [] }), s.children.push(c)), (s = c));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) mt(n);
    return t;
  }
  function mt(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) mt(t);
  }
  function M(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function ht(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? ee(e.fullKey) : null,
        a = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${M(e.fullKey ?? "")}">
        <span class="tree-seg">${M(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${M(a)}">${M(a)}</span>
      </div>`;
    }
    let r = e.children.map((o) => ht(o, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${M(e.segment)}</span>
    </div>
    ${r}`;
  }
  var O = "__se_label_target",
    _e = "__se_label_target_style",
    D = !1,
    Se = null,
    I = null,
    bt = null,
    xt = [];
  function On() {
    if (document.getElementById(_e)) return;
    let e = document.createElement("style");
    ((e.id = _e),
      (e.textContent = `
    .${O} {
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
    .${O}:hover,
    .${O}.__se_label_active {
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
  function gt() {
    document.getElementById(_e)?.remove();
  }
  function W(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let i = o.nodeValue ?? "";
      if (
        !i.includes(R.LABEL_MARKER_START) ||
        r.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let d = document.createDocumentFragment(),
        c = 0;
      R.LABEL_MARKER_RE.lastIndex = 0;
      let g;
      for (; (g = R.LABEL_MARKER_RE.exec(i)) !== null; ) {
        g.index > c && d.appendChild(document.createTextNode(i.slice(c, g.index)));
        let u = document.createElement("span");
        u.setAttribute("data-label", g[1]);
        let w = ee(g[1]);
        ((u.textContent = w ?? g[2]), d.appendChild(u), (c = g.index + g[0].length));
      }
      (c < i.length && d.appendChild(document.createTextNode(i.slice(c))), n.push([o, d]));
    }
    for (let [i, d] of n) i.parentNode?.replaceChild(d, i);
    let a = window._sei18n_t;
    for (let i of Array.from(document.querySelectorAll("[data-label]"))) {
      let d = i.textContent ?? "",
        c = i.getAttribute("data-label"),
        g = ee(c);
      if (d.includes(R.LABEL_MARKER_START)) {
        R.LABEL_MARKER_RE.lastIndex = 0;
        let u = R.LABEL_MARKER_RE.exec(d);
        u && (i.textContent = g ?? u[2]);
      } else if (a)
        try {
          let u = i.dataset.variables ? JSON.parse(i.dataset.variables) : void 0,
            w = a(c, u);
          w && w !== c ? (i.textContent = g ?? w) : g && (i.textContent = g);
        } catch {}
    }
    let s = ["placeholder", "alt", "aria-label", "title"];
    for (let i of s)
      for (let d of Array.from(document.querySelectorAll(`[${i}]`))) {
        let c = d.getAttribute(i);
        if (!c.includes(R.LABEL_MARKER_START)) continue;
        R.LABEL_MARKER_RE.lastIndex = 0;
        let g = R.LABEL_MARKER_RE.exec(c);
        g && d.setAttribute(i, g[2]);
      }
    return n.length;
  }
  function j() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function C() {
    (I?.remove(),
      (I = null),
      document.querySelectorAll(`.${O}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  async function Cn(e, t, n, r) {
    ((n.textContent = t),
      pe(e, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e, value: t } })));
    let o = ue(),
      a = K(),
      s = bt;
    if (!s || (!o && !a)) {
      C();
      return;
    }
    let i = r.querySelector('[data-action="save"]'),
      d = r.querySelector(".lp-err");
    ((i.disabled = !0), (i.textContent = "Saving\u2026"), d && (d.textContent = ""));
    try {
      if (o) await s.upsertDraftKey(o, e, t);
      else if (a) {
        let c = xt.find((g) => g.key === e && g.profileId === a);
        c && (await s.updateKeyById(c.id, t));
      }
      C();
    } catch (c) {
      ((i.disabled = !1),
        (i.textContent = "Save"),
        d && (d.textContent = c instanceof Error ? c.message : String(c)));
    }
  }
  function Hn(e, t) {
    (C(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      r = e.dataset.labelDesc ?? "",
      a = K() ?? "default";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let s = e.textContent ?? "",
      i = document.createElement("div");
    ((i.className = "label-popper"),
      (i.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${M(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${M(a)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${r ? "" : "empty"}">${r ? M(r) : "No description"}</span>
      </div>
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${M(s)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      t.appendChild(i));
    let d = e.getBoundingClientRect(),
      c = i.offsetHeight,
      g = i.offsetWidth,
      u = 8,
      w = d.bottom + u;
    w + c > window.innerHeight - 8 && (w = Math.max(8, d.top - c - u));
    let y = d.left;
    (y + g > window.innerWidth - 8 && (y = Math.max(8, window.innerWidth - g - 8)),
      (i.style.top = `${w}px`),
      (i.style.left = `${y}px`));
    let v = i.querySelector(".lp-input");
    (v.focus(),
      v.select(),
      i.querySelector(".lp-close").addEventListener("click", C),
      i.querySelector('[data-action="save"]').addEventListener("click", () => {
        Cn(n, v.value, e, i);
      }),
      i.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let p = e.dataset.__seOriginal ?? "";
        ((e.textContent = p),
          pe(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          C());
      }),
      i.addEventListener("click", (p) => p.stopPropagation()),
      i.addEventListener("mousedown", (p) => p.stopPropagation()),
      (I = i));
  }
  function vt(e, t, n) {
    if (((D = e), Se?.(), (Se = null), !e)) {
      C();
      for (let u of j()) u.classList.remove(O);
      gt();
      return;
    }
    On();
    for (let u of j()) u.classList.add(O);
    function r(u) {
      return I !== null && u.composedPath().includes(I);
    }
    function o(u) {
      for (let w of u.composedPath())
        if (w instanceof HTMLElement && w.hasAttribute("data-label")) return w;
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
    function s(u) {
      r(u) || (o(u) && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation()));
    }
    function i(u) {
      if (r(u)) return;
      let w = o(u);
      w && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation(), Hn(w, t));
    }
    function d(u) {
      I && (r(u) || o(u) || C());
    }
    function c(u) {
      u.key === "Escape" && C();
    }
    let g = new MutationObserver(() => {
      if (D) {
        for (let u of j()) u.classList.add(O);
        n();
      }
    });
    g.observe(document.body, { childList: !0, subtree: !0 });
    for (let u of a) document.addEventListener(u, s, !0);
    (document.addEventListener("click", i, !0),
      document.addEventListener("mousedown", d, !0),
      document.addEventListener("keydown", c),
      (Se = () => {
        for (let u of a) document.removeEventListener(u, s, !0);
        (document.removeEventListener("click", i, !0),
          document.removeEventListener("mousedown", d, !0),
          document.removeEventListener("keydown", c),
          g.disconnect());
        for (let u of j()) u.classList.remove(O);
        gt();
      }));
  }
  async function yt(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (n.innerHTML = ""),
      (bt = t));
    let o, a, s;
    try {
      let y = K() ?? void 0;
      [o, a, s] = await Promise.all([t.profiles(), t.drafts(), t.keys(y)]);
    } catch (y) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(y)}</div>`;
      return;
    }
    xt = s;
    let i = Pn(s),
      d = Array.from(i.keys()),
      c = { activeChunk: d[0] ?? null };
    function g() {
      if (d.length === 0) {
        e.innerHTML = A({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let y = d
          .map(
            (l) =>
              `<button class="tab${l === c.activeChunk ? " active" : ""}" data-chunk="${M(l)}">${M(l)}</button>`,
          )
          .join(""),
        v = c.activeChunk ? i.get(c.activeChunk) : null,
        p = v ? v.children.map((l) => ht(l, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${y}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${p}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((l) => {
          l.addEventListener("click", () => {
            ((c.activeChunk = l.dataset.chunk), g());
          });
        }));
    }
    function u() {
      let y = K() ?? "",
        v = ue() ?? "";
      W();
      let p = j().length,
        l = D
          ? `Editing ${p} label${p === 1 ? "" : "s"}`
          : p > 0
            ? `Edit labels (${p})`
            : "Edit labels",
        b = D
          ? "Disable in-page label editing"
          : p === 0
            ? "Enable in-page label editing \u2014 reloads page with ?se_edit_labels=1 to scan all translation strings"
            : "Toggle in-page label editing (reloads page)",
        E = [
          '<option value="">Default</option>',
          ...o.map(
            (x) =>
              `<option value="${M(x.id)}" ${y === x.id ? "selected" : ""}>${M(x.name)}</option>`,
          ),
        ].join(""),
        L = [
          '<option value="">No draft</option>',
          ...a.map(
            (x) =>
              `<option value="${M(x.id)}" ${v === x.id ? "selected" : ""}>${M(x.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${D ? " on" : ""}" id="se-edit-toggle" title="${M(b)}">
        <span class="dot"></span>
        ${M(l)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${E}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${L}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          N() ? ie(!1) : D ? (vt(!1, r, () => u()), u()) : ie(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (x) => {
          let f = x.target.value || null;
          Ke(f);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (x) => {
          let f = x.target.value || null;
          ze(f);
        }));
    }
    (N() && (W(), D || vt(!0, r, () => u())),
      g(),
      u(),
      window.i18n?.on?.("update", () => {
        (W(), u());
      }));
  }
  function G(e, t) {
    let n = document.createElement("div");
    n.className = "se-modal-overlay";
    let r = document.createElement("div");
    ((r.className = `se-modal se-modal-${t.size ?? "md"}`), n.appendChild(r));
    let o = document.createElement("div");
    o.className = "se-modal-head";
    let a = document.createElement("div");
    ((a.className = "se-modal-title"), (a.textContent = t.title));
    let s = document.createElement("button");
    ((s.className = "se-modal-close"),
      (s.type = "button"),
      s.setAttribute("aria-label", "Close"),
      (s.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'),
      o.appendChild(a),
      o.appendChild(s),
      r.appendChild(o));
    let i = document.createElement("div");
    ((i.className = "se-modal-body"), r.appendChild(i));
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
      s.addEventListener("click", d),
      e.appendChild(n),
      { body: i, root: r, close: d }
    );
  }
  async function wt() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 });
    try {
      let t = document.createElement("video");
      ((t.srcObject = e),
        (t.muted = !0),
        (t.playsInline = !0),
        await new Promise((i, d) => {
          let c = setTimeout(() => d(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(c), i());
          }),
            (t.onerror = () => {
              (clearTimeout(c), d(new Error("Capture stream errored")));
            }));
        }),
        await t.play(),
        await new Promise((i) => requestAnimationFrame(() => i(null))));
      let n = t.videoWidth,
        r = t.videoHeight;
      if (!n || !r) throw new Error("Capture stream returned no frames.");
      let o = document.createElement("canvas");
      ((o.width = n), (o.height = r));
      let a = o.getContext("2d");
      if (!a) throw new Error("Canvas 2d context unavailable");
      return (
        a.drawImage(t, 0, 0, n, r),
        await new Promise((i, d) => {
          o.toBlob((c) => (c ? i(c) : d(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      e.getTracks().forEach((t) => t.stop());
    }
  }
  async function Et() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((s) =>
          MediaRecorder.isTypeSupported(s),
        ) ?? "",
      r = n ? new MediaRecorder(e, { mimeType: n }) : new MediaRecorder(e),
      o = [];
    (r.addEventListener("dataavailable", (s) => {
      s.data && s.data.size > 0 && o.push(s.data);
    }),
      r.start(500),
      e.getVideoTracks()[0]?.addEventListener("ended", () => {
        r.state !== "inactive" && r.stop();
      }));
    function a() {
      e.getTracks().forEach((s) => s.stop());
    }
    return {
      stop() {
        return new Promise((s, i) => {
          if (r.state === "inactive") {
            if ((a(), o.length === 0)) {
              i(new Error("No recording data."));
              return;
            }
            s(new Blob(o, { type: n || "video/webm" }));
            return;
          }
          (r.addEventListener(
            "stop",
            () => {
              (a(), s(new Blob(o, { type: n || "video/webm" })));
            },
            { once: !0 },
          ),
            r.addEventListener("error", (d) => i(d), { once: !0 }),
            r.stop());
        });
      },
      cancel() {
        (r.state !== "inactive" && r.stop(), a());
      },
    };
  }
  var kt = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Lt(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((f, h) => {
        let m = new Image();
        ((m.onload = () => f(m)),
          (m.onerror = () => h(new Error("Failed to load screenshot for annotation."))),
          (m.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), r.appendChild(o));
    let a = "arrow",
      s = kt[0],
      i = [];
    function d(f, h) {
      let m = document.createElement("button");
      return (
        (m.type = "button"),
        (m.className = "se-annot-btn"),
        (m.dataset.tool = f),
        (m.textContent = h),
        m.addEventListener("click", () => {
          ((a = f),
            o
              .querySelectorAll("[data-tool]")
              .forEach((k) => k.classList.toggle("on", k.dataset.tool === f)));
        }),
        m
      );
    }
    let c = d("arrow", "\u2197 arrow");
    (c.classList.add("on"),
      o.appendChild(c),
      o.appendChild(d("rect", "\u25AD rect")),
      o.appendChild(d("text", "T text")));
    let g = document.createElement("span");
    ((g.className = "se-annot-sep"), o.appendChild(g));
    for (let f of kt) {
      let h = document.createElement("button");
      ((h.type = "button"),
        (h.className = "se-annot-swatch"),
        (h.dataset.color = f),
        (h.style.background = f),
        f === s && h.classList.add("on"),
        h.addEventListener("click", () => {
          ((s = f),
            o
              .querySelectorAll("[data-color]")
              .forEach((m) => m.classList.toggle("on", m.dataset.color === f)));
        }),
        o.appendChild(h));
    }
    let u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "se-annot-btn"),
      (u.textContent = "\u21B6 undo"),
      u.addEventListener("click", () => {
        (i.pop(), L());
      }),
      o.appendChild(u));
    let w = document.createElement("button");
    ((w.type = "button"),
      (w.className = "se-annot-btn"),
      (w.textContent = "clear"),
      w.addEventListener("click", () => {
        ((i.length = 0), L());
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
    let p = v.getContext("2d");
    function l(f) {
      let h = v.getBoundingClientRect(),
        m = v.width / h.width,
        k = v.height / h.height;
      return { x: (f.clientX - h.left) * m, y: (f.clientY - h.top) * k };
    }
    function b() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function E(f) {
      if (
        (p.save(),
        (p.strokeStyle = f.color),
        (p.fillStyle = f.color),
        (p.lineWidth = b()),
        (p.lineCap = "round"),
        (p.lineJoin = "round"),
        f.tool === "rect")
      ) {
        let h = Math.min(f.x1, f.x2),
          m = Math.min(f.y1, f.y2),
          k = Math.abs(f.x2 - f.x1),
          T = Math.abs(f.y2 - f.y1);
        p.strokeRect(h, m, k, T);
      } else if (f.tool === "arrow") {
        (p.beginPath(), p.moveTo(f.x1, f.y1), p.lineTo(f.x2, f.y2), p.stroke());
        let h = Math.atan2(f.y2 - f.y1, f.x2 - f.x1),
          m = b() * 5;
        (p.beginPath(),
          p.moveTo(f.x2, f.y2),
          p.lineTo(f.x2 - m * Math.cos(h - Math.PI / 6), f.y2 - m * Math.sin(h - Math.PI / 6)),
          p.lineTo(f.x2 - m * Math.cos(h + Math.PI / 6), f.y2 - m * Math.sin(h + Math.PI / 6)),
          p.closePath(),
          p.fill());
      } else if (f.tool === "text" && f.text) {
        let h = Math.max(14, Math.round(n.naturalWidth / 60));
        ((p.font = `600 ${h}px ui-sans-serif, system-ui, sans-serif`), (p.textBaseline = "top"));
        let m = h * 0.3,
          T = p.measureText(f.text).width + m * 2,
          $ = h + m * 2;
        ((p.fillStyle = "rgba(0,0,0,0.55)"),
          p.fillRect(f.x1, f.y1, T, $),
          (p.fillStyle = f.color),
          p.fillText(f.text, f.x1 + m, f.y1 + m));
      }
      p.restore();
    }
    function L(f) {
      (p.clearRect(0, 0, v.width, v.height), p.drawImage(n, 0, 0));
      for (let h of i) E(h);
      f && E(f);
    }
    L();
    let x = null;
    return (
      v.addEventListener("pointerdown", (f) => {
        f.preventDefault();
        let h = l(f);
        if (a === "text") {
          let m = prompt("Annotation text:");
          m &&
            m.trim() &&
            (i.push({ tool: "text", color: s, x1: h.x, y1: h.y, x2: h.x, y2: h.y, text: m.trim() }),
            L());
          return;
        }
        ((x = { x1: h.x, y1: h.y }), v.setPointerCapture(f.pointerId));
      }),
      v.addEventListener("pointermove", (f) => {
        if (!x) return;
        let h = l(f);
        L({ tool: a, color: s, x1: x.x1, y1: x.y1, x2: h.x, y2: h.y });
      }),
      v.addEventListener("pointerup", (f) => {
        if (!x) return;
        let h = l(f),
          m = Math.abs(h.x - x.x1),
          k = Math.abs(h.y - x.y1);
        ((m > 4 || k > 4) && i.push({ tool: a, color: s, x1: x.x1, y1: x.y1, x2: h.x, y2: h.y }),
          (x = null),
          L());
      }),
      {
        root: r,
        async export() {
          let f = await new Promise((h, m) => {
            v.toBlob((k) => (k ? h(k) : m(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), f);
        },
      }
    );
  }
  function J(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Bn(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Dn(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function St(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let a;
      try {
        a = await t.bugs();
      } catch (i) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${J(String(i))}</div>`), o());
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
                <div class="row-name">${J(i.title)}</div>
                <div class="row-sub">${Dn(i.createdAt)}${i.reporterEmail ? ` \xB7 ${J(i.reporterEmail)}` : ""}</div>
              </div>
              ${Bn(i.status)}
            </a>`,
            )
            .join("")),
        o());
    }
    function o() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => qn(t, n, r));
    }
    await r();
  }
  function qn(e, t, n) {
    let r = G(t, { title: "File a bug", size: "lg" }),
      o = [],
      a = null;
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
    let s = r.body.querySelector("#se-b-title"),
      i = r.body.querySelector("#se-b-steps"),
      d = r.body.querySelector("#se-b-actual"),
      c = r.body.querySelector("#se-b-expected"),
      g = r.body.querySelector("#se-b-attach"),
      u = r.body.querySelector("#se-b-status"),
      w = r.body.querySelector("#se-b-file"),
      y = r.body.querySelector("#se-b-record");
    function v() {
      if (o.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = o
        .map(
          (l, b) => `
          <div class="se-attach-item">
            <span>${J(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${b}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (o.splice(Number(l.dataset.idx), 1), v());
          });
        }));
    }
    function p(l, b = !1) {
      ((u.textContent = l), (u.style.color = b ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (r.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      p("Pick a screen/tab to capture\u2026");
      try {
        let l = await wt();
        (p(""),
          In(t, l, (b) => {
            (o.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: b }),
              v());
          }));
      } catch (l) {
        p(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      y.addEventListener("click", async () => {
        if (a) {
          try {
            ((y.disabled = !0), p("Finalizing recording\u2026"));
            let l = await a.stop();
            ((a = null),
              (y.textContent = "\u23FA Record screen"),
              y.classList.remove("danger"),
              o.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              v(),
              p(""));
          } catch (l) {
            p(String(l instanceof Error ? l.message : l), !0);
          } finally {
            y.disabled = !1;
          }
          return;
        }
        p("Pick a screen/tab to record\u2026");
        try {
          ((a = await Et()),
            (y.textContent = "\u25A0 Stop recording"),
            y.classList.add("danger"),
            p("Recording\u2026 click stop when done."));
        } catch (l) {
          (p(String(l instanceof Error ? l.message : l), !0), (a = null));
        }
      }),
      r.body.querySelector("#se-b-upload").addEventListener("click", () => w.click()),
      w.addEventListener("change", () => {
        let l = w.files?.[0];
        l && (o.push({ kind: "file", filename: l.name, blob: l }), (w.value = ""), v());
      }),
      r.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (a && a.cancel(), r.close());
      }),
      r.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let l = r.body.querySelector("#se-b-submit"),
          b = s.value.trim();
        if (!b) {
          (p("Title is required", !0), s.focus());
          return;
        }
        ((l.disabled = !0), p("Submitting\u2026"));
        try {
          let E = await e.createBug({
            title: b,
            stepsToReproduce: i.value,
            actualResult: d.value,
            expectedResult: c.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let L = 0; L < o.length; L++) {
            let x = o[L];
            (p(`Uploading attachment ${L + 1}/${o.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: E.id,
                kind: x.kind,
                filename: x.filename,
                blob: x.blob,
              }));
          }
          (r.close(), n());
        } catch (E) {
          (p(String(E instanceof Error ? E.message : E), !0), (l.disabled = !1));
        }
      }));
  }
  function In(e, t, n) {
    let r = G(e, { title: "Annotate screenshot", size: "lg" });
    r.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let o = r.body.querySelector("#se-annot-host");
    ((o.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Lt(t)
        .then((a) => {
          ((o.innerHTML = ""),
            o.appendChild(a.root),
            r.body.querySelector("#se-a-cancel").addEventListener("click", () => r.close()),
            r.body.querySelector("#se-a-save").addEventListener("click", async () => {
              let s = await a.export();
              (r.close(), n(s));
            }));
        })
        .catch((a) => {
          o.innerHTML = `<div class="err">${J(String(a))}</div>`;
        }));
  }
  function Me(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Un(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Nn(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function Kn(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function _t(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let o;
      try {
        o = await t.featureRequests();
      } catch (s) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${Me(String(s))}</div>`;
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
      (o.length === 0
        ? (a.innerHTML = '<div class="empty">No feature requests yet.</div>')
        : (a.innerHTML = o
            .map(
              (s) => `
            <a class="row se-feedback-row" target="_blank" rel="noopener"
               href="${t.adminUrl}/dashboard/feature-requests/${s.id}">
              <div style="flex:1;min-width:0">
                <div class="row-name">${Me(s.title)}</div>
                <div class="row-sub">${Kn(s.createdAt)}${s.reporterEmail ? ` \xB7 ${Me(s.reporterEmail)}` : ""}</div>
              </div>
              ${Nn(s.importance)}
              ${Un(s.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => zn(t, n, r)));
    }
    await r();
  }
  function zn(e, t, n) {
    let r = G(t, { title: "Request a feature", size: "lg" });
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
      a = r.body.querySelector("#se-f-desc"),
      s = r.body.querySelector("#se-f-use"),
      i = r.body.querySelector("#se-f-imp"),
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
            description: a.value,
            useCase: s.value,
            importance: i.value,
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
  var Fn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    jn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    Wn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Gn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    Jn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Vn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    Xn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Yn =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    re = {
      gates: { icon: Fn, label: "Gates" },
      configs: { icon: jn, label: "Configs" },
      experiments: { icon: Wn, label: "Experiments" },
      i18n: { icon: Gn, label: "Translations" },
      bugs: { icon: Jn, label: "Bugs" },
      features: { icon: Vn, label: "Feature requests" },
    },
    Pt = "se_l_overlay",
    Te = "se_l_active_panel";
  function Zn() {
    try {
      let e = sessionStorage.getItem(Te);
      if (e && e in re) return e;
    } catch {}
    return null;
  }
  function Mt(e) {
    try {
      e === null ? sessionStorage.removeItem(Te) : sessionStorage.setItem(Te, e);
    } catch {}
  }
  var Re = 240,
    Tt = 580,
    $e = 180,
    Rt = 700,
    $t = { edge: "right", offsetPct: 50, panelWidth: 340, panelHeight: 460 };
  function Qn() {
    try {
      let e = localStorage.getItem(Pt);
      if (e) return { ...$t, ...JSON.parse(e) };
    } catch {}
    return { ...$t };
  }
  function At(e) {
    try {
      localStorage.setItem(Pt, JSON.stringify(e));
    } catch {}
  }
  function er(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((d, c) => d[0] - c[0]);
    let a = o[0][1],
      i = Math.max(5, Math.min(95, a === "left" || a === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: a, offsetPct: i };
  }
  function V(e, t, n, r) {
    let { edge: o, offsetPct: a, panelWidth: s, panelHeight: i } = r,
      d = window.innerWidth,
      c = window.innerHeight,
      g = o === "left" || o === "right",
      u = Math.max(Re, Math.min(s, d - 80)),
      w = Math.max($e, Math.min(i, c - 40)),
      y = (a / 100) * (g ? c : d),
      v = e.getBoundingClientRect(),
      p = g ? v.width || 52 : v.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = g ? "column" : "row"),
      (l.padding = g ? "8px 6px" : "6px 8px"),
      o === "right"
        ? ((l.right = "0"),
          (l.top = `${a}%`),
          (l.transform = "translateY(-50%)"),
          (l.borderRadius = "10px 0 0 10px"),
          (l.borderRight = "none"),
          (l.boxShadow = "-3px 0 16px rgba(0,0,0,0.45)"))
        : o === "left"
          ? ((l.left = "0"),
            (l.top = `${a}%`),
            (l.transform = "translateY(-50%)"),
            (l.borderRadius = "0 10px 10px 0"),
            (l.borderLeft = "none"),
            (l.boxShadow = "3px 0 16px rgba(0,0,0,0.45)"))
          : o === "top"
            ? ((l.top = "0"),
              (l.left = `${a}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "0 0 10px 10px"),
              (l.borderTop = "none"),
              (l.boxShadow = "0 3px 16px rgba(0,0,0,0.45)"))
            : ((l.bottom = "0"),
              (l.left = `${a}%`),
              (l.transform = "translateX(-50%)"),
              (l.borderRadius = "10px 10px 0 0"),
              (l.borderBottom = "none"),
              (l.boxShadow = "0 -3px 16px rgba(0,0,0,0.45)")));
    let b = t.style;
    if (
      ((b.top = b.bottom = b.left = b.right = b.transform = ""),
      (b.borderTop = b.borderBottom = b.borderLeft = b.borderRight = ""),
      (b.width = u + "px"),
      (b.height = w + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let L = Math.max(10, Math.min(c - w - 10, y - w / 2));
      ((b.right = p + "px"),
        (b.top = L + "px"),
        (b.borderRadius = "10px 0 0 10px"),
        (b.borderRight = "none"),
        (b.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let L = Math.max(10, Math.min(c - w - 10, y - w / 2));
      ((b.left = p + "px"),
        (b.top = L + "px"),
        (b.borderRadius = "0 10px 10px 0"),
        (b.borderLeft = "none"),
        (b.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let L = Math.max(10, Math.min(d - u - 10, y - u / 2));
      ((b.top = p + "px"),
        (b.left = L + "px"),
        (b.borderRadius = "0 0 10px 10px"),
        (b.borderTop = "none"),
        (b.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let L = Math.max(10, Math.min(d - u - 10, y - u / 2));
      ((b.bottom = p + "px"),
        (b.left = L + "px"),
        (b.borderRadius = "10px 10px 0 0"),
        (b.borderBottom = "none"),
        (b.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let E = n.style;
    ((E.top = E.bottom = E.left = E.right = E.width = E.height = ""),
      (n.dataset.dir = g ? "ew" : "ns"),
      g
        ? ((E.width = "10px"),
          (E.top = "0"),
          (E.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          o === "right" ? (E.left = "0") : (E.right = "0"))
        : ((E.height = "10px"),
          (E.left = "0"),
          (E.right = "0"),
          (n.style.cursor = "ns-resize"),
          o === "top" ? (E.bottom = "0") : (E.top = "0")));
  }
  function Ot(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${Pe}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let a = document.createElement("div");
    ((a.className = "resize-handle"), o.appendChild(a));
    let s = document.createElement("div");
    ((s.className = "panel-inner"), o.appendChild(s));
    let i = Qn(),
      d = null,
      c = Oe(),
      g = Zn();
    requestAnimationFrame(() => V(r, o, a, i));
    let u = document.createElement("div");
    ((u.className = "drag-handle"),
      (u.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (u.innerHTML = Yn),
      r.appendChild(u),
      u.addEventListener("mousedown", (x) => {
        (x.preventDefault(), u.classList.add("dragging"));
        let f = (m) => {
            let { edge: k, offsetPct: T } = er(m.clientX, m.clientY);
            ((i = { ...i, edge: k, offsetPct: T }), V(r, o, a, i));
          },
          h = () => {
            (u.classList.remove("dragging"),
              document.removeEventListener("mousemove", f),
              document.removeEventListener("mouseup", h),
              At(i));
          };
        (document.addEventListener("mousemove", f), document.addEventListener("mouseup", h));
      }));
    let w = new Map();
    for (let [x, { icon: f, label: h }] of Object.entries(re)) {
      let m = document.createElement("button");
      ((m.className = "btn"),
        (m.title = h),
        (m.innerHTML = f),
        m.addEventListener("click", () => l(x)),
        r.appendChild(m),
        w.set(x, m));
    }
    a.addEventListener("mousedown", (x) => {
      (x.preventDefault(), x.stopPropagation(), a.classList.add("dragging"));
      let f = x.clientX,
        h = x.clientY,
        m = i.panelWidth,
        k = i.panelHeight,
        { edge: T } = i,
        $ = (q) => {
          let Y = q.clientX - f,
            Ae = q.clientY - h,
            U = { ...i };
          (T === "right" && (U.panelWidth = Math.max(Re, Math.min(Tt, m - Y))),
            T === "left" && (U.panelWidth = Math.max(Re, Math.min(Tt, m + Y))),
            T === "top" && (U.panelHeight = Math.max($e, Math.min(Rt, k + Ae))),
            T === "bottom" && (U.panelHeight = Math.max($e, Math.min(Rt, k - Ae))),
            (i = U),
            V(r, o, a, i));
        },
        H = () => {
          (a.classList.remove("dragging"),
            document.removeEventListener("mousemove", $),
            document.removeEventListener("mouseup", H),
            At(i));
        };
      (document.addEventListener("mousemove", $), document.addEventListener("mouseup", H));
    });
    let y = () => V(r, o, a, i);
    window.addEventListener("resize", y);
    function v(x) {
      ((d = x),
        Mt(x),
        w.forEach((f, h) => f.classList.toggle("active", h === x)),
        o.classList.add("open"),
        V(r, o, a, i),
        E(x));
    }
    function p() {
      (o.classList.remove("open"),
        w.forEach((x) => x.classList.remove("active")),
        (d = null),
        Mt(null));
    }
    function l(x) {
      d === x ? p() : v(x);
    }
    function b(x, f) {
      let h = typeof window < "u" && window.location ? window.location.host : "",
        m = h ? `<span class="sub">${h}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${x}</span>
          <span class="panel-title-label">${f}</span>
          ${m}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${Xn}</button>
      </div>`;
    }
    function E(x) {
      let { icon: f, label: h } = re[x];
      if (!c) {
        L(x);
        return;
      }
      let m = new te(e.adminUrl, c.token);
      ((s.innerHTML = `
      ${b(f, h)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        s.querySelector("#se-close").addEventListener("click", p),
        s.querySelector("#se-signout").addEventListener("click", () => {
          (Ce(), (c = null), L(x));
        }),
        s.querySelector("#se-clearall").addEventListener("click", () => {
          (Fe(), E(x));
        }),
        s.querySelector("#se-apply-url").addEventListener("click", () => {
          je();
        }),
        s.querySelector("#se-share").addEventListener("click", async () => {
          let H = fe({ ...ge(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(H);
            let q = s.querySelector("#se-share"),
              Y = q.textContent;
            ((q.textContent = "Copied \u2713"), setTimeout(() => (q.textContent = Y), 1500));
          } catch {
            prompt("Copy this URL:", H);
          }
        }));
      let k = s.querySelector("#se-body"),
        T = s.querySelector("#se-subfoot");
      ({
        gates: () => We(k, m),
        configs: () => Ge(k, m),
        experiments: () => Ve(k, m),
        i18n: () => yt(k, m, T, n),
        bugs: () => St(k, m, n),
        features: () => _t(k, m, n),
      })
        [x]()
        .catch((H) => {
          k.innerHTML = `<div class="err">${String(H)}</div>`;
        });
    }
    function L(x) {
      let { icon: f, label: h } = re[x];
      ((s.innerHTML = `
      ${b(f, h)}
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
        s.querySelector("#se-close").addEventListener("click", p),
        s.querySelector("#se-connect").addEventListener("click", async () => {
          let m = s.querySelector("#se-connect"),
            k = s.querySelector("#se-auth-status"),
            T = s.querySelector("#se-auth-err");
          ((m.disabled = !0),
            (m.textContent = "Opening\u2026"),
            (k.textContent = ""),
            (T.textContent = ""));
          try {
            ((c = await He(e, () => {
              ((k.textContent = "Waiting for approval in the opened tab\u2026"),
                (m.textContent = "Waiting\u2026"));
            })),
              E(x));
          } catch ($) {
            ((T.textContent = $ instanceof Error ? $.message : String($)),
              (k.textContent = ""),
              (m.disabled = !1),
              (m.textContent = "Retry"));
          }
        }));
    }
    return (
      document.body.appendChild(t),
      g && requestAnimationFrame(() => v(g)),
      {
        destroy() {
          (window.removeEventListener("resize", y), t.remove());
        },
      }
    );
  }
  function tr() {
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
  var X = null;
  function Ct(e = {}) {
    if (X || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? tr() },
      { destroy: n } = Ot(t);
    X = n;
  }
  function nr() {
    (X?.(), (X = null));
  }
  function Ht(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    qe() && Ct(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      a = n.includes("Alt") || n.includes("Option"),
      s = n.includes("Ctrl") || n.includes("Control"),
      i = n.includes("Meta") || n.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function c(g) {
      (d ? g.code === d : g.key.toLowerCase() === r.toLowerCase()) &&
        g.shiftKey === o &&
        g.altKey === a &&
        g.ctrlKey === s &&
        g.metaKey === i &&
        (X ? nr() : Ct(e));
    }
    return (window.addEventListener("keydown", c), () => window.removeEventListener("keydown", c));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((Ht(e), N())) {
      let t = !1,
        n = new MutationObserver(() => r()),
        r = () => {
          t ||
            ((t = !0),
            requestAnimationFrame(() => {
              ((t = !1),
                n.disconnect(),
                W(),
                n.observe(document.body, { childList: !0, subtree: !0 }));
            }));
        };
      (r(), window.addEventListener("se:i18n:ready", () => r(), { once: !0 }));
      let o = window;
      o.i18n?.on && o.i18n.on("update", () => r());
    }
    window.__se_devtools_ready = !0;
  }
})();
