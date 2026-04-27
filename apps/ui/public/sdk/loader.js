"use strict";
var __shipeasyLoader = (() => {
  var y = "__se_anon_id",
    v = "__se_seen",
    d = "__se_pending_alias",
    h = class {
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
            let n = sessionStorage.getItem(v);
            n && (this.exposureSeen = new Set(JSON.parse(n)));
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
      pushExposure(e, t, n, r) {
        let a = `${n || r}:${e}`;
        if (!this.exposureSeen.has(a)) {
          this.exposureSeen.add(a);
          try {
            sessionStorage.setItem(v, JSON.stringify([...this.exposureSeen]));
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
          localStorage.setItem(d, JSON.stringify(n));
        } catch {}
        (await this.flushAsync(), await this._sendAlias(e, t));
        try {
          localStorage.removeItem(d);
        } catch {}
      }
      async flushPendingAlias() {
        try {
          let e = localStorage.getItem(d);
          if (!e) return;
          let t = JSON.parse(e);
          if (Date.now() - t.ts > 7 * 864e5) {
            localStorage.removeItem(d);
            return;
          }
          (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(d));
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
    };
  function _(s, e, t) {
    if (typeof window > "u" || typeof PerformanceObserver > "u") return;
    let n = null,
      r = null,
      a = !1,
      i = !1,
      c = !1;
    try {
      new PerformanceObserver((u) => {
        let l = u.getEntries();
        l.length && (n = l[l.length - 1].startTime);
      }).observe({ type: "largest-contentful-paint", buffered: !0 });
    } catch {}
    try {
      new PerformanceObserver((u) => {
        for (let l of u.getEntries()) {
          let g = l.duration ?? 0;
          (r === null || g > r) && (r = g);
        }
      }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
    } catch {}
    try {
      new PerformanceObserver((u) => {
        for (let l of u.getEntries()) l.value > 0.1 && (a = !0);
      }).observe({ type: "layout-shift", buffered: !0 });
    } catch {}
    let p = window.onerror;
    ((window.onerror = (...o) => (
      i || ((i = !0), s.pushMetric("__auto_js_error", e, t, { value: 1 })),
      typeof p == "function" ? p(...o) : !1
    )),
      window.addEventListener("unhandledrejection", () => {
        i || ((i = !0), s.pushMetric("__auto_js_error", e, t, { value: 1 }));
      }));
    let m = window.fetch;
    window.fetch = async function (...o) {
      let u = await m.apply(this, o);
      return (
        !c &&
          u.status >= 500 &&
          ((c = !0), s.pushMetric("__auto_network_error", e, t, { value: 1 })),
        u
      );
    };
    let w = () => {
      (n !== null && s.pushMetric("__auto_lcp", e, t, { value: n }),
        r !== null && s.pushMetric("__auto_inp", e, t, { value: r }),
        a && s.pushMetric("__auto_cls_binary", e, t, { value: 1 }));
      let o = n === null ? 1 : 0;
      (s.pushMetric("__auto_abandoned", e, t, { value: o }), s.flush(!0));
    };
    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "hidden" && w();
    });
  }
  function b() {
    try {
      let e = localStorage.getItem(y);
      if (e) return e;
    } catch {}
    let s =
      typeof crypto < "u" && typeof crypto.randomUUID == "function"
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}`;
    try {
      localStorage.setItem(y, s);
    } catch {}
    return s;
  }
  function E() {
    if (typeof window > "u") return {};
    let s = {};
    try {
      typeof navigator < "u" && navigator.language && (s.locale = navigator.language);
    } catch {}
    try {
      let e = Intl.DateTimeFormat().resolvedOptions().timeZone;
      e && (s.timezone = e);
    } catch {}
    try {
      document.referrer && (s.referrer = document.referrer);
    } catch {}
    try {
      s.path = window.location.pathname;
    } catch {}
    try {
      window.screen &&
        ((s.screen_width = window.screen.width), (s.screen_height = window.screen.height));
    } catch {}
    try {
      typeof navigator < "u" &&
        typeof navigator.userAgent == "string" &&
        (s.user_agent = navigator.userAgent);
    } catch {}
    return s;
  }
  function S() {
    if (typeof window > "u") return {};
    let s = {};
    try {
      let e = new URLSearchParams(window.location.search);
      for (let [t, n] of e)
        !n ||
          n === "default" ||
          n === "none" ||
          ((t.startsWith("se_exp_") || t.startsWith("se-exp-")) && (s[t.slice(7)] = n));
    } catch {}
    return s;
  }
  var f = class {
    sdkKey;
    baseUrl;
    autoGuardrails;
    env;
    evalResult = null;
    anonId;
    userId = "";
    buffer;
    guardrailsInstalled = !1;
    constructor(e) {
      ((this.sdkKey = e.sdkKey),
        (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
        (this.env = e.env ?? "prod"),
        (this.autoGuardrails = e.autoGuardrails !== !1),
        (this.anonId = b()),
        (this.buffer = new h(`${this.baseUrl}/collect`, this.sdkKey)),
        this.buffer.flushPendingAlias());
    }
    async identify(e) {
      let t = this.userId;
      ((this.userId = e.user_id ?? ""),
        this.anonId &&
          this.userId &&
          this.userId !== t &&
          (await this.buffer.alias(this.anonId, this.userId)));
      let n = { ...E(), anonymous_id: this.anonId, ...e },
        r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
          method: "POST",
          headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
          body: JSON.stringify({ user: n, experiment_overrides: S() }),
        });
      if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
      ((this.evalResult = await r.json()),
        this.autoGuardrails &&
          !this.guardrailsInstalled &&
          ((this.guardrailsInstalled = !0), _(this.buffer, this.userId, this.anonId)));
    }
    initFromBootstrap(e) {
      this.evalResult = e;
    }
    getFlag(e) {
      return this.evalResult?.flags[e] ?? !1;
    }
    getConfig(e, t) {
      let n = this.evalResult?.configs?.[e];
      if (n !== void 0) {
        if (!t) return n;
        try {
          return t(n);
        } catch (r) {
          console.warn(`[shipeasy] getConfig('${e}') decode failed:`, String(r));
          return;
        }
      }
    }
    getExperiment(e, t, n) {
      let r = { inExperiment: !1, group: "control", params: t },
        a = this.evalResult?.experiments[e];
      if (!a || !a.inExperiment) return r;
      if ((this.buffer.pushExposure(e, a.group, this.userId, this.anonId), !n))
        return { inExperiment: !0, group: a.group, params: a.params };
      try {
        return { inExperiment: !0, group: a.group, params: n(a.params) };
      } catch (i) {
        return (console.warn(`[shipeasy] getExperiment('${e}') decode failed:`, String(i)), r);
      }
    }
    track(e, t) {
      this.buffer.pushMetric(e, this.userId, this.anonId, t);
    }
    async flush() {
      await this.buffer.flushAsync();
    }
    destroy() {
      (this.buffer.flush(), this.buffer.destroy());
    }
  };
  function k() {
    let s = Array.from(document.querySelectorAll("script[data-sdk-key]")),
      e = s[s.length - 1];
    if (!e) return { sdkKey: null, user: {} };
    let t = e.dataset,
      n = {};
    if (
      (t.userId && (n.user_id = t.userId),
      t.userEmail && (n.email = t.userEmail),
      t.userName && (n.name = t.userName),
      t.userPlan && (n.plan = t.userPlan),
      t.userProjectId && (n.project_id = t.userProjectId),
      t.attrs)
    )
      try {
        let r = JSON.parse(t.attrs);
        Object.assign(n, r);
      } catch (r) {
        console.warn("[shipeasy] data-attrs is not valid JSON:", String(r));
      }
    return { sdkKey: t.sdkKey ?? null, baseUrl: t.baseUrl, user: n };
  }
  (function () {
    if (typeof window > "u" || window.shipeasy) return;
    let { sdkKey: e, baseUrl: t, user: n } = k();
    if (!e) {
      console.warn("[shipeasy] loader.js: missing data-sdk-key");
      return;
    }
    let r = new f({ sdkKey: e, baseUrl: t }),
      a = r.identify(n).catch((i) => {
        console.warn("[shipeasy] identify failed:", String(i));
      });
    window.shipeasy = {
      getFlag: (i) => r.getFlag(i),
      getConfig: (i) => r.getConfig(i),
      getExperiment: (i, c) => r.getExperiment(i, c),
      identify: (i) => r.identify(i),
      track: (i, c) => r.track(i, c),
      ready: a,
    };
  })();
})();
