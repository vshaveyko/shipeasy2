"use strict";
var __shipeasyLoader = (() => {
  var E = "__se_anon_id",
    b = "__se_seen",
    p = "__se_pending_alias",
    _ = class {
      constructor(e, t) {
        this.collectUrl = e;
        this.sdkKey = t;
        if (typeof window < "u") {
          ((this.timer = setInterval(() => this.flush(), 5e3)),
            window.addEventListener("beforeunload", () => this.flush()),
            document.addEventListener("visibilitychange", () => {
              document.visibilityState === "hidden" && this.flush(!0);
            }));
          try {
            let r = sessionStorage.getItem(b);
            r && (this.exposureSeen = new Set(JSON.parse(r)));
          } catch {}
        }
      }
      collectUrl;
      sdkKey;
      queue = [];
      exposureSeen = new Set();
      timer = null;
      destroy() {
        this.timer !== null && (clearInterval(this.timer), (this.timer = null));
      }
      pushExposure(e, t, r, i) {
        let c = `${r || i}:${e}`;
        if (!this.exposureSeen.has(c)) {
          this.exposureSeen.add(c);
          try {
            sessionStorage.setItem(b, JSON.stringify([...this.exposureSeen]));
          } catch {}
          this.enqueue({
            type: "exposure",
            experiment: e,
            group: t,
            user_id: r,
            anonymous_id: i,
            ts: Date.now(),
          });
        }
      }
      pushMetric(e, t, r, i) {
        this.enqueue({
          type: "metric",
          event_name: e,
          user_id: t,
          anonymous_id: r,
          ts: Date.now(),
          ...(i ? { properties: i } : {}),
        });
      }
      async alias(e, t) {
        let r = { anonymousId: e, userId: t, ts: Date.now() };
        try {
          localStorage.setItem(p, JSON.stringify(r));
        } catch {}
        (await this.flushAsync(), await this._sendAlias(e, t));
        try {
          localStorage.removeItem(p);
        } catch {}
      }
      async flushPendingAlias() {
        try {
          let e = localStorage.getItem(p);
          if (!e) return;
          let t = JSON.parse(e);
          if (Date.now() - t.ts > 7 * 864e5) {
            localStorage.removeItem(p);
            return;
          }
          (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(p));
        } catch {}
      }
      async _sendAlias(e, t) {
        (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
          await this.flushAsync());
      }
      enqueue(e) {
        (this.queue.push(e), this.queue.length >= 100 && this.flush());
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
    w = 5;
  function x(n, e, t) {
    if (typeof window > "u" || typeof PerformanceObserver > "u") return;
    let r = null,
      i = null,
      c = !1,
      o = 0,
      d = 0,
      f = !1;
    try {
      new PerformanceObserver((s) => {
        let l = s.getEntries();
        l.length && (r = l[l.length - 1].startTime);
      }).observe({ type: "largest-contentful-paint", buffered: !0 });
    } catch {}
    try {
      new PerformanceObserver((s) => {
        for (let l of s.getEntries()) {
          let a = l.duration ?? 0;
          (i === null || a > i) && (i = a);
        }
      }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
    } catch {}
    try {
      new PerformanceObserver((s) => {
        for (let l of s.getEntries()) l.value > 0.1 && (c = !0);
      }).observe({ type: "layout-shift", buffered: !0 });
    } catch {}
    let v = window.onerror;
    ((window.onerror = (u, s, l, a, g) => (
      o < w &&
        ((o += 1),
        n.pushMetric("__auto_js_error", e, t, {
          value: 1,
          kind: "exception",
          message: typeof u == "string" ? u.slice(0, 200) : String(g ?? "").slice(0, 200),
          source: typeof s == "string" ? s.slice(0, 200) : "",
          line: l ?? 0,
        })),
      typeof v == "function" ? v(u, s, l, a, g) : !1
    )),
      window.addEventListener("unhandledrejection", (u) => {
        if (o < w) {
          o += 1;
          let s = u.reason,
            l = s instanceof Error ? s.message : typeof s == "string" ? s : String(s);
          n.pushMetric("__auto_js_error", e, t, {
            value: 1,
            kind: "unhandled_rejection",
            message: l.slice(0, 200),
          });
        }
      }));
    let S = window.fetch;
    window.fetch = async function (...u) {
      let s = typeof performance < "u" ? performance.now() : 0,
        l = typeof u[0] == "string" ? u[0] : u[0].toString(),
        a;
      try {
        a = await S.apply(this, u);
      } catch (g) {
        throw (
          d < w &&
            ((d += 1),
            n.pushMetric("__auto_network_error", e, t, {
              value: 1,
              kind: "network",
              status: 0,
              url: l.slice(0, 200),
            })),
          g
        );
      }
      if (a.status >= 500 && d < w) {
        d += 1;
        let g = typeof performance < "u" ? performance.now() - s : 0;
        n.pushMetric("__auto_network_error", e, t, {
          value: 1,
          kind: "5xx",
          status: a.status,
          url: l.slice(0, 200),
          duration_ms: Math.round(g),
        });
      }
      return a;
    };
    let m = () => {
      if (!f) {
        f = !0;
        try {
          let s = performance.getEntriesByType("navigation")[0];
          if (s) {
            let a = s.startTime ?? 0;
            (s.loadEventEnd > 0 &&
              n.pushMetric("__auto_page_load", e, t, { value: s.loadEventEnd - a }),
              s.responseStart > 0 &&
                n.pushMetric("__auto_ttfb", e, t, { value: s.responseStart - a }),
              s.domContentLoadedEventEnd > 0 &&
                n.pushMetric("__auto_dom_ready", e, t, { value: s.domContentLoadedEventEnd - a }));
          }
          let l = performance.getEntriesByType("paint");
          for (let a of l)
            a.name === "first-paint"
              ? n.pushMetric("__auto_fp", e, t, { value: a.startTime })
              : a.name === "first-contentful-paint" &&
                n.pushMetric("__auto_fcp", e, t, { value: a.startTime });
        } catch {}
      }
    };
    document.readyState === "complete"
      ? setTimeout(m, 0)
      : window.addEventListener(
          "load",
          () => {
            setTimeout(m, 0);
          },
          { once: !0 },
        );
    let k = () => {
      (m(),
        r !== null && n.pushMetric("__auto_lcp", e, t, { value: r }),
        i !== null && n.pushMetric("__auto_inp", e, t, { value: i }),
        c && n.pushMetric("__auto_cls_binary", e, t, { value: 1 }));
      let u = r === null ? 1 : 0;
      (n.pushMetric("__auto_abandoned", e, t, { value: u }), n.flush(!0));
    };
    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "hidden" && k();
    });
  }
  function R() {
    try {
      let e = localStorage.getItem(E);
      if (e) return e;
    } catch {}
    let n =
      typeof crypto < "u" && typeof crypto.randomUUID == "function"
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}`;
    try {
      localStorage.setItem(E, n);
    } catch {}
    return n;
  }
  function P() {
    if (typeof window > "u") return {};
    let n = {};
    try {
      typeof navigator < "u" && navigator.language && (n.locale = navigator.language);
    } catch {}
    try {
      let e = Intl.DateTimeFormat().resolvedOptions().timeZone;
      e && (n.timezone = e);
    } catch {}
    try {
      document.referrer && (n.referrer = document.referrer);
    } catch {}
    try {
      n.path = window.location.pathname;
    } catch {}
    try {
      window.screen &&
        ((n.screen_width = window.screen.width), (n.screen_height = window.screen.height));
    } catch {}
    try {
      typeof navigator < "u" &&
        typeof navigator.userAgent == "string" &&
        (n.user_agent = navigator.userAgent);
    } catch {}
    return n;
  }
  function U() {
    if (typeof window > "u") return {};
    let n = {};
    try {
      let e = new URLSearchParams(window.location.search);
      for (let [t, r] of e)
        !r ||
          r === "default" ||
          r === "none" ||
          ((t.startsWith("se_exp_") || t.startsWith("se-exp-")) && (n[t.slice(7)] = r));
    } catch {}
    return n;
  }
  var y = class {
      sdkKey;
      baseUrl;
      autoGuardrails;
      env;
      evalResult = null;
      anonId;
      userId = "";
      buffer;
      guardrailsInstalled = !1;
      listeners = new Set();
      overrideListenerInstalled = !1;
      onOverrideChange = () => {
        (this.installBridge(), this.notify());
      };
      constructor(e) {
        ((this.sdkKey = e.sdkKey),
          (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
          (this.env = e.env ?? "prod"),
          (this.autoGuardrails = e.autoGuardrails !== !1),
          (this.anonId = R()),
          (this.buffer = new _(`${this.baseUrl}/collect`, this.sdkKey)),
          this.buffer.flushPendingAlias());
      }
      async identify(e) {
        let t = this.userId;
        ((this.userId = e.user_id ?? ""),
          this.anonId &&
            this.userId &&
            this.userId !== t &&
            (await this.buffer.alias(this.anonId, this.userId)));
        let r = { ...P(), anonymous_id: this.anonId, ...e },
          i = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
            method: "POST",
            headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
            body: JSON.stringify({ user: r, experiment_overrides: U() }),
          });
        if (!i.ok) throw new Error(`/sdk/evaluate returned ${i.status}`);
        ((this.evalResult = await i.json()),
          this.autoGuardrails &&
            !this.guardrailsInstalled &&
            ((this.guardrailsInstalled = !0), x(this.buffer, this.userId, this.anonId)),
          this.notify());
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
        let t = F(e);
        return t !== null ? t : (this.evalResult?.flags[e] ?? !1);
      }
      getConfig(e, t) {
        let r = L(e),
          i = r !== void 0 ? r : this.evalResult?.configs?.[e];
        if (i !== void 0) {
          if (!t) return i;
          try {
            return t(i);
          } catch (c) {
            console.warn(`[shipeasy] getConfig('${e}') decode failed:`, String(c));
            return;
          }
        }
      }
      getExperiment(e, t, r, i) {
        let c = { inExperiment: !1, group: "control", params: t },
          o = A(e);
        if (o !== null) {
          let f = i?.[o],
            v = f ? { ...t, ...f } : t;
          return { inExperiment: !0, group: o, params: v };
        }
        let d = this.evalResult?.experiments[e];
        if (!d || !d.inExperiment) return c;
        if ((this.buffer.pushExposure(e, d.group, this.userId, this.anonId), !r))
          return { inExperiment: !0, group: d.group, params: d.params };
        try {
          return { inExperiment: !0, group: d.group, params: r(d.params) };
        } catch (f) {
          return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(f)), c);
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
    O = /^(true|on|1|yes)$/i,
    C = /^(false|off|0|no)$/i;
  function T(n) {
    return O.test(n) ? !0 : C.test(n) ? !1 : null;
  }
  function B(n) {
    if (n.startsWith("b64:"))
      try {
        let e = atob(n.slice(4).replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(e);
      } catch {
        return n;
      }
    try {
      return JSON.parse(n);
    } catch {
      return n;
    }
  }
  function h(n, e) {
    if (typeof window > "u" || !window.location) return null;
    let t = new URLSearchParams(window.location.search),
      r = t.get(n);
    if (r !== null) return r;
    if (e) {
      let i = t.get(e);
      if (i !== null) return i;
    }
    return null;
  }
  function F(n) {
    let e = h(`se_ks_${n}`) ?? h(`se_gate_${n}`) ?? h(`se-gate-${n}`);
    return e === null ? null : T(e);
  }
  function L(n) {
    let e = h(`se_config_${n}`, `se-config-${n}`);
    if (e !== null) return B(e);
  }
  function A(n) {
    let e = h(`se_exp_${n}`, `se-exp-${n}`);
    return e === null || e === "" || e === "default" || e === "none" ? null : e;
  }
  function I() {
    let n = Array.from(document.querySelectorAll("script[data-sdk-key]")),
      e = n[n.length - 1];
    if (!e) return { sdkKey: null, user: {} };
    let t = e.dataset,
      r = {};
    if (
      (t.userId && (r.user_id = t.userId),
      t.userEmail && (r.email = t.userEmail),
      t.userName && (r.name = t.userName),
      t.userPlan && (r.plan = t.userPlan),
      t.userProjectId && (r.project_id = t.userProjectId),
      t.attrs)
    )
      try {
        let i = JSON.parse(t.attrs);
        Object.assign(r, i);
      } catch (i) {
        console.warn("[shipeasy] data-attrs is not valid JSON:", String(i));
      }
    return { sdkKey: t.sdkKey ?? null, baseUrl: t.baseUrl, user: r };
  }
  (function () {
    if (typeof window > "u" || window.shipeasy) return;
    let { sdkKey: e, baseUrl: t, user: r } = I();
    if (!e) {
      console.warn("[shipeasy] loader.js: missing data-sdk-key");
      return;
    }
    let i = new y({ sdkKey: e, baseUrl: t }),
      c = i.identify(r).catch((o) => {
        console.warn("[shipeasy] identify failed:", String(o));
      });
    window.shipeasy = {
      getFlag: (o) => i.getFlag(o),
      getConfig: (o) => i.getConfig(o),
      getExperiment: (o, d) => i.getExperiment(o, d),
      identify: (o) => i.identify(o),
      track: (o, d) => i.track(o, d),
      ready: c,
    };
  })();
})();
