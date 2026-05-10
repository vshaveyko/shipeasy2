"use strict";
(() => {
  var Rn = Object.create;
  var bt = Object.defineProperty;
  var An = Object.getOwnPropertyDescriptor;
  var Pn = Object.getOwnPropertyNames;
  var Hn = Object.getPrototypeOf,
    Cn = Object.prototype.hasOwnProperty;
  var On = (e, t, r) =>
    t in e ? bt(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : (e[t] = r);
  var In = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var zn = (e, t, r, n) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of Pn(t))
        !Cn.call(e, o) &&
          o !== r &&
          bt(e, o, { get: () => t[o], enumerable: !(n = An(t, o)) || n.enumerable });
    return e;
  };
  var qn = (e, t, r) => (
    (r = e != null ? Rn(Hn(e)) : {}),
    zn(t || !e || !e.__esModule ? bt(r, "default", { value: e, enumerable: !0 }) : r, e)
  );
  var Z = (e, t, r) => On(e, typeof t != "symbol" ? t + "" : t, r);
  var Fr = In((os, Kr) => {
    "use strict";
    var Bt = Object.defineProperty,
      zo = Object.getOwnPropertyDescriptor,
      qo = Object.getOwnPropertyNames,
      Bo = Object.prototype.hasOwnProperty,
      jo = (e, t) => {
        for (var r in t) Bt(e, r, { get: t[r], enumerable: !0 });
      },
      Do = (e, t, r, n) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of qo(t))
            !Bo.call(e, o) &&
              o !== r &&
              Bt(e, o, { get: () => t[o], enumerable: !(n = zo(t, o)) || n.enumerable });
        return e;
      },
      Uo = (e) => Do(Bt({}, "__esModule", { value: !0 }), e),
      Cr = {};
    jo(Cr, {
      FlagsClientBrowser: () => Or,
      LABEL_MARKER_END: () => Ur,
      LABEL_MARKER_RE: () => oa,
      LABEL_MARKER_SEP: () => Dr,
      LABEL_MARKER_START: () => jr,
      _resetShipeasyForTests: () => ra,
      attachDevtools: () => zr,
      configureShipeasy: () => Ut,
      encodeLabelMarker: () => Nr,
      flags: () => Br,
      getShipeasyClient: () => ta,
      i18n: () => va,
      isDevtoolsRequested: () => Ot,
      labelAttrs: () => aa,
      loadDevtools: () => It,
      readConfigOverride: () => Dt,
      readExpOverride: () => Ir,
      readGateOverride: () => jt,
      shipeasy: () => qr,
      version: () => No,
    });
    Kr.exports = Uo(Cr);
    var No = "1.0.0",
      Ko = 5e3,
      Fo = 100,
      Rr = "__se_anon_id",
      Ar = "__se_seen",
      Je = "__se_pending_alias",
      Wo = class {
        constructor(e, t) {
          Z(this, "collectUrl");
          Z(this, "sdkKey");
          Z(this, "queue", []);
          Z(this, "exposureSeen", new Set());
          Z(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), Ko)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let r = sessionStorage.getItem(Ar);
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
              sessionStorage.setItem(Ar, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(Je, JSON.stringify(r));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(Je);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(Je);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(Je);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(Je));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= Fo && this.flush());
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
      ct = 5;
    function Go(e, t, r) {
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
            let v = w.duration ?? 0;
            (o === null || v > o) && (o = v);
          }
        }).observe({ type: "event", buffered: !0, durationThreshold: 16 });
      } catch {}
      try {
        new PerformanceObserver((h) => {
          for (let w of h.getEntries()) w.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let d = window.onerror;
      ((window.onerror = (g, h, w, v, _) => (
        a < ct &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, r, {
            value: 1,
            kind: "exception",
            message: typeof g == "string" ? g.slice(0, 200) : String(_ ?? "").slice(0, 200),
            source: typeof h == "string" ? h.slice(0, 200) : "",
            line: w ?? 0,
          })),
        typeof d == "function" ? d(g, h, w, v, _) : !1
      )),
        window.addEventListener("unhandledrejection", (g) => {
          if (a < ct) {
            a += 1;
            let h = g.reason,
              w = h instanceof Error ? h.message : typeof h == "string" ? h : String(h);
            e.pushMetric("__auto_js_error", t, r, {
              value: 1,
              kind: "unhandled_rejection",
              message: w.slice(0, 200),
            });
          }
        }));
      let l = window.fetch;
      window.fetch = async function (...g) {
        let h = typeof performance < "u" ? performance.now() : 0,
          w = typeof g[0] == "string" ? g[0] : g[0].toString(),
          v;
        try {
          v = await l.apply(this, g);
        } catch (_) {
          throw (
            s < ct &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, r, {
                value: 1,
                kind: "network",
                status: 0,
                url: w.slice(0, 200),
              })),
            _
          );
        }
        if (v.status >= 500 && s < ct) {
          s += 1;
          let _ = typeof performance < "u" ? performance.now() - h : 0;
          e.pushMetric("__auto_network_error", t, r, {
            value: 1,
            kind: "5xx",
            status: v.status,
            url: w.slice(0, 200),
            duration_ms: Math.round(_),
          });
        }
        return v;
      };
      let f = () => {
        if (!c) {
          c = !0;
          try {
            let h = performance.getEntriesByType("navigation")[0];
            if (h) {
              let v = h.startTime ?? 0;
              (h.loadEventEnd > 0 &&
                e.pushMetric("__auto_page_load", t, r, { value: h.loadEventEnd - v }),
                h.responseStart > 0 &&
                  e.pushMetric("__auto_ttfb", t, r, { value: h.responseStart - v }),
                h.domContentLoadedEventEnd > 0 &&
                  e.pushMetric("__auto_dom_ready", t, r, {
                    value: h.domContentLoadedEventEnd - v,
                  }));
            }
            let w = performance.getEntriesByType("paint");
            for (let v of w)
              v.name === "first-paint"
                ? e.pushMetric("__auto_fp", t, r, { value: v.startTime })
                : v.name === "first-contentful-paint" &&
                  e.pushMetric("__auto_fcp", t, r, { value: v.startTime });
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
        let g = n === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, r, { value: g }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && p();
      });
    }
    function Jo() {
      try {
        let t = localStorage.getItem(Rr);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(Rr, e);
      } catch {}
      return e;
    }
    function Vo() {
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
    function Yo() {
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
    var Or = class {
        constructor(e) {
          Z(this, "sdkKey");
          Z(this, "baseUrl");
          Z(this, "autoGuardrails");
          Z(this, "env");
          Z(this, "evalResult", null);
          Z(this, "anonId");
          Z(this, "userId", "");
          Z(this, "buffer");
          Z(this, "guardrailsInstalled", !1);
          Z(this, "listeners", new Set());
          Z(this, "overrideListenerInstalled", !1);
          Z(this, "onOverrideChange", () => {
            (this.installBridge(), this.notify());
          });
          ((this.sdkKey = e.sdkKey),
            (this.baseUrl = (e.baseUrl ?? "https://edge.shipeasy.dev").replace(/\/$/, "")),
            (this.env = e.env ?? "prod"),
            (this.autoGuardrails = e.autoGuardrails !== !1),
            (this.anonId = Jo()),
            (this.buffer = new Wo(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let r = { ...Vo(), anonymous_id: this.anonId, ...e },
            n = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: r, experiment_overrides: Yo() }),
            });
          if (!n.ok) throw new Error(`/sdk/evaluate returned ${n.status}`);
          ((this.evalResult = await n.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), Go(this.buffer, this.userId, this.anonId)),
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
          let t = jt(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let r = Dt(e),
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
            i = Ir(e);
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
      Xo = /^(true|on|1|yes)$/i,
      Zo = /^(false|off|0|no)$/i;
    function Qo(e) {
      return Xo.test(e) ? !0 : Zo.test(e) ? !1 : null;
    }
    function ea(e) {
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
    function Ve(e, t) {
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
    function jt(e) {
      let t = Ve(`se_ks_${e}`) ?? Ve(`se_gate_${e}`) ?? Ve(`se-gate-${e}`);
      return t === null ? null : Qo(t);
    }
    function Dt(e) {
      let t = Ve(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return ea(t);
    }
    function Ir(e) {
      let t = Ve(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function Ot() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function It(e = {}) {
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
    function zr(e, t = {}) {
      if (typeof window > "u") return () => {};
      let n = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = n[n.length - 1],
        i = n.includes("Shift"),
        a = n.includes("Alt"),
        s = n.includes("Ctrl") || n.includes("Control"),
        c = n.includes("Meta") || n.includes("Cmd");
      (e.installBridge(), Ot() && It({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let d = Ot();
      function l(p) {
        p.key === o &&
          p.shiftKey === i &&
          p.altKey === a &&
          p.ctrlKey === s &&
          p.metaKey === c &&
          (d
            ? window.__shipeasy_devtools?.toggle()
            : ((d = !0), It({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", l);
      let f = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", l), f());
      };
    }
    var se = null;
    function qr(e) {
      let t = Ut({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (Br.notifyMounted(), zr(t, { adminUrl: e.adminUrl }));
    }
    function Ut(e) {
      return se || ((se = new Or(e)), se);
    }
    function ta() {
      return se;
    }
    function ra() {
      (se?.destroy(), (se = null));
    }
    function Pr() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var Pt = !1,
      zt = new Set(),
      Hr = !1;
    function na() {
      Hr ||
        typeof window > "u" ||
        ((Hr = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of zt) e();
        }));
    }
    var Br = {
        configure(e) {
          Ut(e);
        },
        identify(e) {
          return se
            ? se.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = Pr();
          return t !== null && e in t.flags
            ? t.flags[e]
            : Pt
              ? se
                ? se.getFlag(e)
                : (jt(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let r = Pr();
          if (r !== null && e in r.configs) {
            let o = r.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!Pt) return;
          if (se) return se.getConfig(e, t);
          let n = Dt(e);
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
          return se?.getExperiment(e, t, r, n) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          se?.track(e, t);
        },
        flush() {
          return se?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          ((Pt = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return se ? se.subscribe(e) : (zt.add(e), na(), () => zt.delete(e));
        },
        get ready() {
          return se?.ready ?? !1;
        },
      },
      jr = "\uFFF9",
      Dr = "\uFFFA",
      Ur = "\uFFFB",
      oa = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function Nr(e, t) {
      return `${jr}${e}${Dr}${t}${Ur}`;
    }
    function aa(e, t, r) {
      let n = { "data-label": e };
      return (t && (n["data-variables"] = JSON.stringify(t)), r && (n["data-label-desc"] = r), n);
    }
    var ia = null,
      sa = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      la = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function da() {
      return globalThis[sa]?.() ?? null;
    }
    function ca() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[la];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function pt(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (r, n) => {
            let o = t[n];
            return o != null ? String(o) : r;
          })
        : e;
    }
    var pa = typeof document < "u",
      fa = [
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
    function ua() {
      let e = {};
      for (let t of fa)
        e[t] = pa
          ? (r) => {
              let n = document.createElement(t);
              return (t !== "br" && t !== "hr" && (n.textContent = r), n);
            }
          : (r) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${r}</${t}>`);
      return e;
    }
    var ga = ua(),
      qt = {},
      Ht = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function ma(e, t) {
      let r = [],
        n = 0,
        o,
        i = !0;
      for (Ht.lastIndex = 0; (o = Ht.exec(e)) !== null; ) {
        o.index > n && r.push(e.slice(n, o.index));
        let a = o[1],
          s = o[2] ?? "",
          c = t[a] ?? qt[a] ?? ga[a];
        if (c) {
          let d = c(s);
          (typeof d != "string" && (i = !1), r.push(d));
        } else r.push(s);
        n = Ht.lastIndex;
      }
      return (n < e.length && r.push(e.slice(n)), i ? r.join("") : r);
    }
    function Ct(e, t) {
      if (typeof window < "u" && window.i18n) {
        let n = window.i18n.t(e, t);
        return n === e ? void 0 : n;
      }
      let r = da();
      if (r?.strings[e]) return pt(r.strings[e], t);
    }
    var va = {
      t(e, t, r) {
        let n, o;
        typeof t == "string" ? ((n = t), (o = r)) : (o = t);
        let i = Ct(e, o);
        return i !== void 0 ? i : n !== void 0 ? pt(n, o) : e;
      },
      rich(e, t, r, n) {
        let i = Ct(e, n) ?? pt(t, n);
        return ma(i, r ?? {});
      },
      tEl(e, t, r, n) {
        if (ca()) {
          let i = Ct(e, r) ?? pt(t, r);
          return Nr(e, i);
        }
        return this.t(e, t, r);
      },
      configure(e) {
        (e.components && (qt = { ...qt, ...e.components }),
          e.createElement && (ia = e.createElement));
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
      e?.apiKey && !se && qr({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var tt = `
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
.dtf-head-extras { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.dtf-head-locale { background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; color:var(--fg); font-family:var(--mono); font-size:10.5px;
  padding:3px 22px 3px 7px; cursor:pointer; outline:none; max-width:170px;
  height:24px; line-height:1; appearance:none; -webkit-appearance:none;
  background-image:linear-gradient(45deg,transparent 50%,var(--fg-3) 50%),
    linear-gradient(135deg,var(--fg-3) 50%,transparent 50%);
  background-position:calc(100% - 11px) 50%, calc(100% - 7px) 50%;
  background-size:4px 4px, 4px 4px; background-repeat:no-repeat; }
.dtf-head-locale:hover { border-color:var(--fg-4); }
.dtf-head-toggle { display:inline-flex; align-items:center; gap:5px;
  background:var(--bg-2); border:1px solid var(--line); border-radius:4px;
  color:var(--fg-2); font-family:var(--mono); font-size:10.5px;
  padding:0 8px; height:24px; cursor:pointer; }
.dtf-head-toggle:hover { color:var(--fg); border-color:var(--fg-4); }
.dtf-head-toggle svg { width:11px; height:11px; }
.dtf-head-toggle.active { color:var(--accent);
  border-color:color-mix(in oklab, var(--accent) 40%, var(--line));
  background:color-mix(in oklab, var(--accent) 12%, var(--bg-2)); }
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
.lbl-edit-row { display:flex; align-items:center; gap:8px;
  padding:6px 0 8px; margin-bottom:8px; font-family:var(--mono); }
.lbl-edit-row .lbl-edit-loc { color:var(--accent); background:color-mix(in oklab, var(--accent) 18%, var(--bg-3));
  font-size:10px; font-weight:600; padding:3px 6px; border-radius:3px;
  flex-shrink:0; min-width:46px; text-align:center; }
.lbl-edit-row .lbl-edit-input { flex:1; min-width:0; height:26px;
  background:var(--bg-2); border:1px solid var(--line); border-radius:4px;
  padding:0 8px; color:var(--fg); font-family:var(--mono); font-size:11.5px;
  outline:none; box-sizing:border-box; }
.lbl-edit-row .lbl-edit-input:focus { border-color:color-mix(in oklab, var(--pri) 60%, var(--line)); }
.lbl-edit-row .lbl-edit-save { flex-shrink:0; height:26px; padding:0 12px;
  background:color-mix(in oklab, var(--pri) 16%, var(--bg-3));
  color:var(--pri); border:1px solid color-mix(in oklab, var(--pri) 30%, var(--line));
  border-radius:4px; font-family:var(--mono); font-size:10.5px; font-weight:600;
  cursor:pointer; transition:background .12s, color .12s, opacity .12s; }
.lbl-edit-row .lbl-edit-save:disabled { opacity:.45; cursor:not-allowed; }
.lbl-edit-row .lbl-edit-save:not(:disabled):hover {
  background:color-mix(in oklab, var(--pri) 24%, var(--bg-3)); }
.lbl-edit-row .lbl-edit-save.dirty { background:color-mix(in oklab, var(--pri) 22%, var(--bg-3)); color:var(--fg); }
.lbl-edit-row .lbl-edit-save.done { background:color-mix(in oklab, var(--accent) 22%, var(--bg-3));
  color:var(--accent); border-color:color-mix(in oklab, var(--accent) 40%, var(--line)); }
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
.dtf-modal .dtf-input { width:100%; box-sizing:border-box; height:28px;
  padding:4px 8px; background:var(--bg-2); border:1px solid var(--line);
  border-radius:3px; outline:none; color:var(--fg);
  font-family:var(--mono); font-size:11.5px; }
.dtf-modal .dtf-input:focus { border-color:color-mix(in oklab, var(--pri) 45%, var(--line)); }
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

/* \u2500\u2500\u2500 Inline label popper (Edit-on-page mode) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.label-popper { position:fixed; top:0; left:0; z-index:2147483646;
  width:380px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px);
  display:flex; flex-direction:column;
  background:var(--bg-1); color:var(--fg);
  border:1px solid var(--line); border-radius:8px;
  box-shadow:0 18px 48px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
  font-family:var(--sans); font-size:12px;
  animation:lp-in .12s cubic-bezier(.2,.8,.3,1); }
@keyframes lp-in { from { opacity:0; transform:translateY(-3px) scale(.985); }
  to { opacity:1; transform:translateY(0) scale(1); } }
.label-popper .lp-head { display:flex; align-items:center; gap:8px;
  padding:8px 10px; border-bottom:1px solid var(--line);
  background:var(--bg-2); border-radius:8px 8px 0 0; }
.label-popper .lp-key { flex:1; min-width:0; font-family:var(--mono);
  font-size:10.5px; color:var(--fg-2); overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
.label-popper .lp-close { width:22px; height:22px; border:0;
  background:transparent; color:var(--fg-3); cursor:pointer;
  border-radius:4px; display:grid; place-items:center; font-size:13px;
  font-family:var(--mono); }
.label-popper .lp-close:hover { background:var(--bg-3); color:var(--fg); }
.label-popper .lp-tabs { display:flex; gap:2px; padding:6px 8px 0;
  border-bottom:1px solid var(--line-2); overflow-x:auto;
  scrollbar-width:thin; }
.label-popper .lp-tab { background:transparent; border:0;
  color:var(--fg-3); font-family:var(--mono); font-size:10.5px;
  padding:5px 9px; border-radius:4px 4px 0 0; cursor:pointer;
  border-bottom:2px solid transparent; white-space:nowrap; }
.label-popper .lp-tab:hover { color:var(--fg); background:var(--bg-2); }
.label-popper .lp-tab.active { color:var(--fg);
  border-bottom-color:var(--pri); }
.label-popper .lp-tab-attr { color:var(--info); }
.label-popper .lp-body { flex:1; overflow-y:auto; padding:10px 12px;
  display:flex; flex-direction:column; gap:10px;
  scrollbar-width:thin; scrollbar-color:var(--line) transparent; }
.label-popper .lp-body::-webkit-scrollbar { width:6px; }
.label-popper .lp-body::-webkit-scrollbar-thumb {
  background:var(--line); border-radius:3px; }
.label-popper .lp-field { display:flex; flex-direction:column; gap:5px; }
.label-popper .lp-field label { font-family:var(--mono); font-size:9.5px;
  text-transform:uppercase; letter-spacing:.06em; color:var(--fg-4);
  font-weight:500; }
.label-popper .lp-field span { font-size:11px; color:var(--fg-2);
  font-family:var(--mono); }
.label-popper .lp-field span.empty { color:var(--fg-4); font-style:italic; }
.label-popper .lp-field span.mono { font-family:var(--mono); }
.label-popper .lp-input { width:100%; box-sizing:border-box;
  min-height:64px; max-height:160px; resize:vertical;
  background:var(--bg-2); border:1px solid var(--line);
  border-radius:4px; padding:8px 10px; outline:none;
  color:var(--fg); font-family:var(--mono); font-size:11.5px; line-height:1.5; }
.label-popper .lp-input:focus {
  border-color:color-mix(in oklab, var(--pri) 60%, var(--line)); }
.label-popper .lp-vars { display:flex; flex-direction:column; gap:3px;
  background:var(--bg-2); border:1px solid var(--line-2);
  border-radius:4px; padding:6px 8px; }
.label-popper .lp-var { display:flex; align-items:center; gap:8px;
  font-family:var(--mono); font-size:10.5px; }
.label-popper .lp-var-k { color:var(--info);
  background:color-mix(in oklab, var(--info) 12%, var(--bg-3));
  padding:1px 5px; border-radius:2px; flex-shrink:0; }
.label-popper .lp-var-v { color:var(--fg-2); overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; }
.label-popper .lp-actions { display:flex; gap:6px; justify-content:flex-end;
  padding:8px 10px; border-top:1px solid var(--line); background:var(--bg-2);
  border-radius:0 0 8px 8px; }
.label-popper .lp-actions .ibtn { background:var(--bg-3);
  border:1px solid var(--line); color:var(--fg-2);
  font-family:var(--mono); font-size:10.5px; padding:5px 12px;
  border-radius:4px; cursor:pointer; transition:background .12s,color .12s; }
.label-popper .lp-actions .ibtn:hover { color:var(--fg); border-color:var(--fg-4); }
.label-popper .lp-actions .ibtn:disabled { opacity:.5; cursor:not-allowed; }
.label-popper .lp-actions .ibtn.pri {
  background:color-mix(in oklab, var(--pri) 22%, var(--bg-3));
  color:var(--pri); border-color:color-mix(in oklab, var(--pri) 35%, var(--line)); }
.label-popper .lp-actions .ibtn.pri:not(:disabled):hover {
  background:color-mix(in oklab, var(--pri) 32%, var(--bg-3)); color:var(--fg); }
.label-popper .lp-err { padding:0 12px 8px; color:var(--danger);
  font-family:var(--mono); font-size:10.5px; min-height:0; }
.label-popper .lp-err:empty { display:none; }
`;
  var ht = "se_dt_session";
  function tr() {
    try {
      let e = sessionStorage.getItem(ht);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function Bn(e) {
    try {
      sessionStorage.setItem(ht, JSON.stringify(e));
    } catch {}
  }
  function xt() {
    try {
      sessionStorage.removeItem(ht);
    } catch {}
  }
  function jn() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  async function rr(e, t) {
    let r = new URL(e.adminUrl).origin,
      n = window.location.origin,
      o = `shipeasy-devtools-auth-${Date.now()}`,
      i = new URL(`${e.adminUrl}/devtools-auth`);
    i.searchParams.set("origin", n);
    let a = jn();
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
        function p(_, k) {
          f ||
            ((f = !0),
            window.removeEventListener("message", g),
            clearInterval(w),
            clearTimeout(v),
            _ ? d(_) : c(k));
        }
        function g(_) {
          if (_.origin !== r) return;
          let k = _.data;
          if (!k || k.type !== "se:devtools-auth" || !k.token || !k.projectId) return;
          let T = { token: k.token, projectId: k.projectId };
          (Bn(T), p(null, T));
        }
        window.addEventListener("message", g);
        let h = Date.now(),
          w = setInterval(() => {
            Date.now() - h < 1500 ||
              (s.closed && !f && p(new Error("Sign-in window closed before approval.")));
          }, 500),
          v = setTimeout(() => {
            p(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var Dn = /^(true|on|1|yes)$/i,
    Un = /^(false|off|0|no)$/i,
    wt = /^se(?:_|-|$)/;
  function rt(e) {
    return Dn.test(e) ? !0 : Un.test(e) ? !1 : null;
  }
  function yt(e) {
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
  function or(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function Ue() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function $e(e, t) {
    let r = Ue(),
      n = r.get(e);
    if (n !== null) return n;
    if (t) {
      let o = r.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function Ne(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [r, n] of e) n === null ? t.searchParams.delete(r) : t.searchParams.set(r, n);
    window.location.assign(t.toString());
  }
  function nt() {
    if (typeof window > "u") return !1;
    let e = Ue();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function Ee() {
    return typeof window > "u" ? !1 : Ue().has("se_edit_labels");
  }
  function Ke(e) {
    if (!e && typeof document < "u")
      try {
        document.cookie = "se_edit_labels=;path=/;max-age=0;samesite=lax";
      } catch {}
    Ne([["se_edit_labels", e ? "1" : null]]);
  }
  function ar(e) {
    let t = $e(`se_ks_${e}`) ?? $e(`se_gate_${e}`) ?? $e(`se-gate-${e}`);
    return t === null ? null : rt(t);
  }
  function ot(e, t, r = "session") {
    Ne([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function ir(e) {
    let t = $e(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return yt(t);
  }
  function kt(e, t, r = "session") {
    Ne([
      [`se_config_${e}`, t == null ? null : or(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function sr(e) {
    let t = $e(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function $t(e, t, r = "session") {
    Ne([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function He() {
    return $e("se_i18n");
  }
  function lr() {
    return $e("se_i18n_draft");
  }
  function Me(e) {
    return $e(`se_i18n_label_${e}`);
  }
  function Fe(e, t, r = "session") {
    Ne([[`se_i18n_label_${e}`, t]]);
  }
  function dr() {
    let e = [],
      t = Ue();
    for (let [r, n] of t.entries())
      r.startsWith("se_i18n_label_") && e.push({ key: r.slice(14), value: n });
    return e;
  }
  function cr() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()])
      t.startsWith("se_i18n_label_") && e.searchParams.delete(t);
    window.history.replaceState({}, "", e.toString());
  }
  function pr() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) wt.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Et(e, t) {
    let r = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let n of [...r.searchParams.keys()]) wt.test(n) && r.searchParams.delete(n);
    e.openDevtools && r.searchParams.set("se", "1");
    for (let [n, o] of Object.entries(e.gates ?? {}))
      r.searchParams.set(`se_ks_${n}`, o ? "true" : "false");
    for (let [n, o] of Object.entries(e.experiments ?? {})) r.searchParams.set(`se_exp_${n}`, o);
    for (let [n, o] of Object.entries(e.configs ?? {})) r.searchParams.set(`se_config_${n}`, or(o));
    (e.i18nProfile && r.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && r.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [n, o] of Object.entries(e.i18nLabels ?? {}))
      r.searchParams.set(`se_i18n_label_${n}`, o);
    return r.toString();
  }
  function St() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = Ue();
    for (let [r, n] of t)
      if (r.startsWith("se_ks_")) {
        let o = rt(n);
        o !== null && (e.gates[r.slice(6)] = o);
      } else if (r.startsWith("se_gate_")) {
        let o = rt(n);
        o !== null && (e.gates[r.slice(8)] = o);
      } else if (r.startsWith("se-gate-")) {
        let o = rt(n);
        o !== null && (e.gates[r.slice(8)] = o);
      } else
        r.startsWith("se_exp_") || r.startsWith("se-exp-")
          ? (e.experiments[r.slice(7)] = n)
          : r.startsWith("se_config_") || r.startsWith("se-config-")
            ? (e.configs[r.slice(10)] = yt(n))
            : r === "se_i18n"
              ? (e.i18nProfile = n)
              : r === "se_i18n_draft"
                ? (e.i18nDraft = n)
                : r.startsWith("se_i18n_label_") && (e.i18nLabels[r.slice(14)] = n);
    return e;
  }
  function fr(e) {
    if (typeof window > "u") return;
    let t = { ...St(), ...e, openDevtools: !0 },
      r = Et(t);
    window.location.assign(r);
  }
  function Nn() {
    let e = [];
    if (typeof window > "u") return e;
    for (let [t, r] of new URLSearchParams(window.location.search))
      (t === "se" || wt.test(t)) && e.push([t, r]);
    return e;
  }
  function nr(e) {
    for (let [t, r] of Nn()) e.searchParams.has(t) || e.searchParams.set(t, r);
  }
  function ur() {
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
      nr(l);
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
      return s.origin !== t ? a : (nr(s), s.toString());
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
  var gr = "shipeasy_hide_admin_links";
  function mr(e, t) {
    return t
      ? t === "*"
        ? !0
        : t.startsWith("*.")
          ? e.endsWith(t.slice(1))
          : e === t || e === `www.${t}`
      : !1;
  }
  var Lt = { type: "object", properties: {}, additionalProperties: !0 };
  var at = class {
    constructor(t, r, n, o = !1) {
      Z(this, "adminUrl", t);
      Z(this, "token", r);
      Z(this, "projectId", n);
      Z(this, "hideAdminLinks", o);
      Z(this, "cache", new Map());
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
    async drainList(t) {
      let r = t.includes("?") ? "&" : "?",
        n = [],
        o = null;
      do {
        let i = `${r}limit=500${o ? `&cursor=${encodeURIComponent(o)}` : ""}`,
          a = await fetch(`${this.adminUrl}${t}${i}`, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
        if (!a.ok) throw new Error(`${t} \u2192 HTTP ${a.status}`);
        let s = await a.json();
        if (Array.isArray(s)) return s;
        (n.push(...s.data), (o = s.next_cursor));
      } while (o);
      return n;
    }
    gates() {
      return this.memo("gates", () => this.drainList("/api/admin/gates"));
    }
    configs() {
      return this.memo("configs", async () => {
        let t = await this.drainList("/api/admin/configs"),
          r = "prod";
        return await Promise.all(
          t.map(async (o) => {
            try {
              let i = await this.get(`/api/admin/configs/${o.id}`),
                a = i.valueJson !== void 0 ? i.valueJson : (i.values?.[r] ?? {}),
                s = i.schema ?? o.schema ?? Lt;
              return { id: o.id, name: o.name, updatedAt: o.updatedAt, valueJson: a, schema: s };
            } catch {
              return {
                id: o.id,
                name: o.name,
                updatedAt: o.updatedAt,
                valueJson: {},
                schema: o.schema ?? Lt,
              };
            }
          }),
        );
      });
    }
    experiments() {
      return this.memo("experiments", () => this.drainList("/api/admin/experiments"));
    }
    universes() {
      return this.memo("universes", () => this.drainList("/api/admin/universes"));
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
    async createDraft(t) {
      let r = await this.post("/api/admin/i18n/drafts", { profile_id: t.profileId, name: t.name });
      return (this.cache.delete("drafts"), r);
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
  var te = (e, t = 1.75) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,
    C = {
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
  function ue(e) {
    let t = Date.now() - Date.parse(e);
    if (Number.isNaN(t)) return "\u2014";
    let r = Math.floor(t / 6e4);
    if (r < 1) return "just now";
    if (r < 60) return `${r}m ago`;
    let n = Math.floor(r / 60);
    return n < 24 ? `${n}h ago` : `${Math.floor(n / 24)}d ago`;
  }
  function it(e) {
    return e < 1024
      ? `${e} B`
      : e < 1024 * 1024
        ? `${(e / 1024).toFixed(0)} KB`
        : `${(e / 1024 / 1024).toFixed(1)} MB`;
  }
  function Se() {
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
  function ge(e) {
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
    return `<button class="dtf-copy" data-copy="${e}" title="${$(t)}">${C.copy}</button>`;
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
            (r.innerHTML = C.check),
            setTimeout(() => {
              (r.classList.remove("done"), (r.innerHTML = C.copy));
            }, 900));
        }
      });
    });
  }
  var Kn = [
    { k: "ctx.route", get: () => `"${window.location.pathname}"` },
    { k: "ctx.user_agent", get: () => `"${(navigator.userAgent ?? "").slice(0, 64)}"` },
    { k: "ctx.viewport", get: () => `${window.innerWidth}x${window.innerHeight}` },
  ];
  function Fn() {
    let e = window.__shipeasy;
    if (!e) return null;
    let t = e.user;
    return t && typeof t == "object" ? t : null;
  }
  function Wn(e) {
    return e.trim().charAt(0).toUpperCase() || "?";
  }
  function vr(e, t, r, n) {
    let o = Fn();
    if (!o && Object.keys(r.props).length === 0) {
      let { html: p, wire: g } = ge({
        title: "No <em>identified user</em>",
        message:
          "The host app hasn't called shipeasy.identify() yet. Once it does, the user's properties will show here and you can simulate other users.",
        actions: [],
      });
      ((e.innerHTML = p), g(e));
      return;
    }
    let i = {};
    if (o)
      for (let [p, g] of Object.entries(o)) g == null || typeof g == "object" || (i[p] = String(g));
    for (let [p, g] of Object.entries(r.props)) i[p] = g;
    let a = i.id || i.userId || "\u2014",
      s = i.email || i.user_email || "",
      c = s || a,
      d = Object.entries(i)
        .map(([p, g]) => {
          let h = r.dirty[p] ? '<span class="changed"></span>' : '<span style="width:5px"></span>';
          return `<div class="dtf-prop">
        <span class="k">user.${$(p)}</span>
        <span class="v"><input data-prop="${$(p)}" value="${Gn(g)}"/></span>
        ${h}
      </div>`;
        })
        .join(""),
      l = Kn.map(
        (p) => `<div class="dtf-prop">
      <span class="k">${$(p.k)}</span>
      <span class="v" style="color:var(--accent)">${$(p.get())}</span>
      <span style="width:5px"></span>
    </div>`,
      ).join(""),
      f = Object.values(r.dirty).filter(Boolean).length;
    ((e.innerHTML = `
    <div class="dtf-user">
      <div class="who">
        <div class="av">${$(Wn(c))}</div>
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
        <button class="b" data-action="reeval">${C.play} Re-evaluate ${f > 0 ? "with changes" : ""}</button>
        <button class="b g" data-action="reset">Reset</button>
      </div>
    </div>`),
      e.querySelectorAll("input[data-prop]").forEach((p) => {
        p.addEventListener("input", () => {
          let g = p.dataset.prop;
          ((r.props[g] = p.value), (r.dirty[g] = (o ? String(o[g] ?? "") : "") !== p.value));
        });
      }),
      e.querySelector('[data-action="reeval"]').addEventListener("click", () => n()),
      e.querySelector('[data-action="reset"]').addEventListener("click", () => {
        ((r.props = {}), (r.dirty = {}), n());
      }));
  }
  function Gn(e) {
    return $(e);
  }
  function Jn() {
    return window.__shipeasy ?? null;
  }
  function Vn(e) {
    let t = ar(e.name),
      r = Jn()?.getFlag(e.name),
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
  function _t(e, t) {
    let r = t === e.name,
      n = e.override !== null,
      o = e.killswitch ? e.effective : !e.effective,
      i = e.killswitch ? C.power : C.shield,
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
    let c = `<div class="dtf-toggle${e.effective ? (n ? " over" : " on") : ""}" data-toggle="${We(e.name)}"></div>`,
      d = e.killswitch
        ? e.effective
          ? `killswitch \xB7 KILLED (override: ${n ? "yes" : "no"})`
          : `killswitch \xB7 live \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout`
        : `gate \xB7 ${(e.rolloutPct / 100).toFixed(0)}% rollout \xB7 updated ${ue(e.updatedAt)}`,
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
        <button class="${e.effective ? "primary" : ""}" data-toggle-detail="${We(e.name)}">${e.effective ? "\u2713 Restore" : "\u26A0 Pull the switch"}</button>
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
        <span class="lbl">updated</span><span class="v">${ue(e.updatedAt)}</span>
      </div>
      <div class="actions">
        <button class="primary" data-toggle-detail="${We(e.name)}">\u2922 Force ${e.effective ? "false" : "true"}</button>
        ${n ? `<button data-clear-detail="${We(e.name)}">\u21BA Clear override</button>` : ""}
      </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}${o ? " muted" : ""}" data-row="${We(e.name)}">
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
  async function br(e, t, r, n) {
    e.innerHTML = Se();
    let o;
    try {
      o = await t.gates();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load gates: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = ge({
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
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Vn);
      if ((n(d.filter((l) => l.override !== null).length), d.length === 0)) {
        e.innerHTML = Ce(r.search);
        return;
      }
      if (r.view === "page") {
        let l = d.filter((p) => p.live === !0 || p.killswitch),
          f = d.filter((p) => !l.includes(p));
        e.innerHTML =
          `<div class="dtf-group">Active on this page<span class="pulse"><span class="d"></span>${l.length} firing</span></div>` +
          l.map((p) => _t(p, i)).join("") +
          (f.length
            ? `<div class="dtf-group">Inactive<span class="c">${f.length} more</span></div>` +
              f.map((p) => _t(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All flags<span class="c">${d.length}</span></div>` +
          d.map((l) => _t(l, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (f) => {
          let p = f.target;
          if (p.closest(".dtf-toggle") || p.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((i = i === g ? null : g), a());
        });
      }),
        e.querySelectorAll("[data-toggle]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-toggle"),
              g = d.find((h) => h.name === p);
            g && ot(p, !g.effective);
          });
        }),
        e.querySelectorAll("[data-toggle-detail]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-toggle-detail"),
              g = d.find((h) => h.name === p);
            g && ot(p, !g.effective);
          });
        }),
        e.querySelectorAll("[data-clear-detail]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-clear-detail");
            ot(p, null);
          });
        }),
        Ie(e, Object.fromEntries(d.map((l) => ["g:" + l.name, () => l.name]))));
    }
    a();
  }
  function We(e) {
    return $(e);
  }
  function Yn() {
    return window.__shipeasy ?? null;
  }
  function Xn(e) {
    let t = sr(e.name),
      r = Yn()?.getExperiment(e.name),
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
  function Tt(e, t) {
    let r = t === e.name,
      n = e.override !== null,
      o = e.groups
        .map(
          (d) =>
            `<option value="${st(d.name)}"${d.name === e.effective ? " selected" : ""}>${$(d.name)}</option>`,
        )
        .join(""),
      i = `<select class="sel${n ? " over" : ""}" data-exp="${st(e.name)}" style="grid-column:3 / span 2; justify-self:end">
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
      <span class="lbl">updated</span><span class="v">${ue(e.updatedAt)}</span>
    </div>
    <div class="actions">
      ${n ? `<button data-clear="${st(e.name)}">\u21BA Clear override</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}${e.status !== "running" ? " muted" : ""}" data-row="${st(e.name)}">
      <div class="ic"><span style="color:${e.liveEnrolled ? "var(--accent)" : "var(--fg-3)"}">${C.flask}</span></div>
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
  async function hr(e, t, r, n) {
    e.innerHTML = Se();
    let o;
    try {
      o = await t.experiments();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load experiments: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = ge({
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
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Xn);
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
            ? l.map((p) => Tt(p, i)).join("")
            : '<div class="se-empty">No experiments enrolled yet on this page.</div>') +
          (f.length
            ? `<div class="dtf-group">Other<span class="c">${f.length}</span></div>` +
              f.map((p) => Tt(p, i)).join("")
            : "");
      } else
        e.innerHTML =
          `<div class="dtf-group">All experiments<span class="c">${d.length}</span></div>` +
          d.map((l) => Tt(l, i)).join("");
      (e.querySelectorAll(".dtf-row").forEach((l) => {
        l.addEventListener("click", (f) => {
          let p = f.target;
          if (p.closest("select") || p.closest(".dtf-copy")) return;
          let g = l.dataset.row;
          ((i = i === g ? null : g), a());
        });
      }),
        e.querySelectorAll("select[data-exp]").forEach((l) => {
          l.addEventListener("change", () => {
            $t(l.dataset.exp, l.value || null);
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (f) => {
            (f.stopPropagation(), $t(l.getAttribute("data-clear"), null));
          });
        }),
        Ie(e, Object.fromEntries(d.map((l) => ["e:" + l.name, () => l.name]))));
    }
    a();
  }
  function st(e) {
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
  function me(e) {
    return encodeURI(Zn(e));
  }
  function Zn(e) {
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  var Qn = { prefixItems: !0, items: !0, allOf: !0, anyOf: !0, oneOf: !0 },
    eo = {
      $defs: !0,
      definitions: !0,
      properties: !0,
      patternProperties: !0,
      dependentSchemas: !0,
    },
    to = {
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
    ro =
      typeof self < "u" && self.location && self.location.origin !== "null"
        ? new URL(self.location.origin + self.location.pathname + location.search)
        : new URL("https://github.com/cfworker");
  function we(e, t = Object.create(null), r = ro, n = "") {
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
      if (to[i]) continue;
      let a = `${n}/${me(i)}`,
        s = e[i];
      if (Array.isArray(s)) {
        if (Qn[i]) {
          let c = s.length;
          for (let d = 0; d < c; d++) we(s[d], t, r, `${a}/${d}`);
        }
      } else if (eo[i]) for (let c in s) we(s[c], t, r, `${a}/${me(c)}`);
      else we(s, t, r, a);
    }
    return t;
  }
  var no = /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
    oo = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    ao = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i,
    io =
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    so =
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    lo =
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    co =
      /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    po = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    fo = /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    uo = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    go = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    mo = (e) => {
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
    vo = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    bo =
      /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    ho = (e) =>
      e.length > 1 &&
      e.length < 80 &&
      (/^P\d+([.,]\d+)?W$/.test(e) ||
        (/^P[\dYMDTHS]*(\d[.,]\d+)?[YMDHS]$/.test(e) &&
          /^P([.,\d]+Y)?([.,\d]+M)?([.,\d]+D)?(T([.,\d]+H)?([.,\d]+M)?([.,\d]+S)?)?$/.test(e)));
  function xe(e) {
    return e.test.bind(e);
  }
  var Mt = {
    date: xr,
    time: yr.bind(void 0, !1),
    "date-time": wo,
    duration: ho,
    uri: Eo,
    "uri-reference": xe(so),
    "uri-template": xe(lo),
    url: xe(co),
    email: mo,
    hostname: xe(io),
    ipv4: xe(vo),
    ipv6: xe(bo),
    regex: Lo,
    uuid: xe(po),
    "json-pointer": xe(fo),
    "json-pointer-uri-fragment": xe(uo),
    "relative-json-pointer": xe(go),
  };
  function xo(e) {
    return e % 4 === 0 && (e % 100 !== 0 || e % 400 === 0);
  }
  function xr(e) {
    let t = e.match(no);
    if (!t) return !1;
    let r = +t[1],
      n = +t[2],
      o = +t[3];
    return n >= 1 && n <= 12 && o >= 1 && o <= (n == 2 && xo(r) ? 29 : oo[n]);
  }
  function yr(e, t) {
    let r = t.match(ao);
    if (!r) return !1;
    let n = +r[1],
      o = +r[2],
      i = +r[3],
      a = !!r[5];
    return ((n <= 23 && o <= 59 && i <= 59) || (n == 23 && o == 59 && i == 60)) && (!e || a);
  }
  var yo = /t|\s/i;
  function wo(e) {
    let t = e.split(yo);
    return t.length == 2 && xr(t[0]) && yr(!0, t[1]);
  }
  var ko = /\/|:/,
    $o =
      /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function Eo(e) {
    return ko.test(e) && $o.test(e);
  }
  var So = /[^\\]\\Z/;
  function Lo(e) {
    if (So.test(e)) return !1;
    try {
      return (new RegExp(e, "u"), !0);
    } catch {
      return !1;
    }
  }
  var wr;
  (function (e) {
    ((e[(e.Flag = 1)] = "Flag"), (e[(e.Basic = 2)] = "Basic"), (e[(e.Detailed = 4)] = "Detailed"));
  })(wr || (wr = {}));
  function kr(e) {
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
  function oe(
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
        $recursiveAnchor: g,
        type: h,
        const: w,
        enum: v,
        required: _,
        not: k,
        anyOf: T,
        allOf: b,
        oneOf: E,
        if: y,
        then: R,
        else: O,
        format: J,
        properties: ae,
        patternProperties: m,
        additionalProperties: L,
        unevaluatedProperties: U,
        minProperties: V,
        maxProperties: ce,
        propertyNames: ve,
        dependentRequired: le,
        dependentSchemas: ye,
        dependencies: Y,
        prefixItems: he,
        items: be,
        additionalItems: Pe,
        unevaluatedItems: pe,
        contains: De,
        minContains: u,
        maxContains: x,
        minItems: N,
        maxItems: K,
        uniqueItems: G,
        minimum: z,
        maximum: A,
        exclusiveMinimum: H,
        exclusiveMaximum: W,
        multipleOf: ie,
        minLength: re,
        maxLength: F,
        pattern: X,
        __absolute_ref__: ne,
        __absolute_recursive_ref__: ee,
      } = t,
      S = [];
    if ((g === !0 && i === null && (i = t), p === "#")) {
      let q = i === null ? n[ee] : i,
        I = `${s}/$recursiveRef`,
        D = oe(e, i === null ? t : i, r, n, o, q, a, I, c);
      D.valid ||
        S.push(
          {
            instanceLocation: a,
            keyword: "$recursiveRef",
            keywordLocation: I,
            error: "A subschema had errors.",
          },
          ...D.errors,
        );
    }
    if (f !== void 0) {
      let I = n[ne || f];
      if (I === void 0) {
        let M = `Unresolved $ref "${f}".`;
        throw (
          ne && ne !== f && (M += `  Absolute URI "${ne}".`),
          (M += `
Known schemas:
- ${Object.keys(n).join(`
- `)}`),
          new Error(M)
        );
      }
      let D = `${s}/$ref`,
        P = oe(e, I, r, n, o, i, a, D, c);
      if (
        (P.valid ||
          S.push(
            {
              instanceLocation: a,
              keyword: "$ref",
              keywordLocation: D,
              error: "A subschema had errors.",
            },
            ...P.errors,
          ),
        r === "4" || r === "7")
      )
        return { valid: S.length === 0, errors: S };
    }
    if (Array.isArray(h)) {
      let q = h.length,
        I = !1;
      for (let D = 0; D < q; D++)
        if (l === h[D] || (h[D] === "integer" && l === "number" && e % 1 === 0 && e === e)) {
          I = !0;
          break;
        }
      I ||
        S.push({
          instanceLocation: a,
          keyword: "type",
          keywordLocation: `${s}/type`,
          error: `Instance type "${l}" is invalid. Expected "${h.join('", "')}".`,
        });
    } else
      h === "integer"
        ? (l !== "number" || e % 1 || e !== e) &&
          S.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${h}".`,
          })
        : h !== void 0 &&
          l !== h &&
          S.push({
            instanceLocation: a,
            keyword: "type",
            keywordLocation: `${s}/type`,
            error: `Instance type "${l}" is invalid. Expected "${h}".`,
          });
    if (
      (w !== void 0 &&
        (l === "object" || l === "array"
          ? ze(e, w) ||
            S.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(w)}.`,
            })
          : e !== w &&
            S.push({
              instanceLocation: a,
              keyword: "const",
              keywordLocation: `${s}/const`,
              error: `Instance does not match ${JSON.stringify(w)}.`,
            })),
      v !== void 0 &&
        (l === "object" || l === "array"
          ? v.some((q) => ze(e, q)) ||
            S.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(v)}.`,
            })
          : v.some((q) => e === q) ||
            S.push({
              instanceLocation: a,
              keyword: "enum",
              keywordLocation: `${s}/enum`,
              error: `Instance does not match any of ${JSON.stringify(v)}.`,
            })),
      k !== void 0)
    ) {
      let q = `${s}/not`;
      oe(e, k, r, n, o, i, a, q).valid &&
        S.push({
          instanceLocation: a,
          keyword: "not",
          keywordLocation: q,
          error: 'Instance matched "not" schema.',
        });
    }
    let de = [];
    if (T !== void 0) {
      let q = `${s}/anyOf`,
        I = S.length,
        D = !1;
      for (let P = 0; P < T.length; P++) {
        let M = T[P],
          j = Object.create(c),
          B = oe(e, M, r, n, o, g === !0 ? i : null, a, `${q}/${P}`, j);
        (S.push(...B.errors), (D = D || B.valid), B.valid && de.push(j));
      }
      D
        ? (S.length = I)
        : S.splice(I, 0, {
            instanceLocation: a,
            keyword: "anyOf",
            keywordLocation: q,
            error: "Instance does not match any subschemas.",
          });
    }
    if (b !== void 0) {
      let q = `${s}/allOf`,
        I = S.length,
        D = !0;
      for (let P = 0; P < b.length; P++) {
        let M = b[P],
          j = Object.create(c),
          B = oe(e, M, r, n, o, g === !0 ? i : null, a, `${q}/${P}`, j);
        (S.push(...B.errors), (D = D && B.valid), B.valid && de.push(j));
      }
      D
        ? (S.length = I)
        : S.splice(I, 0, {
            instanceLocation: a,
            keyword: "allOf",
            keywordLocation: q,
            error: "Instance does not match every subschema.",
          });
    }
    if (E !== void 0) {
      let q = `${s}/oneOf`,
        I = S.length,
        D = E.filter((P, M) => {
          let j = Object.create(c),
            B = oe(e, P, r, n, o, g === !0 ? i : null, a, `${q}/${M}`, j);
          return (S.push(...B.errors), B.valid && de.push(j), B.valid);
        }).length;
      D === 1
        ? (S.length = I)
        : S.splice(I, 0, {
            instanceLocation: a,
            keyword: "oneOf",
            keywordLocation: q,
            error: `Instance does not match exactly one subschema (${D} matches).`,
          });
    }
    if (((l === "object" || l === "array") && Object.assign(c, ...de), y !== void 0)) {
      let q = `${s}/if`;
      if (oe(e, y, r, n, o, i, a, q, c).valid) {
        if (R !== void 0) {
          let D = oe(e, R, r, n, o, i, a, `${s}/then`, c);
          D.valid ||
            S.push(
              {
                instanceLocation: a,
                keyword: "if",
                keywordLocation: q,
                error: 'Instance does not match "then" schema.',
              },
              ...D.errors,
            );
        }
      } else if (O !== void 0) {
        let D = oe(e, O, r, n, o, i, a, `${s}/else`, c);
        D.valid ||
          S.push(
            {
              instanceLocation: a,
              keyword: "if",
              keywordLocation: q,
              error: 'Instance does not match "else" schema.',
            },
            ...D.errors,
          );
      }
    }
    if (l === "object") {
      if (_ !== void 0)
        for (let P of _)
          P in e ||
            S.push({
              instanceLocation: a,
              keyword: "required",
              keywordLocation: `${s}/required`,
              error: `Instance does not have required property "${P}".`,
            });
      let q = Object.keys(e);
      if (
        (V !== void 0 &&
          q.length < V &&
          S.push({
            instanceLocation: a,
            keyword: "minProperties",
            keywordLocation: `${s}/minProperties`,
            error: `Instance does not have at least ${V} properties.`,
          }),
        ce !== void 0 &&
          q.length > ce &&
          S.push({
            instanceLocation: a,
            keyword: "maxProperties",
            keywordLocation: `${s}/maxProperties`,
            error: `Instance does not have at least ${ce} properties.`,
          }),
        ve !== void 0)
      ) {
        let P = `${s}/propertyNames`;
        for (let M in e) {
          let j = `${a}/${me(M)}`,
            B = oe(M, ve, r, n, o, i, j, P);
          B.valid ||
            S.push(
              {
                instanceLocation: a,
                keyword: "propertyNames",
                keywordLocation: P,
                error: `Property name "${M}" does not match schema.`,
              },
              ...B.errors,
            );
        }
      }
      if (le !== void 0) {
        let P = `${s}/dependantRequired`;
        for (let M in le)
          if (M in e) {
            let j = le[M];
            for (let B of j)
              B in e ||
                S.push({
                  instanceLocation: a,
                  keyword: "dependentRequired",
                  keywordLocation: P,
                  error: `Instance has "${M}" but does not have "${B}".`,
                });
          }
      }
      if (ye !== void 0)
        for (let P in ye) {
          let M = `${s}/dependentSchemas`;
          if (P in e) {
            let j = oe(e, ye[P], r, n, o, i, a, `${M}/${me(P)}`, c);
            j.valid ||
              S.push(
                {
                  instanceLocation: a,
                  keyword: "dependentSchemas",
                  keywordLocation: M,
                  error: `Instance has "${P}" but does not match dependant schema.`,
                },
                ...j.errors,
              );
          }
        }
      if (Y !== void 0) {
        let P = `${s}/dependencies`;
        for (let M in Y)
          if (M in e) {
            let j = Y[M];
            if (Array.isArray(j))
              for (let B of j)
                B in e ||
                  S.push({
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: P,
                    error: `Instance has "${M}" but does not have "${B}".`,
                  });
            else {
              let B = oe(e, j, r, n, o, i, a, `${P}/${me(M)}`);
              B.valid ||
                S.push(
                  {
                    instanceLocation: a,
                    keyword: "dependencies",
                    keywordLocation: P,
                    error: `Instance has "${M}" but does not match dependant schema.`,
                  },
                  ...B.errors,
                );
            }
          }
      }
      let I = Object.create(null),
        D = !1;
      if (ae !== void 0) {
        let P = `${s}/properties`;
        for (let M in ae) {
          if (!(M in e)) continue;
          let j = `${a}/${me(M)}`,
            B = oe(e[M], ae[M], r, n, o, i, j, `${P}/${me(M)}`);
          if (B.valid) c[M] = I[M] = !0;
          else if (
            ((D = o),
            S.push(
              {
                instanceLocation: a,
                keyword: "properties",
                keywordLocation: P,
                error: `Property "${M}" does not match schema.`,
              },
              ...B.errors,
            ),
            D)
          )
            break;
        }
      }
      if (!D && m !== void 0) {
        let P = `${s}/patternProperties`;
        for (let M in m) {
          let j = new RegExp(M, "u"),
            B = m[M];
          for (let fe in e) {
            if (!j.test(fe)) continue;
            let Qt = `${a}/${me(fe)}`,
              er = oe(e[fe], B, r, n, o, i, Qt, `${P}/${me(M)}`);
            er.valid
              ? (c[fe] = I[fe] = !0)
              : ((D = o),
                S.push(
                  {
                    instanceLocation: a,
                    keyword: "patternProperties",
                    keywordLocation: P,
                    error: `Property "${fe}" matches pattern "${M}" but does not match associated schema.`,
                  },
                  ...er.errors,
                ));
          }
        }
      }
      if (!D && L !== void 0) {
        let P = `${s}/additionalProperties`;
        for (let M in e) {
          if (I[M]) continue;
          let j = `${a}/${me(M)}`,
            B = oe(e[M], L, r, n, o, i, j, P);
          B.valid
            ? (c[M] = !0)
            : ((D = o),
              S.push(
                {
                  instanceLocation: a,
                  keyword: "additionalProperties",
                  keywordLocation: P,
                  error: `Property "${M}" does not match additional properties schema.`,
                },
                ...B.errors,
              ));
        }
      } else if (!D && U !== void 0) {
        let P = `${s}/unevaluatedProperties`;
        for (let M in e)
          if (!c[M]) {
            let j = `${a}/${me(M)}`,
              B = oe(e[M], U, r, n, o, i, j, P);
            B.valid
              ? (c[M] = !0)
              : S.push(
                  {
                    instanceLocation: a,
                    keyword: "unevaluatedProperties",
                    keywordLocation: P,
                    error: `Property "${M}" does not match unevaluated properties schema.`,
                  },
                  ...B.errors,
                );
          }
      }
    } else if (l === "array") {
      (K !== void 0 &&
        e.length > K &&
        S.push({
          instanceLocation: a,
          keyword: "maxItems",
          keywordLocation: `${s}/maxItems`,
          error: `Array has too many items (${e.length} > ${K}).`,
        }),
        N !== void 0 &&
          e.length < N &&
          S.push({
            instanceLocation: a,
            keyword: "minItems",
            keywordLocation: `${s}/minItems`,
            error: `Array has too few items (${e.length} < ${N}).`,
          }));
      let q = e.length,
        I = 0,
        D = !1;
      if (he !== void 0) {
        let P = `${s}/prefixItems`,
          M = Math.min(he.length, q);
        for (; I < M; I++) {
          let j = oe(e[I], he[I], r, n, o, i, `${a}/${I}`, `${P}/${I}`);
          if (
            ((c[I] = !0),
            !j.valid &&
              ((D = o),
              S.push(
                {
                  instanceLocation: a,
                  keyword: "prefixItems",
                  keywordLocation: P,
                  error: "Items did not match schema.",
                },
                ...j.errors,
              ),
              D))
          )
            break;
        }
      }
      if (be !== void 0) {
        let P = `${s}/items`;
        if (Array.isArray(be)) {
          let M = Math.min(be.length, q);
          for (; I < M; I++) {
            let j = oe(e[I], be[I], r, n, o, i, `${a}/${I}`, `${P}/${I}`);
            if (
              ((c[I] = !0),
              !j.valid &&
                ((D = o),
                S.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: P,
                    error: "Items did not match schema.",
                  },
                  ...j.errors,
                ),
                D))
            )
              break;
          }
        } else
          for (; I < q; I++) {
            let M = oe(e[I], be, r, n, o, i, `${a}/${I}`, P);
            if (
              ((c[I] = !0),
              !M.valid &&
                ((D = o),
                S.push(
                  {
                    instanceLocation: a,
                    keyword: "items",
                    keywordLocation: P,
                    error: "Items did not match schema.",
                  },
                  ...M.errors,
                ),
                D))
            )
              break;
          }
        if (!D && Pe !== void 0) {
          let M = `${s}/additionalItems`;
          for (; I < q; I++) {
            let j = oe(e[I], Pe, r, n, o, i, `${a}/${I}`, M);
            ((c[I] = !0),
              j.valid ||
                ((D = o),
                S.push(
                  {
                    instanceLocation: a,
                    keyword: "additionalItems",
                    keywordLocation: M,
                    error: "Items did not match additional items schema.",
                  },
                  ...j.errors,
                )));
          }
        }
      }
      if (De !== void 0)
        if (q === 0 && u === void 0)
          S.push({
            instanceLocation: a,
            keyword: "contains",
            keywordLocation: `${s}/contains`,
            error: "Array is empty. It must contain at least one item matching the schema.",
          });
        else if (u !== void 0 && q < u)
          S.push({
            instanceLocation: a,
            keyword: "minContains",
            keywordLocation: `${s}/minContains`,
            error: `Array has less items (${q}) than minContains (${u}).`,
          });
        else {
          let P = `${s}/contains`,
            M = S.length,
            j = 0;
          for (let B = 0; B < q; B++) {
            let fe = oe(e[B], De, r, n, o, i, `${a}/${B}`, P);
            fe.valid ? ((c[B] = !0), j++) : S.push(...fe.errors);
          }
          (j >= (u || 0) && (S.length = M),
            u === void 0 && x === void 0 && j === 0
              ? S.splice(M, 0, {
                  instanceLocation: a,
                  keyword: "contains",
                  keywordLocation: P,
                  error: "Array does not contain item matching schema.",
                })
              : u !== void 0 && j < u
                ? S.push({
                    instanceLocation: a,
                    keyword: "minContains",
                    keywordLocation: `${s}/minContains`,
                    error: `Array must contain at least ${u} items matching schema. Only ${j} items were found.`,
                  })
                : x !== void 0 &&
                  j > x &&
                  S.push({
                    instanceLocation: a,
                    keyword: "maxContains",
                    keywordLocation: `${s}/maxContains`,
                    error: `Array may contain at most ${x} items matching schema. ${j} items were found.`,
                  }));
        }
      if (!D && pe !== void 0) {
        let P = `${s}/unevaluatedItems`;
        for (I; I < q; I++) {
          if (c[I]) continue;
          let M = oe(e[I], pe, r, n, o, i, `${a}/${I}`, P);
          ((c[I] = !0),
            M.valid ||
              S.push(
                {
                  instanceLocation: a,
                  keyword: "unevaluatedItems",
                  keywordLocation: P,
                  error: "Items did not match unevaluated items schema.",
                },
                ...M.errors,
              ));
        }
      }
      if (G)
        for (let P = 0; P < q; P++) {
          let M = e[P],
            j = typeof M == "object" && M !== null;
          for (let B = 0; B < q; B++) {
            if (P === B) continue;
            let fe = e[B];
            (M === fe || (j && typeof fe == "object" && fe !== null && ze(M, fe))) &&
              (S.push({
                instanceLocation: a,
                keyword: "uniqueItems",
                keywordLocation: `${s}/uniqueItems`,
                error: `Duplicate items at indexes ${P} and ${B}.`,
              }),
              (P = Number.MAX_SAFE_INTEGER),
              (B = Number.MAX_SAFE_INTEGER));
          }
        }
    } else if (l === "number") {
      if (
        (r === "4"
          ? (z !== void 0 &&
              ((H === !0 && e <= z) || e < z) &&
              S.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${H ? "or equal to " : ""} ${z}.`,
              }),
            A !== void 0 &&
              ((W === !0 && e >= A) || e > A) &&
              S.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${W ? "or equal to " : ""} ${A}.`,
              }))
          : (z !== void 0 &&
              e < z &&
              S.push({
                instanceLocation: a,
                keyword: "minimum",
                keywordLocation: `${s}/minimum`,
                error: `${e} is less than ${z}.`,
              }),
            A !== void 0 &&
              e > A &&
              S.push({
                instanceLocation: a,
                keyword: "maximum",
                keywordLocation: `${s}/maximum`,
                error: `${e} is greater than ${A}.`,
              }),
            H !== void 0 &&
              e <= H &&
              S.push({
                instanceLocation: a,
                keyword: "exclusiveMinimum",
                keywordLocation: `${s}/exclusiveMinimum`,
                error: `${e} is less than ${H}.`,
              }),
            W !== void 0 &&
              e >= W &&
              S.push({
                instanceLocation: a,
                keyword: "exclusiveMaximum",
                keywordLocation: `${s}/exclusiveMaximum`,
                error: `${e} is greater than or equal to ${W}.`,
              })),
        ie !== void 0)
      ) {
        let q = e % ie;
        Math.abs(0 - q) >= 11920929e-14 &&
          Math.abs(ie - q) >= 11920929e-14 &&
          S.push({
            instanceLocation: a,
            keyword: "multipleOf",
            keywordLocation: `${s}/multipleOf`,
            error: `${e} is not a multiple of ${ie}.`,
          });
      }
    } else if (l === "string") {
      let q = re === void 0 && F === void 0 ? 0 : kr(e);
      (re !== void 0 &&
        q < re &&
        S.push({
          instanceLocation: a,
          keyword: "minLength",
          keywordLocation: `${s}/minLength`,
          error: `String is too short (${q} < ${re}).`,
        }),
        F !== void 0 &&
          q > F &&
          S.push({
            instanceLocation: a,
            keyword: "maxLength",
            keywordLocation: `${s}/maxLength`,
            error: `String is too long (${q} > ${F}).`,
          }),
        X !== void 0 &&
          !new RegExp(X, "u").test(e) &&
          S.push({
            instanceLocation: a,
            keyword: "pattern",
            keywordLocation: `${s}/pattern`,
            error: "String does not match pattern.",
          }),
        J !== void 0 &&
          Mt[J] &&
          !Mt[J](e) &&
          S.push({
            instanceLocation: a,
            keyword: "format",
            keywordLocation: `${s}/format`,
            error: `String does not match format "${J}".`,
          }));
    }
    return { valid: S.length === 0, errors: S };
  }
  var lt = class {
    constructor(t, r = "2019-09", n = !0) {
      Z(this, "schema");
      Z(this, "draft");
      Z(this, "shortCircuit");
      Z(this, "lookup");
      ((this.schema = t), (this.draft = r), (this.shortCircuit = n), (this.lookup = we(t)));
    }
    validate(t) {
      return oe(t, this.schema, this.draft, this.lookup, this.shortCircuit);
    }
    addSchema(t, r) {
      (r && (t = { ...t, $id: r }), we(t, this.lookup));
    }
  };
  function dt(e) {
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
  function Ge(e) {
    return dt(e);
  }
  function _o(e) {
    let t = e.properties ?? {};
    return Object.entries(t);
  }
  function To(e, t) {
    let r = e.required;
    return Array.isArray(r) && r.includes(t);
  }
  function Mo(e, t) {
    if (!(e === null || typeof e != "object" || Array.isArray(e))) return e[t];
  }
  function Re(e, t, r) {
    return { ...(e !== null && typeof e == "object" && !Array.isArray(e) ? e : {}), [t]: r };
  }
  function $r(e) {
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
  function Ro(e) {
    let t = e.items?.type;
    return t === "number" || t === "integer" ? "number" : t === "boolean" ? "boolean" : "string";
  }
  function Ao(e, t, r, n) {
    let o = $r(t),
      i = `<label class="dtf-sf-lbl"><span class="k">${dt(e)}</span>${n ? '<span class="req">*</span>' : ""}<span class="t">${o}</span></label>`,
      a = "";
    if (o === "boolean") {
      let c = r === !0;
      a = `<span class="dtf-sf-bool">
      <button type="button" class="t${c ? " on" : ""}" data-bool-true>true</button>
      <button type="button" class="f${c === !1 ? " on" : ""}" data-bool-false>false</button>
    </span>`;
    } else if (o === "number") {
      let c = typeof r == "number" ? String(r) : "";
      a = `<input type="number" value="${Ge(c)}" data-input />`;
    } else if (o === "enum") {
      let c = (t.enum ?? []).map((l) => String(l)),
        d = String(r ?? "");
      a = `<select data-input>${c.map((l) => `<option value="${Ge(l)}"${l === d ? " selected" : ""}>${dt(l)}</option>`).join("")}</select>`;
    } else if (o === "array") {
      let d = (Array.isArray(r) ? r : []).map((f) => String(f)).join(", "),
        l = Ro(t);
      a = `<input type="text" value="${Ge(d)}" data-input data-array-items="${l}" placeholder="comma-separated ${l}s" />`;
    } else {
      let c = typeof r == "string" ? r : r == null ? "" : String(r);
      a = `<input type="text" value="${Ge(c)}" data-input />`;
    }
    let s = t.description ? `<div class="dtf-sf-desc">${dt(t.description)}</div>` : "";
    return `<div class="dtf-sf-field" data-field="${Ge(e)}">${i}${a}${s}</div>`;
  }
  function Po(e, t) {
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
  function Er(e, t, r, n) {
    let o = _o(t);
    if (o.length === 0) {
      e.innerHTML =
        '<div class="dtf-sf-empty">This config has no schema fields. Define fields in the dashboard to enable schema-driven editing.</div>';
      return;
    }
    e.innerHTML = `<div class="dtf-sf">${o.map(([i, a]) => Ao(i, a, Mo(r, i), To(t, i))).join("")}</div>`;
    for (let [i, a] of o) {
      let s = e.querySelector(`[data-field="${CSS.escape(i)}"]`);
      if (!s) continue;
      let c = $r(a);
      if (c === "boolean") {
        let l = s.querySelector("[data-bool-true]"),
          f = s.querySelector("[data-bool-false]");
        (l?.addEventListener("click", () => n(Re(r, i, !0))),
          f?.addEventListener("click", () => n(Re(r, i, !1))));
        continue;
      }
      let d = s.querySelector("[data-input]");
      if (d)
        if (c === "number")
          d.addEventListener("input", () => {
            let l = d.value;
            if (l === "") n(Re(r, i, void 0));
            else {
              let f = Number(l);
              Number.isNaN(f) || n(Re(r, i, f));
            }
          });
        else if (c === "array") {
          let l = d.dataset.arrayItems ?? "string";
          d.addEventListener("input", () => {
            let f = Po(d.value, l);
            n(Re(r, i, f));
          });
        } else
          (d.addEventListener("input", () => n(Re(r, i, d.value))),
            d.addEventListener("change", () => n(Re(r, i, d.value))));
    }
  }
  function Ho() {
    return window.__shipeasy ?? null;
  }
  function Tr(e) {
    return e === null ? "null" : Array.isArray(e) ? "array" : typeof e;
  }
  function Sr(e, t) {
    try {
      return JSON.stringify(e) === JSON.stringify(t);
    } catch {
      return e === t;
    }
  }
  function Lr(e) {
    let t = Tr(e);
    if (t === "object") return `{${Object.keys(e).length} keys}`;
    if (t === "array") return `[${e.length}]`;
    if (t === "string") {
      let r = e;
      return `"${r.length > 22 ? r.slice(0, 22) + "\u2026" : r}"`;
    }
    return t === "null" ? "null" : String(e);
  }
  function Co(e) {
    let t = ir(e.name),
      r = Ho()?.getConfig(e.name),
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
      o = Tr(e.effective),
      i = `config \xB7 ${o} \xB7 updated ${ue(e.updatedAt)}`,
      a = `<span class="val${n ? " over" : ""}" style="grid-column:3 / span 2; justify-self:end">${$(Lr(e.effective))}</span>`,
      s = `
    <div class="crumbs">
      <div><span class="pass">\u25CF</span> ${$(e.name)}
        <span style="color:var(--fg-4)">=</span>
        <span style="color:var(--fg-2)">${$(Lr(e.effective))}</span>
        <span style="color:var(--fg-4)">\xB7 ${o}</span>
      </div>
    </div>
    <div class="mini">
      <span class="lbl">override</span><span class="v">${n ? "yes" : "none"}</span>
      <span class="lbl">updated</span><span class="v">${ue(e.updatedAt)}</span>
    </div>
    <div class="actions">
      <button class="primary" data-edit="${At(e.name)}">\u2922 ${n ? "Edit override" : "Override value"}</button>
      ${n ? `<button data-clear="${At(e.name)}">\u21BA Reset</button>` : ""}
    </div>`;
    return `
    <div class="dtf-row${r ? " expanded" : ""}" data-row="${At(e.name)}">
      <div class="ic"><span style="color:var(--accent)">${C.sliders}</span></div>
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
  async function Mr(e, t, r, n) {
    e.innerHTML = Se();
    let o;
    try {
      o = await t.configs();
    } catch (s) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load configs: ${$(String(s))}</div>`;
      return;
    }
    if (o.length === 0) {
      let { html: s, wire: c } = ge({
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
        d = (s ? o.filter((l) => l.name.toLowerCase().includes(s)) : o).map(Co);
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
          let g = l.dataset.row;
          ((i = i === g ? null : g), a());
        });
      }),
        e.querySelectorAll("[data-edit]").forEach((l) => {
          l.addEventListener("click", (f) => {
            f.stopPropagation();
            let p = l.getAttribute("data-edit"),
              g = d.find((h) => h.name === p);
            Io(e, g, () => a());
          });
        }),
        e.querySelectorAll("[data-clear]").forEach((l) => {
          l.addEventListener("click", (f) => {
            (f.stopPropagation(), kt(l.getAttribute("data-clear"), null));
          });
        }),
        Ie(e, Object.fromEntries(d.map((l) => ["c:" + l.name, () => l.name]))));
    }
    a();
  }
  function _r(e) {
    return e == null || typeof e != "object" ? e : JSON.parse(JSON.stringify(e));
  }
  function Oo(e, t) {
    try {
      let n = new lt(t, "2020-12", !1).validate(e ?? {});
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
  function Io(e, t, r) {
    let n = t.override !== void 0 ? t.override : t.real,
      o = n !== null && typeof n == "object" && !Array.isArray(n) ? n : {},
      i = _r(o);
    function a() {
      (document.removeEventListener("keydown", s), r());
    }
    function s(f) {
      (f.key === "Escape" && a(), f.key === "Enter" && (f.metaKey || f.ctrlKey) && c());
    }
    function c() {
      let f = Oo(i, t.schema);
      if (f) {
        d(f);
        return;
      }
      (kt(t.name, i), a());
    }
    function d(f) {
      let p = e.querySelector("[data-error]");
      p && (p.textContent = f ?? "");
    }
    function l() {
      let f = !Sr(i, t.real);
      e.innerHTML = `
      <div class="dtf-inline-form">
        <div class="hd">
          <button class="back" data-action="close" title="Back (Esc)">${C.arrowLeft} Back</button>
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
      (Er(p, t.schema, i, (g) => {
        ((i = g), d(null));
        let h = !Sr(i, t.real),
          w = e.querySelector('[data-action="reset"]');
        w && ((w.disabled = !h), (w.style.opacity = h ? "" : ".4"));
      }),
        e.querySelector('[data-action="close"]').addEventListener("click", a),
        e.querySelector('[data-action="cancel"]').addEventListener("click", a),
        e.querySelector('[data-action="save"]').addEventListener("click", c),
        e.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
          let g =
            t.real !== null && typeof t.real == "object" && !Array.isArray(t.real) ? t.real : {};
          ((i = _r(g)), l());
        }));
    }
    (document.addEventListener("keydown", s), l());
  }
  function At(e) {
    return $(e);
  }
  var ut = qn(Fr(), 1);
  var qe = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function ba(e) {
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
  var Le = "__se_label_target",
    Kt = "__se_label_target_style",
    Ft = !1,
    Nt = null,
    Be = null,
    Xr = null,
    Zr = [];
  function ha() {
    if (document.getElementById(Kt)) return;
    let e = document.createElement("style");
    ((e.id = Kt),
      (e.textContent = `
    .${Le} {
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
    .${Le}:hover,
    .${Le}.__se_label_active {
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
  function Wr() {
    document.getElementById(Kt)?.remove();
  }
  function Ye(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      r = [],
      n = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let a = o.nodeValue ?? "";
      if (
        !a.includes(ut.LABEL_MARKER_START) ||
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
          g = document.createElement("span");
        (g.setAttribute("data-label", l), f && g.setAttribute("data-variables", f));
        let h = Me(l),
          w = null;
        if (f)
          try {
            w = JSON.parse(f);
          } catch {
            w = null;
          }
        ((g.textContent = h !== null ? gt(h, w) : p),
          s.appendChild(g),
          (c = d.index + d[0].length));
      }
      (c < a.length && s.appendChild(document.createTextNode(a.slice(c))), r.push([o, s]));
    }
    for (let [a, s] of r) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        c = a.getAttribute("data-label"),
        d = Me(c);
      if (s.includes(ut.LABEL_MARKER_START)) {
        qe.lastIndex = 0;
        let l = qe.exec(s);
        if (l) {
          l[2] && a.setAttribute("data-variables", l[2]);
          let f = l[2] ? xa(l[2]) : null;
          a.textContent = d !== null ? gt(d, f) : l[3];
        }
      } else if (i)
        try {
          let l = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            f = i(c, l);
          d !== null ? (a.textContent = gt(d, l ?? null)) : f && f !== c && (a.textContent = f);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = Wt(a),
        c = new Map();
      for (let l of s) c.set(l.attr, l);
      let d = !1;
      for (let l of Array.from(a.attributes)) {
        let f = l.value;
        if (!f.includes(ut.LABEL_MARKER_START)) continue;
        qe.lastIndex = 0;
        let p = qe.exec(f);
        if (!p) continue;
        let g = p[1],
          h = p[3],
          w = Me(g);
        (a.setAttribute(l.name, w ?? h),
          c.set(l.name, { attr: l.name, key: g, original: h }),
          (d = !0));
      }
      d && en(a, Array.from(c.values()));
    }
    return r.length;
  }
  function Gr(e) {
    let t = [],
      r = /\{\{(\w+)\}\}/g,
      n;
    for (; (n = r.exec(e)) !== null; ) t.push(n[1]);
    return t;
  }
  function gt(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (r, n) => {
          let o = t[n];
          return o != null ? String(o) : `{{${n}}}`;
        })
      : e;
  }
  function xa(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  var Jr = "se-popper-host";
  function ya() {
    let e = document.getElementById(Jr);
    if (e?.shadowRoot) return e.shadowRoot;
    e || ((e = document.createElement("div")), (e.id = Jr), document.body.appendChild(e));
    let t = e.attachShadow({ mode: "open" }),
      r = document.createElement("style");
    return ((r.textContent = tt), t.appendChild(r), t);
  }
  function Qr(e) {
    let r = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof r == "string" ? r : null;
  }
  function Wt(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let r = JSON.parse(t);
      if (Array.isArray(r)) return r;
    } catch {}
    return [];
  }
  function en(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var wa = "[data-label], [data-label-attrs]";
  function ft() {
    return Array.from(document.querySelectorAll(wa));
  }
  function _e() {
    (Be?.remove(),
      (Be = null),
      document.querySelectorAll(`.${Le}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function tn(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let r = Wt(e.target),
        n = r.findIndex((o) => o.attr === e.attr);
      n >= 0 && ((r[n] = { ...r[n], original: t }), en(e.target, r));
    }
  }
  async function ka(e, t, r) {
    let n = r.querySelector(".lp-err"),
      o = r.querySelector('[data-action="save"]'),
      i = Me(e.key),
      a = Qr(e.key),
      s = Gr(i ?? a ?? ""),
      c = Gr(t),
      d = s.filter((v) => !c.includes(v)),
      l = c.filter((v) => !s.includes(v));
    if (d.length || l.length) {
      if (n) {
        let v = [];
        (d.length && v.push(`missing {{${d.join("}}, {{")}}}`),
          l.length && v.push(`unknown {{${l.join("}}, {{")}}}`),
          (n.textContent = `Placeholders must match exactly \u2014 ${v.join("; ")}.`));
      }
      return;
    }
    let f = e.variables ?? {},
      p = gt(t, f);
    (tn(e, p),
      Fe(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let g = lr(),
      h = He(),
      w = Xr;
    if (!w || (!g && !h)) {
      _e();
      return;
    }
    ((o.disabled = !0), (o.textContent = "Saving\u2026"), n && (n.textContent = ""));
    try {
      if (g) await w.upsertDraftKey(g, e.key, t);
      else if (h) {
        let v = Zr.find((_) => _.key === e.key && _.profileId === h);
        v && (await w.updateKeyById(v.id, t));
      }
      _e();
    } catch (v) {
      ((o.disabled = !1),
        (o.textContent = "Save"),
        n && (n.textContent = v instanceof Error ? v.message : String(v)));
    }
  }
  function $a(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function Ea(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: $a(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    )
      for (let r of Wt(e)) t.push({ kind: "attr", key: r.key, target: e, attr: r.attr });
    return t;
  }
  function Vr(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function Sa(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let r = e.key.split(".").pop() || e.key;
    return t.filter((o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === r).length > 1
      ? e.key
      : r;
  }
  function La(e, t) {
    (_e(), e.classList.add("__se_label_active"));
    let r = Ea(e);
    if (r.length === 0) return;
    let o = He() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let c = `<div class="lp-tabs">${r
      .map((R, O) => {
        let J = Sa(R, r),
          ae = O === 0 ? "lp-tab active" : "lp-tab",
          m = R.kind === "attr" ? `@<span class="lp-tab-attr">${Q(R.attr ?? "")}</span>` : Q(J);
        return `<button class="${ae}" data-surface-idx="${O}">${m}</button>`;
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
      ya().appendChild(s));
    let l = s.querySelector(".lp-key"),
      f = s.querySelector(".lp-body"),
      p = s.querySelector(".lp-err"),
      g = s.querySelector('[data-action="save"]'),
      h = s.querySelector('[data-action="reset"]');
    function w() {
      return r[a];
    }
    function v() {
      let R = w();
      (i.has(a) || i.set(a, Vr(R)), (l.textContent = R.key));
      let O = Qr(R.key),
        ae = Me(R.key) ?? O ?? Vr(R),
        m = R.variables ?? {},
        L = Object.entries(m),
        U = L.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${L.map(([le, ye]) => `<div class="lp-var"><span class="lp-var-k mono">${Q(`{{${le}}}`)}</span><span class="lp-var-v">${Q(String(ye))}</span></div>`).join("")}</div>
        </div>`
          : "",
        V = R.desc ?? "",
        ce = R.kind === "attr" ? `attribute \xB7 ${Q(R.attr ?? "")}` : "text content";
      ((f.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${Q(ae)}</textarea>
      </div>
      ${U}
      <div class="lp-field">
        <label>Current profile</label>
        <span>${Q(o)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${ce}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${V ? "" : "empty"}">${V ? Q(V) : "No description"}</span>
      </div>`),
        (p.textContent = ""),
        (g.disabled = !1),
        (g.textContent = "Save"));
      let ve = f.querySelector(".lp-input");
      (ve.focus(), ve.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((R) => {
      R.addEventListener("click", () => {
        let O = Number(R.dataset.surfaceIdx);
        O !== a &&
          ((a = O),
          s.querySelectorAll(".lp-tab").forEach((J, ae) => {
            J.classList.toggle("active", ae === a);
          }),
          v());
      });
    }),
      v());
    let _ = e.getBoundingClientRect(),
      k = s.offsetHeight,
      T = s.offsetWidth,
      b = 8,
      E = _.bottom + b;
    E + k > window.innerHeight - 8 && (E = Math.max(8, _.top - k - b));
    let y = _.left;
    (y + T > window.innerWidth - 8 && (y = Math.max(8, window.innerWidth - T - 8)),
      (s.style.top = `${E}px`),
      (s.style.left = `${y}px`),
      s.querySelector(".lp-close").addEventListener("click", _e),
      g.addEventListener("click", () => {
        let R = f.querySelector(".lp-input");
        ka(w(), R.value, s);
      }),
      h.addEventListener("click", () => {
        let R = w(),
          O = i.get(a) ?? "";
        (tn(R, O),
          Fe(R.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: R.key, value: null } }),
          ),
          _e());
      }),
      s.addEventListener("click", (R) => R.stopPropagation()),
      s.addEventListener("mousedown", (R) => R.stopPropagation()),
      (Be = s));
  }
  function Xe(e, t, r) {
    if (((Ft = e), Nt?.(), (Nt = null), !e)) {
      _e();
      for (let p of ft()) p.classList.remove(Le);
      Wr();
      return;
    }
    ha();
    for (let p of ft()) p.classList.add(Le);
    function n(p) {
      return Be !== null && p.composedPath().includes(Be);
    }
    function o(p) {
      for (let g of p.composedPath())
        if (
          g instanceof HTMLElement &&
          (g.hasAttribute("data-label") || g.hasAttribute("data-label-attrs"))
        )
          return g;
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
      let g = o(p);
      g &&
        (a(p) || (p.preventDefault(), p.stopPropagation(), p.stopImmediatePropagation(), La(g, t)));
    }
    function d(p) {
      Be && (n(p) || o(p) || _e());
    }
    function l(p) {
      p.key === "Escape" && _e();
    }
    let f = new MutationObserver(() => {
      if (Ft) {
        for (let p of ft()) p.classList.add(Le);
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
      (Nt = () => {
        for (let p of i) document.removeEventListener(p, s, !0);
        (document.removeEventListener("click", c, !0),
          document.removeEventListener("mousedown", d, !0),
          document.removeEventListener("keydown", l),
          f.disconnect());
        for (let p of ft()) p.classList.remove(Le);
        Wr();
      }));
  }
  function _a(e) {
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
  function rn(e) {
    let t = e.leaves.length;
    for (let r of e.children.values()) t += rn(r);
    return t;
  }
  function Ta(e, t) {
    let r = t.split("-")[0].toLowerCase();
    return (
      e.find((n) => n.name.toLowerCase().startsWith(`${r}:`)) ??
      e.find((n) => n.name.toLowerCase().startsWith(`${r}-`)) ??
      e.find((n) => n.name.toLowerCase() === r) ??
      null
    );
  }
  function Ma(e) {
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
  async function nn(e, t, r, n, o) {
    ((e.innerHTML = '<div class="dtf-load"><div class="topstrip"></div></div>'), (Xr = t));
    let i, a, s;
    try {
      [i, a] = await Promise.all([t.profiles(), t.drafts()]);
      let T = He() ?? Ta(i, o.locale)?.id ?? ba(i);
      s = await t.keys(T ?? void 0);
    } catch (k) {
      e.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed to load labels: ${Q(String(k))}</div>`;
      return;
    }
    if (((Zr = s), s.length === 0)) {
      e.innerHTML = `
      <div class="dtf-empty">
        <div class="vis"><div class="ring r2"></div><div class="ring"></div><div class="core">A</div></div>
        <h3>No <em>translation keys</em> yet</h3>
        <p>Add keys in the admin and group them by namespace (e.g. checkout.title).</p>
      </div>`;
      return;
    }
    let c = e.getRootNode().querySelector("select[data-locale]"),
      d = Ma(i);
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
      p = _a(f),
      g = new Map(),
      h = null;
    function w() {
      let k = f.length;
      ((e.innerHTML =
        `<div class="dtf-group">All keys
        <span class="cov-mini" title="${Q(o.locale)} coverage">${k}/${s.length}</span>
        <span class="pulse"><span class="d"></span>${k} ${r.view === "page" ? "rendered" : "total"}</span>
      </div>` + v(p, 0)),
        e.querySelectorAll(".dtf-tree-node[data-tree]").forEach((T) => {
          T.addEventListener("click", () => {
            let b = T.dataset.tree;
            (g.set(b, !(g.get(b) ?? !0)), w());
          });
        }),
        e.querySelectorAll(".dtf-lbl-row[data-key]").forEach((T) => {
          T.addEventListener("click", (b) => {
            if (
              b.target.closest(".dtf-copy") ||
              b.target.closest("textarea") ||
              b.target.closest("button")
            )
              return;
            let E = T.dataset.key;
            ((h = h === E ? null : E), w());
          });
        }),
        e.querySelectorAll("input[data-edit-key]").forEach((T) => {
          (T.addEventListener("input", () => {
            let E = T.closest(".dtf-detail")?.querySelector("button[data-save-key]");
            if (!E) return;
            let y = f.find((O) => O.key === T.dataset.editKey)?.value ?? "",
              R = T.value !== y;
            ((E.disabled = !R), E.classList.toggle("dirty", R));
          }),
            T.addEventListener("keydown", (b) => {
              if (b.key !== "Enter") return;
              (b.preventDefault(),
                T.closest(".dtf-detail")?.querySelector("button[data-save-key]")?.click());
            }));
        }),
        e.querySelectorAll("button[data-save-key]").forEach((T) => {
          T.addEventListener("click", (b) => {
            b.stopPropagation();
            let E = T.dataset.saveKey,
              y = T.closest(".dtf-detail")?.querySelector("input[data-edit-key]");
            if (!y) return;
            let R = f.find((J) => J.key === E)?.value ?? "";
            (y.value === R ? Fe(E, null) : Fe(E, y.value), T.classList.add("done"));
            let O = T.textContent;
            ((T.textContent = "Saved \u2713"),
              (T.disabled = !0),
              T.classList.remove("dirty"),
              setTimeout(() => {
                (T.classList.remove("done"), (T.textContent = O));
              }, 1100));
          });
        }));
    }
    function v(k, T) {
      let b = "",
        E = Array.from(k.children.values()).sort((y, R) => y.name.localeCompare(R.name));
      for (let y of E) {
        let R = g.get(y.path) ?? !0,
          O = rn(y);
        if (
          ((b += `
        <div class="dtf-tree-node" style="padding-left:${12 + T * 14}px" data-tree="${Q(y.path)}">
          <span class="caret">${R ? "\u25BE" : "\u25B8"}</span>
          <span class="seg">${Q(y.name)}</span>
          <span class="dotpath">${Q(y.path)}</span>
          <span class="counts"><span class="t">${O}</span></span>
        </div>`),
          R)
        ) {
          b += v(y, T + 1);
          for (let J of y.leaves) b += _(J, T + 1);
        }
      }
      if (T === 0) for (let y of k.leaves) b += _(y, 0);
      return b;
    }
    function _(k, T) {
      let b = h === k.key,
        E = Me(k.key),
        y = E ?? k.value,
        R = !y,
        O = k.key.split(".").pop() ?? k.key,
        J = R ? "missing" : E !== null ? "edited" : "ok",
        ae = R ? "\u2298" : E !== null ? "\u270E" : "\u25CF";
      return `
      <div class="dtf-lbl-row${b ? " expanded" : ""}${R ? " missing" : ""}" style="padding-left:${12 + T * 14}px" data-key="${Q(k.key)}" title="${Q(k.key)}">
        <span class="lbl-pill ${J}" title="${J}">${ae}</span>
        <div class="meta">
          <div class="src">
            ${Q(O)}
            <button class="dtf-copy" data-copy-leaf="${Q(k.key)}" title="Copy value">${Yr}</button>
          </div>
          <div class="sub">
            <span class="k" title="${Q(y)}">${R ? '<em style="color:var(--warn)">\u2014 not translated \u2014</em>' : Q(y)}</span>
          </div>
        </div>
        <span style="width:5px"></span>
      </div>
      <div class="dtf-detail${b ? " open" : ""}">
        <div class="inner"><div class="pad lbl-pad">
          <div class="lbl-edit-row">
            <span class="lbl-edit-loc">${Q(o.locale)}</span>
            <input type="text" class="lbl-edit-input" data-edit-key="${Q(k.key)}"
              value="${Q(y)}"
              placeholder="Translate to ${Q(o.locale)}\u2026" />
            <button class="lbl-edit-save" data-save-key="${Q(k.key)}" disabled>Save</button>
          </div>
          <div class="actions">
            ${t.hideAdminLinks ? "" : `<a target="_blank" rel="noopener" href="${t.adminUrl}/dashboard/i18n/keys">\u2197 Open in dashboard</a>`}
          </div>
        </div></div>
      </div>`;
    }
    (w(),
      e.querySelectorAll("[data-copy-leaf]").forEach((k) => {
        k.addEventListener("click", async (T) => {
          T.stopPropagation();
          let b = k.getAttribute("data-copy-leaf"),
            E = f.find((y) => y.key === b)?.value ?? "";
          try {
            await navigator.clipboard.writeText(E);
          } catch {}
          (k.classList.add("done"),
            (k.innerHTML = Ra),
            setTimeout(() => {
              (k.classList.remove("done"), (k.innerHTML = Yr));
            }, 900));
        });
      }),
      Ee() && (Ye(), Ft || Xe(!0, n, () => w())));
  }
  var Yr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    Ra =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function on(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function an(e) {
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
      r = on(e);
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
  async function sn(e, t) {
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
      n = on(e);
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
  var ln = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function dn(e) {
    let t = URL.createObjectURL(e),
      r = await new Promise((m, L) => {
        let U = new Image();
        ((U.onload = () => m(U)),
          (U.onerror = () => L(new Error("Failed to load screenshot for annotation."))),
          (U.src = t));
      }),
      n = document.createElement("div");
    n.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), n.appendChild(o));
    let i = "pen",
      a = ln[0],
      s = [];
    function c(m) {
      ((i = m),
        o
          .querySelectorAll("[data-tool]")
          .forEach((L) => L.classList.toggle("on", L.dataset.tool === m)));
    }
    function d(m, L, U) {
      let V = document.createElement("button");
      return (
        (V.type = "button"),
        (V.className = "se-annot-btn"),
        (V.dataset.tool = m),
        (V.textContent = L),
        (V.title = U),
        V.addEventListener("click", () => c(m)),
        V
      );
    }
    (o.appendChild(d("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(d("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(d("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(d("text", "T text", "Text (T)")),
      c("pen"));
    let l = document.createElement("span");
    ((l.className = "se-annot-sep"), o.appendChild(l));
    for (let m of ln) {
      let L = document.createElement("button");
      ((L.type = "button"),
        (L.className = "se-annot-swatch"),
        (L.dataset.color = m),
        (L.style.background = m),
        m === a && L.classList.add("on"),
        L.addEventListener("click", () => {
          ((a = m),
            o
              .querySelectorAll("[data-color]")
              .forEach((U) => U.classList.toggle("on", U.dataset.color === m)));
        }),
        o.appendChild(L));
    }
    let f = document.createElement("button");
    ((f.type = "button"),
      (f.className = "se-annot-btn"),
      (f.textContent = "\u21B6 undo"),
      (f.title = "Undo (Ctrl/Cmd+Z)"),
      f.addEventListener("click", () => {
        (s.pop(), E());
      }),
      o.appendChild(f));
    let p = document.createElement("button");
    ((p.type = "button"),
      (p.className = "se-annot-btn"),
      (p.textContent = "clear"),
      p.addEventListener("click", () => {
        ((s.length = 0), E());
      }),
      o.appendChild(p));
    let g = document.createElement("div");
    ((g.className = "se-annot-stage"), n.appendChild(g));
    let h = document.createElement("canvas");
    ((h.width = r.naturalWidth),
      (h.height = r.naturalHeight),
      (h.className = "se-annot-canvas"),
      (h.style.cursor = "crosshair"),
      (h.style.touchAction = "none"),
      g.appendChild(h));
    let w = h.getContext("2d"),
      v = null;
    function _(m) {
      let L = h.getBoundingClientRect(),
        U = h.width / L.width,
        V = h.height / L.height;
      return { x: (m.clientX - L.left) * U, y: (m.clientY - L.top) * V };
    }
    function k() {
      return Math.max(2, Math.round(r.naturalWidth / 400));
    }
    function T() {
      return Math.max(14, Math.round(r.naturalWidth / 60));
    }
    function b(m) {
      if (
        (w.save(),
        (w.strokeStyle = m.color),
        (w.fillStyle = m.color),
        (w.lineWidth = k()),
        (w.lineCap = "round"),
        (w.lineJoin = "round"),
        m.tool === "rect")
      ) {
        let L = Math.min(m.x1, m.x2),
          U = Math.min(m.y1, m.y2),
          V = Math.abs(m.x2 - m.x1),
          ce = Math.abs(m.y2 - m.y1);
        w.strokeRect(L, U, V, ce);
      } else if (m.tool === "arrow") {
        (w.beginPath(), w.moveTo(m.x1, m.y1), w.lineTo(m.x2, m.y2), w.stroke());
        let L = Math.atan2(m.y2 - m.y1, m.x2 - m.x1),
          U = k() * 5;
        (w.beginPath(),
          w.moveTo(m.x2, m.y2),
          w.lineTo(m.x2 - U * Math.cos(L - Math.PI / 6), m.y2 - U * Math.sin(L - Math.PI / 6)),
          w.lineTo(m.x2 - U * Math.cos(L + Math.PI / 6), m.y2 - U * Math.sin(L + Math.PI / 6)),
          w.closePath(),
          w.fill());
      } else if (m.tool === "pen")
        if (m.points.length < 2) {
          if (m.points.length === 1) {
            let L = m.points[0];
            (w.beginPath(), w.arc(L.x, L.y, k() / 2, 0, Math.PI * 2), w.fill());
          }
        } else {
          (w.beginPath(), w.moveTo(m.points[0].x, m.points[0].y));
          for (let L = 1; L < m.points.length; L++) w.lineTo(m.points[L].x, m.points[L].y);
          w.stroke();
        }
      else if (m.tool === "text" && m.text) {
        let L = T();
        ((w.font = `600 ${L}px ui-sans-serif, system-ui, sans-serif`), (w.textBaseline = "top"));
        let U = L * 0.3,
          ce = w.measureText(m.text).width + U * 2,
          ve = L + U * 2;
        ((w.fillStyle = "rgba(0,0,0,0.55)"),
          w.fillRect(m.x1, m.y1, ce, ve),
          (w.fillStyle = m.color),
          w.fillText(m.text, m.x1 + U, m.y1 + U));
      }
      w.restore();
    }
    function E(m) {
      (w.clearRect(0, 0, h.width, h.height), w.drawImage(r, 0, 0));
      for (let L of s) b(L);
      m && b(m);
    }
    E();
    let y = null;
    function R(m, L) {
      y && y.blur();
      let U = h.getBoundingClientRect(),
        V = g.getBoundingClientRect(),
        ce = U.width / h.width,
        ve = U.height / h.height,
        le = T() * ce,
        ye = le * 0.3,
        Y = document.createElement("input");
      ((Y.type = "text"),
        (Y.className = "se-annot-text-input"),
        (Y.style.position = "absolute"),
        (Y.style.left = `${U.left - V.left + m * ce}px`),
        (Y.style.top = `${U.top - V.top + L * ve}px`),
        (Y.style.color = a),
        (Y.style.background = "rgba(0,0,0,0.55)"),
        (Y.style.border = `1px dashed ${a}`),
        (Y.style.outline = "none"),
        (Y.style.padding = `${ye}px`),
        (Y.style.font = `600 ${le}px ui-sans-serif, system-ui, sans-serif`),
        (Y.style.minWidth = `${le * 4}px`),
        (Y.style.lineHeight = "1"),
        (Y.placeholder = "type\u2026"));
      let he = !1;
      function be() {
        if (he) return;
        he = !0;
        let pe = Y.value.trim();
        (Y.remove(),
          (y = null),
          pe && (s.push({ tool: "text", color: a, x1: m, y1: L, text: pe }), E()));
      }
      function Pe() {
        he || ((he = !0), Y.remove(), (y = null));
      }
      (Y.addEventListener("keydown", (pe) => {
        (pe.key === "Enter"
          ? (pe.preventDefault(), be())
          : pe.key === "Escape" && (pe.preventDefault(), Pe()),
          pe.stopPropagation());
      }),
        Y.addEventListener("blur", be),
        g.appendChild(Y),
        (y = Y),
        setTimeout(() => Y.focus(), 0));
    }
    let O = null;
    (h.addEventListener("pointermove", (m) => {
      ((v = _(m)),
        O &&
          (O.kind === "pen"
            ? (O.shape.points.push(v), E())
            : E({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: O.x1,
                y1: O.y1,
                x2: v.x,
                y2: v.y,
              })));
    }),
      h.addEventListener("pointerdown", (m) => {
        m.preventDefault();
        let L = _(m);
        if (((v = L), i === "text")) {
          R(L.x, L.y);
          return;
        }
        if (i === "pen") {
          let U = { tool: "pen", color: a, points: [L] };
          (s.push(U), (O = { kind: "pen", shape: U }), h.setPointerCapture(m.pointerId), E());
          return;
        }
        ((O = { kind: "shape", x1: L.x, y1: L.y }), h.setPointerCapture(m.pointerId));
      }),
      h.addEventListener("pointerup", (m) => {
        if (!O) return;
        let L = _(m);
        if (O.kind === "shape") {
          let U = Math.abs(L.x - O.x1),
            V = Math.abs(L.y - O.y1);
          (U > 4 || V > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: O.x1, y1: O.y1, x2: L.x, y2: L.y });
        }
        ((O = null), E());
      }));
    function J(m) {
      if (!(m instanceof HTMLElement)) return !1;
      let L = m.tagName;
      return L === "INPUT" || L === "TEXTAREA" || m.isContentEditable;
    }
    function ae(m) {
      if (!n.isConnected) {
        document.removeEventListener("keydown", ae, !0);
        return;
      }
      if (J(m.target)) return;
      let L = m.key.toLowerCase();
      if ((m.ctrlKey || m.metaKey) && L === "z") {
        (m.preventDefault(), s.pop(), E());
        return;
      }
      if (!(m.ctrlKey || m.metaKey || m.altKey))
        if (L === "t") {
          (m.preventDefault(), c("text"));
          let U = v ?? { x: h.width / 2, y: h.height / 2 };
          R(U.x, U.y);
        } else L === "p" ? c("pen") : L === "a" ? c("arrow") : L === "r" && c("rect");
    }
    return (
      document.addEventListener("keydown", ae, !0),
      {
        root: n,
        async export() {
          (y && y.blur(), await new Promise((L) => requestAnimationFrame(() => L(null))));
          let m = await new Promise((L, U) => {
            h.toBlob((V) => (V ? L(V) : U(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", ae, !0), m);
        },
      }
    );
  }
  var Aa = {
      open: "badge-run",
      triaged: "badge-run",
      in_progress: "badge-run",
      resolved: "badge-on",
      wont_fix: "badge-off",
    },
    Pa = {
      open: "badge-run",
      considering: "badge-run",
      planned: "badge-draft",
      shipped: "badge-on",
      declined: "badge-off",
    },
    Ha = { critical: "badge-warn", important: "badge-run", nice_to_have: "badge-draft" };
  function Gt(e, t) {
    return `<span class="badge ${t}">${$(e.replace(/_/g, " "))}</span>`;
  }
  async function fn(e, t, r, n) {
    let o = e.getRootNode(),
      i = null,
      a = new Map(),
      s = new Map();
    function c(v) {
      let _ = a.get(v);
      return (_ || ((_ = t.bug(v)), a.set(v, _)), _);
    }
    function d(v) {
      let _ = a.get(v);
      return (_ || ((_ = t.featureRequest(v)), a.set(v, _)), _);
    }
    function l(v) {
      let _ = s.get(v);
      return (_ || ((_ = t.attachmentBlob(v).then((k) => URL.createObjectURL(k))), s.set(v, _)), _);
    }
    n.pendingForm && ((i = n.pendingForm), n.consumePendingForm?.());
    async function f() {
      if (i === "bug") {
        za(e, t, r, o, () => {
          ((i = null), f());
        });
        return;
      }
      if (i === "feature") {
        Ba(e, t, () => {
          ((i = null), f());
        });
        return;
      }
      await p();
    }
    async function p() {
      ((e.innerHTML = `
      <div class="se-fb-subtabs">
        <button class="${n.sub === "bugs" ? "active" : ""}" data-sub="bugs">${C.bug} Bugs <span class="c">\u2026</span></button>
        <button class="${n.sub === "features" ? "active" : ""}" data-sub="features">${C.sparkles} Feature requests <span class="c">\u2026</span></button>
      </div>
      <div class="se-feedback-head">
        <button class="ibtn pri" data-action="file">+ ${n.sub === "bugs" ? "File a bug" : "Request a feature"}</button>
        <span class="grow"></span>
        ${t.hideAdminLinks ? "" : `<a class="ibtn" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/${n.sub === "bugs" ? "bugs" : "feature-requests"}">${C.external} Open dashboard</a>`}
      </div>
      <div class="se-feedback-list" data-list></div>`),
        e.querySelectorAll("[data-sub]").forEach((_) => {
          _.addEventListener("click", () => n.setSub(_.dataset.sub));
        }),
        e.querySelector('[data-action="file"]').addEventListener("click", () => {
          ((i = n.sub === "bugs" ? "bug" : "feature"), f());
        }));
      let v = e.querySelector("[data-list]");
      if (((v.innerHTML = Se()), n.sub === "bugs")) {
        let _;
        try {
          _ = await t.bugs();
        } catch (b) {
          v.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(b))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="bugs"] .c');
        k.textContent = String(_.length);
        let T = e.querySelector('[data-sub="features"] .c');
        try {
          let b = await t.featureRequests();
          T.textContent = String(b.length);
        } catch {
          T.textContent = "?";
        }
        g(v, _);
      } else {
        let _;
        try {
          _ = await t.featureRequests();
        } catch (b) {
          v.innerHTML = `<div class="se-empty" style="color:var(--danger)">Failed: ${$(String(b))}</div>`;
          return;
        }
        let k = e.querySelector('[data-sub="features"] .c');
        k.textContent = String(_.length);
        let T = e.querySelector('[data-sub="bugs"] .c');
        try {
          let b = await t.bugs();
          T.textContent = String(b.length);
        } catch {
          T.textContent = "?";
        }
        h(v, _);
      }
    }
    function g(v, _) {
      if (_.length === 0) {
        let { html: b, wire: E } = ge({
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
        ((v.innerHTML = b), E(v));
        return;
      }
      let k = new Set(),
        T = () => {
          ((v.innerHTML = _.map(
            (b) => `
          <div class="se-feedback-row${k.has(b.id) ? " expanded" : ""}" data-id="${$(b.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(b.title)}</div>
              <div class="row-sub">${$(ue(b.createdAt))}${b.reporterEmail ? " \xB7 " + $(b.reporterEmail) : ""}</div>
            </div>
            ${Gt(b.status, Aa[b.status])}
          </div>
          <div class="se-feedback-detail${k.has(b.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">page</span><span>${$(b.pageUrl ?? "\u2014")}</span>
                <span class="k">filed</span><span>${$(ue(b.createdAt))}${b.reporterEmail ? " \xB7 " + $(b.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(b.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/bugs/${$(b.id)}">${C.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            v.querySelectorAll("[data-id]").forEach((b) => {
              b.addEventListener("click", () => {
                let E = b.dataset.id;
                (k.has(E) ? k.delete(E) : k.add(E), T());
              });
            }));
          for (let b of k) {
            let E = v.querySelector(`[data-attach-slot="${b}"]`);
            E && w(E, c(b));
          }
        };
      T();
    }
    function h(v, _) {
      if (_.length === 0) {
        let { html: b, wire: E } = ge({
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
        ((v.innerHTML = b), E(v));
        return;
      }
      let k = new Set(),
        T = () => {
          ((v.innerHTML = _.map(
            (b) => `
          <div class="se-feedback-row${k.has(b.id) ? " expanded" : ""}" data-id="${$(b.id)}">
            <span class="chev">\u25B8</span>
            <div class="grow">
              <div class="row-name">${$(b.title)}</div>
              <div class="row-sub">${$(ue(b.createdAt))}${b.reporterEmail ? " \xB7 " + $(b.reporterEmail) : ""}</div>
            </div>
            ${Gt(b.importance, Ha[b.importance])}
            ${Gt(b.status, Pa[b.status])}
          </div>
          <div class="se-feedback-detail${k.has(b.id) ? " open" : ""}">
            <div class="inner"><div class="pad">
              <div class="se-fb-meta">
                <span class="k">importance</span><span>${$(b.importance.replace(/_/g, " "))}</span>
                <span class="k">filed</span><span>${$(ue(b.createdAt))}${b.reporterEmail ? " \xB7 " + $(b.reporterEmail) : ""}</span>
              </div>
              <div class="se-attach-slot" data-attach-slot="${$(b.id)}"></div>
              <div class="se-fb-actions">
                ${t.hideAdminLinks ? "" : `<a class="ibtn pri" target="_blank" rel="noopener" href="${$(t.adminUrl)}/dashboard/feature-requests/${$(b.id)}">${C.external} Open in dashboard</a>`}
              </div>
            </div></div>
          </div>`,
          ).join("")),
            v.querySelectorAll("[data-id]").forEach((b) => {
              b.addEventListener("click", () => {
                let E = b.dataset.id;
                (k.has(E) ? k.delete(E) : k.add(E), T());
              });
            }));
          for (let b of k) {
            let E = v.querySelector(`[data-attach-slot="${b}"]`);
            E && w(E, d(b));
          }
        };
      T();
    }
    function w(v, _) {
      v.dataset.hydrated !== "1" &&
        ((v.dataset.hydrated = "1"),
        (v.innerHTML = '<div class="se-attach-slot-loading">Loading attachments\u2026</div>'),
        _.then((k) => {
          if (v.isConnected) {
            if (k.attachments.length === 0) {
              v.innerHTML = "";
              return;
            }
            ((v.innerHTML = `<div class="se-attach-grid">${k.attachments.map(Ca).join("")}</div>`),
              v.querySelectorAll("[data-thumb-fetch]").forEach((T) => {
                let b = T.dataset.thumbFetch;
                l(b)
                  .then((E) => {
                    T.isConnected &&
                      ((T.style.backgroundImage = `url('${E}')`), T.classList.add("has-image"));
                  })
                  .catch(() => {});
              }),
              v.querySelectorAll("[data-preview-id]").forEach((T) => {
                T.addEventListener("click", async (b) => {
                  b.stopPropagation();
                  let E = T.dataset.previewId,
                    y = k.attachments.find((R) => R.id === E);
                  if (y)
                    try {
                      let R = await l(E);
                      gn(r, { kind: y.kind, filename: y.filename, url: R, sizeBytes: y.sizeBytes });
                    } catch (R) {
                      console.error(R);
                    }
                });
              }));
          }
        }).catch((k) => {
          v.isConnected &&
            (v.innerHTML = `<div class="se-attach-slot-loading err">Failed: ${$(String(k))}</div>`);
        }));
    }
    await f();
  }
  function un(e, t) {
    e.innerHTML = `
    <div class="dtf-inline-form">
      <div class="hd">
        <button class="back" data-action="cancel">${C.arrowLeft} Back</button>
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
          (s.innerHTML = `${C.alert}<span>Discard your changes?</span><span style="flex:1"></span>
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
  function Ca(e) {
    let t = $(e.id),
      r = e.kind === "screenshot" || e.kind === "recording",
      n =
        e.kind === "screenshot"
          ? `<div class="preview screenshot" data-preview-id="${t}" data-thumb-fetch="${t}">
           <span class="scrim">click to preview</span>
         </div>`
          : e.kind === "recording"
            ? `<div class="preview recording" data-preview-id="${t}">
             <div class="play">${C.playFilled}</div>
             <span class="scrim">click to play</span>
           </div>`
            : `<div class="preview file">${C.file}<span class="ext">.${$(mn(e.filename))}</span></div>`,
      o = e.kind === "screenshot" ? C.camera : e.kind === "recording" ? C.record : C.file;
    return `
    <div class="se-attach-card readonly">
      ${n}
      <div class="meta">
        <span class="ic">${o}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(it(e.sizeBytes))}</span>
      </div>
    </div>`;
  }
  function Oa(e) {
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
             <div class="play">${C.playFilled}</div>
             ${e.duration ? `<span class="dur">${Ia(e.duration)}</span>` : ""}
             ${n ? '<span class="scrim">click to play</span>' : ""}
           </div>`
            : `<div class="preview file">${C.file}<span class="ext">.${$(mn(e.filename))}</span></div>`,
      i =
        e.progress != null && e.progress < 100
          ? `<div class="progress"><div class="fill" style="width:${e.progress}%"></div></div>`
          : "",
      a = e.kind === "screenshot" ? C.camera : e.kind === "recording" ? C.record : C.file;
    return `
    <div class="se-attach-card" data-attach="${$(e.id)}">
      ${o}
      ${i}
      <button class="rm" data-remove="${$(e.id)}" title="Remove">${C.x}</button>
      <div class="meta">
        <span class="ic">${a}</span>
        <span class="name" title="${$(e.filename)}">${$(e.filename)}</span>
        <span class="size">${$(it(e.blob.size))}</span>
      </div>
    </div>`;
  }
  function gn(e, t) {
    if (!t.url) return;
    let r = document.createElement("div");
    r.className = "dtf-lightbox";
    let n = t.kind === "recording";
    ((r.innerHTML = `
    <div class="frame">
      <button class="x" data-action="close" title="Close (Esc)">${C.x}</button>
      ${n ? `<video src="${t.url}" controls autoplay playsinline></video>` : `<img src="${t.url}" alt="${$(t.filename)}" />`}
      <div class="cap">
        <span>${$(t.filename)}</span>
        <span style="color:var(--fg-4)">\xB7</span>
        <span style="color:var(--fg-4)">${$(it(t.sizeBytes))}</span>
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
  function mn(e) {
    let t = e.lastIndexOf(".");
    return t > 0 ? e.slice(t + 1) : "file";
  }
  function Ia(e) {
    let t = Math.round(e / 1e3);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  }
  function za(e, t, r, n, o) {
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
          <button type="button" class="ibtn" data-action="screenshot">${C.camera} Screenshot</button>
          <button type="button" class="ibtn" data-action="record">${C.record} Record screen</button>
          <button type="button" class="ibtn" data-action="upload">${C.upload} Upload file</button>
          <input type="file" hidden data-action="file-input"/>
        </div>
        <div class="se-attach-grid" data-attach-grid></div>
        <div class="se-status" data-status></div>
      </div>
    </div>`,
      d = { title: "", steps: "", actual: "", expected: "", priority: "" },
      l = un(e, {
        title: "File a bug",
        bodyHtml: c,
        isDirty: () => !!(d.title || d.steps || d.actual || d.expected || i.length),
        onSubmit: E,
        onCancel: () => {
          (s(), o());
        },
      }),
      f = l.host,
      p = f.querySelector("[data-status]"),
      g = (y, R = !1) => {
        ((p.textContent = y), p.classList.toggle("err", R));
      },
      h = f.querySelector("[data-attach-grid]"),
      w = () => {
        ((h.innerHTML = i.map(Oa).join("")),
          h.querySelectorAll("[data-remove]").forEach((y) => {
            y.addEventListener("click", (R) => {
              R.stopPropagation();
              let O = i.findIndex((J) => J.id === y.dataset.remove);
              if (O >= 0) {
                let [J] = i.splice(O, 1);
                J.previewUrl && URL.revokeObjectURL(J.previewUrl);
              }
              w();
            });
          }),
          h.querySelectorAll("[data-preview]").forEach((y) => {
            y.addEventListener("click", (R) => {
              R.stopPropagation();
              let O = i.find((J) => J.id === y.dataset.preview);
              O &&
                O.previewUrl &&
                gn(r, {
                  kind: O.kind,
                  filename: O.filename,
                  url: O.previewUrl,
                  sizeBytes: O.blob.size,
                });
            });
          }));
      },
      v = (y) => {
        (!y.previewUrl &&
          (y.kind === "screenshot" || y.kind === "recording") &&
          (y.previewUrl = URL.createObjectURL(y.blob)),
          i.push(y),
          w());
      };
    (f.querySelectorAll("[data-field]").forEach((y) => {
      let R = () => {
        d[y.dataset.field] = y.value;
        let O = y.closest("[data-field-wrap]");
        O?.classList.contains("invalid") && y.value.trim() && O.classList.remove("invalid");
      };
      (y.addEventListener("input", R), y.addEventListener("change", R));
    }),
      f.querySelector('[data-action="screenshot"]').addEventListener("click", async () => {
        g("Pick a screen/tab to capture\u2026");
        try {
          let y = await an(n.host);
          (g(""),
            qa(r, n, y, (R) => {
              v({
                id: "at_" + Math.random().toString(36).slice(2, 7),
                kind: "screenshot",
                filename: `screenshot-${Date.now()}.png`,
                blob: R,
              });
            }));
        } catch (y) {
          g(y instanceof Error ? y.message : String(y), !0);
        }
      }));
    let _ = f.querySelector('[data-action="record"]'),
      k = !1;
    async function T() {
      if (!(!a || k)) {
        k = !0;
        try {
          ((_.disabled = !0), g("Finalizing recording\u2026"));
          let y = await a.stop();
          ((a = null),
            _.classList.remove("recording"),
            (_.innerHTML = `${C.record} Record screen`),
            v({
              id: "at_" + Math.random().toString(36).slice(2, 7),
              kind: "recording",
              filename: `recording-${Date.now()}.webm`,
              blob: y,
            }),
            g(""));
        } catch (y) {
          g(y instanceof Error ? y.message : String(y), !0);
        } finally {
          ((_.disabled = !1), (k = !1));
        }
      }
    }
    _.addEventListener("click", async () => {
      if (a) {
        await T();
        return;
      }
      g("Pick a screen/tab to record\u2026");
      try {
        ((a = await sn(n.host, () => {
          T();
        })),
          _.classList.add("recording"),
          (_.innerHTML = `${C.record} Stop recording`),
          g("Recording\u2026"));
      } catch (y) {
        (g(y instanceof Error ? y.message : String(y), !0), (a = null));
      }
    });
    let b = f.querySelector('[data-action="file-input"]');
    (f.querySelector('[data-action="upload"]').addEventListener("click", () => b.click()),
      b.addEventListener("change", () => {
        let y = b.files?.[0];
        if (!y) return;
        let R = y.type.startsWith("image/"),
          O = y.type.startsWith("video/");
        (v({
          id: "at_" + Math.random().toString(36).slice(2, 7),
          kind: R ? "screenshot" : O ? "recording" : "file",
          filename: y.name,
          blob: y,
        }),
          (b.value = ""));
      }));
    async function E() {
      let y = ["title", "steps"],
        R = null;
      for (let O of y) {
        let J = f.querySelector(`[data-field-wrap="${O}"]`),
          ae = f.querySelector(`[data-field="${O}"]`),
          m = !d[O].trim();
        (J?.classList.toggle("invalid", m), m && !R && (R = ae));
      }
      if (R) {
        (g(""),
          R.scrollIntoView({ block: "center", behavior: "smooth" }),
          R.focus({ preventScroll: !0 }));
        return;
      }
      g("Submitting\u2026");
      try {
        let O = await t.createBug({
          title: d.title.trim(),
          stepsToReproduce: d.steps,
          actualResult: d.actual,
          expectedResult: d.expected,
          priority: d.priority || void 0,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        });
        for (let J = 0; J < i.length; J++) {
          let ae = i[J];
          (g(`Uploading ${J + 1}/${i.length}\u2026`),
            await t.uploadAttachment({
              reportKind: "bug",
              reportId: O.id,
              kind: ae.kind,
              filename: ae.filename,
              blob: ae.blob,
            }));
        }
        (s(), l.close());
      } catch (O) {
        g(O instanceof Error ? O.message : String(O), !0);
      }
    }
  }
  function qa(e, t, r, n) {
    let o = document.createElement("div");
    ((o.className = "dtf-modal-bg annotate"),
      (o.innerHTML = `
    <div class="dtf-modal lg annot-modal">
      <div class="hd">
        <span class="k">Annotate screenshot</span>
        <button class="x" data-action="close">${C.x}</button>
      </div>
      <div class="bd annot-bd" data-host>Preparing annotator\u2026</div>
      <div class="ft">
        <span class="sp"></span>
        <button data-action="close">Cancel</button>
        <button class="primary" data-action="save">Use screenshot</button>
      </div>
    </div>`),
      cn(o, t),
      e.appendChild(o));
    let i = () => {
      (cn(o, t), pn(o));
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
    dn(r)
      .then((c) => {
        ((s.innerHTML = ""),
          s.appendChild(c.root),
          pn(o),
          o.querySelector('[data-action="save"]').addEventListener("click", async () => {
            let d = await c.export();
            (a(), n(d));
          }));
      })
      .catch((c) => {
        s.innerHTML = `<div class="err">${$(String(c))}</div>`;
      });
  }
  function cn(e, t) {
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
  function pn(e) {
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
  function Ba(e, t, r) {
    let n = { title: "", description: "", useCase: "", importance: "nice_to_have" },
      i = un(e, {
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
  var ja = 200,
    Ze = [];
  function Da(e, t) {
    (Ze.push({ ts: Date.now(), level: e, message: t }), Ze.length > ja && Ze.shift());
  }
  typeof window < "u" &&
    window.addEventListener("se:state:update", (e) => {
      let t = e.detail,
        r = "state update";
      if (t && typeof t == "object")
        try {
          r = JSON.stringify(t).slice(0, 200);
        } catch {}
      Da("log", r);
    });
  function Ua(e, t) {
    let r = e - t;
    return r < 1e3 ? `${r}ms` : r < 6e4 ? `${(r / 1e3).toFixed(1)}s` : `${Math.floor(r / 6e4)}m`;
  }
  function vn(e) {
    if (Ze.length === 0) {
      let { html: n, wire: o } = ge({
        title: "No <em>events</em> yet",
        message:
          "SDK evaluations and overrides will stream here as the page interacts with ShipEasy.",
      });
      ((e.innerHTML = n), o(e));
      return;
    }
    let t = Date.now(),
      r = Ze.slice().reverse();
    e.innerHTML =
      `<div class="dtf-group">Live event stream<span class="pulse"><span class="d"></span>${r.length}/buf</span></div>` +
      r
        .map(
          (n) => `
      <div class="dtf-event">
        <span class="ts">${Ua(t, n.ts)} ago</span>
        <span class="lvl${n.level === "warn" ? " warn" : n.level === "err" ? " err" : ""}">${n.level === "warn" ? "!" : n.level === "err" ? "\xD7" : "\u203A"}</span>
        <span class="msg">${$(n.message)}</span>
        <span class="ms"></span>
      </div>`,
        )
        .join("");
  }
  var bn = "sdk_client_6cecf6208cb443faa86b9ce6c007aee4",
    Na = "https://cdn.shipeasy.ai",
    hn = "__se_devtools_controls_anon";
  function Ka() {
    if (typeof window > "u") return "anon_devtools";
    try {
      let t = localStorage.getItem(hn);
      if (t) return t;
    } catch {}
    let e =
      typeof crypto < "u" && typeof crypto.randomUUID == "function"
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}`;
    try {
      localStorage.setItem(hn, e);
    } catch {}
    return e;
  }
  var Fa = { hideAdminLinks: !1 },
    Jt = { ...Fa },
    Qe = null,
    Vt = new Set();
  function xn() {
    return Jt;
  }
  function yn(e) {
    return (Vt.add(e), () => Vt.delete(e));
  }
  function wn() {
    return bn
      ? Qe ||
          ((Qe = (async () => {
            try {
              let e = await fetch(`${Na}/sdk/evaluate`, {
                method: "POST",
                headers: { "X-SDK-Key": bn, "Content-Type": "application/json" },
                body: JSON.stringify({ user: { anonymous_id: Ka() } }),
              });
              if (!e.ok) return;
              let n = { hideAdminLinks: !!((await e.json()).flags ?? {})[gr] },
                o = n.hideAdminLinks !== Jt.hideAdminLinks;
              if (((Jt = n), o)) for (let i of Vt) i();
            } catch {
            } finally {
              Qe = null;
            }
          })()),
          Qe)
      : Promise.resolve();
  }
  var Wa = {
      gates: "gates",
      configs: "configs",
      experiments: "experiments",
      labels: "translations",
      feedback: "feedback",
      user: "user",
      events: "events",
    },
    Ae = [
      { k: "user", label: "User", icon: C.users, description: "props \xB7 impersonate" },
      { k: "gates", label: "Gates", icon: C.shield, description: "flags & killswitches" },
      { k: "experiments", label: "Experiments", icon: C.flask, description: "A/B variants" },
      { k: "configs", label: "Configs", icon: C.sliders, description: "remote values" },
      { k: "labels", label: "Translations", icon: C.book, description: "i18n strings" },
      { k: "feedback", label: "Feedback", icon: C.bug, description: "bugs + requests" },
      { k: "events", label: "Events", icon: C.activity, description: "live stream" },
    ],
    Xt = "se_dt_project",
    Sn = "se_l_overlay",
    Zt = "se_l_active_panel",
    Ga = 24,
    Ja = 56,
    kn = { edge: "right", offsetPct: 50, railIconSize: 32, collapsed: !1 };
  function Va() {
    try {
      let e = sessionStorage.getItem(Xt);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function mt(e) {
    try {
      e === null ? sessionStorage.removeItem(Xt) : sessionStorage.setItem(Xt, JSON.stringify(e));
    } catch {}
  }
  function Ya() {
    try {
      let e = localStorage.getItem(Sn);
      if (e) return { ...kn, ...JSON.parse(e) };
    } catch {}
    return { ...kn };
  }
  function ke(e) {
    try {
      localStorage.setItem(Sn, JSON.stringify(e));
    } catch {}
  }
  var Xa = new Set(["user", "gates", "experiments", "configs", "labels", "feedback", "events"]);
  function $n() {
    try {
      let e = sessionStorage.getItem(Zt);
      if (e && Xa.has(e)) return e;
    } catch {}
    return null;
  }
  function Te(e) {
    try {
      e === null ? sessionStorage.removeItem(Zt) : sessionStorage.setItem(Zt, e);
    } catch {}
  }
  function Za() {
    if (typeof window > "u") return null;
    let e = window.__SE_BOOTSTRAP;
    return typeof e?.apiKey == "string" && e.apiKey ? e.apiKey : null;
  }
  function Qa(e, t) {
    return (
      e.translations === t.translations &&
      e.configs === t.configs &&
      e.gates === t.gates &&
      e.experiments === t.experiments &&
      e.feedback === t.feedback
    );
  }
  function En(e) {
    return !!(e.hideAdminLinks || xn().hideAdminLinks);
  }
  function Ln(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let r = t.attachShadow({ mode: "open" }),
      n = document.createElement("style");
    ((n.textContent = tt), r.appendChild(n));
    let o = document.createElement("div");
    r.appendChild(o);
    let i = Ya(),
      a = $n(),
      s = tr(),
      c = Va();
    c && s && c.id !== s.projectId && ((c = null), mt(null));
    let d = null;
    function l() {
      return s
        ? (!d || d.token !== s.token || d.projectId !== s.projectId
            ? (d = new at(e.adminUrl, s.token, s.projectId, En(e)))
            : (d.hideAdminLinks = En(e)),
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
      g = "bugs",
      h = null,
      w = { props: {}, dirty: {} },
      v = { user: 0, gates: 0, experiments: 0, configs: 0, labels: 0, feedback: 0, events: 0 };
    function _() {
      return Object.values(v).reduce((u, x) => u + x, 0);
    }
    function k(u) {
      let x = Wa[u];
      return x ? (c ? c.modules[x] : !s) : !0;
    }
    function T(u) {
      let x = window.innerWidth,
        N = window.innerHeight,
        { edge: K, offsetPct: G, collapsed: z } = i,
        A = u.style;
      if (((A.top = A.bottom = A.left = A.right = A.transform = ""), (u.dataset.edge = K), z))
        K === "right"
          ? ((A.right = "10px"), (A.top = `${G}%`), (A.transform = "translateY(-50%)"))
          : K === "left"
            ? ((A.left = "10px"), (A.top = `${G}%`), (A.transform = "translateY(-50%)"))
            : K === "top"
              ? ((A.top = "10px"), (A.left = `${G}%`), (A.transform = "translateX(-50%)"))
              : ((A.bottom = "10px"), (A.left = `${G}%`), (A.transform = "translateX(-50%)"));
      else {
        let W = N - 36;
        K === "right"
          ? ((A.right = "12px"), (A.top = "18px"))
          : K === "left"
            ? ((A.left = "12px"), (A.top = "18px"))
            : K === "top"
              ? ((A.top = "12px"), (A.right = "18px"))
              : ((A.bottom = "12px"), (A.right = "18px"));
      }
    }
    function b(u, x) {
      let N = window.innerWidth,
        K = window.innerHeight,
        G = [
          [N - u, "right"],
          [u, "left"],
          [x, "top"],
          [K - x, "bottom"],
        ];
      G.sort((W, ie) => W[0] - ie[0]);
      let z = G[0][1],
        H = Math.max(
          5,
          Math.min(95, z === "left" || z === "right" ? (x / K) * 100 : (u / N) * 100),
        );
      return { edge: z, offsetPct: H };
    }
    function E() {
      let u = document.createElement("div");
      for (
        u.className = i.collapsed ? "dtf-panel collapsed" : "dtf-panel",
          u.setAttribute("data-edge", i.edge);
        o.firstChild;
      )
        o.removeChild(o.firstChild);
      (o.appendChild(u), T(u), i.collapsed ? R(u) : J(u));
    }
    function y(u) {
      let x = null,
        N = null,
        K = (H) => {
          (A(!0),
            (h = H),
            (g = H === "bug" ? "bugs" : "features"),
            (a = "feedback"),
            Te(a),
            (i = { ...i, collapsed: !1 }),
            ke(i),
            E());
        },
        G = () => {
          if (!x) return;
          let H = u.getBoundingClientRect(),
            W = x.offsetWidth,
            ie = x.offsetHeight,
            re = 8,
            F,
            X;
          i.edge === "right"
            ? ((F = H.left - W - re), (X = H.top + H.height / 2 - ie / 2))
            : i.edge === "left"
              ? ((F = H.right + re), (X = H.top + H.height / 2 - ie / 2))
              : i.edge === "top"
                ? ((F = H.left + H.width / 2 - W / 2), (X = H.bottom + re))
                : ((F = H.left + H.width / 2 - W / 2), (X = H.top - ie - re));
          let ne = window.innerWidth,
            ee = window.innerHeight;
          ((F = Math.max(8, Math.min(ne - W - 8, F))),
            (X = Math.max(8, Math.min(ee - ie - 8, X))),
            (x.style.left = `${F}px`),
            (x.style.top = `${X}px`));
        },
        z = () => {
          (N && (window.clearTimeout(N), (N = null)),
            !x &&
              ((x = document.createElement("div")),
              (x.className = "se-qa"),
              (x.innerHTML = `<span class="qa-hd">Quick actions</span><button data-qa="bug">${C.bug}<span>File a bug</span><span class="sub">screenshot \xB7 video</span></button><button data-qa="feature">${C.sparkles}<span>Request a feature</span></button>`),
              r.appendChild(x),
              G(),
              requestAnimationFrame(() => {
                requestAnimationFrame(() => x?.classList.add("show"));
              }),
              x.addEventListener("mouseenter", z),
              x.addEventListener("mouseleave", () => A()),
              x.querySelectorAll("[data-qa]").forEach((H) => {
                H.addEventListener("click", (W) => {
                  (W.stopPropagation(), K(H.dataset.qa));
                });
              })));
        },
        A = (H = !1) => {
          N && (window.clearTimeout(N), (N = null));
          let W = () => {
            x && (x.remove(), (x = null));
          };
          H ? W() : (N = window.setTimeout(W, 160));
        };
      (u.addEventListener("mouseenter", z),
        u.addEventListener("mouseleave", () => A()),
        u.addEventListener("click", () => A(!0)));
    }
    function R(u) {
      let x = i.railIconSize,
        N = s
          ? Ae.filter((H) => k(H.k))
              .map((H) => {
                let W = v[H.k] > 0;
                return (
                  `<button class="ri" data-tab="${H.k}" style="width:${x}px;height:${x}px">` +
                  H.icon.replace(
                    "<svg ",
                    `<svg width="${Math.round(x * 0.5)}" height="${Math.round(x * 0.5)}" `,
                  ) +
                  (W ? '<span class="dotw"></span>' : "") +
                  `<span class="tip">${H.label}</span></button>`
                );
              })
              .join("")
          : `<button class="ri lock-only" data-tab="__lock__" style="width:${x}px;height:${x}px" title="">` +
            C.lock.replace(
              "<svg ",
              `<svg width="${Math.round(x * 0.5)}" height="${Math.round(x * 0.5)}" `,
            ) +
            '<span class="tip tip-multi"><b>Devtools locked</b>Sign in to ShipEasy to inspect and override gates, configs, experiments, and translations on this page.<span class="hint">Click to connect \u2192</span></span></button>',
        K =
          `<div class="dtf-panel-rail"><div class="mk" title="Drag to reposition \xB7 click to expand" style="width:${x * 0.7}px;height:${x * 0.7}px"></div>` +
          N +
          `<div class="dtf-rail-resize" style="width:${i.edge === "right" || i.edge === "left" ? x : 12}px;height:${i.edge === "right" || i.edge === "left" ? 12 : x}px" title="Drag to resize"></div></div>`;
      u.innerHTML = K;
      let G = u.querySelector(".mk"),
        z = !1;
      (G.addEventListener("mousedown", (H) => {
        (H.preventDefault(), (z = !1));
        let W = H.clientX,
          ie = H.clientY,
          re = u.getBoundingClientRect(),
          F = H.clientX - (re.left + re.width / 2),
          X = H.clientY - (re.top + re.height / 2);
        G.classList.add("dragging");
        let ne = i.edge,
          ee = (de) => {
            Math.hypot(de.clientX - W, de.clientY - ie) > 4 && (z = !0);
            let { edge: q } = b(de.clientX, de.clientY),
              I = q === "left" || q === "right",
              D = de.clientX - F,
              P = de.clientY - X,
              M = window.innerWidth,
              j = window.innerHeight,
              B = Math.max(5, Math.min(95, I ? (P / j) * 100 : (D / M) * 100));
            ((i = { ...i, edge: q, offsetPct: B }), T(u), u.setAttribute("data-edge", q), (ne = q));
          },
          S = () => {
            (G.classList.remove("dragging"),
              document.removeEventListener("mousemove", ee),
              document.removeEventListener("mouseup", S),
              ke(i),
              z && E());
          };
        (document.addEventListener("mousemove", ee), document.addEventListener("mouseup", S));
      }),
        G.addEventListener("click", () => {
          z || ((i = { ...i, collapsed: !1 }), ke(i), E());
        }),
        u.querySelectorAll(".ri").forEach((H) => {
          (H.addEventListener("click", () => {
            let W = H.dataset.tab;
            (W !== "__lock__" && ((a = W), Te(a)), (i = { ...i, collapsed: !1 }), ke(i), E());
          }),
            H.dataset.tab === "feedback" && y(H));
        }));
      let A = u.querySelector(".dtf-rail-resize");
      A.addEventListener("mousedown", (H) => {
        (H.preventDefault(), H.stopPropagation());
        let W = i.edge === "right" || i.edge === "left",
          ie = H.clientX,
          re = H.clientY,
          F = i.railIconSize;
        A.classList.add("dragging");
        let X = (ee) => {
            let S = W ? ee.clientY - re : ee.clientX - ie,
              de = Math.max(Ga, Math.min(Ja, Math.round(F + S)));
            ((i = { ...i, railIconSize: de }), E());
          },
          ne = () => {
            (A.classList.remove("dragging"),
              document.removeEventListener("mousemove", X),
              document.removeEventListener("mouseup", ne),
              ke(i));
          };
        (document.addEventListener("mousemove", X), document.addEventListener("mouseup", ne));
      });
    }
    function O(u) {
      let x = window.location.host;
      u.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">Locked</span>
          <span class="sub">${et(x)}</span>
        </div>
        <div class="actions">
          <button class="ib" data-action="collapse" title="Collapse">${C.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">
          <button class="t lock-only active" title="">
            ${C.lock}
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
              <div class="ic-big">${C.lock}</div>
              <h2>Connect to <em>ShipEasy</em></h2>
              <p>Sign in to inspect and override flags, configs, experiments, and translations live on this page.</p>
              <div class="features">
                <div class="row"><span class="ic">${C.shield}</span><span class="k">Toggle gates &amp; killswitches</span></div>
                <div class="row"><span class="ic">${C.flask}</span><span class="k">Force experiment variants</span></div>
                <div class="row"><span class="ic">${C.sliders}</span><span class="k">Override config values</span></div>
                <div class="row"><span class="ic">${C.book}</span><span class="k">Edit translations in-place</span></div>
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
      let N = u.querySelector(".dtf-head .mk");
      (N.addEventListener("mousedown", (A) => {
        (A.preventDefault(), N.classList.add("dragging"));
        let H = (ie) => {
            let { edge: re, offsetPct: F } = b(ie.clientX, ie.clientY);
            ((i = { ...i, edge: re, offsetPct: F }), T(u));
          },
          W = () => {
            (N.classList.remove("dragging"),
              document.removeEventListener("mousemove", H),
              document.removeEventListener("mouseup", W),
              ke(i));
          };
        (document.addEventListener("mousemove", H), document.addEventListener("mouseup", W));
      }),
        u.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ke(i), E());
        }));
      let K = u.querySelector('[data-action="connect"]'),
        G = u.querySelector("[data-status]"),
        z = u.querySelector("[data-err]");
      K.addEventListener("click", async () => {
        ((K.disabled = !0),
          (K.innerHTML = '<span class="spin"></span> Opening\u2026'),
          (G.textContent = ""),
          (z.style.display = "none"),
          (z.textContent = ""));
        try {
          ((s = await rr(e, () => {
            ((G.textContent = "Waiting for approval in the opened tab\u2026"),
              (K.innerHTML = '<span class="spin"></span> Waiting for approval'));
          })),
            (a = Ae.find((A) => k(A.k))?.k ?? "gates"),
            Te(a),
            E());
        } catch (A) {
          ((z.textContent = A instanceof Error ? A.message : String(A)),
            (z.style.display = "block"),
            (G.textContent = ""),
            (K.disabled = !1),
            (K.textContent = "Retry connect \u2192"));
        }
      });
    }
    function J(u) {
      if (!s) {
        O(u);
        return;
      }
      let x = a && a !== "__lock__" ? a : (Ae.find((F) => k(F.k))?.k ?? "gates");
      a !== x && ((a = x), Te(x));
      let N = Ae.find((F) => F.k === x),
        K = c?.name ?? "",
        G = window.location.host,
        z = K || G,
        A = Ae.filter((F) => k(F.k))
          .map((F) => {
            let X = F.k === x,
              ne = v[F.k] > 0;
            return (
              `<button class="t${X ? " active" : ""}" data-tab="${F.k}" title="${F.label}">` +
              F.icon +
              (ne ? '<span class="dotw"></span>' : "") +
              `<span class="tip">${F.label}</span></button>`
            );
          })
          .join(""),
        H = m(x),
        W =
          _() > 0
            ? '<div class="dtf-overbar">' +
              C.alert +
              `<span><b>${_()} session override${_() > 1 ? "s" : ""}</b> \xB7 cleared on refresh</span><button data-action="clear-overrides">Clear all</button></div>`
            : "",
        ie = H ? L(x) : "";
      u.innerHTML = `
      <div class="dtf-head">
        <div class="mk" title="Drag to reposition"></div>
        <div class="ti">
          <span class="title">${et(N.label)}</span>
          <span class="sub">${et(z)}</span>
        </div>
        ${U(x)}
        <div class="actions">
          <button class="ib" data-action="refresh" title="Refresh">${C.refresh}</button>
          <button class="ib" data-action="collapse" title="Collapse">${C.x}</button>
        </div>
      </div>
      <div class="dtf-split">
        <div class="dtf-rail">${A}</div>
        <div class="dtf-pane">
          ${W}
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
          ${_() > 0 ? '<button class="ibtn danger" data-action="clear-overrides" title="Drop all session overrides">Clear overrides</button>' : ""}
          ${s ? '<button class="ibtn" data-action="signout" title="Sign out of this project">Sign out</button>' : ""}
        </div>
      </div>
    `;
      let re = u.querySelector(".dtf-head .mk");
      (re.addEventListener("mousedown", (F) => {
        (F.preventDefault(), re.classList.add("dragging"));
        let X = (ee) => {
            let { edge: S, offsetPct: de } = b(ee.clientX, ee.clientY);
            ((i = { ...i, edge: S, offsetPct: de }), T(u));
          },
          ne = () => {
            (re.classList.remove("dragging"),
              document.removeEventListener("mousemove", X),
              document.removeEventListener("mouseup", ne),
              ke(i));
          };
        (document.addEventListener("mousemove", X), document.addEventListener("mouseup", ne));
      }),
        V(u),
        u.querySelector('[data-action="refresh"]').addEventListener("click", () => {
          (l()?.invalidate(), E());
        }),
        u.querySelector('[data-action="collapse"]').addEventListener("click", () => {
          ((i = { ...i, collapsed: !0 }), ke(i), E());
        }),
        u.querySelectorAll(".dtf-rail .t").forEach((F) => {
          (F.addEventListener("click", () => {
            ae(F.dataset.tab);
          }),
            F.dataset.tab === "feedback" && y(F));
        }),
        H && ve(u, x),
        u.querySelector('[data-action="clear-overrides"]')?.addEventListener("click", () => {
          pr();
        }),
        u.querySelector('[data-action="apply-url"]')?.addEventListener("click", () => {
          fr();
        }),
        u.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
          let F = Et({ ...St(), openDevtools: !0 }),
            X = u.querySelector('[data-action="share"]');
          try {
            await navigator.clipboard.writeText(F);
            let ne = X.textContent;
            ((X.textContent = "Copied \u2713"), setTimeout(() => (X.textContent = ne), 1500));
          } catch {
            prompt("Copy this URL:", F);
          }
        }),
        u.querySelector('[data-action="signout"]')?.addEventListener("click", () => {
          (xt(), mt(null), (s = null), (c = null), (d = null), E());
        }),
        le());
    }
    function ae(u) {
      if (!s || i.collapsed) {
        ((a = u), Te(u), E());
        return;
      }
      if (u === a) return;
      let x = o.querySelector(".dtf-panel");
      if (!x) {
        ((a = u), Te(u), E());
        return;
      }
      ((a = u),
        Te(u),
        x.querySelectorAll(".dtf-rail .t").forEach((A) => {
          A.classList.toggle("active", A.dataset.tab === u);
        }));
      let N = Ae.find((A) => A.k === u),
        K = x.querySelector(".dtf-head .ti .title");
      N && K && (K.textContent = N.label);
      let G = x.querySelector(".dtf-head");
      (G?.querySelector(".dtf-head-extras")?.remove(),
        G &&
          u === "labels" &&
          (G.querySelector(".ti")?.insertAdjacentHTML("afterend", U(u)), V(x)));
      let z = x.querySelector(".dtf-pane");
      (z?.querySelector(".dtf-search")?.remove(),
        z &&
          m(u) &&
          (z.querySelector("#dtf-body")?.insertAdjacentHTML("beforebegin", L(u)), ve(x, u)),
        le());
    }
    function m(u) {
      return u === "gates" || u === "experiments" || u === "configs" || u === "labels";
    }
    function L(u) {
      let x = f[u];
      return `<div class="dtf-search">
        <div class="input">
          ${C.search}
          <input placeholder="Filter ${u}\u2026" value="${Yt(x.search)}" />
          ${x.search ? '<span class="kbd" data-action="clear-search">esc</span>' : '<span class="kbd">\u2318K</span>'}
        </div>
        <div class="seg">
          <button class="${x.view === "page" ? "active" : ""}" data-view="page">page</button>
          <button class="${x.view === "all" ? "active" : ""}" data-view="all">all</button>
        </div>
      </div>`;
    }
    function U(u) {
      return u !== "labels"
        ? ""
        : `<div class="dtf-head-extras" data-labels-extras>
        <button class="dtf-head-toggle" data-action="toggle-edit-labels"
          title="Edit labels in place \u2014 click any string on the page">
          ${C.book}<span>Edit on page</span>
        </button>
        <select class="dtf-head-locale" data-locale title="Profile / locale"></select>
      </div>`;
    }
    function V(u) {
      let x = u.querySelector('.dtf-head-extras [data-action="toggle-edit-labels"]');
      x &&
        (Ee() && x.classList.add("active"),
        x.addEventListener("click", () => {
          if (!Ee()) {
            Ke(!0);
            return;
          }
          let K = dr();
          if (K.length === 0) {
            Ke(!1);
            return;
          }
          ce(u, K);
        }));
    }
    function ce(u, x) {
      u.querySelector(".dtf-modal-bg")?.remove();
      let N = l(),
        K = He(),
        G = `edit-${new Date().toISOString().slice(0, 10)}`,
        z = document.createElement("div");
      ((z.className = "dtf-modal-bg"),
        (z.innerHTML = `
      <div class="dtf-modal" role="dialog" aria-modal="true">
        <div class="hd">
          <span class="k">Save edits as draft</span>
          <button class="x" data-cancel aria-label="Close">${C.x}</button>
        </div>
        <div class="bd">
          <p style="margin:0;color:var(--fg-2);font-size:11px;line-height:1.5">
            ${x.length} label edit${x.length === 1 ? "" : "s"} will be promoted into a new draft
            ${K ? `under profile <span class="mono" style="color:var(--fg)">${et(K)}</span>` : "of the active profile"}.
            Session URL overrides will be cleared once the draft is created.
          </p>
          <div class="row">
            <span class="lbl mono">Name</span>
            <input class="dtf-input" data-name placeholder="${Yt(G)}" value="${Yt(G)}" />
          </div>
          <div class="row" style="display:${N ? "none" : "grid"}">
            <span class="lbl mono">Note</span>
            <span style="color:var(--warn);font-size:11px">Not signed in \u2014 only Discard is available.</span>
          </div>
          <div class="dtf-modal-err" data-err style="color:var(--danger);font-family:var(--mono);font-size:10.5px;min-height:0"></div>
        </div>
        <div class="ft">
          <span style="flex:1"></span>
          <button class="ibtn" data-discard>Discard edits</button>
          <button class="ibtn pri" data-save${N ? "" : " disabled"}>Save draft</button>
        </div>
      </div>`),
        u.appendChild(z));
      let A = z.querySelector("[data-name]"),
        H = z.querySelector("[data-err]"),
        W = z.querySelector("[data-save]"),
        ie = z.querySelector("[data-discard]"),
        re = z.querySelector("[data-cancel]");
      (A.focus(), A.select());
      let F = () => z.remove();
      (re.addEventListener("click", F),
        z.addEventListener("click", (X) => {
          X.target === z && F();
        }),
        ie.addEventListener("click", () => {
          (F(), Ke(!1));
        }),
        W.addEventListener("click", async () => {
          if (!N) return;
          H.textContent = "";
          let X = (A.value || G).trim();
          if (!X) {
            H.textContent = "Name is required.";
            return;
          }
          let ne = K;
          if (!ne)
            try {
              let ee = await N.profiles();
              ne = ee.find((S) => S.name === "en:prod")?.id ?? ee[0]?.id ?? null;
            } catch (ee) {
              H.textContent = ee instanceof Error ? ee.message : String(ee);
              return;
            }
          if (!ne) {
            H.textContent = "No profile available to anchor the draft.";
            return;
          }
          ((W.disabled = !0), (W.textContent = "Saving\u2026"));
          try {
            let ee = await N.createDraft({ profileId: ne, name: X });
            for (let S of x) await N.upsertDraftKey(ee.id, S.key, S.value);
            (cr(), Ke(!1));
          } catch (ee) {
            ((W.disabled = !1),
              (W.textContent = "Save draft"),
              (H.textContent = ee instanceof Error ? ee.message : String(ee)));
          }
        }));
    }
    function ve(u, x) {
      let N = u.querySelector(".dtf-search input");
      N &&
        (N.addEventListener("input", () => {
          ((f[x].search = N.value), le());
        }),
        u.querySelectorAll(".dtf-search .seg button").forEach((K) => {
          K.addEventListener("click", () => {
            ((f[x].view = K.dataset.view), E());
          });
        }),
        u.querySelector('[data-action="clear-search"]')?.addEventListener("click", () => {
          ((f[x].search = ""), E());
        }));
    }
    function le() {
      let u = o.querySelector("#dtf-body");
      if (!u || !s) return;
      let x = l();
      if (!x) return;
      Y(x);
      let N = a,
        K = f[N],
        G = (z) => {
          let A = v[N];
          ((v[N] = z), ((A === 0) != (z === 0) || A !== z) && ye());
        };
      switch (N) {
        case "user":
          vr(u, x, w, () => E());
          break;
        case "gates":
          br(u, x, K, G);
          break;
        case "experiments":
          hr(u, x, K, G);
          break;
        case "configs":
          Mr(u, x, K, G);
          break;
        case "labels":
          nn(u, x, K, r, {
            locale: p,
            setLocale: (z) => {
              ((p = z), le());
            },
          });
          break;
        case "feedback":
          fn(u, x, o, {
            sub: g,
            setSub: (z) => {
              ((g = z), le());
            },
            pendingForm: h,
            consumePendingForm: () => {
              h = null;
            },
          });
          break;
        case "events":
          vn(u);
          break;
      }
    }
    function ye() {
      E();
    }
    async function Y(u) {
      try {
        let x = await u.project(),
          N = window.location.host;
        if (!(Za() !== null) && x.domain && !mr(N, x.domain)) {
          (xt(), mt(null), (s = null), (c = null), E());
          return;
        }
        let G = c;
        if (((c = x), mt(x), a && !k(a))) {
          let z = Ae.find((A) => k(A.k))?.k ?? null;
          ((a = z), Te(z), E());
          return;
        }
        (!G || !Qa(G.modules, x.modules)) && E();
      } catch {}
    }
    document.documentElement.appendChild(t);
    let he = () => {
        document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
      },
      be = new MutationObserver(he);
    if (
      (be.observe(document.documentElement, { childList: !0 }),
      Ee() && (Ye(), Xe(!0, r, () => {})),
      $n() || (i = { ...i, collapsed: !0 }),
      E(),
      s)
    ) {
      let u = l();
      u && Y(u);
    }
    wn();
    let Pe = yn(() => E()),
      pe = () => {
        let u = o.querySelector(".dtf-panel");
        u && T(u);
      };
    window.addEventListener("resize", pe);
    let De = () => le();
    return (
      window.addEventListener("se:state:update", De),
      {
        destroy() {
          (window.removeEventListener("resize", pe),
            window.removeEventListener("se:state:update", De),
            Pe(),
            be.disconnect(),
            t.remove());
        },
      }
    );
  }
  function et(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Yt(e) {
    return et(e);
  }
  var ei = "https://shipeasy.ai";
  function _n(e) {
    return (
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|$)/i.test(e) ||
      e === "file://" ||
      e === "null"
    );
  }
  function ti() {
    if (typeof document < "u") {
      let e = document.currentScript;
      if (e?.src)
        try {
          let r = new URL(e.src).origin;
          if (!_n(r)) return r;
        } catch {}
      let t = document.querySelectorAll("script[src]");
      for (let r of Array.from(t))
        if (r.src.includes("se-devtools.js"))
          try {
            let n = new URL(r.src).origin;
            if (!_n(n)) return n;
          } catch {}
    }
    return ei;
  }
  var je = null,
    vt = null;
  function Tn(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (je) {
      if (document.getElementById("shipeasy-devtools")) return;
      je = null;
    }
    vt || (vt = ur());
    let t = { adminUrl: e.adminUrl ?? ti(), hideAdminLinks: e.hideAdminLinks ?? !1 },
      { destroy: r } = Ln(t);
    je = r;
  }
  function ri() {
    (je?.(), (je = null), vt?.(), (vt = null));
  }
  function Mn(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    nt() && Tn(e);
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
        (je ? ri() : Tn(e));
    }
    return (window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => Mn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      Ee())
    ) {
      let r = !1,
        n = new MutationObserver(() => o()),
        o = () => {
          r ||
            ((r = !0),
            requestAnimationFrame(() => {
              ((r = !1),
                n.disconnect(),
                Ye(),
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
        Xe(!0, c.shadowRoot, () => o());
      };
      (a(), window.addEventListener("se:i18n:ready", () => o(), { once: !0 }));
      let s = window;
      s.i18n?.on && s.i18n.on("update", () => o());
    }
    window.__se_devtools_ready = !0;
  }
})();
