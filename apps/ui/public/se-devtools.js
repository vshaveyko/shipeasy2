"use strict";
(() => {
  var qt = Object.create;
  var se = Object.defineProperty;
  var Ut = Object.getOwnPropertyDescriptor;
  var Nt = Object.getOwnPropertyNames;
  var zt = Object.getPrototypeOf,
    Kt = Object.prototype.hasOwnProperty;
  var Ft = (e, t, n) =>
    t in e ? se(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var jt = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var Wt = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of Nt(t))
        !Kt.call(e, o) &&
          o !== n &&
          se(e, o, { get: () => t[o], enumerable: !(r = Ut(t, o)) || r.enumerable });
    return e;
  };
  var Gt = (e, t, n) => (
    (n = e != null ? qt(zt(e)) : {}),
    Wt(t || !e || !e.__esModule ? se(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var _ = (e, t, n) => Ft(e, typeof t != "symbol" ? t + "" : t, n);
  var mt = jt((Rr, vt) => {
    "use strict";
    var Se = Object.defineProperty,
      an = Object.getOwnPropertyDescriptor,
      ln = Object.getOwnPropertyNames,
      dn = Object.prototype.hasOwnProperty,
      cn = (e, t) => {
        for (var n in t) Se(e, n, { get: t[n], enumerable: !0 });
      },
      un = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of ln(t))
            !dn.call(e, o) &&
              o !== n &&
              Se(e, o, { get: () => t[o], enumerable: !(r = an(t, o)) || r.enumerable });
        return e;
      },
      pn = (e) => un(Se({}, "__esModule", { value: !0 }), e),
      st = {};
    cn(st, {
      FlagsClientBrowser: () => at,
      LABEL_MARKER_END: () => ft,
      LABEL_MARKER_RE: () => Tn,
      LABEL_MARKER_SEP: () => pt,
      LABEL_MARKER_START: () => ut,
      _resetShipeasyForTests: () => Ln,
      attachDevtools: () => lt,
      configureShipeasy: () => Me,
      encodeLabelMarker: () => gt,
      flags: () => ct,
      getShipeasyClient: () => _n,
      i18n: () => Un,
      isDevtoolsRequested: () => ye,
      labelAttrs: () => Rn,
      loadDevtools: () => we,
      readConfigOverride: () => Le,
      readExpOverride: () => it,
      readGateOverride: () => _e,
      shipeasy: () => dt,
      version: () => fn,
    });
    vt.exports = pn(st);
    var fn = "1.0.0",
      gn = 5e3,
      vn = 100,
      tt = "__se_anon_id",
      nt = "__se_seen",
      K = "__se_pending_alias",
      mn = class {
        constructor(e, t) {
          _(this, "collectUrl");
          _(this, "sdkKey");
          _(this, "queue", []);
          _(this, "exposureSeen", new Set());
          _(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), gn)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(nt);
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
              sessionStorage.setItem(nt, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(K, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(K);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(K);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(K);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(K));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= vn && this.flush());
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
    function hn(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
        c = !1;
      try {
        new PerformanceObserver((v) => {
          let f = v.getEntries();
          f.length && (r = f[f.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: !0 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let f of v.getEntries()) {
            let l = f.duration ?? 0;
            (o === null || l > o) && (o = l);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((v) => {
          for (let f of v.getEntries()) f.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let d = window.onerror;
      ((window.onerror = (y, v, f, l, h) => (
        a < ne &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof y == "string" ? y.slice(0, 200) : String(h ?? "").slice(0, 200),
            source: typeof v == "string" ? v.slice(0, 200) : "",
            line: f ?? 0,
          })),
        typeof d == "function" ? d(y, v, f, l, h) : !1
      )),
        window.addEventListener("unhandledrejection", (y) => {
          if (a < ne) {
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
      let p = window.fetch;
      window.fetch = async function (...y) {
        let v = typeof performance < "u" ? performance.now() : 0,
          f = typeof y[0] == "string" ? y[0] : y[0].toString(),
          l;
        try {
          l = await p.apply(this, y);
        } catch (h) {
          throw (
            s < ne &&
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
        if (l.status >= 500 && s < ne) {
          s += 1;
          let h = typeof performance < "u" ? performance.now() - v : 0;
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
        if (!c) {
          c = !0;
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
        let y = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: y }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && w();
      });
    }
    function bn() {
      try {
        let t = localStorage.getItem(tt);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(tt, e);
      } catch {}
      return e;
    }
    function xn() {
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
    function yn() {
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
    var at = class {
        constructor(e) {
          _(this, "sdkKey");
          _(this, "baseUrl");
          _(this, "autoGuardrails");
          _(this, "env");
          _(this, "evalResult", null);
          _(this, "anonId");
          _(this, "userId", "");
          _(this, "buffer");
          _(this, "guardrailsInstalled", !1);
          _(this, "listeners", new Set());
          _(this, "overrideListenerInstalled", !1);
          _(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = bn()),
            (this.buffer = new mn(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...xn(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: yn() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), hn(this.buffer, this.userId, this.anonId)),
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
          let t = _e(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = Le(e),
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
            i = it(e);
          if (i !== null) {
            let s = r?.[i],
              c = s ? { ...t, ...s } : t;
            return { inExperiment: !0, group: i, params: c };
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
      wn = /^(true|on|1|yes)$/i,
      En = /^(false|off|0|no)$/i;
    function kn(e) {
      return wn.test(e) ? !0 : En.test(e) ? !1 : null;
    }
    function Sn(e) {
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
    function _e(e) {
      let t = F(`se_ks_${e}`) ?? F(`se_gate_${e}`) ?? F(`se-gate-${e}`);
      return t === null ? null : kn(t);
    }
    function Le(e) {
      let t = F(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return Sn(t);
    }
    function it(e) {
      let t = F(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function ye() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function we(e = {}) {
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
    function lt(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = r[r.length - 1],
        i = r.includes("Shift"),
        a = r.includes("Alt"),
        s = r.includes("Ctrl") || r.includes("Control"),
        c = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), ye() && we({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let d = ye();
      function p(w) {
        w.key === o &&
          w.shiftKey === i &&
          w.altKey === a &&
          w.ctrlKey === s &&
          w.metaKey === c &&
          (d
            ? window.__shipeasy_devtools?.toggle()
            : ((d = !0), we({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", p);
      let u = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", p), u());
      };
    }
    var L = null;
    function dt(e) {
      let t = Me({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (ct.notifyMounted(), lt(t, { adminUrl: e.adminUrl }));
    }
    function Me(e) {
      return L || ((L = new at(e)), L);
    }
    function _n() {
      return L;
    }
    function Ln() {
      (L?.destroy(), (L = null));
    }
    function rt() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var he = !1,
      Ee = new Set(),
      ot = !1;
    function Mn() {
      ot ||
        typeof window > "u" ||
        ((ot = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of Ee) e();
        }));
    }
    var ct = {
        configure(e) {
          Me(e);
        },
        identify(e) {
          return L
            ? L.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = rt();
          return t !== null && e in t.flags
            ? t.flags[e]
            : he
              ? L
                ? L.getFlag(e)
                : (_e(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = rt();
          if (n !== null && e in n.configs) {
            let o = n.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!he) return;
          if (L) return L.getConfig(e, t);
          let r = Le(e);
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
          return L?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          L?.track(e, t);
        },
        flush() {
          return L?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((he = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return L ? L.subscribe(e) : (Ee.add(e), Mn(), () => Ee.delete(e));
        },
        get ready() {
          return L?.ready ?? !1;
        },
      },
      ut = "\uFFF9",
      pt = "\uFFFA",
      ft = "\uFFFB",
      Tn = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function gt(e, t) {
      return `${ut}${e}${pt}${t}${ft}`;
    }
    function Rn(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var $n = null,
      An = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      Pn = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function On() {
      return globalThis[An]?.() ?? null;
    }
    function Cn() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[Pn];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function re(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let o = t[r];
            return o != null ? String(o) : n;
          })
        : e;
    }
    var Hn = typeof document < "u",
      Bn = [
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
    function In() {
      let e = {};
      for (let t of Bn)
        e[t] = Hn
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var Dn = In(),
      ke = {},
      be = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function qn(e, t) {
      let n = [],
        r = 0,
        o,
        i = !0;
      for (be.lastIndex = 0; (o = be.exec(e)) !== null; ) {
        o.index > r && n.push(e.slice(r, o.index));
        let a = o[1],
          s = o[2] ?? "",
          c = t[a] ?? ke[a] ?? Dn[a];
        if (c) {
          let d = c(s);
          (typeof d != "string" && (i = !1), n.push(d));
        } else n.push(s);
        r = be.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), i ? n.join("") : n);
    }
    function xe(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = On();
      if (n?.strings[e]) return re(n.strings[e], t);
    }
    var Un = {
      t(e, t, n) {
        let r, o;
        typeof t == "string" ? ((r = t), (o = n)) : (o = t);
        let i = xe(e, o);
        return i !== void 0 ? i : r !== void 0 ? re(r, o) : e;
      },
      rich(e, t, n, r) {
        let i = xe(e, r) ?? re(t, r);
        return qn(i, n ?? {});
      },
      tEl(e, t, n, r) {
        if (Cn()) {
          let i = xe(e, n) ?? re(t, n);
          return gt(e, i);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && (ke = { ...ke, ...e.components }),
          e.createElement && ($n = e.createElement));
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
      e?.apiKey && !L && dt({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var He = `
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
  var ae = "se_dt_session";
  function Be() {
    try {
      let e = sessionStorage.getItem(ae);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Jt(e) {
    try {
      sessionStorage.setItem(ae, JSON.stringify(e));
    } catch {}
  }
  function Ie() {
    try {
      sessionStorage.removeItem(ae);
    } catch {}
  }
  async function De(e, t) {
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
        let d = !1;
        function p(f, l) {
          d ||
            ((d = !0),
            window.removeEventListener("message", u),
            clearInterval(y),
            clearTimeout(v),
            f ? s(f) : a(l));
        }
        function u(f) {
          if (f.origin !== n) return;
          let l = f.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let h = { token: l.token, projectId: l.projectId };
          (Jt(h), p(null, h));
        }
        window.addEventListener("message", u);
        let w = Date.now(),
          y = setInterval(() => {
            Date.now() - w < 1500 ||
              (i.closed && !d && p(new Error("Sign-in window closed before approval.")));
          }, 500),
          v = setTimeout(() => {
            p(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Vt = /^(true|on|1|yes)$/i,
    Xt = /^(false|off|0|no)$/i,
    qe = /^se(?:_|-|$)/;
  function Z(e) {
    return Vt.test(e) ? !0 : Xt.test(e) ? !1 : null;
  }
  function ie(e) {
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
  function Ue(e) {
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
  function Ne() {
    if (typeof window > "u") return !1;
    let e = Q();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
  }
  function N() {
    return typeof window > "u" ? !1 : Q().has("se_edit_labels");
  }
  function le(e) {
    B([["se_edit_labels", e ? "1" : null]]);
  }
  function de(e) {
    let t = P(`se_ks_${e}`) ?? P(`se_gate_${e}`) ?? P(`se-gate-${e}`);
    return t === null ? null : Z(t);
  }
  function ze(e, t, n = "session") {
    B([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function ce(e) {
    let t = P(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return ie(t);
  }
  function ue(e, t, n = "session") {
    B([
      [`se_config_${e}`, t == null ? null : Ue(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function Ke(e) {
    let t = P(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function Fe(e, t, n = "session") {
    B([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function z() {
    return P("se_i18n");
  }
  function je(e, t = "session") {
    B([["se_i18n", e]]);
  }
  function pe() {
    return P("se_i18n_draft");
  }
  function We(e, t = "session") {
    B([["se_i18n_draft", e]]);
  }
  function ee(e) {
    return P(`se_i18n_label_${e}`);
  }
  function fe(e, t, n = "session") {
    B([[`se_i18n_label_${e}`, t]]);
  }
  function Ge() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) qe.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function ge(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) qe.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, Ue(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function ve() {
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
            ? (e.configs[n.slice(10)] = ie(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function Je(e) {
    if (typeof window > "u") return;
    let t = { ...ve(), ...e, openDevtools: !0 },
      n = ge(t);
    window.location.assign(n);
  }
  var te = class {
    constructor(t, n) {
      _(this, "adminUrl", t);
      _(this, "token", n);
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
      let n = t ? `?profile_id=${encodeURIComponent(t)}` : "",
        r = await this.get(`/api/admin/i18n/keys${n}`);
      return Array.isArray(r) ? r : r && Array.isArray(r.keys) ? r.keys : [];
    }
  };
  function A(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${me(e.title)}</div>
      <div class="empty-msg">${me(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${me(e.ctaLabel)}</a>
    </div>`;
  }
  function me(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Yt() {
    return window.__shipeasy ?? null;
  }
  function Zt(e) {
    let t = de(e.name),
      n = Yt()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function Qt(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function Ve(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
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
      let i = n
        .map(
          (a) => `
        <tr>
          <td class="col-name">${a.name}</td>
          <td class="col-sub">${(a.rolloutPct / 100).toFixed(a.rolloutPct % 100 === 0 ? 0 : 2)}%</td>
          <td class="col-badge">${Zt(a)}</td>
          <td class="col-control">${Qt(a.name, de(a.name))}</td>
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
              c = a.dataset.v;
            (ze(s, c === "default" ? null : c === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function en(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function Xe(e) {
    return ce(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function Ye(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
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
      let i = n
        .map((s) => {
          let c = ce(s.name),
            d = c !== void 0 ? c : s.valueJson;
          return r.has(s.name)
            ? `
            <tr data-config="${s.name}">
              <td colspan="4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="col-name" style="flex:1">${s.name}</span>
                  ${Xe(s.name)}
                  <button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>
                </div>
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(d, null, 2)}</textarea>
                <div class="edit-row" style="display:flex;gap:6px;margin-top:6px">
                  <button class="ibtn pri save-session" data-name="${s.name}">Save (session)</button>
                  <button class="ibtn save-local" data-name="${s.name}">Save (local)</button>
                  ${c !== void 0 ? `<button class="ibtn danger clear-ov" data-name="${s.name}">clear</button>` : ""}
                </div>
              </td>
            </tr>`
            : `
          <tr data-config="${s.name}">
            <td class="col-name">${s.name}</td>
            <td class="col-value">${en(d)}</td>
            <td class="col-badge">${Xe(s.name)}</td>
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
      function a(s, c) {
        let d = s.dataset.name,
          p = e.querySelector(`textarea[data-name="${d}"]`);
        if (p)
          try {
            let u = JSON.parse(p.value);
            (ue(d, u, c), r.delete(d), o());
          } catch {
            p.style.borderColor = "#f87171";
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
            (ue(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function tn() {
    return window.__shipeasy ?? null;
  }
  function nn(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function rn(e) {
    let t = Ke(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function on(e) {
    let t = tn()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function sn(e) {
    let t = e.status === "running";
    return `
    <tr>
      <td class="col-name">${e.name}</td>
      <td class="col-badge">${nn(e.status)}</td>
      <td class="col-badge">${t ? on(e.name) : ""}</td>
      <td class="col-control">${t ? rn(e) : ""}</td>
    </tr>`;
  }
  function Ze(e, t) {
    return e.length === 0
      ? ""
      : `
    <div class="sec-head">${t}</div>
    <div class="dt-scroll">
      <table class="dt-table">
        <thead><tr>
          <th>Name</th><th>Status</th><th>Live</th><th style="text-align:right">Override</th>
        </tr></thead>
        <tbody>${e.map(sn).join("")}</tbody>
      </table>
    </div>`;
  }
  function Qe(e, t, n, r) {
    let o = n.filter((s) => s.universe === t.name);
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
    let i = o.filter((s) => s.status === "running"),
      a = o.filter((s) => s.status !== "running");
    ((e.innerHTML = Ze(i, "Running") + Ze(a, "Other")),
      e.querySelectorAll(".exp-sel").forEach((s) => {
        s.addEventListener("change", () => {
          let c = s.dataset.name;
          Fe(c, s.value || null);
        });
      }));
  }
  async function et(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load: ${String(a)}</div>`;
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
    function i() {
      let a = r
        .map(
          (d) => `
          <button class="tab${d.name === o.activeUniverse ? " active" : ""}"
                  data-universe="${d.name}">${d.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${a}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((d) => {
          d.addEventListener("click", () => {
            ((o.activeUniverse = d.dataset.universe), i());
          });
        }));
      let s = e.querySelector(".tab-body"),
        c = r.find((d) => d.name === o.activeUniverse);
      Qe(s, c, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let a = e.querySelector(".tab-body"),
          s = r.find((c) => c.name === o.activeUniverse);
        a && s && Qe(a, s, n, t.adminUrl);
      }));
  }
  var R = Gt(mt(), 1);
  function Nn(e) {
    let t = new Map();
    for (let n of e) {
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        i = r.length > 1 ? r.slice(1) : r;
      t.has(o) || t.set(o, { segment: o, children: [] });
      let a = t.get(o);
      for (let s = 0; s < i.length; s++) {
        let c = i[s],
          d = a.children.find((p) => p.segment === c);
        (d || ((d = { segment: c, children: [] }), a.children.push(d)), (a = d));
      }
      ((a.value = n.value), (a.fullKey = n.key));
    }
    for (let n of t.values()) xt(n);
    return t;
  }
  function xt(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) xt(t);
  }
  function M(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function yt(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? ee(e.fullKey) : null,
        i = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${M(e.fullKey ?? "")}">
        <span class="tree-seg">${M(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${M(i)}">${M(i)}</span>
      </div>`;
    }
    let r = e.children.map((o) => yt(o, t + 1)).join("");
    return `
    <div class="tree-row branch" style="padding-left:${n}px">
      <span class="tree-caret">\u25BE</span>
      <span class="tree-seg">${M(e.segment)}</span>
    </div>
    ${r}`;
  }
  var O = "__se_label_target",
    Re = "__se_label_target_style",
    I = !1,
    Te = null,
    q = null,
    wt = null,
    Et = [];
  function zn() {
    if (document.getElementById(Re)) return;
    let e = document.createElement("style");
    ((e.id = Re),
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
  function ht() {
    document.getElementById(Re)?.remove();
  }
  function W(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let s = o.nodeValue ?? "";
      if (
        !s.includes(R.LABEL_MARKER_START) ||
        r.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let c = document.createDocumentFragment(),
        d = 0;
      R.LABEL_MARKER_RE.lastIndex = 0;
      let p;
      for (; (p = R.LABEL_MARKER_RE.exec(s)) !== null; ) {
        p.index > d && c.appendChild(document.createTextNode(s.slice(d, p.index)));
        let u = document.createElement("span");
        u.setAttribute("data-label", p[1]);
        let w = ee(p[1]);
        ((u.textContent = w ?? p[2]), c.appendChild(u), (d = p.index + p[0].length));
      }
      (d < s.length && c.appendChild(document.createTextNode(s.slice(d))), n.push([o, c]));
    }
    for (let [s, c] of n) s.parentNode?.replaceChild(c, s);
    let i = window._sei18n_t;
    for (let s of Array.from(document.querySelectorAll("[data-label]"))) {
      let c = s.textContent ?? "",
        d = s.getAttribute("data-label"),
        p = ee(d);
      if (c.includes(R.LABEL_MARKER_START)) {
        R.LABEL_MARKER_RE.lastIndex = 0;
        let u = R.LABEL_MARKER_RE.exec(c);
        u && (s.textContent = p ?? u[2]);
      } else if (i)
        try {
          let u = s.dataset.variables ? JSON.parse(s.dataset.variables) : void 0,
            w = i(d, u);
          w && w !== d ? (s.textContent = p ?? w) : p && (s.textContent = p);
        } catch {}
    }
    let a = ["placeholder", "alt", "aria-label", "title"];
    for (let s of a)
      for (let c of Array.from(document.querySelectorAll(`[${s}]`))) {
        let d = c.getAttribute(s);
        if (!d.includes(R.LABEL_MARKER_START)) continue;
        R.LABEL_MARKER_RE.lastIndex = 0;
        let p = R.LABEL_MARKER_RE.exec(d);
        p && c.setAttribute(s, p[2]);
      }
    return n.length;
  }
  function j() {
    return Array.from(document.querySelectorAll("[data-label]"));
  }
  function C() {
    (q?.remove(),
      (q = null),
      document.querySelectorAll(`.${O}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  async function Kn(e, t, n, r) {
    ((n.textContent = t),
      fe(e, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e, value: t } })));
    let o = pe(),
      i = z(),
      a = wt;
    if (!a || (!o && !i)) {
      C();
      return;
    }
    let s = r.querySelector('[data-action="save"]'),
      c = r.querySelector(".lp-err");
    ((s.disabled = !0), (s.textContent = "Saving\u2026"), c && (c.textContent = ""));
    try {
      if (o) await a.upsertDraftKey(o, e, t);
      else if (i) {
        let d = Et.find((p) => p.key === e && p.profileId === i);
        d && (await a.updateKeyById(d.id, t));
      }
      C();
    } catch (d) {
      ((s.disabled = !1),
        (s.textContent = "Save"),
        c && (c.textContent = d instanceof Error ? d.message : String(d)));
    }
  }
  function Fn(e, t) {
    (C(), e.classList.add("__se_label_active"));
    let n = e.dataset.label ?? "",
      r = e.dataset.labelDesc ?? "",
      i = z() ?? "default",
      a = null;
    if (e.dataset.variables)
      try {
        a = JSON.parse(e.dataset.variables);
      } catch {
        a = null;
      }
    let s = a ? Object.entries(a) : [],
      c = s.length
        ? `<div class="lp-field">
        <label>Variables</label>
        <div class="lp-vars">${s.map(([E, S]) => `<div class="lp-var"><span class="lp-var-k mono">${M(E)}</span><span class="lp-var-v">${M(String(S))}</span></div>`).join("")}</div>
      </div>`
        : "";
    e.dataset.__seOriginal === void 0 && (e.dataset.__seOriginal = e.textContent ?? "");
    let d = e.textContent ?? "",
      p = document.createElement("div");
    ((p.className = "label-popper"),
      (p.innerHTML = `
    <div class="lp-head">
      <span class="lp-key mono">${M(n)}</span>
      <button class="lp-close" aria-label="Close">\u2715</button>
    </div>
    <div class="lp-body">
      <div class="lp-field">
        <label>Current profile</label>
        <span>${M(i)}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${r ? "" : "empty"}">${r ? M(r) : "No description"}</span>
      </div>
      ${c}
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${M(d)}</textarea>
      </div>
    </div>
    <div class="lp-actions">
      <button class="ibtn" data-action="reset">Reset</button>
      <button class="ibtn pri" data-action="save">Save</button>
    </div>
    <div class="lp-err"></div>`),
      t.appendChild(p));
    let u = e.getBoundingClientRect(),
      w = p.offsetHeight,
      y = p.offsetWidth,
      v = 8,
      f = u.bottom + v;
    f + w > window.innerHeight - 8 && (f = Math.max(8, u.top - w - v));
    let l = u.left;
    (l + y > window.innerWidth - 8 && (l = Math.max(8, window.innerWidth - y - 8)),
      (p.style.top = `${f}px`),
      (p.style.left = `${l}px`));
    let h = p.querySelector(".lp-input");
    (h.focus(),
      h.select(),
      p.querySelector(".lp-close").addEventListener("click", C),
      p.querySelector('[data-action="save"]').addEventListener("click", () => {
        Kn(n, h.value, e, p);
      }),
      p.querySelector('[data-action="reset"]').addEventListener("click", () => {
        let E = e.dataset.__seOriginal ?? "";
        ((e.textContent = E),
          fe(n, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: n, value: null } }),
          ),
          C());
      }),
      p.addEventListener("click", (E) => E.stopPropagation()),
      p.addEventListener("mousedown", (E) => E.stopPropagation()),
      (q = p));
  }
  function bt(e, t, n) {
    if (((I = e), Te?.(), (Te = null), !e)) {
      C();
      for (let u of j()) u.classList.remove(O);
      ht();
      return;
    }
    zn();
    for (let u of j()) u.classList.add(O);
    function r(u) {
      return q !== null && u.composedPath().includes(q);
    }
    function o(u) {
      for (let w of u.composedPath())
        if (w instanceof HTMLElement && w.hasAttribute("data-label")) return w;
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
      w && (u.preventDefault(), u.stopPropagation(), u.stopImmediatePropagation(), Fn(w, t));
    }
    function c(u) {
      q && (r(u) || o(u) || C());
    }
    function d(u) {
      u.key === "Escape" && C();
    }
    let p = new MutationObserver(() => {
      if (I) {
        for (let u of j()) u.classList.add(O);
        n();
      }
    });
    p.observe(document.body, { childList: !0, subtree: !0 });
    for (let u of i) document.addEventListener(u, a, !0);
    (document.addEventListener("click", s, !0),
      document.addEventListener("mousedown", c, !0),
      document.addEventListener("keydown", d),
      (Te = () => {
        for (let u of i) document.removeEventListener(u, a, !0);
        (document.removeEventListener("click", s, !0),
          document.removeEventListener("mousedown", c, !0),
          document.removeEventListener("keydown", d),
          p.disconnect());
        for (let u of j()) u.classList.remove(O);
        ht();
      }));
  }
  async function kt(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (n.innerHTML = ""),
      (wt = t));
    let o, i, a;
    try {
      let y = z() ?? void 0;
      [o, i, a] = await Promise.all([t.profiles(), t.drafts(), t.keys(y)]);
    } catch (y) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(y)}</div>`;
      return;
    }
    Et = a;
    let s = Nn(a),
      c = Array.from(s.keys()),
      d = { activeChunk: c[0] ?? null };
    function p() {
      if (c.length === 0) {
        e.innerHTML = A({
          icon: "\u{1F310}",
          title: "No translation keys yet",
          message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
          ctaLabel: "Create new key",
          ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
        });
        return;
      }
      let y = c
          .map(
            (l) =>
              `<button class="tab${l === d.activeChunk ? " active" : ""}" data-chunk="${M(l)}">${M(l)}</button>`,
          )
          .join(""),
        v = d.activeChunk ? s.get(d.activeChunk) : null,
        f = v ? v.children.map((l) => yt(l, 0)).join("") : "";
      ((e.innerHTML = `
      <div class="tabs scroll" id="chunk-tabs">${y}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${f}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((l) => {
          l.addEventListener("click", () => {
            ((d.activeChunk = l.dataset.chunk), p());
          });
        }));
    }
    function u() {
      let y = z() ?? "",
        v = pe() ?? "";
      W();
      let f = j().length,
        l = I
          ? `Editing ${f} label${f === 1 ? "" : "s"}`
          : f > 0
            ? `Edit labels (${f})`
            : "Edit labels",
        h = I
          ? "Disable in-page label editing"
          : f === 0
            ? "Enable in-page label editing \u2014 reloads page with ?se_edit_labels=1 to scan all translation strings"
            : "Toggle in-page label editing (reloads page)",
        E = [
          '<option value="">Default</option>',
          ...o.map(
            (x) =>
              `<option value="${M(x.id)}" ${y === x.id ? "selected" : ""}>${M(x.name)}</option>`,
          ),
        ].join(""),
        S = [
          '<option value="">No draft</option>',
          ...i.map(
            (x) =>
              `<option value="${M(x.id)}" ${v === x.id ? "selected" : ""}>${M(x.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${I ? " on" : ""}" id="se-edit-toggle" title="${M(h)}">
        <span class="dot"></span>
        ${M(l)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${E}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${S}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          N() ? le(!1) : I ? (bt(!1, r, () => u()), u()) : le(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (x) => {
          let g = x.target.value || null;
          je(g);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (x) => {
          let g = x.target.value || null;
          We(g);
        }));
    }
    (N() && (W(), I || bt(!0, r, () => u())),
      p(),
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
    function c() {
      (n.removeEventListener("click", d),
        document.removeEventListener("keydown", p),
        n.remove(),
        t.onClose?.());
    }
    function d(u) {
      u.target === n && c();
    }
    function p(u) {
      u.key === "Escape" && c();
    }
    return (
      n.addEventListener("click", d),
      document.addEventListener("keydown", p),
      a.addEventListener("click", c),
      e.appendChild(n),
      { body: s, root: r, close: c }
    );
  }
  async function St() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 });
    try {
      let t = document.createElement("video");
      ((t.srcObject = e),
        (t.muted = !0),
        (t.playsInline = !0),
        await new Promise((s, c) => {
          let d = setTimeout(() => c(new Error("Capture stream timed out")), 5e3);
          ((t.onloadedmetadata = () => {
            (clearTimeout(d), s());
          }),
            (t.onerror = () => {
              (clearTimeout(d), c(new Error("Capture stream errored")));
            }));
        }),
        await t.play(),
        await new Promise((s) => requestAnimationFrame(() => s(null))));
      let n = t.videoWidth,
        r = t.videoHeight;
      if (!n || !r) throw new Error("Capture stream returned no frames.");
      let o = document.createElement("canvas");
      ((o.width = n), (o.height = r));
      let i = o.getContext("2d");
      if (!i) throw new Error("Canvas 2d context unavailable");
      return (
        i.drawImage(t, 0, 0, n, r),
        await new Promise((s, c) => {
          o.toBlob((d) => (d ? s(d) : c(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      e.getTracks().forEach((t) => t.stop());
    }
  }
  async function _t() {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let e = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n =
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((a) =>
          MediaRecorder.isTypeSupported(a),
        ) ?? "",
      r = n ? new MediaRecorder(e, { mimeType: n }) : new MediaRecorder(e),
      o = [];
    (r.addEventListener("dataavailable", (a) => {
      a.data && a.data.size > 0 && o.push(a.data);
    }),
      r.start(500),
      e.getVideoTracks()[0]?.addEventListener("ended", () => {
        r.state !== "inactive" && r.stop();
      }));
    function i() {
      e.getTracks().forEach((a) => a.stop());
    }
    return {
      stop() {
        return new Promise((a, s) => {
          if (r.state === "inactive") {
            if ((i(), o.length === 0)) {
              s(new Error("No recording data."));
              return;
            }
            a(new Blob(o, { type: n || "video/webm" }));
            return;
          }
          (r.addEventListener(
            "stop",
            () => {
              (i(), a(new Blob(o, { type: n || "video/webm" })));
            },
            { once: !0 },
          ),
            r.addEventListener("error", (c) => s(c), { once: !0 }),
            r.stop());
        });
      },
      cancel() {
        (r.state !== "inactive" && r.stop(), i());
      },
    };
  }
  var Lt = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Mt(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((g, b) => {
        let m = new Image();
        ((m.onload = () => g(m)),
          (m.onerror = () => b(new Error("Failed to load screenshot for annotation."))),
          (m.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), r.appendChild(o));
    let i = "arrow",
      a = Lt[0],
      s = [];
    function c(g, b) {
      let m = document.createElement("button");
      return (
        (m.type = "button"),
        (m.className = "se-annot-btn"),
        (m.dataset.tool = g),
        (m.textContent = b),
        m.addEventListener("click", () => {
          ((i = g),
            o
              .querySelectorAll("[data-tool]")
              .forEach((k) => k.classList.toggle("on", k.dataset.tool === g)));
        }),
        m
      );
    }
    let d = c("arrow", "\u2197 arrow");
    (d.classList.add("on"),
      o.appendChild(d),
      o.appendChild(c("rect", "\u25AD rect")),
      o.appendChild(c("text", "T text")));
    let p = document.createElement("span");
    ((p.className = "se-annot-sep"), o.appendChild(p));
    for (let g of Lt) {
      let b = document.createElement("button");
      ((b.type = "button"),
        (b.className = "se-annot-swatch"),
        (b.dataset.color = g),
        (b.style.background = g),
        g === a && b.classList.add("on"),
        b.addEventListener("click", () => {
          ((a = g),
            o
              .querySelectorAll("[data-color]")
              .forEach((m) => m.classList.toggle("on", m.dataset.color === g)));
        }),
        o.appendChild(b));
    }
    let u = document.createElement("button");
    ((u.type = "button"),
      (u.className = "se-annot-btn"),
      (u.textContent = "\u21B6 undo"),
      u.addEventListener("click", () => {
        (s.pop(), S());
      }),
      o.appendChild(u));
    let w = document.createElement("button");
    ((w.type = "button"),
      (w.className = "se-annot-btn"),
      (w.textContent = "clear"),
      w.addEventListener("click", () => {
        ((s.length = 0), S());
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
    let f = v.getContext("2d");
    function l(g) {
      let b = v.getBoundingClientRect(),
        m = v.width / b.width,
        k = v.height / b.height;
      return { x: (g.clientX - b.left) * m, y: (g.clientY - b.top) * k };
    }
    function h() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function E(g) {
      if (
        (f.save(),
        (f.strokeStyle = g.color),
        (f.fillStyle = g.color),
        (f.lineWidth = h()),
        (f.lineCap = "round"),
        (f.lineJoin = "round"),
        g.tool === "rect")
      ) {
        let b = Math.min(g.x1, g.x2),
          m = Math.min(g.y1, g.y2),
          k = Math.abs(g.x2 - g.x1),
          T = Math.abs(g.y2 - g.y1);
        f.strokeRect(b, m, k, T);
      } else if (g.tool === "arrow") {
        (f.beginPath(), f.moveTo(g.x1, g.y1), f.lineTo(g.x2, g.y2), f.stroke());
        let b = Math.atan2(g.y2 - g.y1, g.x2 - g.x1),
          m = h() * 5;
        (f.beginPath(),
          f.moveTo(g.x2, g.y2),
          f.lineTo(g.x2 - m * Math.cos(b - Math.PI / 6), g.y2 - m * Math.sin(b - Math.PI / 6)),
          f.lineTo(g.x2 - m * Math.cos(b + Math.PI / 6), g.y2 - m * Math.sin(b + Math.PI / 6)),
          f.closePath(),
          f.fill());
      } else if (g.tool === "text" && g.text) {
        let b = Math.max(14, Math.round(n.naturalWidth / 60));
        ((f.font = `600 ${b}px ui-sans-serif, system-ui, sans-serif`), (f.textBaseline = "top"));
        let m = b * 0.3,
          T = f.measureText(g.text).width + m * 2,
          $ = b + m * 2;
        ((f.fillStyle = "rgba(0,0,0,0.55)"),
          f.fillRect(g.x1, g.y1, T, $),
          (f.fillStyle = g.color),
          f.fillText(g.text, g.x1 + m, g.y1 + m));
      }
      f.restore();
    }
    function S(g) {
      (f.clearRect(0, 0, v.width, v.height), f.drawImage(n, 0, 0));
      for (let b of s) E(b);
      g && E(g);
    }
    S();
    let x = null;
    return (
      v.addEventListener("pointerdown", (g) => {
        g.preventDefault();
        let b = l(g);
        if (i === "text") {
          let m = prompt("Annotation text:");
          m &&
            m.trim() &&
            (s.push({ tool: "text", color: a, x1: b.x, y1: b.y, x2: b.x, y2: b.y, text: m.trim() }),
            S());
          return;
        }
        ((x = { x1: b.x, y1: b.y }), v.setPointerCapture(g.pointerId));
      }),
      v.addEventListener("pointermove", (g) => {
        if (!x) return;
        let b = l(g);
        S({ tool: i, color: a, x1: x.x1, y1: x.y1, x2: b.x, y2: b.y });
      }),
      v.addEventListener("pointerup", (g) => {
        if (!x) return;
        let b = l(g),
          m = Math.abs(b.x - x.x1),
          k = Math.abs(b.y - x.y1);
        ((m > 4 || k > 4) && s.push({ tool: i, color: a, x1: x.x1, y1: x.y1, x2: b.x, y2: b.y }),
          (x = null),
          S());
      }),
      {
        root: r,
        async export() {
          let g = await new Promise((b, m) => {
            v.toBlob((k) => (k ? b(k) : m(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), g);
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
  function jn(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Wn(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Tt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let i;
      try {
        i = await t.bugs();
      } catch (s) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${J(String(s))}</div>`), o());
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
                <div class="row-name">${J(s.title)}</div>
                <div class="row-sub">${Wn(s.createdAt)}${s.reporterEmail ? ` \xB7 ${J(s.reporterEmail)}` : ""}</div>
              </div>
              ${jn(s.status)}
            </a>`,
            )
            .join("")),
        o());
    }
    function o() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => Gn(t, n, r));
    }
    await r();
  }
  function Gn(e, t, n) {
    let r = G(t, { title: "File a bug", size: "lg" }),
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
      c = r.body.querySelector("#se-b-actual"),
      d = r.body.querySelector("#se-b-expected"),
      p = r.body.querySelector("#se-b-attach"),
      u = r.body.querySelector("#se-b-status"),
      w = r.body.querySelector("#se-b-file"),
      y = r.body.querySelector("#se-b-record");
    function v() {
      if (o.length === 0) {
        p.innerHTML = "";
        return;
      }
      ((p.innerHTML = o
        .map(
          (l, h) => `
          <div class="se-attach-item">
            <span>${J(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${h}">remove</button>
          </div>`,
        )
        .join("")),
        p.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (o.splice(Number(l.dataset.idx), 1), v());
          });
        }));
    }
    function f(l, h = !1) {
      ((u.textContent = l), (u.style.color = h ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (r.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      f("Pick a screen/tab to capture\u2026");
      try {
        let l = await St();
        (f(""),
          Jn(t, l, (h) => {
            (o.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: h }),
              v());
          }));
      } catch (l) {
        f(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      y.addEventListener("click", async () => {
        if (i) {
          try {
            ((y.disabled = !0), f("Finalizing recording\u2026"));
            let l = await i.stop();
            ((i = null),
              (y.textContent = "\u23FA Record screen"),
              y.classList.remove("danger"),
              o.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              v(),
              f(""));
          } catch (l) {
            f(String(l instanceof Error ? l.message : l), !0);
          } finally {
            y.disabled = !1;
          }
          return;
        }
        f("Pick a screen/tab to record\u2026");
        try {
          ((i = await _t()),
            (y.textContent = "\u25A0 Stop recording"),
            y.classList.add("danger"),
            f("Recording\u2026 click stop when done."));
        } catch (l) {
          (f(String(l instanceof Error ? l.message : l), !0), (i = null));
        }
      }),
      r.body.querySelector("#se-b-upload").addEventListener("click", () => w.click()),
      w.addEventListener("change", () => {
        let l = w.files?.[0];
        l && (o.push({ kind: "file", filename: l.name, blob: l }), (w.value = ""), v());
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
          let E = await e.createBug({
            title: h,
            stepsToReproduce: s.value,
            actualResult: c.value,
            expectedResult: d.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let S = 0; S < o.length; S++) {
            let x = o[S];
            (f(`Uploading attachment ${S + 1}/${o.length}\u2026`),
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
          (f(String(E instanceof Error ? E.message : E), !0), (l.disabled = !1));
        }
      }));
  }
  function Jn(e, t, n) {
    let r = G(e, { title: "Annotate screenshot", size: "lg" });
    r.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let o = r.body.querySelector("#se-annot-host");
    ((o.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Mt(t)
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
          o.innerHTML = `<div class="err">${J(String(i))}</div>`;
        }));
  }
  function $e(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Vn(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Xn(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function Yn(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Rt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let o;
      try {
        o = await t.featureRequests();
      } catch (a) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${$e(String(a))}</div>`;
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
                <div class="row-name">${$e(a.title)}</div>
                <div class="row-sub">${Yn(a.createdAt)}${a.reporterEmail ? ` \xB7 ${$e(a.reporterEmail)}` : ""}</div>
              </div>
              ${Xn(a.importance)}
              ${Vn(a.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => Zn(t, n, r)));
    }
    await r();
  }
  function Zn(e, t, n) {
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
      i = r.body.querySelector("#se-f-desc"),
      a = r.body.querySelector("#se-f-use"),
      s = r.body.querySelector("#se-f-imp"),
      c = r.body.querySelector("#se-f-status");
    (r.body.querySelector("#se-f-cancel").addEventListener("click", () => r.close()),
      r.body.querySelector("#se-f-submit").addEventListener("click", async () => {
        let d = o.value.trim();
        if (!d) {
          ((c.textContent = "Title is required"), (c.style.color = "var(--se-danger)"), o.focus());
          return;
        }
        let p = r.body.querySelector("#se-f-submit");
        ((p.disabled = !0),
          (c.textContent = "Submitting\u2026"),
          (c.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: d,
            description: i.value,
            useCase: a.value,
            importance: s.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            r.close(),
            n());
        } catch (u) {
          ((c.textContent = String(u instanceof Error ? u.message : u)),
            (c.style.color = "var(--se-danger)"),
            (p.disabled = !1));
        }
      }));
  }
  var Qn =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    er =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    tr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    nr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    rr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    or =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    sr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    ar =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    oe = {
      gates: { icon: Qn, label: "Gates" },
      configs: { icon: er, label: "Configs" },
      experiments: { icon: tr, label: "Experiments" },
      i18n: { icon: nr, label: "Translations" },
      bugs: { icon: rr, label: "Bugs" },
      features: { icon: or, label: "Feature requests" },
    },
    Ht = "se_l_overlay",
    Ae = "se_l_active_panel";
  function ir() {
    try {
      let e = sessionStorage.getItem(Ae);
      if (e && e in oe) return e;
    } catch {}
    return null;
  }
  function $t(e) {
    try {
      e === null ? sessionStorage.removeItem(Ae) : sessionStorage.setItem(Ae, e);
    } catch {}
  }
  var Pe = 240,
    At = 580,
    Oe = 180,
    Pt = 700,
    Ot = { edge: "right", offsetPct: 50, panelWidth: 440, panelHeight: 460 };
  function lr() {
    try {
      let e = localStorage.getItem(Ht);
      if (e) return { ...Ot, ...JSON.parse(e) };
    } catch {}
    return { ...Ot };
  }
  function Ct(e) {
    try {
      localStorage.setItem(Ht, JSON.stringify(e));
    } catch {}
  }
  function dr(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((c, d) => c[0] - d[0]);
    let i = o[0][1],
      s = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: s };
  }
  function V(e, t, n, r) {
    let { edge: o, offsetPct: i, panelWidth: a, panelHeight: s } = r,
      c = window.innerWidth,
      d = window.innerHeight,
      p = o === "left" || o === "right",
      u = Math.max(Pe, Math.min(a, c - 80)),
      w = Math.max(Oe, Math.min(s, d - 40)),
      y = (i / 100) * (p ? d : c),
      v = e.getBoundingClientRect(),
      f = p ? v.width || 52 : v.height || 52,
      l = e.style;
    ((l.top = l.bottom = l.left = l.right = l.transform = ""),
      (l.borderTop = l.borderBottom = l.borderLeft = l.borderRight = ""),
      (l.flexDirection = p ? "column" : "row"),
      (l.padding = p ? "8px 6px" : "6px 8px"),
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
      let S = Math.max(10, Math.min(d - w - 10, y - w / 2));
      ((h.right = f + "px"),
        (h.top = S + "px"),
        (h.borderRadius = "10px 0 0 10px"),
        (h.borderRight = "none"),
        (h.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let S = Math.max(10, Math.min(d - w - 10, y - w / 2));
      ((h.left = f + "px"),
        (h.top = S + "px"),
        (h.borderRadius = "0 10px 10px 0"),
        (h.borderLeft = "none"),
        (h.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let S = Math.max(10, Math.min(c - u - 10, y - u / 2));
      ((h.top = f + "px"),
        (h.left = S + "px"),
        (h.borderRadius = "0 0 10px 10px"),
        (h.borderTop = "none"),
        (h.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let S = Math.max(10, Math.min(c - u - 10, y - u / 2));
      ((h.bottom = f + "px"),
        (h.left = S + "px"),
        (h.borderRadius = "10px 10px 0 0"),
        (h.borderBottom = "none"),
        (h.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let E = n.style;
    ((E.top = E.bottom = E.left = E.right = E.width = E.height = ""),
      (n.dataset.dir = p ? "ew" : "ns"),
      p
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
  function Bt(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${He}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), o.appendChild(i));
    let a = document.createElement("div");
    ((a.className = "panel-inner"), o.appendChild(a));
    let s = lr(),
      c = null,
      d = Be(),
      p = ir();
    requestAnimationFrame(() => V(r, o, i, s));
    let u = document.createElement("div");
    ((u.className = "drag-handle"),
      (u.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (u.innerHTML = ar),
      r.appendChild(u),
      u.addEventListener("mousedown", (x) => {
        (x.preventDefault(), u.classList.add("dragging"));
        let g = (m) => {
            let { edge: k, offsetPct: T } = dr(m.clientX, m.clientY);
            ((s = { ...s, edge: k, offsetPct: T }), V(r, o, i, s));
          },
          b = () => {
            (u.classList.remove("dragging"),
              document.removeEventListener("mousemove", g),
              document.removeEventListener("mouseup", b),
              Ct(s));
          };
        (document.addEventListener("mousemove", g), document.addEventListener("mouseup", b));
      }));
    let w = new Map();
    for (let [x, { icon: g, label: b }] of Object.entries(oe)) {
      let m = document.createElement("button");
      ((m.className = "btn"),
        (m.title = b),
        (m.innerHTML = g),
        m.addEventListener("click", () => l(x)),
        r.appendChild(m),
        w.set(x, m));
    }
    i.addEventListener("mousedown", (x) => {
      (x.preventDefault(), x.stopPropagation(), i.classList.add("dragging"));
      let g = x.clientX,
        b = x.clientY,
        m = s.panelWidth,
        k = s.panelHeight,
        { edge: T } = s,
        $ = (D) => {
          let Y = D.clientX - g,
            Ce = D.clientY - b,
            U = { ...s };
          (T === "right" && (U.panelWidth = Math.max(Pe, Math.min(At, m - Y))),
            T === "left" && (U.panelWidth = Math.max(Pe, Math.min(At, m + Y))),
            T === "top" && (U.panelHeight = Math.max(Oe, Math.min(Pt, k + Ce))),
            T === "bottom" && (U.panelHeight = Math.max(Oe, Math.min(Pt, k - Ce))),
            (s = U),
            V(r, o, i, s));
        },
        H = () => {
          (i.classList.remove("dragging"),
            document.removeEventListener("mousemove", $),
            document.removeEventListener("mouseup", H),
            Ct(s));
        };
      (document.addEventListener("mousemove", $), document.addEventListener("mouseup", H));
    });
    let y = () => V(r, o, i, s);
    window.addEventListener("resize", y);
    function v(x) {
      ((c = x),
        $t(x),
        w.forEach((g, b) => g.classList.toggle("active", b === x)),
        o.classList.add("open"),
        V(r, o, i, s),
        E(x));
    }
    function f() {
      (o.classList.remove("open"),
        w.forEach((x) => x.classList.remove("active")),
        (c = null),
        $t(null));
    }
    function l(x) {
      c === x ? f() : v(x);
    }
    function h(x, g) {
      let b = typeof window < "u" && window.location ? window.location.host : "",
        m = b ? `<span class="sub">${b}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${x}</span>
          <span class="panel-title-label">${g}</span>
          ${m}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${sr}</button>
      </div>`;
    }
    function E(x) {
      let { icon: g, label: b } = oe[x];
      if (!d) {
        S(x);
        return;
      }
      let m = new te(e.adminUrl, d.token);
      ((a.innerHTML = `
      ${h(g, b)}
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
          (Ie(), (d = null), S(x));
        }),
        a.querySelector("#se-clearall").addEventListener("click", () => {
          (Ge(), E(x));
        }),
        a.querySelector("#se-apply-url").addEventListener("click", () => {
          Je();
        }),
        a.querySelector("#se-share").addEventListener("click", async () => {
          let H = ge({ ...ve(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(H);
            let D = a.querySelector("#se-share"),
              Y = D.textContent;
            ((D.textContent = "Copied \u2713"), setTimeout(() => (D.textContent = Y), 1500));
          } catch {
            prompt("Copy this URL:", H);
          }
        }));
      let k = a.querySelector("#se-body"),
        T = a.querySelector("#se-subfoot");
      ({
        gates: () => Ve(k, m),
        configs: () => Ye(k, m),
        experiments: () => et(k, m),
        i18n: () => kt(k, m, T, n),
        bugs: () => Tt(k, m, n),
        features: () => Rt(k, m, n),
      })
        [x]()
        .catch((H) => {
          k.innerHTML = `<div class="err">${String(H)}</div>`;
        });
    }
    function S(x) {
      let { icon: g, label: b } = oe[x];
      ((a.innerHTML = `
      ${h(g, b)}
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
          let m = a.querySelector("#se-connect"),
            k = a.querySelector("#se-auth-status"),
            T = a.querySelector("#se-auth-err");
          ((m.disabled = !0),
            (m.textContent = "Opening\u2026"),
            (k.textContent = ""),
            (T.textContent = ""));
          try {
            ((d = await De(e, () => {
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
      p && requestAnimationFrame(() => v(p)),
      {
        destroy() {
          (window.removeEventListener("resize", y), t.remove());
        },
      }
    );
  }
  function cr() {
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
  function It(e = {}) {
    if (X || typeof window > "u" || typeof document > "u") return;
    let t = { adminUrl: e.adminUrl ?? cr() },
      { destroy: n } = Bt(t);
    X = n;
  }
  function ur() {
    (X?.(), (X = null));
  }
  function Dt(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    Ne() && It(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      a = n.includes("Ctrl") || n.includes("Control"),
      s = n.includes("Meta") || n.includes("Cmd"),
      c = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function d(p) {
      (c ? p.code === c : p.key.toLowerCase() === r.toLowerCase()) &&
        p.shiftKey === o &&
        p.altKey === i &&
        p.ctrlKey === a &&
        p.metaKey === s &&
        (X ? ur() : It(e));
    }
    return (window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {};
    if ((Dt(e), N())) {
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
