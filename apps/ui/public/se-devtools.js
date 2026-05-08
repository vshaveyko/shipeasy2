"use strict";
(() => {
  var Kn = Object.create;
  var Je = Object.defineProperty;
  var Fn = Object.getOwnPropertyDescriptor;
  var Gn = Object.getOwnPropertyNames;
  var Wn = Object.getPrototypeOf,
    Jn = Object.prototype.hasOwnProperty;
  var Vn = (e, t, n) =>
    t in e ? Je(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var Yn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var Xn = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let a of Gn(t))
        !Jn.call(e, a) &&
          a !== n &&
          Je(e, a, { get: () => t[a], enumerable: !(r = Fn(t, a)) || r.enumerable });
    return e;
  };
  var Zn = (e, t, n) => (
    (n = e != null ? Kn(Wn(e)) : {}),
    Xn(t || !e || !e.__esModule ? Je(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var N = (e, t, n) => Vn(e, typeof t != "symbol" ? t + "" : t, n);
  var ln = Yn((io, sn) => {
    "use strict";
    var vt = Object.defineProperty,
      vr = Object.getOwnPropertyDescriptor,
      mr = Object.getOwnPropertyNames,
      br = Object.prototype.hasOwnProperty,
      hr = (e, t) => {
        for (var n in t) vt(e, n, { get: t[n], enumerable: !0 });
      },
      xr = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let a of mr(t))
            !br.call(e, a) &&
              a !== n &&
              vt(e, a, { get: () => t[a], enumerable: !(r = vr(t, a)) || r.enumerable });
        return e;
      },
      yr = (e) => xr(vt({}, "__esModule", { value: !0 }), e),
      Yt = {};
    hr(Yt, {
      FlagsClientBrowser: () => Xt,
      LABEL_MARKER_END: () => an,
      LABEL_MARKER_RE: () => qr,
      LABEL_MARKER_SEP: () => rn,
      LABEL_MARKER_START: () => nn,
      _resetShipeasyForTests: () => Hr,
      attachDevtools: () => Qt,
      configureShipeasy: () => ht,
      encodeLabelMarker: () => on,
      flags: () => tn,
      getShipeasyClient: () => Cr,
      i18n: () => Jr,
      isDevtoolsRequested: () => pt,
      labelAttrs: () => Ir,
      loadDevtools: () => ut,
      readConfigOverride: () => bt,
      readExpOverride: () => Zt,
      readGateOverride: () => mt,
      shipeasy: () => en,
      version: () => wr,
    });
    sn.exports = yr(Yt);
    var wr = "1.0.0",
      kr = 5e3,
      Er = 100,
      Gt = "__se_anon_id",
      Wt = "__se_seen",
      ke = "__se_pending_alias",
      Lr = class {
        constructor(e, t) {
          N(this, "collectUrl");
          N(this, "sdkKey");
          N(this, "queue", []);
          N(this, "exposureSeen", new Set());
          N(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), kr)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(Wt);
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
              sessionStorage.setItem(Wt, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(ke, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(ke);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(ke);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(ke);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(ke));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= Er && this.flush());
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
      Be = 5;
    function Sr(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        a = null,
        o = !1,
        i = 0,
        s = 0,
        u = !1;
      try {
        new PerformanceObserver((p) => {
          let v = p.getEntries();
          v.length && (r = v[v.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((p) => {
          for (let v of p.getEntries()) {
            let k = v.duration ?? 0;
            (a === null || k > a) && (a = k);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((p) => {
          for (let v of p.getEntries()) v.value > 0.1 && (o = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let f = window.onerror;
      ((window.onerror = (g, p, v, k, R) => (
        i < Be &&
          ((i += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof g == "string" ? g.slice(0, 200) : String(R ?? "").slice(0, 200),
            source: typeof p == "string" ? p.slice(0, 200) : "",
            line: v ?? 0,
          })),
        typeof f == "function" ? f(g, p, v, k, R) : !1
      )),
        window.addEventListener("unhandledrejection", (g) => {
          if (i < Be) {
            i += 1;
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
          k;
        try {
          k = await l.apply(this, g);
        } catch (R) {
          throw (
            s < Be &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, n, {
                value: 1,
                kind: "network",
                status: 0,
                url: v.slice(0, 200),
              })),
            R
          );
        }
        if (k.status >= 500 && s < Be) {
          s += 1;
          let R = typeof performance < "u" ? performance.now() - p : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: k.status,
            url: v.slice(0, 200),
            duration_ms: Math.round(R),
          });
        }
        return k;
      };
      let c = () => {
        if (!u) {
          u = !0;
          try {
            let p = performance.getEntriesByType("navigation")[0];
            if (p) {
              let k = p.startTime ?? 0;
              (p.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, n, { value: p.loadEventEnd - k }),
                p.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, n, { value: p.responseStart - k }),
                p.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, n, {
                    value: p.domContentLoadedEventEnd - k,
                  }));
            }
            let v = performance.getEntriesByType("paint");
            for (let k of v)
              k.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, n, { value: k.startTime })
                : k.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, n, { value: k.startTime });
          } catch {}
        }
      };
      document.readyState === "complete"
        ? setTimeout(c, 0)
        : window.addEventListener(
            "load",
            () => {
              setTimeout(c, 0);
            },
            { once: !0 },
          );
      let d = () => {
        (c(),
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
    function $r() {
      try {
        let t = localStorage.getItem(Gt);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(Gt, e);
      } catch {}
      return e;
    }
    function _r() {
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
    function Tr() {
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
    var Xt = class {
        constructor(e) {
          N(this, "sdkKey");
          N(this, "baseUrl");
          N(this, "autoGuardrails");
          N(this, "env");
          N(this, "evalResult", null);
          N(this, "anonId");
          N(this, "userId", "");
          N(this, "buffer");
          N(this, "guardrailsInstalled", !1);
          N(this, "listeners", new Set());
          N(this, "overrideListenerInstalled", !1);
          N(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = $r()),
            (this.buffer = new Lr(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ..._r(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: Tr() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), Sr(this.buffer, this.userId, this.anonId)),
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
          let t = mt(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = bt(e),
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
            o = Zt(e);
          if (o !== null) {
            let s = r?.[o],
              u = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: o, params: u };
          }
          let i = this.evalResult?.experiments[e];
          if (!i || !i.inExperiment) return a;
          if ((this.buffer.pushExposure(e, i.group, this.userId, this.anonId), !n))
            return { inExperiment: !0, group: i.group, params: i.params };
          try {
            return { inExperiment: !0, group: i.group, params: n(i.params) };
          } catch (s) {
            return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(s)), a);
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
      Mr = /^(true|on|1|yes)$/i,
      Ar = /^(false|off|0|no)$/i;
    function Rr(e) {
      return Mr.test(e) ? !0 : Ar.test(e) ? !1 : null;
    }
    function Pr(e) {
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
    function Ee(e, t) {
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
    function mt(e) {
      let t = Ee(`se_ks_${e}`) ?? Ee(`se_gate_${e}`) ?? Ee(`se-gate-${e}`);
      return t === null ? null : Rr(t);
    }
    function bt(e) {
      let t = Ee(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return Pr(t);
    }
    function Zt(e) {
      let t = Ee(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function pt() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function ut(e = {}) {
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
    function Qt(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        a = r[r.length - 1],
        o = r.includes("Shift"),
        i = r.includes("Alt"),
        s = r.includes("Ctrl") || r.includes("Control"),
        u = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), pt() && ut({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let f = pt();
      function l(d) {
        d.key === a &&
          d.shiftKey === o &&
          d.altKey === i &&
          d.ctrlKey === s &&
          d.metaKey === u &&
          (f
            ? window.__shipeasy_devtools?.toggle()
            : ((f = !0), ut({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", l);
      let c = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", l), c());
      };
    }
    var K = null;
    function en(e) {
      let t = ht({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (tn.notifyMounted(), Qt(t, { adminUrl: e.adminUrl }));
    }
    function ht(e) {
      return K || ((K = new Xt(e)), K);
    }
    function Cr() {
      return K;
    }
    function Hr() {
      (K?.destroy(), (K = null));
    }
    function Jt() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var lt = !1,
      ft = new Set(),
      Vt = !1;
    function Or() {
      Vt ||
        typeof window > "u" ||
        ((Vt = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of ft) e();
        }));
    }
    var tn = {
        configure(e) {
          ht(e);
        },
        identify(e) {
          return K
            ? K.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = Jt();
          return t !== null && e in t.flags
            ? t.flags[e]
            : lt
              ? K
                ? K.getFlag(e)
                : (mt(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = Jt();
          if (n !== null && e in n.configs) {
            let a = n.configs[e];
            if (!t) return a;
            try {
              return t(a);
            } catch {
              return;
            }
          }
          if (!lt) return;
          if (K) return K.getConfig(e, t);
          let r = bt(e);
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
          return K?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          K?.track(e, t);
        },
        flush() {
          return K?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((lt = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return K ? K.subscribe(e) : (ft.add(e), Or(), () => ft.delete(e));
        },
        get ready() {
          return K?.ready ?? !1;
        },
      },
      nn = "\uFFF9",
      rn = "\uFFFA",
      an = "\uFFFB",
      qr = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function on(e, t) {
      return `${nn}${e}${rn}${t}${an}`;
    }
    function Ir(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var zr = null,
      Br = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      jr = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function Ur() {
      return globalThis[Br]?.() ?? null;
    }
    function Dr() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[jr];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function je(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let a = t[r];
            return a != null ? String(a) : n;
          })
        : e;
    }
    var Nr = typeof document < "u",
      Kr = [
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
    function Fr() {
      let e = {};
      for (let t of Kr)
        e[t] = Nr
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var Gr = Fr(),
      gt = {},
      dt = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function Wr(e, t) {
      let n = [],
        r = 0,
        a,
        o = !0;
      for (dt.lastIndex = 0; (a = dt.exec(e)) !== null; ) {
        a.index > r && n.push(e.slice(r, a.index));
        let i = a[1],
          s = a[2] ?? "",
          u = t[i] ?? gt[i] ?? Gr[i];
        if (u) {
          let f = u(s);
          (typeof f != "string" && (o = !1), n.push(f));
        } else n.push(s);
        r = dt.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), o ? n.join("") : n);
    }
    function ct(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = Ur();
      if (n?.strings[e]) return je(n.strings[e], t);
    }
    var Jr = {
      t(e, t, n) {
        let r, a;
        typeof t == "string" ? ((r = t), (a = n)) : (a = t);
        let o = ct(e, a);
        return o !== void 0 ? o : r !== void 0 ? je(r, a) : e;
      },
      rich(e, t, n, r) {
        let o = ct(e, r) ?? je(t, r);
        return Wr(o, n ?? {});
      },
      tEl(e, t, n, r) {
        if (Dr()) {
          let o = ct(e, n) ?? je(t, n);
          return on(e, o);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && (gt = { ...gt, ...e.components }),
          e.createElement && (zr = e.createElement));
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
      e?.apiKey && !K && en({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var Me = `
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

.dtf-body { flex:1; overflow-y:auto; min-height:340px;
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
.dtf-modal-bg.annotate { padding:14px; }
.dtf-modal.annot-modal { align-self:stretch; height:100%;
  max-height:100%; }
.dtf-modal .bd.annot-bd { padding:0; gap:0; overflow:hidden; }
.se-annot { display:flex; flex-direction:column; flex:1; min-height:0;
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
.se-annot-stage { position:relative; flex:1; min-height:0; min-width:0;
  display:flex; align-items:center; justify-content:center;
  padding:12px; box-sizing:border-box; overflow:hidden;
  background:
    linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%) 0 0/14px 14px,
    linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%) 0 0/14px 14px,
    var(--bg-0); }
.se-annot-canvas { display:block;
  max-width:100%; max-height:100%;
  width:auto; height:auto; object-fit:contain;
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
  var Ve = "se_dt_session";
  function Tt() {
    try {
      let e = sessionStorage.getItem(Ve);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Qn(e) {
    try {
      sessionStorage.setItem(Ve, JSON.stringify(e));
    } catch {}
  }
  function Ye() {
    try {
      sessionStorage.removeItem(Ve);
    } catch {}
  }
  function er() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  async function Mt(e, t) {
    let n = new URL(e.adminUrl).origin,
      r = window.location.origin,
      a = `shipeasy-devtools-auth-${Date.now()}`,
      o = new URL(`${e.adminUrl}/devtools-auth`);
    o.searchParams.set("origin", r);
    let i = er();
    i && o.searchParams.set("sdkKey", i);
    let s = window.open(o.toString(), a, "width=460,height=640,noopener=no");
    if (!s) throw new Error("Popup blocked. Allow popups for this site and try again.");
    try {
      s.focus();
    } catch {}
    return (
      t(),
      new Promise((u, f) => {
        let c = !1;
        function d(R, L) {
          c ||
            ((c = !0),
            window.removeEventListener("message", g),
            clearInterval(v),
            clearTimeout(k),
            R ? f(R) : u(L));
        }
        function g(R) {
          if (R.origin !== n) return;
          let L = R.data;
          if (!L || L.type !== "se:devtools-auth" || !L.token || !L.projectId) return;
          let $ = { token: L.token, projectId: L.projectId };
          (Qn($), d(null, $));
        }
        window.addEventListener("message", g);
        let p = Date.now(),
          v = setInterval(() => {
            Date.now() - p < 1500 ||
              (s.closed && !c && d(new Error("Sign-in window closed before approval.")));
          }, 500),
          k = setTimeout(() => {
            d(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var tr = /^(true|on|1|yes)$/i,
    nr = /^(false|off|0|no)$/i,
    Ze = /^se(?:_|-|$)/;
  function Ae(e) {
    return tr.test(e) ? !0 : nr.test(e) ? !1 : null;
  }
  function Xe(e) {
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
  function Rt(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Re() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function ne(e, t) {
    let n = Re(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let a = n.get(t);
      if (a !== null) return a;
    }
    return null;
  }
  function Pe(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function Ce() {
    if (typeof window > "u") return !1;
    let e = Re();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function de() {
    return typeof window > "u" ? !1 : Re().has("se_edit_labels");
  }
  function Pt(e) {
    let t = ne(`se_ks_${e}`) ?? ne(`se_gate_${e}`) ?? ne(`se-gate-${e}`);
    return t === null ? null : Ae(t);
  }
  function He(e, t, n = "session") {
    Pe([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function Ct(e) {
    let t = ne(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return Xe(t);
  }
  function Qe(e, t, n = "session") {
    Pe([
      [`se_config_${e}`, t == null ? null : Rt(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Ht(e) {
    let t = ne(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function et(e, t, n = "session") {
    Pe([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Oe() {
    return ne("se_i18n");
  }
  function Ot() {
    return ne("se_i18n_draft");
  }
  function se(e) {
    return ne(`se_i18n_label_${e}`);
  }
  function he(e, t, n = "session") {
    Pe([[`se_i18n_label_${e}`, t]]);
  }
  function qt() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) Ze.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function tt(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) Ze.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, a] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, a ? "true" : "false");
    for (let [r, a] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, a);
    for (let [r, a] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, Rt(a));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, a] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, a);
    return n.toString();
  }
  function nt() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Re();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let a = Ae(r);
        a !== null && (e.gates[n.slice(6)] = a);
      } else if (n.startsWith("se_gate_")) {
        let a = Ae(r);
        a !== null && (e.gates[n.slice(8)] = a);
      } else if (n.startsWith("se-gate-")) {
        let a = Ae(r);
        a !== null && (e.gates[n.slice(8)] = a);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = Xe(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function It(e) {
    if (typeof window > "u") return;
    let t = { ...nt(), ...e, openDevtools: !0 },
      n = tt(t);
    window.location.assign(n);
  }
  function rr() {
    let e = [];
    if (typeof window > "u") return e;
    for (let [t, n] of new URLSearchParams(window.location.search))
      (t === "se" || Ze.test(t)) && e.push([t, n]);
    return e;
  }
  function At(e) {
    for (let [t, n] of rr()) e.searchParams.has(t) || e.searchParams.set(t, n);
  }
  function zt() {
    if (typeof window > "u" || typeof document > "u") return () => {};
    let e = window;
    if (e.__seNavGuardInstalled) return () => {};
    e.__seNavGuardInstalled = !0;
    let t = window.location.origin;
    function n(i) {
      if (i.defaultPrevented) return;
      let s = i.composedPath?.() ?? [],
        u = null;
      for (let d of s)
        if (d instanceof HTMLAnchorElement) {
          u = d;
          break;
        }
      if (!u) return;
      let f = u.getAttribute("href");
      if (!f || /^(mailto:|tel:|javascript:|blob:|data:|#)/i.test(f)) return;
      let l;
      try {
        l = new URL(f, window.location.href);
      } catch {
        return;
      }
      if (l.origin !== t) return;
      At(l);
      let c = l.toString();
      c !== u.href && (u.href = c);
    }
    document.addEventListener("click", n, !0);
    let r = history.pushState.bind(history),
      a = history.replaceState.bind(history);
    function o(i) {
      if (i == null) return i;
      let s;
      try {
        s = new URL(i.toString(), window.location.href);
      } catch {
        return i;
      }
      return s.origin !== t ? i : (At(s), s.toString());
    }
    return (
      (history.pushState = function (i, s, u) {
        return r(i, s, o(u));
      }),
      (history.replaceState = function (i, s, u) {
        return a(i, s, o(u));
      }),
      () => {
        (document.removeEventListener("click", n, !0),
          (history.pushState = r),
          (history.replaceState = a),
          (e.__seNavGuardInstalled = !1));
      }
    );
  }
  var xe = class {
    constructor(t, n, r, a = !1) {
      N(this, "adminUrl", t);
      N(this, "token", n);
      N(this, "projectId", r);
      N(this, "hideAdminLinks", a);
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
              i = o.valueJson !== void 0 ? o.valueJson : (o.values?.[n] ?? null);
            return { ...a, valueJson: i };
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
      let r = (s) => {
          let u = new URLSearchParams();
          return (
            t && u.set("profile_id", t),
            u.set("limit", String(500)),
            u.set("offset", String(s)),
            `?${u.toString()}`
          );
        },
        a = async (s) => {
          let u = await this.get(`/api/admin/i18n/keys${r(s)}`);
          if (Array.isArray(u)) return { keys: u, total: u.length };
          let f = u.keys ?? [],
            l = u.total ?? f.length;
          return { keys: f, total: l };
        },
        o = await a(0),
        i = o.keys.slice();
      for (; i.length < o.total && o.keys.length > 0; ) {
        let s = await a(i.length);
        if (s.keys.length === 0) break;
        i.push(...s.keys);
      }
      return i;
    }
  };
  var D = (e, t = 1.75) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
    S = {
      shield: D(
        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
      ),
      flask: D(
        '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 1 3.923 10.5H6.077A6.5 6.5 0 0 1 10 9.3"/>',
      ),
      sliders: D(
        '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
      ),
      power: D('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
      book: D('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
      users: D(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      ),
      activity: D('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
      refresh: D(
        '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
      ),
      settings: D(
        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      ),
      alert: D(
        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
      ),
      search: D('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
      play: D('<polygon points="6 3 20 12 6 21 6 3"/>'),
      playFilled:
        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
      x: D('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
      copy: D(
        '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      ),
      check: D('<path d="M20 6 9 17l-5-5"/>'),
      bug: D(
        '<path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/>',
      ),
      sparkles: D(
        '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
      ),
      camera: D(
        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
      ),
      record: D(
        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
      ),
      upload: D(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      ),
      external: D(
        '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      ),
      arrowLeft: D('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
      file: D(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/>',
      ),
      plus: D('<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>'),
      lock: D(
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      ),
    };
  function b(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Z(e) {
    let t = Date.now() - Date.parse(e);
    if (Number.isNaN(t)) return "\u2014";
    let n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  function rt(e) {
    return e < 1024
      ? `${e} B`
      : e < 1024 * 1024
        ? `${(e / 1024).toFixed(0)} KB`
        : `${(e / 1024 / 1024).toFixed(1)} MB`;
  }
  function re() {
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
  function Q(e) {
    let t = (e.actions ?? [])
      .map((a, o) =>
        a.href
          ? `<a class="a" target="_blank" rel="noopener" href="${b(a.href)}" data-i="${o}">
            <span class="ic">${a.icon ?? "+"}</span><span class="k">${b(a.label)}</span>${a.kbd ? `<span class="kbd">${b(a.kbd)}</span>` : ""}
          </a>`
          : `<button class="a" data-i="${o}">
            <span class="ic">${a.icon ?? "+"}</span><span class="k">${b(a.label)}</span>${a.kbd ? `<span class="kbd">${b(a.kbd)}</span>` : ""}
          </button>`,
      )
      .join("");
    return {
      html: `
    <div class="dtf-empty">
      <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">0</div></div>
      <h3>${e.title}</h3>
      <p>${b(e.message)}</p>
      ${t ? `<div class="actions">${t}</div>` : ""}
    </div>`,
      wire: (a) => {
        a.querySelectorAll(".dtf-empty .actions [data-i]").forEach((o) => {
          let i = Number(o.dataset.i),
            s = e.actions?.[i];
          s?.onClick && o.addEventListener("click", s.onClick);
        });
      },
    };
  }
  function ce(e) {
    return `
    <div class="dtf-empty search">
      <div class="glyph"><span>[</span><span class="core"></span><span>]</span></div>
      <h3>No match for<br/><em style="font-family:var(--mono);font-style:normal;font-size:14px;color:var(--fg-3)">"${b(e)}"</em></h3>
      <p>Nothing in your project shares that key.</p>
    </div>`;
  }
  function pe(e, t = "Copy value") {
    return `<button class="dtf-copy" data-copy="${e}" title="${b(t)}">${S.copy}</button>`;
  }
  function ue(e, t) {
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
            (n.innerHTML = S.check),
            setTimeout(() => {
              (n.classList.remove("done"), (n.innerHTML = S.copy));
            }, 900));
        }
      });
    });
  }
  var ar = [
    { k: "ctx.route", get: () => `"${window.location.pathname}"` },
    { k: "ctx.user_agent", get: () => `"${(navigator.userAgent ?? "").slice(0, 64)}"` },
    { k: "ctx.viewport", get: () => `${window.innerWidth}x${window.innerHeight}` },
  ];
  function or() {
    let e = window.__shipeasy;
    if (!e) return null;
    let t = e.user;
    return t && typeof t == "object" ? t : null;
  }
  function ir(e) {
    return e.trim().charAt(0).toUpperCase() || "?";
  }
  function Bt(e, t, n, r) {
    let a = or();
    if (!a && Object.keys(n.props).length === 0) {
      let { html: d, wire: g } = Q({
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
    let i = o.id || o.userId || "\u2014",
      s = o.email || o.user_email || "",
      u = s || i,
      f = Object.entries(o)
        .map(([d, g]) => {
          let p = n.dirty[d] ? '<span class="changed"></span>' : '<span style="width:5px"></span>';
          return `<div class="dtf-prop">
        <span class="k">user.${b(d)}</span>
        <span class="v"><input data-prop="${b(d)}" value="${sr(g)}"/></span>
        ${p}
      </div>`;
        })
        .join(""),
      l = ar
        .map(
          (d) => `<div class="dtf-prop">
      <span class="k">${b(d.k)}</span>
      <span class="v" style="color:var(--accent)">${b(d.get())}</span>
      <span style="width:5px"></span>
    </div>`,
        )
        .join(""),
      c = Object.values(n.dirty).filter(Boolean).length;
    ((e.innerHTML = `
    <div class="dtf-user">
      <div class="who">
        <div class="av">${b(ir(u))}</div>
        <div class="info">
          <div class="e">${b(s || i)}</div>
          <div class="id">${b(i)}</div>
        </div>
      </div>
      <div class="dtf-group">User properties<span class="c">edit to simulate</span></div>
      <div style="flex:1; overflow-y:auto">
        ${f || '<div class="se-empty">No user properties yet.</div>'}
        <div class="dtf-group">Request context<span class="c">read-only</span></div>
        ${l}
      </div>
      <div class="dtf-evalbar">
        <button class="b" data-action="reeval">${S.play} Re-evaluate ${c > 0 ? "with changes" : ""}</button>
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
  function sr(e) {
    return b(e);
  }
  function lr() {
    return window.__shipeasy ?? null;
  }
  function dr(e) {
    let t = Pt(e.name),
      n = lr()?.getFlag(e.name),
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
  function at(e, t) {
    let n = t === e.name,
      r = e.override !== null,
      a = e.killswitch ? e.effective : !e.effective,
      o = e.killswitch ? S.power : S.shield,
      i = e.killswitch
        ? e.effective
          ? "var(--danger)"
          : "var(--accent)"
        : e.effective
          ? "var(--accent)"
          : "var(--fg-3)",
      s = "";
    e.killswitch
      ? (s = `<span class="val ${e.effective ? "killed" : "kill-live"}">${e.effective ? "KILLED" : "LIVE"}</span>`)
      : (s = `<span class="val ${r ? "over" : e.effective ? "on" : "off"}">${e.effective ? "true" : "false"}</span>`);
    let u = `<div class="dtf-toggle${e.effective ? (r ? " over" : " on") : ""}" data-toggle="${ye(e.name)}"></div>`,
      f = e.killswitch
        ? e.effective
          ? `killswitch \xB7 KILLED (override: ${r ? "yes" : "no"})`
          : `killswitch \xB7 live \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout`
        : `gate \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout \xB7 updated ${Z(e.updatedAt)}`,
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
        <button class="${e.effective ? "primary" : ""}" data-toggle-detail="${ye(e.name)}">${e.effective ? "\u2713 Restore" : "\u26A0 Pull the switch"}</button>
      </div>`
        : `
      <div class="crumbs">
        <div><span class="${r ? "skip" : e.effective ? "pass" : "deny"}">${r ? "\u21A6" : e.effective ? "\u2713" : "\u2717"}</span> ${b(e.name)}
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
        <span class="lbl">updated</span><span class="v">${Z(e.updatedAt)}</span>
      </div>
      <div class="actions">
        <button class="primary" data-toggle-detail="${ye(e.name)}">\u2922 Force ${e.effective ? "false" : "true"}</button>
        ${r ? `<button data-clear-detail="${ye(e.name)}">\u21BA Clear override</button>` : ""}
      </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}${a ? " muted" : ""}" data-row="${ye(e.name)}">
      <div class="ic"><span style="color:${i}">${o}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${b(e.name)}</span>
          ${pe("g:" + e.name, "Copy gate name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
          ${e.live ? '<span class="live-dot" title="firing on this page"></span>' : ""}
        </div>
        <div class="v">${b(f)}</div>
      </div>
      ${s}${u}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${l}</div></div>
    </div>`;
  }
  async function jt(e, t, n, r) {
    e.innerHTML = re();
    let a;
    try {
      a = await t.gates();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load gates: ${b(String(s))}</div>`;
      return;
    }
    if (a.length === 0) {
      let { html: s, wire: u } = Q({
        title: "No <em>gates</em> yet",
        message: "Feature flags let you gate releases and ramp rollouts safely.",
        actions: t.hideAdminLinks
          ? []
          : [{ icon: "+", label: "Create new gate", href: `${t.adminUrl}/dashboard/gates/new` }],
      });
      ((e.innerHTML = s), u(e), r(0));
      return;
    }
    let o = null;
    function i() {
      let s = n.search.trim().toLowerCase(),
        f = (s ? a.filter((l) => l.name.toLowerCase().includes(s)) : a).map(dr);
      if ((r(f.filter((l) => l.override !== null).length), f.length === 0)) {
        e.innerHTML = ce(n.search);
        return;
      }
      if (n.view === "page") {
        let l = f.filter((d) => d.live === !0 || d.killswitch),
          c = f.filter((d) => !l.includes(d));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} firing</span></div>` +
          l.map((d) => at(d, o)).join("") +
          (c.length
            ? `<div class="dtf-group">Inactive<span class="c">${c.length} more</span></div>` +
              c.map((d) => at(d, o)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All flags<span class="c">${f.length}</span></div>` +
          f.map((l) => at(l, o)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (c) => {
          let d = c.target;
          if (d.closest(".dtf-toggle") || d.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((o = o === g ? null : g), i());
        });
      }),
        e.querySelectorAll("[data-toggle]").forEach((l) => {
          l.addEventListener("click", (c) => {
            c.stopPropagation();
            let d = l.getAttribute("data-toggle"),
              g = f.find((p) => p.name === d);
            g && He(d, !g.effective);
          });
        }),
        e.querySelectorAll("[data-toggle-detail]").forEach((l) => {
          l.addEventListener("click", (c) => {
            c.stopPropagation();
            let d = l.getAttribute("data-toggle-detail"),
              g = f.find((p) => p.name === d);
            g && He(d, !g.effective);
          });
        }),
        e.querySelectorAll("[data-clear-detail]").forEach((l) => {
          l.addEventListener("click", (c) => {
            c.stopPropagation();
            let d = l.getAttribute("data-clear-detail");
            He(d, null);
          });
        }),
        ue(e, Object.fromEntries(f.map((l) => ["g:" + l.name, () => l.name]))));
    }
    i();
  }
  function ye(e) {
    return b(e);
  }
  function cr() {
    return window.__shipeasy ?? null;
  }
  function pr(e) {
    let t = Ht(e.name),
      n = cr()?.getExperiment(e.name),
      r = n?.inExperiment ? n.group : null,
      a = ["control", ...e.groups.map((i) => i.name)],
      o = t ?? r ?? "control";
    return {
      name: e.name,
      status: e.status,
      groups: [{ name: "control", weight: 0 }, ...e.groups]
        .map((i, s) => ({ name: s === 0 ? "control" : i.name, weight: i.weight }))
        .filter((i, s, u) => u.findIndex((f) => f.name === i.name) === s),
      override: t,
      liveGroup: r,
      liveEnrolled: n?.inExperiment ?? !1,
      effective: o,
      updatedAt: e.updatedAt,
    };
  }
  function ot(e, t) {
    let n = t === e.name,
      r = e.override !== null,
      a = e.groups
        .map(
          (f) =>
            `<option value="${qe(f.name)}"${f.name === e.effective ? " selected" : ""}>${b(f.name)}</option>`,
        )
        .join(""),
      o = `<select class="sel${r ? " over" : ""}" data-exp="${qe(e.name)}" style="grid-column:3 / span 2; justify-self:end">
    ${a}
  </select>`,
      i = `experiment \xB7 ${e.status} \xB7 ${e.groups.length} variants${e.liveGroup ? ` \xB7 live: ${e.liveGroup}` : ""}`,
      s = e.groups
        .map((f, l) => {
          let c = f.name === e.effective,
            d =
              ["var(--info)", "var(--accent)", "var(--warn)", "var(--danger)", "var(--pri)"][l] ??
              "var(--fg-3)";
          return `<div class="var-row${c ? " assigned" : ""}">
        <span class="sw" style="background:${d}"></span>
        <span>${b(f.name)}</span>
        <span class="pct">${f.weight}%</span>
        <span style="font-size:9.5px;color:var(--fg-4)">${f.name === e.liveGroup ? "real" : f.name === e.override ? "forced" : ""}</span>
      </div>`;
        })
        .join(""),
      u = `
    <div class="crumbs">
      <div><span class="${r ? "skip" : "pass"}">\u25CF</span> ${r ? "forced via URL override" : e.liveGroup ? "assigned via SDK" : "no live assignment"}</div>
    </div>
    ${s}
    <div class="mini">
      <span class="lbl">status</span><span class="v">${e.status}</span>
      <span class="lbl">updated</span><span class="v">${Z(e.updatedAt)}</span>
    </div>
    <div class="actions">
      ${r ? `<button data-clear="${qe(e.name)}">\u21BA Clear override</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}${e.status !== "running" ? " muted" : ""}" data-row="${qe(e.name)}">
      <div class="ic"><span style="color:${e.liveEnrolled ? "var(--accent)" : "var(--fg-3)"}">${S.flask}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${b(e.name)}</span>
          ${pe("e:" + e.name, "Copy experiment name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
          ${e.liveEnrolled ? '<span class="live-dot" title="enrolled on this page"></span>' : ""}
        </div>
        <div class="v">${b(i)}</div>
      </div>
      ${o}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${u}</div></div>
    </div>`;
  }
  async function Ut(e, t, n, r) {
    e.innerHTML = re();
    let a;
    try {
      a = await t.experiments();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load experiments: ${b(String(s))}</div>`;
      return;
    }
    if (a.length === 0) {
      let { html: s, wire: u } = Q({
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
      ((e.innerHTML = s), u(e), r(0));
      return;
    }
    let o = null;
    function i() {
      let s = n.search.trim().toLowerCase(),
        f = (s ? a.filter((l) => l.name.toLowerCase().includes(s)) : a).map(pr);
      if ((r(f.filter((l) => l.override !== null).length), f.length === 0)) {
        e.innerHTML = ce(n.search);
        return;
      }
      if (n.view === "page") {
        let l = f.filter((d) => d.liveEnrolled),
          c = f.filter((d) => !d.liveEnrolled);
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} enrolled</span></div>` +
          (l.length
            ? l.map((d) => ot(d, o)).join("")
            : '<div class="se-empty">No experiments enrolled yet on this page.</div>') +
          (c.length
            ? `<div class="dtf-group">Other<span class="c">${c.length}</span></div>` +
              c.map((d) => ot(d, o)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All experiments<span class="c">${f.length}</span></div>` +
          f.map((l) => ot(l, o)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (c) => {
          let d = c.target;
          if (d.closest("select") || d.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((o = o === g ? null : g), i());
        });
      }),
        e.querySelectorAll("select[data-exp]").forEach((l) => {
          l.addEventListener("change", () => {
            et(l.dataset.exp, l.value || null);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (c) => {
            (c.stopPropagation(), et(l.getAttribute("data-clear"), null));
          });
        }),
        ue(e, Object.fromEntries(f.map((l) => ["e:" + l.name, () => l.name]))));
    }
    i();
  }
  function qe(e) {
    return b(e);
  }
  function ur() {
    return window.__shipeasy ?? null;
  }
  function le(e) {
    return e === null ? "null" : Array.isArray(e) ? "array" : typeof e;
  }
  function Ie(e, t) {
    try {
      return JSON.stringify(e) === JSON.stringify(t);
    } catch {
      return e === t;
    }
  }
  function st(e) {
    let t = le(e);
    if (t === "object") return `{${Object.keys(e).length} keys}`;
    if (t === "array") return `[${e.length}]`;
    if (t === "string") {
      let n = e;
      return `"${n.length > 22 ? n.slice(0, 22) + "\u2026" : n}"`;
    }
    return t === "null" ? "null" : String(e);
  }
  function fr(e) {
    let t = Ct(e.name),
      n = ur()?.getConfig(e.name),
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
  function it(e, t) {
    let n = t === e.name,
      r = e.override !== void 0,
      a = le(e.effective),
      o = `config \xB7 ${a} \xB7 updated ${Z(e.updatedAt)}`,
      i = `<span class="val${r ? " over" : ""}" style="grid-column:3 / span 2; justify-self:end">${b(st(e.effective))}</span>`,
      s = `
    <div class="crumbs">
      <div><span class="pass">\u25CF</span> ${b(e.name)}
        <span style="color:var(--fg-4)">=</span>
        <span style="color:var(--fg-2)">${b(st(e.effective))}</span>
        <span style="color:var(--fg-4)">\xB7 ${a}</span>
      </div>
    </div>
    <div class="mini">
      <span class="lbl">override</span><span class="v">${r ? "yes" : "none"}</span>
      <span class="lbl">updated</span><span class="v">${Z(e.updatedAt)}</span>
    </div>
    <div class="actions">
      <button class="primary" data-edit="${ae(e.name)}">\u2922 ${r ? "Edit override" : "Override value"}</button>
      ${r ? `<button data-clear="${ae(e.name)}">\u21BA Reset</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${n ? " expanded" : ""}" data-row="${ae(e.name)}">
      <div class="ic"><span style="color:var(--accent)">${S.sliders}</span></div>
      <div class="meta">
        <div class="k">
          <span class="name">${b(e.name)}</span>
          ${pe("c:" + e.name, "Copy config name")}
          ${r ? '<span class="override-tag">forced</span>' : ""}
        </div>
        <div class="v">${b(o)}</div>
      </div>
      ${i}
    </div>
    <div class="dtf-detail${n ? " open" : ""}">
      <div class="inner"><div class="pad">${s}</div></div>
    </div>`;
  }
  async function Dt(e, t, n, r, a) {
    e.innerHTML = re();
    let o;
    try {
      o = await t.configs();
    } catch (u) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${b(String(u))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: u, wire: f } = Q({
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
      ((e.innerHTML = u), f(e), r(0));
      return;
    }
    let i = null;
    function s() {
      let u = n.search.trim().toLowerCase(),
        l = (u ? o.filter((c) => c.name.toLowerCase().includes(u)) : o).map(fr);
      if ((r(l.filter((c) => c.override !== void 0).length), l.length === 0)) {
        e.innerHTML = ce(n.search);
        return;
      }
      if (n.view === "page") {
        let c = l.filter((g) => g.override !== void 0 || g.live !== void 0),
          d = l.filter((g) => !c.includes(g));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${c.length} loaded</span></div>` +
          (c.length
            ? c.map((g) => it(g, i)).join("")
            : '<div class="se-empty">No configs read on this page yet.</div>') +
          (d.length
            ? `<div class="dtf-group">Other<span class="c">${d.length}</span></div>` +
              d.map((g) => it(g, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All configs<span class="c">${l.length}</span></div>` +
          l.map((c) => it(c, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((c) => {
        c.addEventListener("click", (d) => {
          if (d.target.closest(".dtf-copy")) return;
          let p = c.dataset.row;
          ((i = i === p ? null : p), s());
        });
      }),
        e.querySelectorAll("[data-edit]").forEach((c) => {
          c.addEventListener("click", (d) => {
            d.stopPropagation();
            let g = c.getAttribute("data-edit"),
              p = l.find((v) => v.name === g);
            gr(a, p);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((c) => {
          c.addEventListener("click", (d) => {
            (d.stopPropagation(), Qe(c.getAttribute("data-clear"), null));
          });
        }),
        ue(e, Object.fromEntries(l.map((c) => ["c:" + c.name, () => c.name]))));
    }
    s();
  }
  function ze(e) {
    return e == null || typeof e != "object" ? e : JSON.parse(JSON.stringify(e));
  }
  function we(e, t, n) {
    if (t.length === 0) return n;
    let [r, ...a] = t,
      o = e;
    if (Array.isArray(o)) {
      let s = o.slice();
      return ((s[r] = we(o[r], a, n)), s);
    }
    let i = { ...o };
    return ((i[String(r)] = we(o[String(r)], a, n)), i);
  }
  function gr(e, t) {
    let n = t.override !== void 0 ? t.override : t.real,
      r = ze(n),
      a = document.createElement("div");
    ((a.className = "dtf-modal-bg"),
      (a.innerHTML = '<div class="dtf-modal" data-role="modal"></div>'));
    let o = a.querySelector(".dtf-modal");
    e.appendChild(a);
    function i() {
      (a.remove(), document.removeEventListener("keydown", s));
    }
    function s(l) {
      (l.key === "Escape" && i(), l.key === "Enter" && (l.metaKey || l.ctrlKey) && u());
    }
    function u() {
      (Qe(t.name, r), i());
    }
    function f() {
      let l = !Ie(r, t.real),
        c = le(r);
      o.innerHTML = `
      <div class="hd">
        <span class="k">${b(t.name)}</span>
        <span class="type-tag t-${c}">${c}</span>
        <button class="x" data-action="close" title="Close (Esc)">${S.x}</button>
      </div>
      <div class="bd">
        ${c === "object" || c === "array" ? '<div class="json-tree" id="tree"></div>' : `<div class="row"><span class="lbl">${c}</span><span data-leaf></span></div>`}
      </div>
      <div class="ft">
        <button class="ghost" data-action="reset" ${l ? "" : "disabled"} style="${l ? "" : "opacity:.4"}">\u21BA Reset all</button>
        <span class="sp"></span>
        <button data-action="cancel">Cancel <span style="opacity:.6;margin-left:4px">Esc</span></button>
        <button class="primary" data-action="save">Save override <span style="opacity:.6;margin-left:4px">\u2318\u23CE</span></button>
      </div>`;
      let d = o.querySelector("#tree");
      d &&
        Nt(d, r, t.real, (p) => {
          ((r = p), f());
        });
      let g = o.querySelector("[data-leaf]");
      (g &&
        ((g.innerHTML = Kt(r, t.real)),
        Ft(g, r, t.real, (p) => {
          ((r = p), f());
        })),
        o.querySelector('[data-action="close"]').addEventListener("click", i),
        o.querySelector('[data-action="cancel"]').addEventListener("click", i),
        o.querySelector('[data-action="save"]').addEventListener("click", u),
        o.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
          ((r = ze(t.real)), f());
        }));
    }
    (a.addEventListener("click", (l) => {
      l.target === a && i();
    }),
      document.addEventListener("keydown", s),
      f());
  }
  function Nt(e, t, n, r) {
    let o = le(t) === "array" ? t.map((s, u) => [u, s]) : Object.entries(t);
    e.innerHTML = '<div class="json-children"></div>';
    let i = e.querySelector(".json-children");
    for (let [s, u] of o) {
      let f = le(u),
        l = n?.[s];
      if (f === "object" || f === "array") {
        let c = document.createElement("div"),
          d = !Ie(u, l);
        ((c.innerHTML = `
        <div class="json-row branch${d ? " dirty" : ""}">
          <span class="caret">\u25BE</span>
          <span class="key branch-key">${b(String(s))}</span>
          <span class="type t-${f}">${f}</span>
          <span class="summary">${b(st(u))}</span>
          ${d ? '<button class="reset" title="reset subtree">\u21BA</button>' : ""}
        </div>
        <div class="json-children-host"></div>`),
          i.appendChild(c));
        let g = c.querySelector(".json-children-host"),
          p = c.querySelector(".json-row"),
          v = !0,
          k = () => {
            ((g.innerHTML = ""),
              v &&
                Nt(g, u, l, (R) => {
                  r(we(t, [s], R));
                }));
          };
        (k(),
          p.addEventListener("click", () => {
            ((v = !v), (p.querySelector(".caret").textContent = v ? "\u25BE" : "\u25B8"), k());
          }),
          c.querySelector(".reset")?.addEventListener("click", (R) => {
            (R.stopPropagation(), r(we(t, [s], ze(l))));
          }));
      } else {
        let c = !Ie(u, l),
          d = document.createElement("div");
        ((d.className = `json-row leaf${c ? " dirty" : ""}`),
          (d.innerHTML = `
        <span class="caret"></span>
        <span class="key">${b(String(s))}</span>
        <span class="type t-${f}">${f}</span>
        ${Kt(u, l)}`),
          i.appendChild(d),
          Ft(d, u, l, (g) => r(we(t, [s], g))));
      }
    }
  }
  function Kt(e, t) {
    let n = le(e),
      r = !Ie(e, t);
    return n === "boolean"
      ? `<span class="ctl${r ? " changed" : ""}">
      <span class="bool">
        <button class="t${e === !0 ? " on" : ""}" data-bool="true">true</button>
        <button class="f${e === !1 ? " on" : ""}" data-bool="false">false</button>
      </span>
      <button class="reset" title="reset to ${ae(String(t))}">\u21BA</button>
    </span>`
      : n === "number"
        ? `<span class="ctl${r ? " changed" : ""}">
      <input type="number" value="${ae(String(e))}"/>
      <button class="reset" title="reset to ${ae(String(t))}">\u21BA</button>
    </span>`
        : n === "string"
          ? `<span class="ctl${r ? " changed" : ""}">
      <input type="text" value="${ae(String(e))}"/>
      <button class="reset" title="reset to ${ae(String(t))}">\u21BA</button>
    </span>`
          : `<span class="summary">${b(String(e))}</span>`;
  }
  function Ft(e, t, n, r) {
    let a = le(t);
    if (a === "boolean")
      e.querySelectorAll("[data-bool]").forEach((o) => {
        o.addEventListener("click", () => r(o.dataset.bool === "true"));
      });
    else if (a === "number") {
      let o = e.querySelector("input");
      o.addEventListener("input", () => {
        let i = o.value === "" ? t : Number(o.value);
        Number.isNaN(i) || r(i);
      });
    } else if (a === "string") {
      let o = e.querySelector("input");
      o.addEventListener("input", () => r(o.value));
    }
    e.querySelector(".reset")?.addEventListener("click", (o) => {
      (o.stopPropagation(), r(ze(n)));
    });
  }
  function ae(e) {
    return b(e);
  }
  var De = Zn(ln(), 1);
  var fe = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function Vr(e) {
    if (e.length === 0) return null;
    let t = e.find((n) => n.name === "en:prod");
    return t ? t.id : e[0].id;
  }
  function U(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  var oe = "__se_label_target",
    yt = "__se_label_target_style",
    wt = !1,
    xt = null,
    ge = null,
    gn = null,
    vn = [];
  function Yr() {
    if (document.getElementById(yt)) return;
    let e = document.createElement("style");
    ((e.id = yt),
      (e.textContent = `
    .${oe} {
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
    .${oe}:hover,
    .${oe}.__se_label_active {
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
  function dn() {
    document.getElementById(yt)?.remove();
  }
  function Le(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      a;
    for (; (a = t.nextNode()); ) {
      let i = a.nodeValue ?? "";
      if (
        !i.includes(De.LABEL_MARKER_START) ||
        r.has(a.parentElement?.tagName ?? "") ||
        a.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        u = 0;
      fe.lastIndex = 0;
      let f;
      for (; (f = fe.exec(i)) !== null; ) {
        f.index > u && s.appendChild(document.createTextNode(i.slice(u, f.index)));
        let l = f[1],
          c = f[2],
          d = f[3],
          g = document.createElement("span");
        (g.setAttribute("data-label", l), c && g.setAttribute("data-variables", c));
        let p = se(l),
          v = null;
        if (c)
          try {
            v = JSON.parse(c);
          } catch {
            v = null;
          }
        ((g.textContent = p !== null ? Ne(p, v) : d),
          s.appendChild(g),
          (u = f.index + f[0].length));
      }
      (u < i.length && s.appendChild(document.createTextNode(i.slice(u))), n.push([a, s]));
    }
    for (let [i, s] of n) i.parentNode?.replaceChild(s, i);
    let o = window._sei18n_t;
    for (let i of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = i.textContent ?? "",
        u = i.getAttribute("data-label"),
        f = se(u);
      if (s.includes(De.LABEL_MARKER_START)) {
        fe.lastIndex = 0;
        let l = fe.exec(s);
        if (l) {
          l[2] && i.setAttribute("data-variables", l[2]);
          let c = l[2] ? Xr(l[2]) : null;
          i.textContent = f !== null ? Ne(f, c) : l[3];
        }
      } else if (o)
        try {
          let l = i.dataset.variables ? JSON.parse(i.dataset.variables) : void 0,
            c = o(u, l);
          f !== null ? (i.textContent = Ne(f, l ?? null)) : c && c !== u && (i.textContent = c);
        } catch {}
    }
    for (let i of Array.from(document.querySelectorAll("*"))) {
      let s = kt(i),
        u = new Map();
      for (let l of s) u.set(l.attr, l);
      let f = !1;
      for (let l of Array.from(i.attributes)) {
        let c = l.value;
        if (!c.includes(De.LABEL_MARKER_START)) continue;
        fe.lastIndex = 0;
        let d = fe.exec(c);
        if (!d) continue;
        let g = d[1],
          p = d[3],
          v = se(g);
        (i.setAttribute(l.name, v ?? p),
          u.set(l.name, { attr: l.name, key: g, original: p }),
          (f = !0));
      }
      f && bn(i, Array.from(u.values()));
    }
    return n.length;
  }
  function cn(e) {
    let t = [],
      n = /\{\{(\w+)\}\}/g,
      r;
    for (; (r = n.exec(e)) !== null; ) t.push(r[1]);
    return t;
  }
  function Ne(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
          let a = t[r];
          return a != null ? String(a) : `{{${r}}}`;
        })
      : e;
  }
  function Xr(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  var pn = "se-popper-host";
  function Zr() {
    let e = document.getElementById(pn);
    if (e?.shadowRoot) return e.shadowRoot;
    e || ((e = document.createElement("div")), (e.id = pn), document.body.appendChild(e));
    let t = e.attachShadow({ mode: "open" }),
      n = document.createElement("style");
    return ((n.textContent = Me), t.appendChild(n), t);
  }
  function mn(e) {
    let n = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof n == "string" ? n : null;
  }
  function kt(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let n = JSON.parse(t);
      if (Array.isArray(n)) return n;
    } catch {}
    return [];
  }
  function bn(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var Qr = "[data-label], [data-label-attrs]";
  function Ue() {
    return Array.from(document.querySelectorAll(Qr));
  }
  function ie() {
    (ge?.remove(),
      (ge = null),
      document.querySelectorAll(`.${oe}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function hn(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let n = kt(e.target),
        r = n.findIndex((a) => a.attr === e.attr);
      r >= 0 && ((n[r] = { ...n[r], original: t }), bn(e.target, n));
    }
  }
  async function ea(e, t, n) {
    let r = n.querySelector(".lp-err"),
      a = n.querySelector('[data-action="save"]'),
      o = se(e.key),
      i = mn(e.key),
      s = cn(o ?? i ?? ""),
      u = cn(t),
      f = s.filter((k) => !u.includes(k)),
      l = u.filter((k) => !s.includes(k));
    if (f.length || l.length) {
      if (r) {
        let k = [];
        (f.length && k.push(`missing {{${f.join("}}, {{")}}}`),
          l.length && k.push(`unknown {{${l.join("}}, {{")}}}`),
          (r.textContent = `Placeholders must match exactly \u2014 ${k.join("; ")}.`));
      }
      return;
    }
    let c = e.variables ?? {},
      d = Ne(t, c);
    (hn(e, d),
      he(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let g = Ot(),
      p = Oe(),
      v = gn;
    if (!v || (!g && !p)) {
      ie();
      return;
    }
    ((a.disabled = !0), (a.textContent = "Saving\u2026"), r && (r.textContent = ""));
    try {
      if (g) await v.upsertDraftKey(g, e.key, t);
      else if (p) {
        let k = vn.find((R) => R.key === e.key && R.profileId === p);
        k && (await v.updateKeyById(k.id, t));
      }
      ie();
    } catch (k) {
      ((a.disabled = !1),
        (a.textContent = "Save"),
        r && (r.textContent = k instanceof Error ? k.message : String(k)));
    }
  }
  function ta(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function na(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: ta(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    )
      for (let n of kt(e)) t.push({ kind: "attr", key: n.key, target: e, attr: n.attr });
    return t;
  }
  function un(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function ra(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let n = e.key.split(".").pop() || e.key;
    return t.filter((a) => a.kind === "text" && (a.key.split(".").pop() || a.key) === n).length > 1
      ? e.key
      : n;
  }
  function aa(e, t) {
    (ie(), e.classList.add("__se_label_active"));
    let n = na(e);
    if (n.length === 0) return;
    let a = Oe() ?? "default",
      o = new Map(),
      i = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let u = `<div class="lp-tabs">${n
      .map((M, O) => {
        let V = ra(M, n),
          J = O === 0 ? "lp-tab active" : "lp-tab",
          m = M.kind === "attr" ? `@<span class="lp-tab-attr">${U(M.attr ?? "")}</span>` : U(V);
        return `<button class="${J}" data-surface-idx="${O}">${m}</button>`;
      })
      .join("")}</div>`;
    ((s.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono"></span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    ${u}
    <div class="lp-body"></div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      Zr().appendChild(s));
    let l = s.querySelector(".lp-key"),
      c = s.querySelector(".lp-body"),
      d = s.querySelector(".lp-err"),
      g = s.querySelector('[data-action="save"]'),
      p = s.querySelector('[data-action="reset"]');
    function v() {
      return n[i];
    }
    function k() {
      let M = v();
      (o.has(i) || o.set(i, un(M)), (l.textContent = M.key));
      let O = mn(M.key),
        J = se(M.key) ?? O ?? un(M),
        m = M.variables ?? {},
        w = Object.entries(m),
        C = w.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${w.map(([y, z]) => `<div class="lp-var"><span class="lp-var-k mono">${U(`{{${y}}}`)}</span><span class="lp-var-v">${U(String(z))}</span></div>`).join("")}</div>
        </div>`
          : "",
        j = M.desc ?? "",
        ee = M.kind === "attr" ? `attribute \xB7 ${U(M.attr ?? "")}` : "text content";
      ((c.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${U(J)}</textarea>
      </div>
      ${C}
      <div class="lp-field">
        <label>Current profile</label>
        <span>${U(a)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${ee}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${j ? "" : "empty"}">${j ? U(j) : "No description"}</span>
      </div>`),
        (d.textContent = ""),
        (g.disabled = !1),
        (g.textContent = "Save"));
      let x = c.querySelector(".lp-input");
      (x.focus(), x.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((M) => {
      M.addEventListener("click", () => {
        let O = Number(M.dataset.surfaceIdx);
        O !== i &&
          ((i = O),
          s.querySelectorAll(".lp-tab").forEach((V, J) => {
            V.classList.toggle("active", J === i);
          }),
          k());
      });
    }),
      k());
    let R = e.getBoundingClientRect(),
      L = s.offsetHeight,
      $ = s.offsetWidth,
      h = 8,
      P = R.bottom + h;
    P + L > window.innerHeight - 8 && (P = Math.max(8, R.top - L - h));
    let A = R.left;
    (A + $ > window.innerWidth - 8 && (A = Math.max(8, window.innerWidth - $ - 8)),
      (s.style.top = `${P}px`),
      (s.style.left = `${A}px`),
      s.querySelector(".lp-close").addEventListener("click", ie),
      g.addEventListener("click", () => {
        let M = c.querySelector(".lp-input");
        ea(v(), M.value, s);
      }),
      p.addEventListener("click", () => {
        let M = v(),
          O = o.get(i) ?? "";
        (hn(M, O),
          he(M.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: M.key, value: null } }),
          ),
          ie());
      }),
      s.addEventListener("click", (M) => M.stopPropagation()),
      s.addEventListener("mousedown", (M) => M.stopPropagation()),
      (ge = s));
  }
  function Se(e, t, n) {
    if (((wt = e), xt?.(), (xt = null), !e)) {
      ie();
      for (let d of Ue()) d.classList.remove(oe);
      dn();
      return;
    }
    Yr();
    for (let d of Ue()) d.classList.add(oe);
    function r(d) {
      return ge !== null && d.composedPath().includes(ge);
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
    function i(d) {
      return "altKey" in d && typeof d.altKey == "boolean" && d.altKey;
    }
    function s(d) {
      r(d) ||
        (a(d) && (i(d) || (d.preventDefault(), d.stopPropagation(), d.stopImmediatePropagation())));
    }
    function u(d) {
      if (r(d)) return;
      let g = a(d);
      g &&
        (i(d) || (d.preventDefault(), d.stopPropagation(), d.stopImmediatePropagation(), aa(g, t)));
    }
    function f(d) {
      ge && (r(d) || a(d) || ie());
    }
    function l(d) {
      d.key === "Escape" && ie();
    }
    let c = new MutationObserver(() => {
      if (wt) {
        for (let d of Ue()) d.classList.add(oe);
        n();
      }
    });
    c.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let d of o) document.addEventListener(d, s, !0);
    (document.addEventListener("click", u, !0),
      document.addEventListener("mousedown", f, !0),
      document.addEventListener("keydown", l),
      (xt = () => {
        for (let d of o) document.removeEventListener(d, s, !0);
        (document.removeEventListener("click", u, !0),
          document.removeEventListener("mousedown", f, !0),
          document.removeEventListener("keydown", l),
          c.disconnect());
        for (let d of Ue()) d.classList.remove(oe);
        dn();
      }));
  }
  function oa(e) {
    let t = { name: "", path: "", children: new Map(), leaves: [] };
    for (let n of e) {
      if (!n.key) continue;
      let r = n.key.split(".").filter((o) => o !== "");
      if (r.length === 0) continue;
      let a = t;
      for (let o = 0; o < r.length - 1; o++) {
        let i = r[o],
          s = a.children.get(i);
        (s ||
          ((s = { name: i, path: a.path ? `${a.path}.${i}` : i, children: new Map(), leaves: [] }),
          a.children.set(i, s)),
          (a = s));
      }
      a.leaves.push(n);
    }
    return t;
  }
  function xn(e) {
    let t = e.leaves.length;
    for (let n of e.children.values()) t += xn(n);
    return t;
  }
  function ia(e, t) {
    let n = t.split("-")[0].toLowerCase();
    return (
      e.find((r) => r.name.toLowerCase().startsWith(`${n}:`)) ??
      e.find((r) => r.name.toLowerCase().startsWith(`${n}-`)) ??
      e.find((r) => r.name.toLowerCase() === n) ??
      null
    );
  }
  function sa(e) {
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
  async function yn(e, t, n, r, a) {
    ((e.innerHTML = '<div class="dtf-load"><div class="topstrip"></div></div>'), (gn = t));
    let o, i, s;
    try {
      [o, i] = await Promise.all([t.profiles(), t.drafts()]);
      let $ = Oe() ?? ia(o, a.locale)?.id ?? Vr(o);
      s = await t.keys($ ?? void 0);
    } catch (L) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load labels: ${U(String(L))}</div>`;
      return;
    }
    if (((vn = s), s.length === 0)) {
      e.innerHTML = `
      <div class="dtf-empty">
        <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">A</div></div>
        <h3>No <em>translation keys</em> yet</h3>
        <p>Add keys in the admin and group them by namespace (e.g. checkout.title).</p>
      </div>`;
      return;
    }
    let u = e.getRootNode().querySelector("select[data-locale]"),
      f = sa(o);
    u &&
      ((u.innerHTML = f
        .map(
          (L) =>
            `<option value="${U(L.code)}"${L.code === a.locale.split("-")[0] ? " selected" : ""}>${U(L.flag)} \xB7 ${U(L.name)}</option>`,
        )
        .join("")),
      (u.onchange = () => a.setLocale(u.value)));
    let l = n.search.trim().toLowerCase(),
      c = l ? s.filter((L) => L.key.toLowerCase().includes(l)) : s,
      d = oa(c),
      g = new Map(),
      p = null;
    function v() {
      let L = c.length;
      ((e.innerHTML =
        `<div class="dtf-group">All keys
        <span class="cov-mini" title="${U(a.locale)} coverage">${L}/${s.length}</span>
        <span class="pulse"><span class="d"></span>${L} ${n.view === "page" ? "rendered" : "total"}</span>
      </div>` + k(d, 0)),
        e.querySelectorAll(".dtf-tree-node[data-tree]").forEach(($) => {
          $.addEventListener("click", () => {
            let h = $.dataset.tree;
            (g.set(h, !(g.get(h) ?? !0)), v());
          });
        }),
        e.querySelectorAll(".dtf-lbl-row[data-key]").forEach(($) => {
          $.addEventListener("click", (h) => {
            if (
              h.target.closest(".dtf-copy") ||
              h.target.closest("textarea") ||
              h.target.closest("button")
            )
              return;
            let P = $.dataset.key;
            ((p = p === P ? null : P), v());
          });
        }),
        e.querySelectorAll("textarea[data-edit-key]").forEach(($) => {
          ($.addEventListener("input", () => {}),
            $.addEventListener("blur", () => {
              let h = $.dataset.editKey,
                P = c.find((A) => A.key === h)?.value ?? "";
              $.value === P ? he(h, null) : he(h, $.value);
            }));
        }));
    }
    function k(L, $) {
      let h = "",
        P = Array.from(L.children.values()).sort((A, M) => A.name.localeCompare(M.name));
      for (let A of P) {
        let M = g.get(A.path) ?? !0,
          O = xn(A);
        if (
          ((h += `
        <div class="dtf-tree-node" style="padding-left:${12 + $ * 14}px" data-tree="${U(A.path)}">
          <span class="caret">${M ? "\u25BE" : "\u25B8"}</span>
          <span class="seg">${U(A.name)}</span>
          <span class="dotpath">${U(A.path)}</span>
          <span class="counts"><span class="t">${O}</span></span>
        </div>`),
          M)
        ) {
          h += k(A, $ + 1);
          for (let V of A.leaves) h += R(V, $ + 1);
        }
      }
      if ($ === 0) for (let A of L.leaves) h += R(A, 0);
      return h;
    }
    function R(L, $) {
      let h = p === L.key,
        P = se(L.key),
        A = P ?? L.value,
        M = !A,
        O = L.key.split(".").pop() ?? L.key,
        V = M ? "missing" : P !== null ? "edited" : "ok",
        J = M ? "\u2298" : P !== null ? "\u270E" : "\u25CF";
      return `
      <div class="dtf-lbl-row${h ? " expanded" : ""}${M ? " missing" : ""}" style="padding-left:${12 + $ * 14}px" data-key="${U(L.key)}" title="${U(L.key)}">
        <span class="lbl-pill ${V}" title="${V}">${J}</span>
        <div class="meta">
          <div class="src">
            ${U(O)}
            <button class="dtf-copy" data-copy-leaf="${U(L.key)}" title="Copy value">${fn}</button>
          </div>
          <div class="sub">
            <span class="k" title="${U(A)}">${M ? '<em style="color:var(--warn)">\u2014 not translated \u2014</em>' : U(A)}</span>
          </div>
        </div>
        <span style="width:5px"></span>
      </div>
      <div class="dtf-detail${h ? " open" : ""}">
        <div class="inner"><div class="pad lbl-pad">
          <div class="lbl-edit">
            <div class="hd"><span>${U(a.locale)}</span></div>
            <textarea data-edit-key="${U(L.key)}" placeholder="Translate to ${U(a.locale)}\u2026">${U(A)}</textarea>
          </div>
          <div class="actions">
            ${t.hideAdminLinks ? "" : `<a target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/i18n/keys">\u2197 Open in dashboard</a>`}
          </div>
        </div></div>
      </div>`;
    }
    (v(),
      e.querySelectorAll("[data-copy-leaf]").forEach((L) => {
        L.addEventListener("click", async ($) => {
          $.stopPropagation();
          let h = L.getAttribute("data-copy-leaf"),
            P = c.find((A) => A.key === h)?.value ?? "";
          try {
            await navigator.clipboard.writeText(P);
          } catch {}
          (L.classList.add("done"),
            (L.innerHTML = la),
            setTimeout(() => {
              (L.classList.remove("done"), (L.innerHTML = fn));
            }, 900));
        });
      }),
      de() && (Le(), wt || Se(!0, r, () => v())));
  }
  var fn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    la =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function wn(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function kn(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 }),
      n = wn(e);
    try {
      let r = document.createElement("video");
      ((r.srcObject = t),
        (r.muted = !0),
        (r.playsInline = !0),
        await new Promise((f, l) => {
          let c = setTimeout(() => l(new Error("Capture stream timed out")), 5e3);
          ((r.onloadedmetadata = () => {
            (clearTimeout(c), f());
          }),
            (r.onerror = () => {
              (clearTimeout(c), l(new Error("Capture stream errored")));
            }));
        }),
        await r.play(),
        await new Promise((f) => requestAnimationFrame(() => f(null))),
        await new Promise((f) => requestAnimationFrame(() => f(null))));
      let a = r.videoWidth,
        o = r.videoHeight;
      if (!a || !o) throw new Error("Capture stream returned no frames.");
      let i = document.createElement("canvas");
      ((i.width = a), (i.height = o));
      let s = i.getContext("2d");
      if (!s) throw new Error("Canvas 2d context unavailable");
      return (
        s.drawImage(r, 0, 0, a, o),
        await new Promise((f, l) => {
          i.toBlob((c) => (c ? f(c) : l(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((r) => r.stop()), n());
    }
  }
  async function En(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n = wn(e);
    await new Promise((u) => requestAnimationFrame(() => u(null)));
    let a =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((u) =>
          MediaRecorder.isTypeSupported(u),
        ) ?? "",
      o = a ? new MediaRecorder(t, { mimeType: a }) : new MediaRecorder(t),
      i = [];
    (o.addEventListener("dataavailable", (u) => {
      u.data && u.data.size > 0 && i.push(u.data);
    }),
      o.start(500),
      t.getVideoTracks()[0]?.addEventListener("ended", () => {
        (n(), o.state !== "inactive" && o.stop());
      }));
    function s() {
      (t.getTracks().forEach((u) => u.stop()), n());
    }
    return {
      stop() {
        return new Promise((u, f) => {
          if (o.state === "inactive") {
            if ((s(), i.length === 0)) {
              f(new Error("No recording data."));
              return;
            }
            u(new Blob(i, { type: a || "video/webm" }));
            return;
          }
          (o.addEventListener(
            "stop",
            () => {
              (s(), u(new Blob(i, { type: a || "video/webm" })));
            },
            { once: !0 },
          ),
            o.addEventListener("error", (l) => f(l), { once: !0 }),
            o.stop());
        });
      },
      cancel() {
        (o.state !== "inactive" && o.stop(), s());
      },
    };
  }
  var Ln = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Sn(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((m, w) => {
        let C = new Image();
        ((C.onload = () => m(C)),
          (C.onerror = () => w(new Error("Failed to load screenshot for annotation."))),
          (C.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let a = document.createElement("div");
    ((a.className = "se-annot-toolbar"), r.appendChild(a));
    let o = "pen",
      i = Ln[0],
      s = [];
    function u(m) {
      ((o = m),
        a
          .querySelectorAll("[data-tool]")
          .forEach((w) => w.classList.toggle("on", w.dataset.tool === m)));
    }
    function f(m, w, C) {
      let j = document.createElement("button");
      return (
        (j.type = "button"),
        (j.className = "se-annot-btn"),
        (j.dataset.tool = m),
        (j.textContent = w),
        (j.title = C),
        j.addEventListener("click", () => u(m)),
        j
      );
    }
    (a.appendChild(f("pen", "\u270E draw", "Freehand draw (P)")),
      a.appendChild(f("arrow", "\u2197 arrow", "Arrow (A)")),
      a.appendChild(f("rect", "\u25AD rect", "Rectangle (R)")),
      a.appendChild(f("text", "T text", "Text (T)")),
      u("pen"));
    let l = document.createElement("span");
    ((l.className = "se-annot-sep"), a.appendChild(l));
    for (let m of Ln) {
      let w = document.createElement("button");
      ((w.type = "button"),
        (w.className = "se-annot-swatch"),
        (w.dataset.color = m),
        (w.style.background = m),
        m === i && w.classList.add("on"),
        w.addEventListener("click", () => {
          ((i = m),
            a
              .querySelectorAll("[data-color]")
              .forEach((C) => C.classList.toggle("on", C.dataset.color === m)));
        }),
        a.appendChild(w));
    }
    let c = document.createElement("button");
    ((c.type = "button"),
      (c.className = "se-annot-btn"),
      (c.textContent = "\u21B6 undo"),
      (c.title = "Undo (Ctrl/Cmd+Z)"),
      c.addEventListener("click", () => {
        (s.pop(), P());
      }),
      a.appendChild(c));
    let d = document.createElement("button");
    ((d.type = "button"),
      (d.className = "se-annot-btn"),
      (d.textContent = "clear"),
      d.addEventListener("click", () => {
        ((s.length = 0), P());
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
      k = null;
    function R(m) {
      let w = p.getBoundingClientRect(),
        C = p.width / w.width,
        j = p.height / w.height;
      return { x: (m.clientX - w.left) * C, y: (m.clientY - w.top) * j };
    }
    function L() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function $() {
      return Math.max(14, Math.round(n.naturalWidth / 60));
    }
    function h(m) {
      if (
        (v.save(),
        (v.strokeStyle = m.color),
        (v.fillStyle = m.color),
        (v.lineWidth = L()),
        (v.lineCap = "round"),
        (v.lineJoin = "round"),
        m.tool === "rect")
      ) {
        let w = Math.min(m.x1, m.x2),
          C = Math.min(m.y1, m.y2),
          j = Math.abs(m.x2 - m.x1),
          ee = Math.abs(m.y2 - m.y1);
        v.strokeRect(w, C, j, ee);
      } else if (m.tool === "arrow") {
        (v.beginPath(), v.moveTo(m.x1, m.y1), v.lineTo(m.x2, m.y2), v.stroke());
        let w = Math.atan2(m.y2 - m.y1, m.x2 - m.x1),
          C = L() * 5;
        (v.beginPath(),
          v.moveTo(m.x2, m.y2),
          v.lineTo(m.x2 - C * Math.cos(w - Math.PI / 6), m.y2 - C * Math.sin(w - Math.PI / 6)),
          v.lineTo(m.x2 - C * Math.cos(w + Math.PI / 6), m.y2 - C * Math.sin(w + Math.PI / 6)),
          v.closePath(),
          v.fill());
      } else if (m.tool === "pen")
        if (m.points.length < 2) {
          if (m.points.length === 1) {
            let w = m.points[0];
            (v.beginPath(), v.arc(w.x, w.y, L() / 2, 0, Math.PI * 2), v.fill());
          }
        } else {
          (v.beginPath(), v.moveTo(m.points[0].x, m.points[0].y));
          for (let w = 1; w < m.points.length; w++) v.lineTo(m.points[w].x, m.points[w].y);
          v.stroke();
        }
      else if (m.tool === "text" && m.text) {
        let w = $();
        ((v.font = `600 ${w}px ui-sans-serif, system-ui, sans-serif`), (v.textBaseline = "top"));
        let C = w * 0.3,
          ee = v.measureText(m.text).width + C * 2,
          x = w + C * 2;
        ((v.fillStyle = "rgba(0,0,0,0.55)"),
          v.fillRect(m.x1, m.y1, ee, x),
          (v.fillStyle = m.color),
          v.fillText(m.text, m.x1 + C, m.y1 + C));
      }
      v.restore();
    }
    function P(m) {
      (v.clearRect(0, 0, p.width, p.height), v.drawImage(n, 0, 0));
      for (let w of s) h(w);
      m && h(m);
    }
    P();
    let A = null;
    function M(m, w) {
      A && A.blur();
      let C = p.getBoundingClientRect(),
        j = g.getBoundingClientRect(),
        ee = C.width / p.width,
        x = C.height / p.height,
        y = $() * ee,
        z = y * 0.3,
        _ = document.createElement("input");
      ((_.type = "text"),
        (_.className = "se-annot-text-input"),
        (_.style.position = "absolute"),
        (_.style.left = `${C.left - j.left + m * ee}px`),
        (_.style.top = `${C.top - j.top + w * x}px`),
        (_.style.color = i),
        (_.style.background = "rgba(0,0,0,0.55)"),
        (_.style.border = `1px dashed ${i}`),
        (_.style.outline = "none"),
        (_.style.padding = `${z}px`),
        (_.style.font = `600 ${y}px ui-sans-serif, system-ui, sans-serif`),
        (_.style.minWidth = `${y * 4}px`),
        (_.style.lineHeight = "1"),
        (_.placeholder = "type\u2026"));
      let I = !1;
      function q() {
        if (I) return;
        I = !0;
        let E = _.value.trim();
        (_.remove(),
          (A = null),
          E && (s.push({ tool: "text", color: i, x1: m, y1: w, text: E }), P()));
      }
      function T() {
        I || ((I = !0), _.remove(), (A = null));
      }
      (_.addEventListener("keydown", (E) => {
        (E.key === "Enter"
          ? (E.preventDefault(), q())
          : E.key === "Escape" && (E.preventDefault(), T()),
          E.stopPropagation());
      }),
        _.addEventListener("blur", q),
        g.appendChild(_),
        (A = _),
        setTimeout(() => _.focus(), 0));
    }
    let O = null;
    (p.addEventListener("pointermove", (m) => {
      ((k = R(m)),
        O &&
          (O.kind === "pen"
            ? (O.shape.points.push(k), P())
            : P({
                tool: o === "text" ? "rect" : o,
                color: i,
                x1: O.x1,
                y1: O.y1,
                x2: k.x,
                y2: k.y,
              })));
    }),
      p.addEventListener("pointerdown", (m) => {
        m.preventDefault();
        let w = R(m);
        if (((k = w), o === "text")) {
          M(w.x, w.y);
          return;
        }
        if (o === "pen") {
          let C = { tool: "pen", color: i, points: [w] };
          (s.push(C), (O = { kind: "pen", shape: C }), p.setPointerCapture(m.pointerId), P());
          return;
        }
        ((O = { kind: "shape", x1: w.x, y1: w.y }), p.setPointerCapture(m.pointerId));
      }),
      p.addEventListener("pointerup", (m) => {
        if (!O) return;
        let w = R(m);
        if (O.kind === "shape") {
          let C = Math.abs(w.x - O.x1),
            j = Math.abs(w.y - O.y1);
          (C > 4 || j > 4) &&
            (o === "arrow" || o === "rect") &&
            s.push({ tool: o, color: i, x1: O.x1, y1: O.y1, x2: w.x, y2: w.y });
        }
        ((O = null), P());
      }));
    function V(m) {
      if (!(m instanceof HTMLElement)) return !1;
      let w = m.tagName;
      return w === "INPUT" || w === "TEXTAREA" || m.isContentEditable;
    }
    function J(m) {
      if (!r.isConnected) {
        document.removeEventListener("keydown", J, !0);
        return;
      }
      if (V(m.target)) return;
      let w = m.key.toLowerCase();
      if ((m.ctrlKey || m.metaKey) && w === "z") {
        (m.preventDefault(), s.pop(), P());
        return;
      }
      if (!(m.ctrlKey || m.metaKey || m.altKey))
        if (w === "t") {
          (m.preventDefault(), u("text"));
          let C = k ?? { x: p.width / 2, y: p.height / 2 };
          M(C.x, C.y);
        } else w === "p" ? u("pen") : w === "a" ? u("arrow") : w === "r" && u("rect");
    }
    return (
      document.addEventListener("keydown", J, !0),
      {
        root: r,
        async export() {
          (A && A.blur(), await new Promise((w) => requestAnimationFrame(() => w(null))));
          let m = await new Promise((w, C) => {
            p.toBlob((j) => (j ? w(j) : C(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", J, !0), m);
        },
      }
    );
  }
  var da = {
      open: "badge-run",
      triaged: "badge-run",
      in_progress: "badge-run",
      resolved: "badge-on",
      wont_fix: "badge-off",
    },
    ca = {
      open: "badge-run",
      considering: "badge-run",
      planned: "badge-draft",
      shipped: "badge-on",
      declined: "badge-off",
    },
    pa = { critical: "badge-warn", important: "badge-run", nice_to_have: "badge-draft" };
  function Et(e, t) {
    return `<span class="badge ${t}">${b(e.replace(/_/g, " "))}</span>`;
  }
  async function $n(e, t, n, r) {
    let a = e.getRootNode(),
      o = null;
    r.pendingForm && ((o = r.pendingForm), r.consumePendingForm?.());
    async function i() {
      if (o === "bug") {
        ma(e, t, n, a, () => {
          ((o = null), i());
        });
        return;
      }
      if (o === "feature") {
        ha(e, t, () => {
          ((o = null), i());
        });
        return;
      }
      await s();
    }
    async function s() {
      ((e.innerHTML = `
      <div class="se-fb-subtabs">
        <button class="${r.sub === "bugs" ? "active" : ""}" data-sub="bugs">${S.bug} Bugs <span class="c">\u2026</span></button>
        <button class="${r.sub === "features" ? "active" : ""}" data-sub="features">${S.sparkles} Feature requests <span class="c">\u2026</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${r.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${t.hideAdminLinks ? "" : `<a class="ibtn" target="_blank" rel="noopener" href="${b(t.adminUrl)}/dashboard/${r.sub === "bugs" ? "bugs" : "feature-requests"}">${S.external} Open dashboard</a>`}
      </div>
      <div class="se-feedback-list" data-list></div>`),
        e.querySelectorAll("[data-sub]").forEach((c) => {
          c.addEventListener("click", () => r.setSub(c.dataset.sub));
        }),
        e.querySelector('[data-action="file"]').addEventListener("click", () => {
          ((o = r.sub === "bugs" ? "bug" : "feature"), i());
        }));
      let l = e.querySelector("[data-list]");
      if (((l.innerHTML = re()), r.sub === "bugs")) {
        let c;
        try {
          c = await t.bugs();
        } catch (p) {
          l.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${b(String(p))}</div>`;
          return;
        }
        let d = e.querySelector('[data-sub="bugs"] .c');
        d.textContent = String(c.length);
        let g = e.querySelector('[data-sub="features"] .c');
        try {
          let p = await t.featureRequests();
          g.textContent = String(p.length);
        } catch {
          g.textContent = "?";
        }
        u(l, c);
      } else {
        let c;
        try {
          c = await t.featureRequests();
        } catch (p) {
          l.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${b(String(p))}</div>`;
          return;
        }
        let d = e.querySelector('[data-sub="features"] .c');
        d.textContent = String(c.length);
        let g = e.querySelector('[data-sub="bugs"] .c');
        try {
          let p = await t.bugs();
          g.textContent = String(p.length);
        } catch {
          g.textContent = "?";
        }
        f(l, c);
      }
    }
    function u(l, c) {
      if (c.length === 0) {
        let { html: p, wire: v } = Q({
          title: "No <em>bugs</em> filed yet",
          message: "Spotted something off on this page? File a bug with a screenshot or recording.",
          actions: [
            {
              icon: "+",
              label: "File a bug",
              onClick: () => {
                ((o = "bug"), i());
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
          ((l.innerHTML = c
            .map(
              (p) => `
          <div class="se-feedback-row${d.has(p.id) ? " expanded" : ""}" data-id="${b(p.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${b(p.title)}</div>
              <div class="row-sub">${b(Z(p.createdAt))}${p.reporterEmail ? " \xB7 " + b(p.reporterEmail) : ""}</div>
            </div>
            ${Et(p.status, da[p.status])}
          </div>
          <div class="se-feedback-detail${d.has(p.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${b(p.pageUrl ?? "\u2014")}</span>
                <span class="k">filed</span><span>${b(Z(p.createdAt))}${p.reporterEmail ? " \xB7 " + b(p.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${b(t.adminUrl)}/dashboard/bugs/${b(p.id)}">${S.external} Open in dashboard</a>`}
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
    function f(l, c) {
      if (c.length === 0) {
        let { html: p, wire: v } = Q({
          title: "No <em>feature requests</em> yet",
          message: "Capture asks from the field with importance, status, and a clean trail.",
          actions: [
            {
              icon: "+",
              label: "Request a feature",
              onClick: () => {
                ((o = "feature"), i());
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
          ((l.innerHTML = c
            .map(
              (p) => `
          <div class="se-feedback-row${d.has(p.id) ? " expanded" : ""}" data-id="${b(p.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${b(p.title)}</div>
              <div class="row-sub">${b(Z(p.createdAt))}${p.reporterEmail ? " \xB7 " + b(p.reporterEmail) : ""}</div>
            </div>
            ${Et(p.importance, pa[p.importance])}
            ${Et(p.status, ca[p.status])}
          </div>
          <div class="se-feedback-detail${d.has(p.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${b(p.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${b(Z(p.createdAt))}${p.reporterEmail ? " \xB7 " + b(p.reporterEmail) : ""}</span>
              </div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${b(t.adminUrl)}/dashboard/feature-requests/${b(p.id)}">${S.external} Open in dashboard</a>`}
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
    await i();
  }
  function _n(e, t) {
    e.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${S.arrowLeft} Back</button>
        <span class="k" style="margin-left:8px">${b(t.title)}</span>
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
        let s = document.createElement("div");
        ((s.className = "dtf-discard"),
          (s.innerHTML = `${S.alert}<span>Discard your changes?</span><span style="flex:1"></span>
      <button class="ibtn" data-action="keep">Keep editing</button>
      <button class="ibtn danger" data-action="discard">Discard</button>`),
          n.querySelector(".hd").after(s),
          s.querySelector('[data-action="keep"]').addEventListener("click", () => {
            (s.remove(), (r = !1));
          }),
          s.querySelector('[data-action="discard"]').addEventListener("click", () => o()));
      },
      o = () => {
        (document.removeEventListener("keydown", i), t.onCancel());
      },
      i = (s) => {
        s.key === "Escape" && a();
      };
    return (
      document.addEventListener("keydown", i),
      n.querySelectorAll('[data-action="cancel"]').forEach((s) => {
        s.addEventListener("click", () => a());
      }),
      n.querySelector('[data-action="submit"]').addEventListener("click", async () => {
        await t.onSubmit();
      }),
      { host: n, close: o }
    );
  }
  function ua(e) {
    let t = e.previewUrl ? ` style="background-image:url('${e.previewUrl}')"` : "",
      n = e.previewUrl && (e.kind === "screenshot" || e.kind === "recording"),
      r = e.kind === "screenshot" || e.kind === "recording",
      a =
        e.kind === "screenshot"
          ? `<div class="preview screenshot${n ? " has-image" : ""}" data-preview="${b(e.id)}"${t}>
           ${r ? '<span class="scrim">click to preview</span>' : ""}
         </div>`
          : e.kind === "recording"
            ? `<div class="preview recording${n ? " has-image" : ""}" data-preview="${b(e.id)}"${t}>
             <div class="play">${S.playFilled}</div>
             ${e.duration ? `<span class="dur">${va(e.duration)}</span>` : ""}
             ${r ? '<span class="scrim">click to play</span>' : ""}
           </div>`
            : `<div class="preview file">${S.file}<span class="ext">.${b(ga(e.filename))}</span></div>`,
      o =
        e.progress != null && e.progress < 100
          ? `<div class="progress"><div class="fill" style="width:${e.progress}%"></div></div>`
          : "",
      i = e.kind === "screenshot" ? S.camera : e.kind === "recording" ? S.record : S.file;
    return `
    <div class="se-attach-card" data-attach="${b(e.id)}">
      ${a}
      ${o}
      <button class="rm" data-remove="${b(e.id)}" title="Remove">${S.x}</button>
      <div class="meta">
        <span class="ic">${i}</span>
        <span class="name" title="${b(e.filename)}">${b(e.filename)}</span>
        <span class="size">${b(rt(e.blob.size))}</span>
      </div>
    </div>`;
  }
  function fa(e, t) {
    if (!t.previewUrl) return;
    let n = document.createElement("div");
    n.className = "dtf-lightbox";
    let r = t.kind === "recording";
    ((n.innerHTML = `
    <div class="frame">
      <button class="x" data-action="close" title="Close (Esc)">${S.x}</button>
      ${r ? `<video src="${t.previewUrl}" controls autoplay playsinline></video>` : `<img src="${t.previewUrl}" alt="${b(t.filename)}" />`}
      <div class="cap">
        <span>${b(t.filename)}</span>
        <span style="color:var(--fg-4)">\xB7</span>
        <span style="color:var(--fg-4)">${b(rt(t.blob.size))}</span>
      </div>
    </div>`),
      e.appendChild(n));
    let a = () => {
        (document.removeEventListener("keydown", o, !0), n.remove());
      },
      o = (i) => {
        i.key === "Escape" && (i.preventDefault(), i.stopPropagation(), a());
      };
    (document.addEventListener("keydown", o, !0),
      n.addEventListener("click", (i) => {
        (i.target === n || i.target.closest('[data-action="close"]')) && a();
      }));
  }
  function ga(e) {
    let t = e.lastIndexOf(".");
    return t > 0 ? e.slice(t + 1) : "file";
  }
  function va(e) {
    let t = Math.round(e / 1e3);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }
  function ma(e, t, n, r, a) {
    let o = [],
      i = null,
      s = () => {
        for (let h of o) h.previewUrl && URL.revokeObjectURL(h.previewUrl);
      },
      u = `
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
          <button type="button" class="ibtn" data-action="screenshot">${S.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${S.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${S.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`,
      f = { title: "", steps: "", actual: "", expected: "" },
      l = _n(e, {
        title: "File a bug",
        bodyHtml: u,
        isDirty: () => !!(f.title || f.steps || f.actual || f.expected || o.length),
        onSubmit: $,
        onCancel: () => {
          (s(), a());
        },
      }),
      c = l.host,
      d = c.querySelector("[data-status]"),
      g = (h, P = !1) => {
        ((d.textContent = h), d.classList.toggle("err", P));
      },
      p = c.querySelector("[data-attach-grid]"),
      v = () => {
        ((p.innerHTML = o.map(ua).join("")),
          p.querySelectorAll("[data-remove]").forEach((h) => {
            h.addEventListener("click", (P) => {
              P.stopPropagation();
              let A = o.findIndex((M) => M.id === h.dataset.remove);
              if (A >= 0) {
                let [M] = o.splice(A, 1);
                M.previewUrl && URL.revokeObjectURL(M.previewUrl);
              }
              v();
            });
          }),
          p.querySelectorAll("[data-preview]").forEach((h) => {
            h.addEventListener("click", (P) => {
              P.stopPropagation();
              let A = o.find((M) => M.id === h.dataset.preview);
              A && fa(n, A);
            });
          }));
      },
      k = (h) => {
        (!h.previewUrl &&
          (h.kind === "screenshot" || h.kind === "recording") &&
          (h.previewUrl = URL.createObjectURL(h.blob)),
          o.push(h),
          v());
      };
    (c.querySelectorAll("[data-field]").forEach((h) => {
      h.addEventListener("input", () => {
        f[h.dataset.field] = h.value;
      });
    }),
      c.querySelector('[data-action="screenshot"]').addEventListener("click", async () => {
        g("Pick a screen/tab to capture\u2026");
        try {
          let h = await kn(r.host);
          (g(""),
            ba(n, r, h, (P) => {
              k({
                id: "at_" + Math.random().toString(36).slice(2, 7),
                kind: "screenshot",
                filename: `screenshot-${Date.now()}.png`,
                blob: P,
              });
            }));
        } catch (h) {
          g(h instanceof Error ? h.message : String(h), !0);
        }
      }));
    let R = c.querySelector('[data-action="record"]');
    R.addEventListener("click", async () => {
      if (i) {
        try {
          ((R.disabled = !0), g("Finalizing recording\u2026"));
          let h = await i.stop();
          ((i = null),
            R.classList.remove("recording"),
            (R.innerHTML = `${S.record} Record screen`),
            k({
              id: "at_" + Math.random().toString(36).slice(2, 7),
              kind: "recording",
              filename: `recording-${Date.now()}.webm`,
              blob: h,
            }),
            g(""));
        } catch (h) {
          g(h instanceof Error ? h.message : String(h), !0);
        } finally {
          R.disabled = !1;
        }
        return;
      }
      g("Pick a screen/tab to record\u2026");
      try {
        ((i = await En(r.host)),
          R.classList.add("recording"),
          (R.innerHTML = `${S.record} Stop recording`),
          g("Recording\u2026"));
      } catch (h) {
        (g(h instanceof Error ? h.message : String(h), !0), (i = null));
      }
    });
    let L = c.querySelector('[data-action="file-input"]');
    (c.querySelector('[data-action="upload"]').addEventListener("click", () => L.click()),
      L.addEventListener("change", () => {
        let h = L.files?.[0];
        if (!h) return;
        let P = h.type.startsWith("image/"),
          A = h.type.startsWith("video/");
        (k({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: P ? "screenshot" : A ? "recording" : "file",
          filename: h.name,
          blob: h,
        }),
          (L.value = ""));
      }));
    async function $() {
      if (!f.title.trim()) {
        g("Title is required", !0);
        return;
      }
      g("Submitting\u2026");
      try {
        let h = await t.createBug({
          title: f.title.trim(),
          stepsToReproduce: f.steps,
          actualResult: f.actual,
          expectedResult: f.expected,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
        for (let P = 0; P < o.length; P++) {
          let A = o[P];
          (g(`Uploading ${P + 1}/${o.length}\u2026`),
            await t.uploadAttachment({
              reportKind: "bug",
              reportId: h.id,
              kind: A.kind,
              filename: A.filename,
              blob: A.blob,
            }));
        }
        (s(), l.close());
      } catch (h) {
        g(h instanceof Error ? h.message : String(h), !0);
      }
    }
  }
  function ba(e, t, n, r) {
    let a = document.createElement("div");
    ((a.className = "dtf-modal-bg annotate"),
      (a.innerHTML = `
    <div class="dtf-modal lg annot-modal">
      <div class="hd">
        <span class="k">Annotate screenshot</span>
        <button class="x" data-action="close">${S.x}</button>
      </div>
      <div class="bd annot-bd" data-host>Preparing annotator\u2026</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="close">Cancel</button>
        <button class="primary" data-action="save">Use screenshot</button>
      </div>
    </div>`),
      e.appendChild(a));
    let o = () => a.remove();
    (a.querySelectorAll('[data-action="close"]').forEach((s) => s.addEventListener("click", o)),
      a.addEventListener("click", (s) => {
        s.target === a && o();
      }));
    let i = a.querySelector("[data-host]");
    Sn(n)
      .then((s) => {
        ((i.innerHTML = ""),
          i.appendChild(s.root),
          a.querySelector('[data-action="save"]').addEventListener("click", async () => {
            let u = await s.export();
            (o(), r(u));
          }));
      })
      .catch((s) => {
        i.innerHTML = `<div class="err">${b(String(s))}</div>`;
      });
  }
  function ha(e, t, n) {
    let r = { title: "", description: "", useCase: "", importance: "nice_to_have" },
      o = _n(e, {
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
      i = o.host,
      s = i.querySelector("[data-status]"),
      u = (l, c = !1) => {
        ((s.textContent = l), s.classList.toggle("err", c));
      };
    i.querySelectorAll("[data-field]").forEach((l) => {
      (l.addEventListener("input", () => {
        r[l.dataset.field] = l.value;
      }),
        l.addEventListener("change", () => {
          r[l.dataset.field] = l.value;
        }));
    });
    async function f() {
      if (!r.title.trim()) {
        u("Title is required", !0);
        return;
      }
      u("Submitting\u2026");
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
        u(l instanceof Error ? l.message : String(l), !0);
      }
    }
  }
  var xa = 200,
    $e = [];
  function ya(e, t) {
    ($e.push({ ts: Date.now(), level: e, message: t }), $e.length > xa && $e.shift());
  }
  typeof window < "u" &&
    window.addEventListener("se:state:update", (e) => {
      let t = e.detail,
        n = "state update";
      if (t && typeof t == "object")
        try {
          n = JSON.stringify(t).slice(0, 200);
        } catch {}
      ya("log", n);
    });
  function wa(e, t) {
    let n = e - t;
    return n < 1e3 ? `${n}ms` : n < 6e4 ? `${(n / 1e3).toFixed(1)}s` : `${Math.floor(n / 6e4)}m`;
  }
  function Tn(e) {
    if ($e.length === 0) {
      let { html: r, wire: a } = Q({
        title: "No <em>events</em> yet",
        message:
          "SDK evaluations and overrides will stream here as the page interacts with ShipEasy.",
      });
      ((e.innerHTML = r), a(e));
      return;
    }
    let t = Date.now(),
      n = $e.slice().reverse();
    e.innerHTML =
      `<div class="dtf-group">Live event stream<span class="pulse"><span class="d"></span>${n.length}/buf</span></div>` +
      n
        .map(
          (r) => `
      <div class="dtf-event">
        <span class="ts">${wa(t, r.ts)} ago</span>
        <span class="lvl${r.level === "warn" ? " warn" : r.level === "err" ? " err" : ""}">${r.level === "warn" ? "!" : r.level === "err" ? "\xD7" : "\u203A"}</span>
        <span class="msg">${b(r.message)}</span>
        <span class="ms"></span>
      </div>`,
        )
        .join("");
  }
  var Mn = "shipeasy_hide_admin_links";
  function An(e, t) {
    return t
      ? t === "*"
        ? !0
        : t.startsWith("*.")
          ? e.endsWith(t.slice(1))
          : e === t || e === `www.${t}`
      : !1;
  }
  var Rn = "sdk_client_6cecf6208cb443faa86b9ce6c007aee4",
    ka = "https://cdn.shipeasy.ai",
    Ea = { hideAdminLinks: !1 },
    Lt = { ...Ea },
    _e = null,
    St = new Set();
  function Pn() {
    return Lt;
  }
  function Cn(e) {
    return (St.add(e), () => St.delete(e));
  }
  function Hn() {
    return Rn
      ? _e ||
          ((_e = (async () => {
            try {
              let e = await fetch(`${ka}/sdk/evaluate`, {
                method: "POST",
                headers: { "X-SDK-Key": Rn, "Content-Type": "application/json" },
                body: JSON.stringify({ user: {} }),
              });
              if (!e.ok) return;
              let r = { hideAdminLinks: !!((await e.json()).flags ?? {})[Mn] },
                a = r.hideAdminLinks !== Lt.hideAdminLinks;
              if (((Lt = r), a)) for (let o of St) o();
            } catch {
            } finally {
              _e = null;
            }
          })()),
          _e)
      : Promise.resolve();
  }
  var La = {
      gates: "gates",
      configs: "configs",
      experiments: "experiments",
      labels: "translations",
      feedback: "feedback",
      user: "user",
      events: "events",
    },
    ve = [
      { k: "user", label: "User", icon: S.users, description: "props \xB7 impersonate" },
      { k: "gates", label: "Gates", icon: S.shield, description: "flags & killswitches" },
      { k: "experiments", label: "Experiments", icon: S.flask, description: "A/B variants" },
      { k: "configs", label: "Configs", icon: S.sliders, description: "remote values" },
      { k: "labels", label: "Translations", icon: S.book, description: "i18n strings" },
      { k: "feedback", label: "Feedback", icon: S.bug, description: "bugs + requests" },
      { k: "events", label: "Events", icon: S.activity, description: "live stream" },
    ],
    $t = "se_dt_project",
    zn = "se_l_overlay",
    _t = "se_l_active_panel",
    Sa = 24,
    $a = 56,
    On = { edge: "right", offsetPct: 50, railIconSize: 32, collapsed: !1 };
  function _a() {
    try {
      let e = sessionStorage.getItem($t);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Ke(e) {
    try {
      e === null ? sessionStorage.removeItem($t) : sessionStorage.setItem($t, JSON.stringify(e));
    } catch {}
  }
  function Ta() {
    try {
      let e = localStorage.getItem(zn);
      if (e) return { ...On, ...JSON.parse(e) };
    } catch {}
    return { ...On };
  }
  function te(e) {
    try {
      localStorage.setItem(zn, JSON.stringify(e));
    } catch {}
  }
  var Ma = new Set(["user", "gates", "experiments", "configs", "labels", "feedback", "events"]);
  function qn() {
    try {
      let e = sessionStorage.getItem(_t);
      if (e && Ma.has(e)) return e;
    } catch {}
    return null;
  }
  function me(e) {
    try {
      e === null ? sessionStorage.removeItem(_t) : sessionStorage.setItem(_t, e);
    } catch {}
  }
  function Aa() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  function Ra(e, t) {
    return (
      e.translations === t.translations &&
      e.configs === t.configs &&
      e.gates === t.gates &&
      e.experiments === t.experiments &&
      e.feedback === t.feedback
    );
  }
  function In(e) {
    return !!(e.hideAdminLinks || Pn().hideAdminLinks);
  }
  function Bn(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" }),
      r = document.createElement("style");
    ((r.textContent = Me), n.appendChild(r));
    let a = document.createElement("div");
    n.appendChild(a);
    let o = Ta(),
      i = qn(),
      s = Tt(),
      u = _a();
    u && s && u.id !== s.projectId && ((u = null), Ke(null));
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
      c = "bugs",
      d = null,
      g = { props: {}, dirty: {} },
      p = { user: 0, gates: 0, experiments: 0, configs: 0, labels: 0, feedback: 0, events: 0 };
    function v() {
      return Object.values(p).reduce((x, y) => x + y, 0);
    }
    function k(x) {
      let y = La[x];
      return y ? (u ? u.modules[y] : !s) : !0;
    }
    function R(x) {
      let y = window.innerWidth,
        z = window.innerHeight,
        { edge: _, offsetPct: I, collapsed: q } = o,
        T = x.style;
      if (((T.top = T.bottom = T.left = T.right = T.transform = ""), (x.dataset.edge = _), q))
        _ === "right"
          ? ((T.right = "10px"), (T.top = `${I}%`), (T.transform = "translateY(-50%)"))
          : _ === "left"
            ? ((T.left = "10px"), (T.top = `${I}%`), (T.transform = "translateY(-50%)"))
            : _ === "top"
              ? ((T.top = "10px"), (T.left = `${I}%`), (T.transform = "translateX(-50%)"))
              : ((T.bottom = "10px"), (T.left = `${I}%`), (T.transform = "translateX(-50%)"));
      else {
        let B = z - 36;
        _ === "right"
          ? ((T.right = "12px"), (T.top = "18px"))
          : _ === "left"
            ? ((T.left = "12px"), (T.top = "18px"))
            : _ === "top"
              ? ((T.top = "12px"), (T.right = "18px"))
              : ((T.bottom = "12px"), (T.right = "18px"));
      }
    }
    function L(x, y) {
      let z = window.innerWidth,
        _ = window.innerHeight,
        I = [
          [z - x, "right"],
          [x, "left"],
          [y, "top"],
          [_ - y, "bottom"],
        ];
      I.sort((B, W) => B[0] - W[0]);
      let q = I[0][1],
        E = Math.max(
          5,
          Math.min(95, q === "left" || q === "right" ? (y / _) * 100 : (x / z) * 100),
        );
      return { edge: q, offsetPct: E };
    }
    function $() {
      let x = document.createElement("div");
      for (
        x.className = o.collapsed ? "dtf-panel collapsed" : "dtf-panel",
          x.setAttribute("data-edge", o.edge);
        a.firstChild;
      )
        a.removeChild(a.firstChild);
      (a.appendChild(x), R(x), o.collapsed ? P(x) : M(x));
    }
    function h(x) {
      let y = null,
        z = null,
        _ = (E) => {
          (T(!0),
            (d = E),
            (c = E === "bug" ? "bugs" : "features"),
            (i = "feedback"),
            me(i),
            (o = { ...o, collapsed: !1 }),
            te(o),
            $());
        },
        I = () => {
          if (!y) return;
          let E = x.getBoundingClientRect(),
            B = y.offsetWidth,
            W = y.offsetHeight,
            Y = 8,
            G,
            H;
          o.edge === "right"
            ? ((G = E.left - B - Y), (H = E.top + E.height / 2 - W / 2))
            : o.edge === "left"
              ? ((G = E.right + Y), (H = E.top + E.height / 2 - W / 2))
              : o.edge === "top"
                ? ((G = E.left + E.width / 2 - B / 2), (H = E.bottom + Y))
                : ((G = E.left + E.width / 2 - B / 2), (H = E.top - W - Y));
          let F = window.innerWidth,
            X = window.innerHeight;
          ((G = Math.max(8, Math.min(F - B - 8, G))),
            (H = Math.max(8, Math.min(X - W - 8, H))),
            (y.style.left = `${G}px`),
            (y.style.top = `${H}px`));
        },
        q = () => {
          (z && (window.clearTimeout(z), (z = null)),
            !y &&
              ((y = document.createElement("div")),
              (y.className = "se-qa"),
              (y.innerHTML = `<span class="qa-hd">Quick actions</span><button data-qa="bug">${S.bug}<span>File a bug</span><span class="sub">screenshot \xB7 video</span></button><button data-qa="feature">${S.sparkles}<span>Request a feature</span></button>`),
              n.appendChild(y),
              I(),
              requestAnimationFrame(() => {
                requestAnimationFrame(() => y?.classList.add("show"));
              }),
              y.addEventListener("mouseenter", q),
              y.addEventListener("mouseleave", () => T()),
              y.querySelectorAll("[data-qa]").forEach((E) => {
                E.addEventListener("click", (B) => {
                  (B.stopPropagation(), _(E.dataset.qa));
                });
              })));
        },
        T = (E = !1) => {
          z && (window.clearTimeout(z), (z = null));
          let B = () => {
            y && (y.remove(), (y = null));
          };
          E ? B() : (z = window.setTimeout(B, 160));
        };
      (x.addEventListener("mouseenter", q), x.addEventListener("mouseleave", () => T()));
    }
    function P(x) {
      let y = o.railIconSize,
        z = s
          ? ve
              .filter((E) => k(E.k))
              .map((E) => {
                let B = p[E.k] > 0;
                return (
                  `<button class="ri" data-tab="${E.k}" style="width:${y}px;height:${y}px">` +
                  E.icon.replace(
                    "<svg ",
                    `<svg width="${Math.round(y * 0.5)}" height="${Math.round(y * 0.5)}" `,
                  ) +
                  (B ? '<span class="dotw"></span>' : "") +
                  `<span class="tip">${E.label}</span></button>`
                );
              })
              .join("")
          : `<button class="ri lock-only" data-tab="__lock__" style="width:${y}px;height:${y}px" title="">` +
            S.lock.replace(
              "<svg ",
              `<svg width="${Math.round(y * 0.5)}" height="${Math.round(y * 0.5)}" `,
            ) +
            '<span class="tip tip-multi"><b>Devtools locked</b>Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.<span class="hint">Click to connect \u2192</span></span></button>',
        _ =
          `<div class="dtf-panel-rail"><div class="mk" title="Drag to reposition \xB7 click to expand" style="width:${y * 0.7}px;height:${y * 0.7}px"></div>` +
          z +
          `<div class="dtf-rail-resize" style="width:${o.edge === "right" || o.edge === "left" ? y : 12}px;height:${o.edge === "right" || o.edge === "left" ? 12 : y}px" title="Drag to resize"></div></div>`;
      x.innerHTML = _;
      let I = x.querySelector(".mk"),
        q = !1;
      (I.addEventListener("mousedown", (E) => {
        (E.preventDefault(), (q = !1));
        let B = E.clientX,
          W = E.clientY;
        I.classList.add("dragging");
        let Y = (H) => {
            Math.hypot(H.clientX - B, H.clientY - W) > 4 && (q = !0);
            let { edge: F, offsetPct: X } = L(H.clientX, H.clientY);
            ((o = { ...o, edge: F, offsetPct: X }), R(x), x.setAttribute("data-edge", F));
          },
          G = () => {
            (I.classList.remove("dragging"),
              document.removeEventListener("mousemove", Y),
              document.removeEventListener("mouseup", G),
              te(o));
          };
        (document.addEventListener("mousemove", Y), document.addEventListener("mouseup", G));
      }),
        I.addEventListener("click", () => {
          q || ((o = { ...o, collapsed: !1 }), te(o), $());
        }),
        x.querySelectorAll(".ri").forEach((E) => {
          (E.addEventListener("click", () => {
            let B = E.dataset.tab;
            (B !== "__lock__" && ((i = B), me(i)), (o = { ...o, collapsed: !1 }), te(o), $());
          }),
            E.dataset.tab === "feedback" && h(E));
        }));
      let T = x.querySelector(".dtf-rail-resize");
      T.addEventListener("mousedown", (E) => {
        (E.preventDefault(), E.stopPropagation());
        let B = o.edge === "right" || o.edge === "left",
          W = E.clientX,
          Y = E.clientY,
          G = o.railIconSize;
        T.classList.add("dragging");
        let H = (X) => {
            let Te = B ? X.clientY - Y : X.clientX - W,
              We = Math.max(Sa, Math.min($a, Math.round(G + Te)));
            ((o = { ...o, railIconSize: We }), $());
          },
          F = () => {
            (T.classList.remove("dragging"),
              document.removeEventListener("mousemove", H),
              document.removeEventListener("mouseup", F),
              te(o));
          };
        (document.addEventListener("mousemove", H), document.addEventListener("mouseup", F));
      });
    }
    function A(x) {
      let y = window.location.host;
      x.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${Fe(y)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${S.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${S.lock}
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
              <div class="ic-big">${S.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${S.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${S.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${S.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${S.book}</span><span class="k">Edit translations in-place</span></div>
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
      let z = x.querySelector(".dtf-head .mk");
      (z.addEventListener("mousedown", (T) => {
        (T.preventDefault(), z.classList.add("dragging"));
        let E = (W) => {
            let { edge: Y, offsetPct: G } = L(W.clientX, W.clientY);
            ((o = { ...o, edge: Y, offsetPct: G }), R(x));
          },
          B = () => {
            (z.classList.remove("dragging"),
              document.removeEventListener("mousemove", E),
              document.removeEventListener("mouseup", B),
              te(o));
          };
        (document.addEventListener("mousemove", E), document.addEventListener("mouseup", B));
      }),
        x.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((o = { ...o, collapsed: !0 }), te(o), $());
        }));
      let _ = x.querySelector('[data-action="connect"]'),
        I = x.querySelector("[data-status]"),
        q = x.querySelector("[data-err]");
      _.addEventListener("click", async () => {
        ((_.disabled = !0),
          (_.innerHTML = '<span class="spin"></span> Opening\u2026'),
          (I.textContent = ""),
          (q.style.display = "none"),
          (q.textContent = ""));
        try {
          ((s = await Mt(e, () => {
            ((I.textContent = "Waiting for approval in the opened tab\u2026"),
              (_.innerHTML = '<span class="spin"></span> Waiting for approval'));
          })),
            (i = ve.find((T) => k(T.k))?.k ?? "gates"),
            me(i),
            $());
        } catch (T) {
          ((q.textContent = T instanceof Error ? T.message : String(T)),
            (q.style.display = "block"),
            (I.textContent = ""),
            (_.disabled = !1),
            (_.textContent = "Retry connect \u2192"));
        }
      });
    }
    function M(x) {
      if (!s) {
        A(x);
        return;
      }
      let y = i && i !== "__lock__" ? i : (ve.find((H) => k(H.k))?.k ?? "gates");
      i !== y && ((i = y), me(y));
      let z = ve.find((H) => H.k === y),
        _ = u?.name ?? "",
        I = window.location.host,
        q = _ || I,
        T = ve
          .filter((H) => k(H.k))
          .map((H) => {
            let F = H.k === y,
              X = p[H.k] > 0;
            return (
              `<button class="t${F ? " active" : ""}" data-tab="${H.k}" title="${H.label}">` +
              H.icon +
              (X ? '<span class="dotw"></span>' : "") +
              `<span class="tip">${H.label}</span></button>`
            );
          })
          .join(""),
        E = ["gates", "experiments", "configs", "labels"].includes(y),
        B = f[y],
        W =
          v() > 0
            ? '<div class="dtf-overbar">' +
              S.alert +
              `<span><b>${v()} session override${v() > 1 ? "s" : ""}</b> \xB7 cleared on refresh</span><button data-action="clear-overrides">Clear all</button></div>`
            : "",
        Y = E
          ? `<div class="dtf-search">
          <div class="input">
            ${S.search}
            <input placeholder="Filter ${y}\u2026" value="${Pa(B.search)}" />
            ${B.search ? '<span class="kbd" data-action="clear-search">esc</span>' : '<span class="kbd">\u2318K</span>'}
          </div>
          <div class="seg">
            <button class="${B.view === "page" ? "active" : ""}" data-view="page">page</button>
            <button class="${B.view === "all" ? "active" : ""}" data-view="all">all</button>
          </div>
          ${y === "labels" ? '<select class="dtf-locale-sel" data-locale></select>' : ""}
        </div>`
          : "";
      x.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${Fe(z.label)}</span>
          <span class="sub">${Fe(q)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${S.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${S.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${T}</div>
        <div class="dtf-pane">
          ${W}
          ${Y}
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
          ${v() > 0 ? '<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>' : ""}
          ${s ? '<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>' : ""}
        </div>
      </div>
    `;
      let G = x.querySelector(".dtf-head .mk");
      if (
        (G.addEventListener("mousedown", (H) => {
          (H.preventDefault(), G.classList.add("dragging"));
          let F = (Te) => {
              let { edge: We, offsetPct: Nn } = L(Te.clientX, Te.clientY);
              ((o = { ...o, edge: We, offsetPct: Nn }), R(x));
            },
            X = () => {
              (G.classList.remove("dragging"),
                document.removeEventListener("mousemove", F),
                document.removeEventListener("mouseup", X),
                te(o));
            };
          (document.addEventListener("mousemove", F), document.addEventListener("mouseup", X));
        }),
        x.querySelector('[data-action="refresh"]').addEventListener("click", () => $()),
        x.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((o = { ...o, collapsed: !0 }), te(o), $());
        }),
        x.querySelectorAll(".dtf-rail .t").forEach((H) => {
          (H.addEventListener("click", () => {
            ((i = H.dataset.tab), me(i), $());
          }),
            H.dataset.tab === "feedback" && h(H));
        }),
        E)
      ) {
        let H = x.querySelector(".dtf-search input");
        (H.addEventListener("input", () => {
          ((f[y].search = H.value), O());
        }),
          x.querySelectorAll(".dtf-search .seg button").forEach((F) => {
            F.addEventListener("click", () => {
              ((f[y].view = F.dataset.view), $());
            });
          }),
          x.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
            ((f[y].search = ""), $());
          }));
      }
      (x.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
        qt();
      }),
        x.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
          It();
        }),
        x.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
          let H = tt({ ...nt(), openDevtools: !0 }),
            F = x.querySelector('[data-action="share"]');
          try {
            await navigator.clipboard.writeText(H);
            let X = F.textContent;
            ((F.textContent = "Copied \u2713"), setTimeout(() => (F.textContent = X), 1500));
          } catch {
            prompt("Copy this URL:", H);
          }
        }),
        x.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
          (Ye(), Ke(null), (s = null), (u = null), $());
        }),
        O());
    }
    function O() {
      let x = a.querySelector("#dtf-body");
      if (!x || !s) return;
      let y = new xe(e.adminUrl, s.token, s.projectId, In(e));
      J(y);
      let z = i,
        _ = f[z],
        I = (q) => {
          let T = p[z];
          ((p[z] = q), ((T === 0) != (q === 0) || T !== q) && V());
        };
      switch (z) {
        case "user":
          Bt(x, y, g, () => $());
          break;
        case "gates":
          jt(x, y, _, I);
          break;
        case "experiments":
          Ut(x, y, _, I);
          break;
        case "configs":
          Dt(x, y, _, I, a);
          break;
        case "labels":
          yn(x, y, _, n, {
            locale: l,
            setLocale: (q) => {
              ((l = q), O());
            },
          });
          break;
        case "feedback":
          $n(x, y, a, {
            sub: c,
            setSub: (q) => {
              ((c = q), O());
            },
            pendingForm: d,
            consumePendingForm: () => {
              d = null;
            },
          });
          break;
        case "events":
          Tn(x);
          break;
      }
    }
    function V() {
      $();
    }
    async function J(x) {
      try {
        let y = await x.project(),
          z = window.location.host;
        if (!(Aa() !== null) && y.domain && !An(z, y.domain)) {
          (Ye(), Ke(null), (s = null), (u = null), $());
          return;
        }
        let I = u;
        if (((u = y), Ke(y), i && !k(i))) {
          let q = ve.find((T) => k(T.k))?.k ?? null;
          ((i = q), me(q), $());
          return;
        }
        (!I || !Ra(I.modules, y.modules)) && $();
      } catch {}
    }
    document.documentElement.appendChild(t);
    let m = () => {
        document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
      },
      w = new MutationObserver(m);
    if (
      (w.observe(document.documentElement, { childList: !0 }),
      de() && (Le(), Se(!0, n, () => {})),
      qn() || (o = { ...o, collapsed: !0 }),
      $(),
      s)
    ) {
      let x = new xe(e.adminUrl, s.token, s.projectId, In(e));
      J(x);
    }
    Hn();
    let C = Cn(() => $()),
      j = () => {
        let x = a.querySelector(".dtf-panel");
        x && R(x);
      };
    window.addEventListener("resize", j);
    let ee = () => O();
    return (
      window.addEventListener("se:state:update", ee),
      {
        destroy() {
          (window.removeEventListener("resize", j),
            window.removeEventListener("se:state:update", ee),
            C(),
            w.disconnect(),
            t.remove());
        },
      }
    );
  }
  function Fe(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Pa(e) {
    return Fe(e);
  }
  var Ca = "https://shipeasy.ai";
  function jn(e) {
    return (
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|$)/i.test(e) ||
      e === "file://" ||
      e === "null"
    );
  }
  function Ha() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          let n = new URL(e.src).origin;
          if (!jn(n)) return n;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let n of Array.from(t))
        if (n.src.includes("se-devtools.js"))
          try {
            let r = new URL(n.src).origin;
            if (!jn(r)) return r;
          } catch {}
    }
    return Ca;
  }
  var be = null,
    Ge = null;
  function Un(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (be) {
      if (document.getElementById("shipeasy-devtools")) return;
      be = null;
    }
    Ge || (Ge = zt());
    let t = { adminUrl: e.adminUrl ?? Ha(), hideAdminLinks: e.hideAdminLinks ?? !1 },
      { destroy: n } = Bn(t);
    be = n;
  }
  function Oa() {
    (be?.(), (be = null), Ge?.(), (Ge = null));
  }
  function Dn(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    Ce() && Un(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      a = n.includes("Shift"),
      o = n.includes("Alt") || n.includes("Option"),
      i = n.includes("Ctrl") || n.includes("Control"),
      s = n.includes("Meta") || n.includes("Cmd"),
      u = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function f(l) {
      (u ? l.code === u : l.key.toLowerCase() === r.toLowerCase()) &&
        l.shiftKey === a &&
        l.altKey === o &&
        l.ctrlKey === i &&
        l.metaKey === s &&
        (be ? Oa() : Un(e));
    }
    return (window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => Dn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      de())
    ) {
      let n = !1,
        r = new MutationObserver(() => a()),
        a = () => {
          n ||
            ((n = !0),
            requestAnimationFrame(() => {
              ((n = !1),
                r.disconnect(),
                Le(),
                r.observe(document.body, { childList: !0, subtree: !0, attributes: !0 }));
            }));
        },
        o = () => {
          requestAnimationFrame(() => requestAnimationFrame(() => a()));
        };
      document.readyState === "complete" ? o() : window.addEventListener("load", o, { once: !0 });
      let i = () => {
        let u = document.getElementById("shipeasy-devtools");
        if (!u?.shadowRoot) {
          setTimeout(i, 100);
          return;
        }
        Se(!0, u.shadowRoot, () => a());
      };
      (i(), window.addEventListener("se:i18n:ready", () => a(), { once: !0 }));
      let s = window;
      s.i18n?.on && s.i18n.on("update", () => a());
    }
    window.__se_devtools_ready = !0;
  }
})();
