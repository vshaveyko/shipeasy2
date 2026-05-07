"use strict";
(() => {
  var ln = Object.create;
  var be = Object.defineProperty;
  var dn = Object.getOwnPropertyDescriptor;
  var cn = Object.getOwnPropertyNames;
  var un = Object.getPrototypeOf,
    pn = Object.prototype.hasOwnProperty;
  var fn = (e, t, n) =>
    t in e ? be(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
  var gn = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
  var mn = (e, t, n, r) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let o of cn(t))
        !pn.call(e, o) &&
          o !== n &&
          be(e, o, { get: () => t[o], enumerable: !(r = dn(t, o)) || r.enumerable });
    return e;
  };
  var vn = (e, t, n) => (
    (n = e != null ? ln(un(e)) : {}),
    mn(t || !e || !e.__esModule ? be(n, "default", { value: e, enumerable: !0 }) : n, e)
  );
  var $ = (e, t, n) => fn(e, typeof t != "symbol" ? t + "" : t, n);
  var At = gn((so, Rt) => {
    "use strict";
    var qe = Object.defineProperty,
      Rn = Object.getOwnPropertyDescriptor,
      An = Object.getOwnPropertyNames,
      $n = Object.prototype.hasOwnProperty,
      Pn = (e, t) => {
        for (var n in t) qe(e, n, { get: t[n], enumerable: !0 });
      },
      Cn = (e, t, n, r) => {
        if ((t && typeof t == "object") || typeof t == "function")
          for (let o of An(t))
            !$n.call(e, o) &&
              o !== n &&
              qe(e, o, { get: () => t[o], enumerable: !(r = Rn(t, o)) || r.enumerable });
        return e;
      },
      On = (e) => Cn(qe({}, "__esModule", { value: !0 }), e),
      yt = {};
    Pn(yt, {
      FlagsClientBrowser: () => xt,
      LABEL_MARKER_END: () => Tt,
      LABEL_MARKER_RE: () => Yn,
      LABEL_MARKER_SEP: () => _t,
      LABEL_MARKER_START: () => Lt,
      _resetShipeasyForTests: () => Gn,
      attachDevtools: () => Et,
      configureShipeasy: () => Ne,
      encodeLabelMarker: () => Mt,
      flags: () => St,
      getShipeasyClient: () => Jn,
      i18n: () => lr,
      isDevtoolsRequested: () => Oe,
      labelAttrs: () => Xn,
      loadDevtools: () => He,
      readConfigOverride: () => Ue,
      readExpOverride: () => wt,
      readGateOverride: () => De,
      shipeasy: () => kt,
      version: () => Hn,
    });
    Rt.exports = On(yt);
    var Hn = "1.0.0",
      Bn = 5e3,
      In = 100,
      mt = "__se_anon_id",
      vt = "__se_seen",
      te = "__se_pending_alias",
      qn = class {
        constructor(e, t) {
          $(this, "collectUrl");
          $(this, "sdkKey");
          $(this, "queue", []);
          $(this, "exposureSeen", new Set());
          $(this, "timer", null);
          if (((this.collectUrl = e), (this.sdkKey = t), typeof window < "u")) {
            ((this.timer = setInterval(() => this.flush(), Bn)),
              window.addEventListener("beforeunload", () => this.flush()),
              document.addEventListener("visibilitychange", () => {
                document.visibilityState === "hidden" && this.flush(!0);
              }));
            try {
              let n = sessionStorage.getItem(vt);
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
              sessionStorage.setItem(vt, JSON.stringify([...this.exposureSeen]));
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
            localStorage.setItem(te, JSON.stringify(n));
          } catch {}
          (await this.flushAsync(), await this._sendAlias(e, t));
          try {
            localStorage.removeItem(te);
          } catch {}
        }
        async flushPendingAlias() {
          try {
            let e = localStorage.getItem(te);
            if (!e) return;
            let t = JSON.parse(e);
            if (Date.now() - t.ts > 7 * 864e5) {
              localStorage.removeItem(te);
              return;
            }
            (await this._sendAlias(t.anonymousId, t.userId), localStorage.removeItem(te));
          } catch {}
        }
        async _sendAlias(e, t) {
          (this.enqueue({ type: "identify", anonymous_id: e, user_id: t, ts: Date.now() }),
            await this.flushAsync());
        }
        enqueue(e) {
          (this.queue.push(e), this.queue.length >= In && this.flush());
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
      fe = 5;
    function Dn(e, t, n) {
      if (typeof window > "u" || typeof PerformanceObserver > "u") return;
      let r = null,
        o = null,
        i = !1,
        a = 0,
        s = 0,
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
          for (let p of v.getEntries()) p.value > 0.1 && (i = !0);
        }).observe({ type: "layout-shift", buffered: !0 });
      } catch {}
      let u = window.onerror;
      ((window.onerror = (b, v, p, l, y) => (
        a < fe &&
          ((a += 1),
          e.pushMetric("__auto_js_error", t, n, {
            value: 1,
            kind: "exception",
            message: typeof b == "string" ? b.slice(0, 200) : String(y ?? "").slice(0, 200),
            source: typeof v == "string" ? v.slice(0, 200) : "",
            line: p ?? 0,
          })),
        typeof u == "function" ? u(b, v, p, l, y) : !1
      )),
        window.addEventListener("unhandledrejection", (b) => {
          if (a < fe) {
            a += 1;
            let v = b.reason,
              p = v instanceof Error ? v.message : typeof v == "string" ? v : String(v);
            e.pushMetric("__auto_js_error", t, n, {
              value: 1,
              kind: "unhandled_rejection",
              message: p.slice(0, 200),
            });
          }
        }));
      let g = window.fetch;
      window.fetch = async function (...b) {
        let v = typeof performance < "u" ? performance.now() : 0,
          p = typeof b[0] == "string" ? b[0] : b[0].toString(),
          l;
        try {
          l = await g.apply(this, b);
        } catch (y) {
          throw (
            s < fe &&
              ((s += 1),
              e.pushMetric("__auto_network_error", t, n, {
                value: 1,
                kind: "network",
                status: 0,
                url: p.slice(0, 200),
              })),
            y
          );
        }
        if (l.status >= 500 && s < fe) {
          s += 1;
          let y = typeof performance < "u" ? performance.now() - v : 0;
          e.pushMetric("__auto_network_error", t, n, {
            value: 1,
            kind: "5xx",
            status: l.status,
            url: p.slice(0, 200),
            duration_ms: Math.round(y),
          });
        }
        return l;
      };
      let h = () => {
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
        ? setTimeout(h, 0)
        : window.addEventListener(
            "load",
            () => {
              setTimeout(h, 0);
            },
            { once: !0 },
          );
      let m = () => {
        (h(),
          r !== null && e.pushMetric("__auto_lcp", t, n, { value: r }),
          o !== null && e.pushMetric("__auto_inp", t, n, { value: o }),
          i && e.pushMetric("__auto_cls_binary", t, n, { value: 1 }));
        let b = r === null ? 1 : 0;
        (e.pushMetric("__auto_abandoned", t, n, { value: b }), e.flush(!0));
      };
      document.addEventListener("visibilitychange", () => {
        document.visibilityState === "hidden" && m();
      });
    }
    function Un() {
      try {
        let t = localStorage.getItem(mt);
        if (t) return t;
      } catch {}
      let e =
        typeof crypto < "u" && typeof crypto.randomUUID == "function"
          ? crypto.randomUUID()
          : `anon_${Math.random().toString(36).slice(2)}`;
      try {
        localStorage.setItem(mt, e);
      } catch {}
      return e;
    }
    function Nn() {
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
    function jn() {
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
    var xt = class {
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
            (this.anonId = Un()),
            (this.buffer = new qn(`${this.baseUrl}/collect`, this.sdkKey)),
            this.buffer.flushPendingAlias());
        }
        async identify(e) {
          let t = this.userId;
          ((this.userId = e.user_id ?? ""),
            this.anonId &&
              this.userId &&
              this.userId !== t &&
              (await this.buffer.alias(this.anonId, this.userId)));
          let n = { ...Nn(), anonymous_id: this.anonId, ...e },
            r = await fetch(`${this.baseUrl}/sdk/evaluate?env=${this.env}`, {
              method: "POST",
              headers: { "X-SDK-Key": this.sdkKey, "Content-Type": "application/json" },
              body: JSON.stringify({ user: n, experiment_overrides: jn() }),
            });
          if (!r.ok) throw new Error(`/sdk/evaluate returned ${r.status}`);
          ((this.evalResult = await r.json()),
            this.autoGuardrails &&
              !this.guardrailsInstalled &&
              ((this.guardrailsInstalled = !0), Dn(this.buffer, this.userId, this.anonId)),
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
          let t = De(e);
          return t !== null ? t : (this.evalResult.flags[e] ?? !1);
        }
        getConfig(e, t) {
          if (this.evalResult === null) return;
          let n = Ue(e),
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
            i = wt(e);
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
      Kn = /^(true|on|1|yes)$/i,
      zn = /^(false|off|0|no)$/i;
    function Fn(e) {
      return Kn.test(e) ? !0 : zn.test(e) ? !1 : null;
    }
    function Wn(e) {
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
    function ne(e, t) {
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
    function De(e) {
      let t = ne(`se_ks_${e}`) ?? ne(`se_gate_${e}`) ?? ne(`se-gate-${e}`);
      return t === null ? null : Fn(t);
    }
    function Ue(e) {
      let t = ne(`se_config_${e}`, `se-config-${e}`);
      if (t !== null) return Wn(t);
    }
    function wt(e) {
      let t = ne(`se_exp_${e}`, `se-exp-${e}`);
      return t === null || t === "" || t === "default" || t === "none" ? null : t;
    }
    function Oe() {
      if (typeof window > "u" || !window.location) return !1;
      let e = new URLSearchParams(window.location.search);
      return e.has("se") || e.has("se_devtools") || e.has("se-devtools");
    }
    function He(e = {}) {
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
    function Et(e, t = {}) {
      if (typeof window > "u") return () => {};
      let r = (t.hotkey ?? "Shift+Alt+S").split("+"),
        o = r[r.length - 1],
        i = r.includes("Shift"),
        a = r.includes("Alt"),
        s = r.includes("Ctrl") || r.includes("Control"),
        d = r.includes("Meta") || r.includes("Cmd");
      (e.installBridge(), Oe() && He({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl }));
      let u = Oe();
      function g(m) {
        m.key === o &&
          m.shiftKey === i &&
          m.altKey === a &&
          m.ctrlKey === s &&
          m.metaKey === d &&
          (u
            ? window.__shipeasy_devtools?.toggle()
            : ((u = !0), He({ adminUrl: t.adminUrl, edgeUrl: t.edgeUrl })));
      }
      window.addEventListener("keydown", g);
      let h = e.subscribe(() => e.installBridge());
      return () => {
        (window.removeEventListener("keydown", g), h());
      };
    }
    var O = null;
    function kt(e) {
      let t = Ne({ sdkKey: e.apiKey, baseUrl: e.baseUrl ?? "https://cdn.shipeasy.ai" });
      return (St.notifyMounted(), Et(t, { adminUrl: e.adminUrl }));
    }
    function Ne(e) {
      return O || ((O = new xt(e)), O);
    }
    function Jn() {
      return O;
    }
    function Gn() {
      (O?.destroy(), (O = null));
    }
    function ht() {
      return typeof window > "u" ? null : (window.__SE_BOOTSTRAP ?? null);
    }
    var $e = !1,
      Be = new Set(),
      bt = !1;
    function Vn() {
      bt ||
        typeof window > "u" ||
        ((bt = !0),
        window.addEventListener("se:override:change", () => {
          for (let e of Be) e();
        }));
    }
    var St = {
        configure(e) {
          Ne(e);
        },
        identify(e) {
          return O
            ? O.identify(e)
            : (console.warn("[shipeasy] flags.identify called before configureShipeasy()"),
              Promise.resolve());
        },
        get(e) {
          let t = ht();
          return t !== null && e in t.flags
            ? t.flags[e]
            : $e
              ? O
                ? O.getFlag(e)
                : (De(e) ?? !1)
              : !1;
        },
        getConfig(e, t) {
          let n = ht();
          if (n !== null && e in n.configs) {
            let o = n.configs[e];
            if (!t) return o;
            try {
              return t(o);
            } catch {
              return;
            }
          }
          if (!$e) return;
          if (O) return O.getConfig(e, t);
          let r = Ue(e);
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
          return O?.getExperiment(e, t, n, r) ?? { inExperiment: !1, group: "control", params: t };
        },
        track(e, t) {
          O?.track(e, t);
        },
        flush() {
          return O?.flush() ?? Promise.resolve();
        },
        notifyMounted() {
          (($e = !0),
            typeof window < "u" && window.dispatchEvent(new CustomEvent("se:override:change")));
        },
        subscribe(e) {
          return O ? O.subscribe(e) : (Be.add(e), Vn(), () => Be.delete(e));
        },
        get ready() {
          return O?.ready ?? !1;
        },
      },
      Lt = "\uFFF9",
      _t = "\uFFFA",
      Tt = "\uFFFB",
      Yn = /￹([^￺￻]+)￺([^￻]*)￻/g;
    function Mt(e, t) {
      return `${Lt}${e}${_t}${t}${Tt}`;
    }
    function Xn(e, t, n) {
      let r = { "data-label": e };
      return (t && (r["data-variables"] = JSON.stringify(t)), n && (r["data-label-desc"] = n), r);
    }
    var Zn = null,
      Qn = Symbol.for("@shipeasy/sdk:ssr-i18n"),
      er = Symbol.for("@shipeasy/sdk:ssr-edit-mode");
    function tr() {
      return globalThis[Qn]?.() ?? null;
    }
    function nr() {
      if (typeof window < "u")
        return (
          !!window.__SE_BOOTSTRAP?.editLabels ||
          new URLSearchParams(location.search).has("se_edit_labels")
        );
      let e = globalThis[er];
      return typeof e == "boolean" ? e : typeof e == "function" ? e() : !1;
    }
    function ge(e, t) {
      return t
        ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
            let o = t[r];
            return o != null ? String(o) : n;
          })
        : e;
    }
    var rr = typeof document < "u",
      or = [
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
    function sr() {
      let e = {};
      for (let t of or)
        e[t] = rr
          ? (n) => {
              let r = document.createElement(t);
              return (t !== "br" && t !== "hr" && (r.textContent = n), r);
            }
          : (n) => (t === "br" || t === "hr" ? `<${t}>` : `<${t}>${n}</${t}>`);
      return e;
    }
    var ar = sr(),
      Ie = {},
      Pe = /<(\w+)(?:\s*\/>|>([\s\S]*?)<\/\1>)/g;
    function ir(e, t) {
      let n = [],
        r = 0,
        o,
        i = !0;
      for (Pe.lastIndex = 0; (o = Pe.exec(e)) !== null; ) {
        o.index > r && n.push(e.slice(r, o.index));
        let a = o[1],
          s = o[2] ?? "",
          d = t[a] ?? Ie[a] ?? ar[a];
        if (d) {
          let u = d(s);
          (typeof u != "string" && (i = !1), n.push(u));
        } else n.push(s);
        r = Pe.lastIndex;
      }
      return (r < e.length && n.push(e.slice(r)), i ? n.join("") : n);
    }
    function Ce(e, t) {
      if (typeof window < "u" && window.i18n) {
        let r = window.i18n.t(e, t);
        return r === e ? void 0 : r;
      }
      let n = tr();
      if (n?.strings[e]) return ge(n.strings[e], t);
    }
    var lr = {
      t(e, t, n) {
        let r, o;
        typeof t == "string" ? ((r = t), (o = n)) : (o = t);
        let i = Ce(e, o);
        return i !== void 0 ? i : r !== void 0 ? ge(r, o) : e;
      },
      rich(e, t, n, r) {
        let i = Ce(e, r) ?? ge(t, r);
        return ir(i, n ?? {});
      },
      tEl(e, t, n, r) {
        if (nr()) {
          let i = Ce(e, n) ?? ge(t, n);
          return Mt(e, i);
        }
        return this.t(e, t, n);
      },
      configure(e) {
        (e.components && (Ie = { ...Ie, ...e.components }),
          e.createElement && (Zn = e.createElement));
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
      e?.apiKey && !O && kt({ apiKey: e.apiKey, baseUrl: e.apiUrl });
    }
  });
  var le = `
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
  var ye = "se_dt_session";
  function Ze() {
    try {
      let e = sessionStorage.getItem(ye);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function hn(e) {
    try {
      sessionStorage.setItem(ye, JSON.stringify(e));
    } catch {}
  }
  function xe() {
    try {
      sessionStorage.removeItem(ye);
    } catch {}
  }
  async function Qe(e, t) {
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
        let u = !1;
        function g(p, l) {
          u ||
            ((u = !0),
            window.removeEventListener("message", h),
            clearInterval(b),
            clearTimeout(v),
            p ? s(p) : a(l));
        }
        function h(p) {
          if (p.origin !== n) return;
          let l = p.data;
          if (!l || l.type !== "se:devtools-auth" || !l.token || !l.projectId) return;
          let y = { token: l.token, projectId: l.projectId };
          (hn(y), g(null, y));
        }
        window.addEventListener("message", h);
        let m = Date.now(),
          b = setInterval(() => {
            Date.now() - m < 1500 ||
              (i.closed && !u && g(new Error("Sign-in window closed before approval.")));
          }, 500),
          v = setTimeout(() => {
            g(new Error("Sign-in timed out after 10 minutes."));
          }, 6e5);
      })
    );
  }
  var bn = /^(true|on|1|yes)$/i,
    yn = /^(false|off|0|no)$/i,
    et = /^se(?:_|-|$)/;
  function de(e) {
    return bn.test(e) ? !0 : yn.test(e) ? !1 : null;
  }
  function we(e) {
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
  function tt(e) {
    let t = JSON.stringify(e);
    return t.length <= 60
      ? t
      : `b64:${btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }
  function ce() {
    return typeof window > "u"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  }
  function j(e, t) {
    let n = ce(),
      r = n.get(e);
    if (r !== null) return r;
    if (t) {
      let o = n.get(t);
      if (o !== null) return o;
    }
    return null;
  }
  function F(e) {
    if (typeof window > "u") return;
    let t = new URL(window.location.href);
    t.searchParams.set("se", "1");
    for (let [n, r] of e) r === null ? t.searchParams.delete(n) : t.searchParams.set(n, r);
    window.location.assign(t.toString());
  }
  function ue() {
    if (typeof window > "u") return !1;
    let e = ce();
    return e.has("se") || e.has("se_devtools") || e.has("se-devtools") || e.has("se_edit_labels");
  }
  function W() {
    return typeof window > "u" ? !1 : ce().has("se_edit_labels");
  }
  function Ee(e) {
    if (!e && typeof document < "u")
      try {
        document.cookie = "se_edit_labels=;path=/;max-age=0;samesite=lax";
      } catch {}
    F([["se_edit_labels", e ? "1" : null]]);
  }
  function ke(e) {
    let t = j(`se_ks_${e}`) ?? j(`se_gate_${e}`) ?? j(`se-gate-${e}`);
    return t === null ? null : de(t);
  }
  function nt(e, t, n = "session") {
    F([
      [`se_ks_${e}`, t === null ? null : t ? "true" : "false"],
      [`se_gate_${e}`, null],
      [`se-gate-${e}`, null],
    ]);
  }
  function Se(e) {
    let t = j(`se_config_${e}`, `se-config-${e}`);
    if (t !== null) return we(t);
  }
  function Le(e, t, n = "session") {
    F([
      [`se_config_${e}`, t == null ? null : tt(t)],
      [`se-config-${e}`, null],
    ]);
  }
  function rt(e) {
    let t = j(`se_exp_${e}`, `se-exp-${e}`);
    return t === null || t === "" || t === "default" || t === "none" ? null : t;
  }
  function ot(e, t, n = "session") {
    F([
      [`se_exp_${e}`, t],
      [`se-exp-${e}`, null],
    ]);
  }
  function Y() {
    return j("se_i18n");
  }
  function st(e, t = "session") {
    F([["se_i18n", e]]);
  }
  function _e() {
    return j("se_i18n_draft");
  }
  function at(e, t = "session") {
    F([["se_i18n_draft", e]]);
  }
  function J(e) {
    return j(`se_i18n_label_${e}`);
  }
  function Te(e, t, n = "session") {
    F([[`se_i18n_label_${e}`, t]]);
  }
  function it() {
    if (typeof window > "u") return;
    let e = new URL(window.location.href);
    for (let t of [...e.searchParams.keys()]) et.test(t) && e.searchParams.delete(t);
    (e.searchParams.set("se", "1"), window.location.assign(e.toString()));
  }
  function Me(e, t) {
    let n = new URL(t ?? (typeof window < "u" ? window.location.href : "https://example.com/"));
    for (let r of [...n.searchParams.keys()]) et.test(r) && n.searchParams.delete(r);
    e.openDevtools && n.searchParams.set("se", "1");
    for (let [r, o] of Object.entries(e.gates ?? {}))
      n.searchParams.set(`se_ks_${r}`, o ? "true" : "false");
    for (let [r, o] of Object.entries(e.experiments ?? {})) n.searchParams.set(`se_exp_${r}`, o);
    for (let [r, o] of Object.entries(e.configs ?? {})) n.searchParams.set(`se_config_${r}`, tt(o));
    (e.i18nProfile && n.searchParams.set("se_i18n", e.i18nProfile),
      e.i18nDraft && n.searchParams.set("se_i18n_draft", e.i18nDraft));
    for (let [r, o] of Object.entries(e.i18nLabels ?? {}))
      n.searchParams.set(`se_i18n_label_${r}`, o);
    return n.toString();
  }
  function Re() {
    let e = { gates: {}, experiments: {}, configs: {}, i18nLabels: {} };
    if (typeof window > "u") return e;
    let t = ce();
    for (let [n, r] of t)
      if (n.startsWith("se_ks_")) {
        let o = de(r);
        o !== null && (e.gates[n.slice(6)] = o);
      } else if (n.startsWith("se_gate_")) {
        let o = de(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else if (n.startsWith("se-gate-")) {
        let o = de(r);
        o !== null && (e.gates[n.slice(8)] = o);
      } else
        n.startsWith("se_exp_") || n.startsWith("se-exp-")
          ? (e.experiments[n.slice(7)] = r)
          : n.startsWith("se_config_") || n.startsWith("se-config-")
            ? (e.configs[n.slice(10)] = we(r))
            : n === "se_i18n"
              ? (e.i18nProfile = r)
              : n === "se_i18n_draft"
                ? (e.i18nDraft = r)
                : n.startsWith("se_i18n_label_") && (e.i18nLabels[n.slice(14)] = r);
    return e;
  }
  function lt(e) {
    if (typeof window > "u") return;
    let t = { ...Re(), ...e, openDevtools: !0 },
      n = Me(t);
    window.location.assign(n);
  }
  var pe = class {
    constructor(t, n, r) {
      $(this, "adminUrl", t);
      $(this, "token", n);
      $(this, "projectId", r);
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
        },
      };
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
          let u = d.keys ?? [],
            g = d.total ?? u.length;
          return { keys: u, total: g };
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
  function U(e) {
    return `
    <div class="empty-state">
      <div class="empty-icon">${e.icon}</div>
      <div class="empty-title">${Ae(e.title)}</div>
      <div class="empty-msg">${Ae(e.message)}</div>
      <a class="empty-cta" href="${e.ctaHref}" target="_blank" rel="noopener">${Ae(e.ctaLabel)}</a>
    </div>`;
  }
  function Ae(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function xn() {
    return window.__shipeasy ?? null;
  }
  function wn(e) {
    let t = ke(e.name),
      n = xn()?.getFlag(e.name);
    return (t !== null ? t : (n ?? e.enabled))
      ? '<span class="badge badge-on">ON</span>'
      : '<span class="badge badge-off">OFF</span>';
  }
  function En(e, t) {
    let n = (r) => (t === (r === "on" ? !0 : r === "off" ? !1 : null) ? " sel" : "");
    return `
    <div class="tog" data-gate="${e}">
      <button class="tog-btn${n("default")}" data-v="default">default</button>
      <button class="tog-btn${n("on")}" data-v="on">ON</button>
      <button class="tog-btn${n("off")}" data-v="off">OFF</button>
    </div>`;
  }
  async function dt(e, t) {
    e.innerHTML = '<div class="loading">Loading gates\u2026</div>';
    let n;
    try {
      n = await t.gates();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load gates: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = U({
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
          <td class="col-badge">${wn(a)}</td>
          <td class="col-control">${En(a.name, ke(a.name))}</td>
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
            (nt(s, d === "default" ? null : d === "on"), r());
          });
        }));
    }
    r();
    let o = () => r();
    window.addEventListener("se:state:update", o);
  }
  function kn(e) {
    let t = typeof e == "string" ? e : JSON.stringify(e);
    return t.length > 40 ? t.slice(0, 38) + "\u2026" : t;
  }
  function ct(e) {
    return Se(e) === void 0 ? "" : '<span class="badge badge-run">overridden</span>';
  }
  async function ut(e, t) {
    e.innerHTML = '<div class="loading">Loading configs\u2026</div>';
    let n;
    try {
      n = await t.configs();
    } catch (i) {
      e.innerHTML = `<div class="err">Failed to load configs: ${String(i)}</div>`;
      return;
    }
    if (n.length === 0) {
      e.innerHTML = U({
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
          let d = Se(s.name),
            u = d !== void 0 ? d : s.valueJson;
          return r.has(s.name)
            ? `
            <tr data-config="${s.name}">
              <td colspan="4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="col-name" style="flex:1">${s.name}</span>
                  ${ct(s.name)}
                  <button class="ibtn cancel-edit" data-name="${s.name}">cancel</button>
                </div>
                <textarea class="editor" data-name="${s.name}" rows="3">${JSON.stringify(u, null, 2)}</textarea>
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
            <td class="col-value">${kn(u)}</td>
            <td class="col-badge">${ct(s.name)}</td>
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
        let u = s.dataset.name,
          g = e.querySelector(`textarea[data-name="${u}"]`);
        if (g)
          try {
            let h = JSON.parse(g.value);
            (Le(u, h, d), r.delete(u), o());
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
            (Le(s.dataset.name, null), r.delete(s.dataset.name), o());
          });
        }));
    }
    o();
  }
  function Sn() {
    return window.__shipeasy ?? null;
  }
  function Ln(e) {
    return `<span class="badge ${{ running: "badge-run", draft: "badge-draft", stopped: "badge-stop", archived: "badge-stop" }[e]}">${e}</span>`;
  }
  function _n(e) {
    let t = rt(e.name),
      n = ["control", ...e.groups.map((o) => o.name)],
      r = [
        `<option value="" ${t === null ? "selected" : ""}>default</option>`,
        ...n.map((o) => `<option value="${o}" ${t === o ? "selected" : ""}>${o}</option>`),
      ].join("");
    return `<select class="sel-input exp-sel" data-name="${e.name}">${r}</select>`;
  }
  function Tn(e) {
    let t = Sn()?.getExperiment(e);
    return t
      ? t.inExperiment
        ? `<span class="badge badge-run">${t.group}</span>`
        : '<span class="badge badge-draft">not enrolled</span>'
      : "";
  }
  function Mn(e) {
    let t = e.status === "running";
    return `
    <tr>
      <td class="col-name">${e.name}</td>
      <td class="col-badge">${Ln(e.status)}</td>
      <td class="col-badge">${t ? Tn(e.name) : ""}</td>
      <td class="col-control">${t ? _n(e) : ""}</td>
    </tr>`;
  }
  function pt(e, t) {
    return e.length === 0
      ? ""
      : `
    <div class="sec-head">${t}</div>
    <div class="dt-scroll">
      <table class="dt-table">
        <thead><tr>
          <th>Name</th><th>Status</th><th>Live</th><th style="text-align:right">Override</th>
        </tr></thead>
        <tbody>${e.map(Mn).join("")}</tbody>
      </table>
    </div>`;
  }
  function ft(e, t, n, r) {
    let o = n.filter((s) => s.universe === t.name);
    if (o.length === 0) {
      e.innerHTML = U({
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
    ((e.innerHTML = pt(i, "Running") + pt(a, "Other")),
      e.querySelectorAll(".exp-sel").forEach((s) => {
        s.addEventListener("change", () => {
          let d = s.dataset.name;
          ot(d, s.value || null);
        });
      }));
  }
  async function gt(e, t) {
    e.innerHTML = '<div class="loading">Loading\u2026</div>';
    let n, r;
    try {
      [n, r] = await Promise.all([t.experiments(), t.universes()]);
    } catch (a) {
      e.innerHTML = `<div class="err">Failed to load: ${String(a)}</div>`;
      return;
    }
    if (r.length === 0) {
      e.innerHTML = U({
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
          (u) => `
          <button class="tab${u.name === o.activeUniverse ? " active" : ""}"
                  data-universe="${u.name}">${u.name}</button>`,
        )
        .join("");
      ((e.innerHTML = `
      <div class="tabs scroll">${a}</div>
      <div class="tab-body" style="overflow-y:auto;flex:1"></div>`),
        e.querySelectorAll(".tab[data-universe]").forEach((u) => {
          u.addEventListener("click", () => {
            ((o.activeUniverse = u.dataset.universe), i());
          });
        }));
      let s = e.querySelector(".tab-body"),
        d = r.find((u) => u.name === o.activeUniverse);
      ft(s, d, n, t.adminUrl);
    }
    (i(),
      window.addEventListener("se:state:update", () => {
        let a = e.querySelector(".tab-body"),
          s = r.find((d) => d.name === o.activeUniverse);
        a && s && ft(a, s, n, t.adminUrl);
      }));
  }
  var me = vn(At(), 1);
  var X = /￹([^￺￻]+)￺(?:([^￺￻]*)￺)?([^￻]*)￻/g;
  function je(e) {
    if (e.length === 0) return null;
    let t = e.find((n) => n.name === "en:prod");
    return t ? t.id : e[0].id;
  }
  function dr(e) {
    let t = new Map();
    for (let n of e) {
      if (!n.key || !n.key.trim()) continue;
      let r = n.key.split("."),
        o = r.length > 1 ? r[0] : "(root)",
        i = o === "" ? "(root)" : o,
        a = r.length > 1 ? r.slice(1) : r;
      t.has(i) || t.set(i, { segment: i, children: [] });
      let s = t.get(i);
      for (let d = 0; d < a.length; d++) {
        let u = a[d],
          g = s.children.find((h) => h.segment === u);
        (g || ((g = { segment: u, children: [] }), s.children.push(g)), (s = g));
      }
      ((s.value = n.value), (s.fullKey = n.key));
    }
    for (let n of t.values()) Ht(n);
    return t;
  }
  function Ht(e) {
    e.children.sort((t, n) => {
      let r = t.value !== void 0,
        o = n.value !== void 0;
      return r !== o ? (r ? 1 : -1) : t.segment.localeCompare(n.segment);
    });
    for (let t of e.children) Ht(t);
  }
  function P(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function Bt(e, t) {
    let n = t * 14 + 6;
    if (e.value !== void 0) {
      let o = e.fullKey ? J(e.fullKey) : null,
        i = o ?? e.value;
      return `
      <div class="tree-row leaf" style="padding-left:${n}px" data-key="${P(e.fullKey ?? "")}">
        <span class="tree-seg">${P(e.segment)}</span>
        <span class="tree-val${o !== null ? " overridden" : ""}" title="${P(i)}">${P(i)}</span>
      </div>`;
    }
    let r = e.children.map((o) => Bt(o, t + 1)).join("");
    return `
    <div class="tree-branch">
      <div class="tree-row branch" role="button" tabindex="0" style="padding-left:${n}px" data-branch>
        <span class="tree-caret">\u25BE</span>
        <span class="tree-seg">${P(e.segment)}</span>
      </div>
      <div class="tree-children">${r}</div>
    </div>`;
  }
  var K = "__se_label_target",
    ze = "__se_label_target_style",
    G = !1,
    Ke = null,
    Z = null,
    It = null,
    qt = [];
  function cr() {
    if (document.getElementById(ze)) return;
    let e = document.createElement("style");
    ((e.id = ze),
      (e.textContent = `
    .${K} {
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
    .${K}:hover,
    .${K}.__se_label_active {
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
  function $t() {
    document.getElementById(ze)?.remove();
  }
  function V(e = document.body) {
    let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
      n = [],
      r = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]),
      o;
    for (; (o = t.nextNode()); ) {
      let a = o.nodeValue ?? "";
      if (
        !a.includes(me.LABEL_MARKER_START) ||
        r.has(o.parentElement?.tagName ?? "") ||
        o.parentElement?.closest?.("[data-label]")
      )
        continue;
      let s = document.createDocumentFragment(),
        d = 0;
      X.lastIndex = 0;
      let u;
      for (; (u = X.exec(a)) !== null; ) {
        u.index > d && s.appendChild(document.createTextNode(a.slice(d, u.index)));
        let g = u[1],
          h = u[2],
          m = u[3],
          b = document.createElement("span");
        (b.setAttribute("data-label", g), h && b.setAttribute("data-variables", h));
        let v = J(g),
          p = null;
        if (h)
          try {
            p = JSON.parse(h);
          } catch {
            p = null;
          }
        ((b.textContent = v !== null ? ve(v, p) : m),
          s.appendChild(b),
          (d = u.index + u[0].length));
      }
      (d < a.length && s.appendChild(document.createTextNode(a.slice(d))), n.push([o, s]));
    }
    for (let [a, s] of n) a.parentNode?.replaceChild(s, a);
    let i = window._sei18n_t;
    for (let a of Array.from(document.querySelectorAll("[data-label]"))) {
      let s = a.textContent ?? "",
        d = a.getAttribute("data-label"),
        u = J(d);
      if (s.includes(me.LABEL_MARKER_START)) {
        X.lastIndex = 0;
        let g = X.exec(s);
        if (g) {
          g[2] && a.setAttribute("data-variables", g[2]);
          let h = g[2] ? ur(g[2]) : null;
          a.textContent = u !== null ? ve(u, h) : g[3];
        }
      } else if (i)
        try {
          let g = a.dataset.variables ? JSON.parse(a.dataset.variables) : void 0,
            h = i(d, g);
          u !== null ? (a.textContent = ve(u, g ?? null)) : h && h !== d && (a.textContent = h);
        } catch {}
    }
    for (let a of Array.from(document.querySelectorAll("*"))) {
      let s = Fe(a),
        d = new Map();
      for (let g of s) d.set(g.attr, g);
      let u = !1;
      for (let g of Array.from(a.attributes)) {
        let h = g.value;
        if (!h.includes(me.LABEL_MARKER_START)) continue;
        X.lastIndex = 0;
        let m = X.exec(h);
        if (!m) continue;
        let b = m[1],
          v = m[3],
          p = J(b);
        (a.setAttribute(g.name, p ?? v),
          d.set(g.name, { attr: g.name, key: b, original: v }),
          (u = !0));
      }
      u && Ut(a, Array.from(d.values()));
    }
    return n.length;
  }
  function Pt(e) {
    let t = [],
      n = /\{\{(\w+)\}\}/g,
      r;
    for (; (r = n.exec(e)) !== null; ) t.push(r[1]);
    return t;
  }
  function ve(e, t) {
    return t
      ? e.replace(/\{\{(\w+)\}\}/g, (n, r) => {
          let o = t[r];
          return o != null ? String(o) : `{{${r}}}`;
        })
      : e;
  }
  function ur(e) {
    try {
      return JSON.parse(e);
    } catch {
      return null;
    }
  }
  var Ct = "se-popper-host";
  function pr() {
    let e = document.getElementById(Ct);
    if (e?.shadowRoot) return e.shadowRoot;
    e || ((e = document.createElement("div")), (e.id = Ct), document.body.appendChild(e));
    let t = e.attachShadow({ mode: "open" }),
      n = document.createElement("style");
    return ((n.textContent = le), t.appendChild(n), t);
  }
  function Dt(e) {
    let n = window.__SE_BOOTSTRAP?.i18n?.strings?.[e];
    return typeof n == "string" ? n : null;
  }
  function Fe(e) {
    let t = e.getAttribute("data-label-attrs");
    if (!t) return [];
    try {
      let n = JSON.parse(t);
      if (Array.isArray(n)) return n;
    } catch {}
    return [];
  }
  function Ut(e, t) {
    if (t.length === 0) {
      e.removeAttribute("data-label-attrs");
      return;
    }
    e.setAttribute("data-label-attrs", JSON.stringify(t));
  }
  var fr = "[data-label], [data-label-attrs]";
  function re() {
    return Array.from(document.querySelectorAll(fr));
  }
  function z() {
    (Z?.remove(),
      (Z = null),
      document.querySelectorAll(`.${K}.__se_label_active`).forEach((e) => {
        e.classList.remove("__se_label_active");
      }));
  }
  function Nt(e, t) {
    if (e.kind === "text") e.target.textContent = t;
    else if (e.attr) {
      e.target.setAttribute(e.attr, t);
      let n = Fe(e.target),
        r = n.findIndex((o) => o.attr === e.attr);
      r >= 0 && ((n[r] = { ...n[r], original: t }), Ut(e.target, n));
    }
  }
  async function gr(e, t, n) {
    let r = n.querySelector(".lp-err"),
      o = n.querySelector('[data-action="save"]'),
      i = J(e.key),
      a = Dt(e.key),
      s = Pt(i ?? a ?? ""),
      d = Pt(t),
      u = s.filter((l) => !d.includes(l)),
      g = d.filter((l) => !s.includes(l));
    if (u.length || g.length) {
      if (r) {
        let l = [];
        (u.length && l.push(`missing {{${u.join("}}, {{")}}}`),
          g.length && l.push(`unknown {{${g.join("}}, {{")}}}`),
          (r.textContent = `Placeholders must match exactly \u2014 ${l.join("; ")}.`));
      }
      return;
    }
    let h = e.variables ?? {},
      m = ve(t, h);
    (Nt(e, m),
      Te(e.key, t),
      window.dispatchEvent(new CustomEvent("se:i18n:edit", { detail: { key: e.key, value: t } })));
    let b = _e(),
      v = Y(),
      p = It;
    if (!p || (!b && !v)) {
      z();
      return;
    }
    ((o.disabled = !0), (o.textContent = "Saving\u2026"), r && (r.textContent = ""));
    try {
      if (b) await p.upsertDraftKey(b, e.key, t);
      else if (v) {
        let l = qt.find((y) => y.key === e.key && y.profileId === v);
        l && (await p.updateKeyById(l.id, t));
      }
      z();
    } catch (l) {
      ((o.disabled = !1),
        (o.textContent = "Save"),
        r && (r.textContent = l instanceof Error ? l.message : String(l)));
    }
  }
  function mr(e) {
    let t = e.dataset.variables;
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  function vr(e) {
    let t = [];
    if (
      (e.hasAttribute("data-label") &&
        t.push({
          kind: "text",
          key: e.dataset.label ?? "",
          target: e,
          variables: mr(e),
          desc: e.dataset.labelDesc ?? "",
        }),
      e.hasAttribute("data-label-attrs"))
    )
      for (let n of Fe(e)) t.push({ kind: "attr", key: n.key, target: e, attr: n.attr });
    return t;
  }
  function Ot(e) {
    return e.kind === "text"
      ? (e.target.textContent ?? "")
      : e.attr
        ? (e.target.getAttribute(e.attr) ?? "")
        : "";
  }
  function hr(e, t) {
    if (e.kind === "attr") return e.attr ?? "attr";
    let n = e.key.split(".").pop() || e.key;
    return t.filter((o) => o.kind === "text" && (o.key.split(".").pop() || o.key) === n).length > 1
      ? e.key
      : n;
  }
  function br(e, t) {
    (z(), e.classList.add("__se_label_active"));
    let n = vr(e);
    if (n.length === 0) return;
    let o = Y() ?? "default",
      i = new Map(),
      a = 0,
      s = document.createElement("div");
    s.className = "label-popper";
    let d = `<div class="lp-tabs">${n
      .map((S, M) => {
        let E = hr(S, n),
          _ = M === 0 ? "lp-tab active" : "lp-tab",
          c = S.kind === "attr" ? `@<span class="lp-tab-attr">${P(S.attr ?? "")}</span>` : P(E);
        return `<button class="${_}" data-surface-idx="${M}">${c}</button>`;
      })
      .join("")}</div>`;
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
      pr().appendChild(s));
    let g = s.querySelector(".lp-key"),
      h = s.querySelector(".lp-body"),
      m = s.querySelector(".lp-err"),
      b = s.querySelector('[data-action="save"]'),
      v = s.querySelector('[data-action="reset"]');
    function p() {
      return n[a];
    }
    function l() {
      let S = p();
      (i.has(a) || i.set(a, Ot(S)), (g.textContent = S.key));
      let M = Dt(S.key),
        _ = J(S.key) ?? M ?? Ot(S),
        c = S.variables ?? {},
        f = Object.entries(c),
        x = f.length
          ? `<div class="lp-field">
          <label>Variables (read-only)</label>
          <div class="lp-vars">${f.map(([I, q]) => `<div class="lp-var"><span class="lp-var-k mono">${P(`{{${I}}}`)}</span><span class="lp-var-v">${P(String(q))}</span></div>`).join("")}</div>
        </div>`
          : "",
        k = S.desc ?? "",
        B = S.kind === "attr" ? `attribute \xB7 ${P(S.attr ?? "")}` : "text content";
      ((h.innerHTML = `
      <div class="lp-field">
        <label>Value</label>
        <textarea class="lp-input" spellcheck="false">${P(_)}</textarea>
      </div>
      ${x}
      <div class="lp-field">
        <label>Current profile</label>
        <span>${P(o)}</span>
      </div>
      <div class="lp-field">
        <label>Surface</label>
        <span class="mono">${B}</span>
      </div>
      <div class="lp-field">
        <label>Description</label>
        <span class="${k ? "" : "empty"}">${k ? P(k) : "No description"}</span>
      </div>`),
        (m.textContent = ""),
        (b.disabled = !1),
        (b.textContent = "Save"));
      let H = h.querySelector(".lp-input");
      (H.focus(), H.select());
    }
    (s.querySelectorAll(".lp-tab").forEach((S) => {
      S.addEventListener("click", () => {
        let M = Number(S.dataset.surfaceIdx);
        M !== a &&
          ((a = M),
          s.querySelectorAll(".lp-tab").forEach((E, _) => {
            E.classList.toggle("active", _ === a);
          }),
          l());
      });
    }),
      l());
    let y = e.getBoundingClientRect(),
      w = s.offsetHeight,
      R = s.offsetWidth,
      C = 8,
      L = y.bottom + C;
    L + w > window.innerHeight - 8 && (L = Math.max(8, y.top - w - C));
    let A = y.left;
    (A + R > window.innerWidth - 8 && (A = Math.max(8, window.innerWidth - R - 8)),
      (s.style.top = `${L}px`),
      (s.style.left = `${A}px`),
      s.querySelector(".lp-close").addEventListener("click", z),
      b.addEventListener("click", () => {
        let S = h.querySelector(".lp-input");
        gr(p(), S.value, s);
      }),
      v.addEventListener("click", () => {
        let S = p(),
          M = i.get(a) ?? "";
        (Nt(S, M),
          Te(S.key, null),
          window.dispatchEvent(
            new CustomEvent("se:i18n:edit", { detail: { key: S.key, value: null } }),
          ),
          z());
      }),
      s.addEventListener("click", (S) => S.stopPropagation()),
      s.addEventListener("mousedown", (S) => S.stopPropagation()),
      (Z = s));
  }
  function Q(e, t, n) {
    if (((G = e), Ke?.(), (Ke = null), !e)) {
      z();
      for (let m of re()) m.classList.remove(K);
      $t();
      return;
    }
    cr();
    for (let m of re()) m.classList.add(K);
    function r(m) {
      return Z !== null && m.composedPath().includes(Z);
    }
    function o(m) {
      for (let b of m.composedPath())
        if (
          b instanceof HTMLElement &&
          (b.hasAttribute("data-label") || b.hasAttribute("data-label-attrs"))
        )
          return b;
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
    function a(m) {
      return "altKey" in m && typeof m.altKey == "boolean" && m.altKey;
    }
    function s(m) {
      r(m) ||
        (o(m) && (a(m) || (m.preventDefault(), m.stopPropagation(), m.stopImmediatePropagation())));
    }
    function d(m) {
      if (r(m)) return;
      let b = o(m);
      b &&
        (a(m) || (m.preventDefault(), m.stopPropagation(), m.stopImmediatePropagation(), br(b, t)));
    }
    function u(m) {
      Z && (r(m) || o(m) || z());
    }
    function g(m) {
      m.key === "Escape" && z();
    }
    let h = new MutationObserver(() => {
      if (G) {
        for (let m of re()) m.classList.add(K);
        n();
      }
    });
    h.observe(document.body, {
      childList: !0,
      subtree: !0,
      attributeFilter: ["data-label", "data-label-attrs"],
    });
    for (let m of i) document.addEventListener(m, s, !0);
    (document.addEventListener("click", d, !0),
      document.addEventListener("mousedown", u, !0),
      document.addEventListener("keydown", g),
      (Ke = () => {
        for (let m of i) document.removeEventListener(m, s, !0);
        (document.removeEventListener("click", d, !0),
          document.removeEventListener("mousedown", u, !0),
          document.removeEventListener("keydown", g),
          h.disconnect());
        for (let m of re()) m.classList.remove(K);
        $t();
      }));
  }
  async function jt(e, t, n, r) {
    ((e.innerHTML = '<div class="loading">Loading i18n data\u2026</div>'),
      (n.innerHTML = ""),
      (It = t));
    let o, i, a;
    try {
      [o, i] = await Promise.all([t.profiles(), t.drafts()]);
      let p = Y() ?? je(o);
      a = await t.keys(p ?? void 0);
    } catch (v) {
      e.innerHTML = `<div class="err">Failed to load i18n data: ${String(v)}</div>`;
      return;
    }
    qt = a;
    let s = dr(a),
      d = Array.from(s.keys()),
      u = { activeChunk: d[0] ?? null };
    function g() {
      let p = Y() ?? je(o);
      return o.find((l) => l.id === p)?.name ?? "(none)";
    }
    function h() {
      let v = `<div class="i18n-profile-header" style="padding:6px 8px;border-bottom:1px solid var(--border,#222);font:500 12px system-ui;color:var(--muted,#9aa)">Profile: <span style="color:var(--fg,#ddd);font-weight:600">${P(g())}</span></div>`;
      if (d.length === 0) {
        e.innerHTML =
          v +
          U({
            icon: "\u{1F310}",
            title: "No translation keys yet",
            message: "Add keys in the admin and group them by namespace (e.g. checkout.title).",
            ctaLabel: "Create new key",
            ctaHref: `${t.adminUrl}/dashboard/i18n/keys`,
          });
        return;
      }
      let p = d
          .map(
            (w) =>
              `<button class="tab${w === u.activeChunk ? " active" : ""}" data-chunk="${P(w)}">${P(w)}</button>`,
          )
          .join(""),
        l = u.activeChunk ? s.get(u.activeChunk) : null,
        y = l ? l.children.map((w) => Bt(w, 0)).join("") : "";
      ((e.innerHTML = `
      ${v}
      <div class="tabs scroll" id="chunk-tabs">${p}</div>
      <div class="tree-body" style="flex:1;overflow-y:auto;padding:6px 4px">${y}</div>`),
        e.querySelectorAll(".tab[data-chunk]").forEach((w) => {
          w.addEventListener("click", () => {
            ((u.activeChunk = w.dataset.chunk), h());
          });
        }),
        e.querySelectorAll(".tree-row.branch[data-branch]").forEach((w) => {
          let R = () => {
            let C = w.parentElement;
            if (!C) return;
            let L = C.classList.toggle("collapsed"),
              A = w.querySelector(".tree-caret");
            A && (A.textContent = L ? "\u25B8" : "\u25BE");
          };
          (w.addEventListener("click", R),
            w.addEventListener("keydown", (C) => {
              (C.key === "Enter" || C.key === " ") && (C.preventDefault(), R());
            }));
        }));
    }
    function m() {
      let v = Y() ?? je(o) ?? "",
        p = _e() ?? "";
      V();
      let l = re().length,
        y = G
          ? `Editing ${l} label${l === 1 ? "" : "s"}`
          : l > 0
            ? `Edit labels (${l})`
            : "Edit labels",
        w = G
          ? "Disable in-page label editing"
          : l === 0
            ? "Enable in-page label editing \u2014 reloads page with ?se_edit_labels=1 to scan all translation strings"
            : "Toggle in-page label editing (reloads page)",
        R = o
          .map(
            (L) =>
              `<option value="${P(L.id)}" ${v === L.id ? "selected" : ""}>${P(L.name)}</option>`,
          )
          .join(""),
        C = [
          '<option value="">No draft</option>',
          ...i.map(
            (L) =>
              `<option value="${P(L.id)}" ${p === L.id ? "selected" : ""}>${P(L.name)}</option>`,
          ),
        ].join("");
      ((n.innerHTML = `
      <button class="subfoot-btn${G ? " on" : ""}" id="se-edit-toggle" title="${P(w)}">
        <span class="dot"></span>
        ${P(y)}
      </button>
      <select class="subfoot-sel" id="se-profile-sel" title="Active profile">${R}</select>
      <select class="subfoot-sel" id="se-draft-sel" title="Active draft">${C}</select>`),
        n.querySelector("#se-edit-toggle").addEventListener("click", () => {
          W() ? Ee(!1) : G ? (Q(!1, r, () => m()), m()) : Ee(!0);
        }),
        n.querySelector("#se-profile-sel").addEventListener("change", (L) => {
          let A = L.target.value || null;
          st(A);
        }),
        n.querySelector("#se-draft-sel").addEventListener("change", (L) => {
          let A = L.target.value || null;
          at(A);
        }));
    }
    (W() && (V(), G || Q(!0, r, () => m())),
      h(),
      m(),
      window.i18n?.on?.("update", () => {
        (V(), m());
      }));
  }
  function oe(e, t) {
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
      (n.removeEventListener("click", u),
        document.removeEventListener("keydown", g),
        n.remove(),
        t.onClose?.());
    }
    function u(h) {
      h.target === n && d();
    }
    function g(h) {
      h.key === "Escape" && d();
    }
    return (
      n.addEventListener("click", u),
      document.addEventListener("keydown", g),
      a.addEventListener("click", d),
      e.appendChild(n),
      { body: s, root: r, close: d }
    );
  }
  function Kt(e) {
    if (!e) return () => {};
    let t = e.style.visibility;
    return (
      (e.style.visibility = "hidden"),
      () => {
        e.style.visibility = t;
      }
    );
  }
  async function zt(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !1 }),
      n = Kt(e);
    try {
      let r = document.createElement("video");
      ((r.srcObject = t),
        (r.muted = !0),
        (r.playsInline = !0),
        await new Promise((u, g) => {
          let h = setTimeout(() => g(new Error("Capture stream timed out")), 5e3);
          ((r.onloadedmetadata = () => {
            (clearTimeout(h), u());
          }),
            (r.onerror = () => {
              (clearTimeout(h), g(new Error("Capture stream errored")));
            }));
        }),
        await r.play(),
        await new Promise((u) => requestAnimationFrame(() => u(null))),
        await new Promise((u) => requestAnimationFrame(() => u(null))));
      let o = r.videoWidth,
        i = r.videoHeight;
      if (!o || !i) throw new Error("Capture stream returned no frames.");
      let a = document.createElement("canvas");
      ((a.width = o), (a.height = i));
      let s = a.getContext("2d");
      if (!s) throw new Error("Canvas 2d context unavailable");
      return (
        s.drawImage(r, 0, 0, o, i),
        await new Promise((u, g) => {
          a.toBlob((h) => (h ? u(h) : g(new Error("toBlob failed"))), "image/png");
        })
      );
    } finally {
      (t.getTracks().forEach((r) => r.stop()), n());
    }
  }
  async function Ft(e) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not supported in this browser.");
    let t = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !0 }),
      n = Kt(e);
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
        return new Promise((d, u) => {
          if (i.state === "inactive") {
            if ((s(), a.length === 0)) {
              u(new Error("No recording data."));
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
            i.addEventListener("error", (g) => u(g), { once: !0 }),
            i.stop());
        });
      },
      cancel() {
        (i.state !== "inactive" && i.stop(), s());
      },
    };
  }
  var Wt = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];
  async function Jt(e) {
    let t = URL.createObjectURL(e),
      n = await new Promise((c, f) => {
        let x = new Image();
        ((x.onload = () => c(x)),
          (x.onerror = () => f(new Error("Failed to load screenshot for annotation."))),
          (x.src = t));
      }),
      r = document.createElement("div");
    r.className = "se-annot";
    let o = document.createElement("div");
    ((o.className = "se-annot-toolbar"), r.appendChild(o));
    let i = "pen",
      a = Wt[0],
      s = [];
    function d(c) {
      ((i = c),
        o
          .querySelectorAll("[data-tool]")
          .forEach((f) => f.classList.toggle("on", f.dataset.tool === c)));
    }
    function u(c, f, x) {
      let k = document.createElement("button");
      return (
        (k.type = "button"),
        (k.className = "se-annot-btn"),
        (k.dataset.tool = c),
        (k.textContent = f),
        (k.title = x),
        k.addEventListener("click", () => d(c)),
        k
      );
    }
    (o.appendChild(u("pen", "\u270E draw", "Freehand draw (P)")),
      o.appendChild(u("arrow", "\u2197 arrow", "Arrow (A)")),
      o.appendChild(u("rect", "\u25AD rect", "Rectangle (R)")),
      o.appendChild(u("text", "T text", "Text (T)")),
      d("pen"));
    let g = document.createElement("span");
    ((g.className = "se-annot-sep"), o.appendChild(g));
    for (let c of Wt) {
      let f = document.createElement("button");
      ((f.type = "button"),
        (f.className = "se-annot-swatch"),
        (f.dataset.color = c),
        (f.style.background = c),
        c === a && f.classList.add("on"),
        f.addEventListener("click", () => {
          ((a = c),
            o
              .querySelectorAll("[data-color]")
              .forEach((x) => x.classList.toggle("on", x.dataset.color === c)));
        }),
        o.appendChild(f));
    }
    let h = document.createElement("button");
    ((h.type = "button"),
      (h.className = "se-annot-btn"),
      (h.textContent = "\u21B6 undo"),
      (h.title = "Undo (Ctrl/Cmd+Z)"),
      h.addEventListener("click", () => {
        (s.pop(), L());
      }),
      o.appendChild(h));
    let m = document.createElement("button");
    ((m.type = "button"),
      (m.className = "se-annot-btn"),
      (m.textContent = "clear"),
      m.addEventListener("click", () => {
        ((s.length = 0), L());
      }),
      o.appendChild(m));
    let b = document.createElement("div");
    ((b.className = "se-annot-stage"), r.appendChild(b));
    let v = document.createElement("canvas");
    ((v.width = n.naturalWidth),
      (v.height = n.naturalHeight),
      (v.className = "se-annot-canvas"),
      (v.style.cursor = "crosshair"),
      (v.style.touchAction = "none"),
      b.appendChild(v));
    let p = v.getContext("2d"),
      l = null;
    function y(c) {
      let f = v.getBoundingClientRect(),
        x = v.width / f.width,
        k = v.height / f.height;
      return { x: (c.clientX - f.left) * x, y: (c.clientY - f.top) * k };
    }
    function w() {
      return Math.max(2, Math.round(n.naturalWidth / 400));
    }
    function R() {
      return Math.max(14, Math.round(n.naturalWidth / 60));
    }
    function C(c) {
      if (
        (p.save(),
        (p.strokeStyle = c.color),
        (p.fillStyle = c.color),
        (p.lineWidth = w()),
        (p.lineCap = "round"),
        (p.lineJoin = "round"),
        c.tool === "rect")
      ) {
        let f = Math.min(c.x1, c.x2),
          x = Math.min(c.y1, c.y2),
          k = Math.abs(c.x2 - c.x1),
          B = Math.abs(c.y2 - c.y1);
        p.strokeRect(f, x, k, B);
      } else if (c.tool === "arrow") {
        (p.beginPath(), p.moveTo(c.x1, c.y1), p.lineTo(c.x2, c.y2), p.stroke());
        let f = Math.atan2(c.y2 - c.y1, c.x2 - c.x1),
          x = w() * 5;
        (p.beginPath(),
          p.moveTo(c.x2, c.y2),
          p.lineTo(c.x2 - x * Math.cos(f - Math.PI / 6), c.y2 - x * Math.sin(f - Math.PI / 6)),
          p.lineTo(c.x2 - x * Math.cos(f + Math.PI / 6), c.y2 - x * Math.sin(f + Math.PI / 6)),
          p.closePath(),
          p.fill());
      } else if (c.tool === "pen")
        if (c.points.length < 2) {
          if (c.points.length === 1) {
            let f = c.points[0];
            (p.beginPath(), p.arc(f.x, f.y, w() / 2, 0, Math.PI * 2), p.fill());
          }
        } else {
          (p.beginPath(), p.moveTo(c.points[0].x, c.points[0].y));
          for (let f = 1; f < c.points.length; f++) p.lineTo(c.points[f].x, c.points[f].y);
          p.stroke();
        }
      else if (c.tool === "text" && c.text) {
        let f = R();
        ((p.font = `600 ${f}px ui-sans-serif, system-ui, sans-serif`), (p.textBaseline = "top"));
        let x = f * 0.3,
          B = p.measureText(c.text).width + x * 2,
          H = f + x * 2;
        ((p.fillStyle = "rgba(0,0,0,0.55)"),
          p.fillRect(c.x1, c.y1, B, H),
          (p.fillStyle = c.color),
          p.fillText(c.text, c.x1 + x, c.y1 + x));
      }
      p.restore();
    }
    function L(c) {
      (p.clearRect(0, 0, v.width, v.height), p.drawImage(n, 0, 0));
      for (let f of s) C(f);
      c && C(c);
    }
    L();
    let A = null;
    function S(c, f) {
      A && A.blur();
      let x = v.getBoundingClientRect(),
        k = b.getBoundingClientRect(),
        B = x.width / v.width,
        H = x.height / v.height,
        I = R() * B,
        q = I * 0.3,
        T = document.createElement("input");
      ((T.type = "text"),
        (T.className = "se-annot-text-input"),
        (T.style.position = "absolute"),
        (T.style.left = `${x.left - k.left + c * B}px`),
        (T.style.top = `${x.top - k.top + f * H}px`),
        (T.style.color = a),
        (T.style.background = "rgba(0,0,0,0.55)"),
        (T.style.border = `1px dashed ${a}`),
        (T.style.outline = "none"),
        (T.style.padding = `${q}px`),
        (T.style.font = `600 ${I}px ui-sans-serif, system-ui, sans-serif`),
        (T.style.minWidth = `${I * 4}px`),
        (T.style.lineHeight = "1"),
        (T.placeholder = "type\u2026"));
      let D = !1;
      function Xe() {
        if (D) return;
        D = !0;
        let N = T.value.trim();
        (T.remove(),
          (A = null),
          N && (s.push({ tool: "text", color: a, x1: c, y1: f, text: N }), L()));
      }
      function an() {
        D || ((D = !0), T.remove(), (A = null));
      }
      (T.addEventListener("keydown", (N) => {
        (N.key === "Enter"
          ? (N.preventDefault(), Xe())
          : N.key === "Escape" && (N.preventDefault(), an()),
          N.stopPropagation());
      }),
        T.addEventListener("blur", Xe),
        b.appendChild(T),
        (A = T),
        setTimeout(() => T.focus(), 0));
    }
    let M = null;
    (v.addEventListener("pointermove", (c) => {
      ((l = y(c)),
        M &&
          (M.kind === "pen"
            ? (M.shape.points.push(l), L())
            : L({
                tool: i === "text" ? "rect" : i,
                color: a,
                x1: M.x1,
                y1: M.y1,
                x2: l.x,
                y2: l.y,
              })));
    }),
      v.addEventListener("pointerdown", (c) => {
        c.preventDefault();
        let f = y(c);
        if (((l = f), i === "text")) {
          S(f.x, f.y);
          return;
        }
        if (i === "pen") {
          let x = { tool: "pen", color: a, points: [f] };
          (s.push(x), (M = { kind: "pen", shape: x }), v.setPointerCapture(c.pointerId), L());
          return;
        }
        ((M = { kind: "shape", x1: f.x, y1: f.y }), v.setPointerCapture(c.pointerId));
      }),
      v.addEventListener("pointerup", (c) => {
        if (!M) return;
        let f = y(c);
        if (M.kind === "shape") {
          let x = Math.abs(f.x - M.x1),
            k = Math.abs(f.y - M.y1);
          (x > 4 || k > 4) &&
            (i === "arrow" || i === "rect") &&
            s.push({ tool: i, color: a, x1: M.x1, y1: M.y1, x2: f.x, y2: f.y });
        }
        ((M = null), L());
      }));
    function E(c) {
      if (!(c instanceof HTMLElement)) return !1;
      let f = c.tagName;
      return f === "INPUT" || f === "TEXTAREA" || c.isContentEditable;
    }
    function _(c) {
      if (!r.isConnected) {
        document.removeEventListener("keydown", _, !0);
        return;
      }
      if (E(c.target)) return;
      let f = c.key.toLowerCase();
      if ((c.ctrlKey || c.metaKey) && f === "z") {
        (c.preventDefault(), s.pop(), L());
        return;
      }
      if (!(c.ctrlKey || c.metaKey || c.altKey))
        if (f === "t") {
          (c.preventDefault(), d("text"));
          let x = l ?? { x: v.width / 2, y: v.height / 2 };
          S(x.x, x.y);
        } else f === "p" ? d("pen") : f === "a" ? d("arrow") : f === "r" && d("rect");
    }
    return (
      document.addEventListener("keydown", _, !0),
      {
        root: r,
        async export() {
          (A && A.blur(), await new Promise((f) => requestAnimationFrame(() => f(null))));
          let c = await new Promise((f, x) => {
            v.toBlob((k) => (k ? f(k) : x(new Error("toBlob failed"))), "image/png");
          });
          return (URL.revokeObjectURL(t), document.removeEventListener("keydown", _, !0), c);
        },
      }
    );
  }
  function se(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function yr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "resolved" ? "badge-on" : e === "wont_fix" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function xr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Gt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading bugs\u2026</div>';
      let i;
      try {
        i = await t.bugs();
      } catch (s) {
        ((e.innerHTML = `<div class="err">Failed to load bugs: ${se(String(s))}</div>`), o());
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
                <div class="row-name">${se(s.title)}</div>
                <div class="row-sub">${xr(s.createdAt)}${s.reporterEmail ? ` \xB7 ${se(s.reporterEmail)}` : ""}</div>
              </div>
              ${yr(s.status)}
            </a>`,
            )
            .join("")),
        o());
    }
    function o() {
      e.querySelector("#se-file-bug")?.addEventListener("click", () => wr(t, n, r));
    }
    await r();
  }
  function wr(e, t, n) {
    let r = oe(t, { title: "File a bug", size: "lg" }),
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
      u = r.body.querySelector("#se-b-expected"),
      g = r.body.querySelector("#se-b-attach"),
      h = r.body.querySelector("#se-b-status"),
      m = r.body.querySelector("#se-b-file"),
      b = r.body.querySelector("#se-b-record");
    function v() {
      if (o.length === 0) {
        g.innerHTML = "";
        return;
      }
      ((g.innerHTML = o
        .map(
          (l, y) => `
          <div class="se-attach-item">
            <span>${se(l.filename)} <span class="dim">(${(l.blob.size / 1024).toFixed(0)} KB)</span></span>
            <button type="button" class="ibtn danger" data-idx="${y}">remove</button>
          </div>`,
        )
        .join("")),
        g.querySelectorAll("button[data-idx]").forEach((l) => {
          l.addEventListener("click", () => {
            (o.splice(Number(l.dataset.idx), 1), v());
          });
        }));
    }
    function p(l, y = !1) {
      ((h.textContent = l), (h.style.color = y ? "var(--se-danger)" : "var(--se-fg-3)"));
    }
    (r.body.querySelector("#se-b-screenshot").addEventListener("click", async () => {
      p("Pick a screen/tab to capture\u2026");
      try {
        let l = await zt(t.host);
        (p(""),
          Er(t, l, (y) => {
            (o.push({ kind: "screenshot", filename: `screenshot-${Date.now()}.png`, blob: y }),
              v());
          }));
      } catch (l) {
        p(String(l instanceof Error ? l.message : l), !0);
      }
    }),
      b.addEventListener("click", async () => {
        if (i) {
          try {
            ((b.disabled = !0), p("Finalizing recording\u2026"));
            let l = await i.stop();
            ((i = null),
              (b.textContent = "\u23FA Record screen"),
              b.classList.remove("danger"),
              o.push({ kind: "recording", filename: `recording-${Date.now()}.webm`, blob: l }),
              v(),
              p(""));
          } catch (l) {
            p(String(l instanceof Error ? l.message : l), !0);
          } finally {
            b.disabled = !1;
          }
          return;
        }
        p("Pick a screen/tab to record\u2026");
        try {
          ((i = await Ft(t.host)),
            (b.textContent = "\u25A0 Stop recording"),
            b.classList.add("danger"),
            p("Recording\u2026 click stop when done."));
        } catch (l) {
          (p(String(l instanceof Error ? l.message : l), !0), (i = null));
        }
      }),
      r.body.querySelector("#se-b-upload").addEventListener("click", () => m.click()),
      m.addEventListener("change", () => {
        let l = m.files?.[0];
        l && (o.push({ kind: "file", filename: l.name, blob: l }), (m.value = ""), v());
      }),
      r.body.querySelector("#se-b-cancel").addEventListener("click", () => {
        (i && i.cancel(), r.close());
      }),
      r.body.querySelector("#se-b-submit").addEventListener("click", async () => {
        let l = r.body.querySelector("#se-b-submit"),
          y = a.value.trim();
        if (!y) {
          (p("Title is required", !0), a.focus());
          return;
        }
        ((l.disabled = !0), p("Submitting\u2026"));
        try {
          let w = await e.createBug({
            title: y,
            stepsToReproduce: s.value,
            actualResult: d.value,
            expectedResult: u.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          });
          for (let R = 0; R < o.length; R++) {
            let C = o[R];
            (p(`Uploading attachment ${R + 1}/${o.length}\u2026`),
              await e.uploadAttachment({
                reportKind: "bug",
                reportId: w.id,
                kind: C.kind,
                filename: C.filename,
                blob: C.blob,
              }));
          }
          (r.close(), n());
        } catch (w) {
          (p(String(w instanceof Error ? w.message : w), !0), (l.disabled = !1));
        }
      }));
  }
  function Er(e, t, n) {
    let r = oe(e, { title: "Annotate screenshot", size: "lg" });
    r.body.innerHTML = `<div class="se-annot-host" id="se-annot-host"></div>
    <div class="se-modal-footer">
      <button type="button" class="ibtn" id="se-a-cancel">Cancel</button>
      <button type="button" class="ibtn pri" id="se-a-save">Use screenshot</button>
    </div>`;
    let o = r.body.querySelector("#se-annot-host");
    ((o.innerHTML = '<div class="loading">Preparing annotator\u2026</div>'),
      Jt(t)
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
          o.innerHTML = `<div class="err">${se(String(i))}</div>`;
        }));
  }
  function We(e) {
    return e.replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    );
  }
  function kr(e) {
    return `<span class="badge ${e === "open" ? "badge-run" : e === "shipped" ? "badge-on" : e === "declined" ? "badge-off" : "badge-draft"}">${e.replace("_", " ")}</span>`;
  }
  function Sr(e) {
    let t = e.replace("_", " ");
    return `<span class="badge ${e === "critical" ? "badge-off" : e === "important" ? "badge-run" : "badge-draft"}">${t}</span>`;
  }
  function Lr(e) {
    let t = Date.now() - Date.parse(e),
      n = Math.floor(t / 6e4);
    if (n < 1) return "just now";
    if (n < 60) return `${n}m ago`;
    let r = Math.floor(n / 60);
    return r < 24 ? `${r}h ago` : `${Math.floor(r / 24)}d ago`;
  }
  async function Vt(e, t, n) {
    async function r() {
      e.innerHTML = '<div class="loading">Loading feature requests\u2026</div>';
      let o;
      try {
        o = await t.featureRequests();
      } catch (a) {
        e.innerHTML = `<div class="err">Failed to load feature requests: ${We(String(a))}</div>`;
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
                <div class="row-name">${We(a.title)}</div>
                <div class="row-sub">${Lr(a.createdAt)}${a.reporterEmail ? ` \xB7 ${We(a.reporterEmail)}` : ""}</div>
              </div>
              ${Sr(a.importance)}
              ${kr(a.status)}
            </a>`,
            )
            .join("")),
        e.querySelector("#se-file-fr").addEventListener("click", () => _r(t, n, r)));
    }
    await r();
  }
  function _r(e, t, n) {
    let r = oe(t, { title: "Request a feature", size: "lg" });
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
        let u = o.value.trim();
        if (!u) {
          ((d.textContent = "Title is required"), (d.style.color = "var(--se-danger)"), o.focus());
          return;
        }
        let g = r.body.querySelector("#se-f-submit");
        ((g.disabled = !0),
          (d.textContent = "Submitting\u2026"),
          (d.style.color = "var(--se-fg-3)"));
        try {
          (await e.createFeatureRequest({
            title: u,
            description: i.value,
            useCase: a.value,
            importance: s.value,
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
          }),
            r.close(),
            n());
        } catch (h) {
          ((d.textContent = String(h instanceof Error ? h.message : h)),
            (d.style.color = "var(--se-danger)"),
            (g.disabled = !1));
        }
      }));
  }
  function Yt(e, t) {
    return t ? (t.startsWith("*.") ? e.endsWith(t.slice(1)) : e === t || e === `www.${t}`) : !1;
  }
  var Tr = {
      gates: "gates",
      configs: "configs",
      experiments: "experiments",
      i18n: "translations",
      bugs: "feedback",
      features: "feedback",
    },
    Je = "se_dt_project";
  function Mr() {
    try {
      let e = sessionStorage.getItem(Je);
      if (e) return JSON.parse(e);
    } catch {}
    return null;
  }
  function he(e) {
    try {
      e === null ? sessionStorage.removeItem(Je) : sessionStorage.setItem(Je, JSON.stringify(e));
    } catch {}
  }
  var Rr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/><circle cx="8" cy="12" r="3"/></svg>',
    Ar =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2.25"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.25"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="18" r="2.25"/></svg>',
    $r =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></svg>',
    Pr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h8"/><path d="M8 3v2"/><path d="M5.5 11s2.5-2 4-6"/><path d="M5 11s2 4 5 4"/><path d="M11 21l3.5-9 3.5 9"/><path d="M12.5 18h4"/></svg>',
    Cr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V4a4 4 0 0 1 8 0v2"/><rect x="6" y="6" width="12" height="14" rx="6"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M3 18l3-2"/><path d="M21 18l-3-2"/><path d="M3 6l3 2"/><path d="M21 6l-3 2"/></svg>',
    Or =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8z"/></svg>',
    Hr =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    Br =
      '<svg viewBox="0 0 200 200" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"/></svg>',
    ie = {
      gates: { icon: Rr, label: "Gates" },
      configs: { icon: Ar, label: "Configs" },
      experiments: { icon: $r, label: "Experiments" },
      i18n: { icon: Pr, label: "Translations" },
      bugs: { icon: Cr, label: "Bugs" },
      features: { icon: Or, label: "Feature requests" },
    },
    nn = "se_l_overlay",
    Ge = "se_l_active_panel";
  function Ir() {
    try {
      let e = sessionStorage.getItem(Ge);
      if (e && e in ie) return e;
    } catch {}
    return null;
  }
  function Xt(e) {
    try {
      e === null ? sessionStorage.removeItem(Ge) : sessionStorage.setItem(Ge, e);
    } catch {}
  }
  var Ve = 240,
    Zt = 580,
    Ye = 180,
    Qt = 700,
    en = { edge: "right", offsetPct: 50, panelWidth: 440, panelHeight: 460 };
  function qr() {
    try {
      let e = localStorage.getItem(nn);
      if (e) return { ...en, ...JSON.parse(e) };
    } catch {}
    return { ...en };
  }
  function tn(e) {
    try {
      localStorage.setItem(nn, JSON.stringify(e));
    } catch {}
  }
  function Dr(e, t) {
    let n = window.innerWidth,
      r = window.innerHeight,
      o = [
        [n - e, "right"],
        [e, "left"],
        [t, "top"],
        [r - t, "bottom"],
      ];
    o.sort((d, u) => d[0] - u[0]);
    let i = o[0][1],
      s = Math.max(5, Math.min(95, i === "left" || i === "right" ? (t / r) * 100 : (e / n) * 100));
    return { edge: i, offsetPct: s };
  }
  function ae(e, t, n, r) {
    let { edge: o, offsetPct: i, panelWidth: a, panelHeight: s } = r,
      d = window.innerWidth,
      u = window.innerHeight,
      g = o === "left" || o === "right",
      h = Math.max(Ve, Math.min(a, d - 80)),
      m = Math.max(Ye, Math.min(s, u - 40)),
      b = (i / 100) * (g ? u : d),
      v = e.getBoundingClientRect(),
      p = g ? v.width || 52 : v.height || 52,
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
    let y = t.style;
    if (
      ((y.top = y.bottom = y.left = y.right = y.transform = ""),
      (y.borderTop = y.borderBottom = y.borderLeft = y.borderRight = ""),
      (y.width = h + "px"),
      (y.height = m + "px"),
      (t.dataset.edge = o),
      o === "right")
    ) {
      let R = Math.max(10, Math.min(u - m - 10, b - m / 2));
      ((y.right = p + "px"),
        (y.top = R + "px"),
        (y.borderRadius = "10px 0 0 10px"),
        (y.borderRight = "none"),
        (y.boxShadow = "-6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "left") {
      let R = Math.max(10, Math.min(u - m - 10, b - m / 2));
      ((y.left = p + "px"),
        (y.top = R + "px"),
        (y.borderRadius = "0 10px 10px 0"),
        (y.borderLeft = "none"),
        (y.boxShadow = "6px 0 24px rgba(0,0,0,0.4)"));
    } else if (o === "top") {
      let R = Math.max(10, Math.min(d - h - 10, b - h / 2));
      ((y.top = p + "px"),
        (y.left = R + "px"),
        (y.borderRadius = "0 0 10px 10px"),
        (y.borderTop = "none"),
        (y.boxShadow = "0 6px 24px rgba(0,0,0,0.4)"));
    } else {
      let R = Math.max(10, Math.min(d - h - 10, b - h / 2));
      ((y.bottom = p + "px"),
        (y.left = R + "px"),
        (y.borderRadius = "10px 10px 0 0"),
        (y.borderBottom = "none"),
        (y.boxShadow = "0 -6px 24px rgba(0,0,0,0.4)"));
    }
    let w = n.style;
    ((w.top = w.bottom = w.left = w.right = w.width = w.height = ""),
      (n.dataset.dir = g ? "ew" : "ns"),
      g
        ? ((w.width = "10px"),
          (w.top = "0"),
          (w.bottom = "0"),
          (n.style.cursor = "ew-resize"),
          o === "right" ? (w.left = "0") : (w.right = "0"))
        : ((w.height = "10px"),
          (w.left = "0"),
          (w.right = "0"),
          (n.style.cursor = "ns-resize"),
          o === "top" ? (w.bottom = "0") : (w.top = "0")));
  }
  function rn(e) {
    let t = document.createElement("div");
    t.setAttribute("id", "shipeasy-devtools");
    let n = t.attachShadow({ mode: "open" });
    n.innerHTML = `<style>${le}</style><div id="toolbar"></div><div id="panel"></div>`;
    let r = n.getElementById("toolbar"),
      o = n.getElementById("panel");
    ((r.className = "toolbar"), (o.className = "panel"));
    let i = document.createElement("div");
    ((i.className = "resize-handle"), o.appendChild(i));
    let a = document.createElement("div");
    ((a.className = "panel-inner"), o.appendChild(a));
    let s = qr(),
      d = null,
      u = Ze(),
      g = Mr();
    g && u && g.id !== u.projectId && ((g = null), he(null));
    let h = Ir();
    requestAnimationFrame(() => ae(r, o, i, s));
    let m = document.createElement("div");
    ((m.className = "drag-handle"),
      (m.title = "ShipEasy DevTools \u2014 drag to reposition"),
      (m.innerHTML = Br),
      r.appendChild(m),
      m.addEventListener("mousedown", (E) => {
        (E.preventDefault(), m.classList.add("dragging"));
        let _ = (f) => {
            let { edge: x, offsetPct: k } = Dr(f.clientX, f.clientY);
            ((s = { ...s, edge: x, offsetPct: k }), ae(r, o, i, s));
          },
          c = () => {
            (m.classList.remove("dragging"),
              document.removeEventListener("mousemove", _),
              document.removeEventListener("mouseup", c),
              tn(s));
          };
        (document.addEventListener("mousemove", _), document.addEventListener("mouseup", c));
      }));
    let b = new Map();
    function v(E) {
      return g ? g.modules[Tr[E]] : !0;
    }
    function p() {
      for (let E of b.values()) E.remove();
      b.clear();
      for (let [E, { icon: _, label: c }] of Object.entries(ie)) {
        if (!v(E)) continue;
        let f = document.createElement("button");
        ((f.className = "btn"),
          (f.title = c),
          (f.innerHTML = _),
          f.addEventListener("click", () => R(E)),
          r.appendChild(f),
          b.set(E, f));
      }
      d && !v(d) && w();
    }
    (p(),
      i.addEventListener("mousedown", (E) => {
        (E.preventDefault(), E.stopPropagation(), i.classList.add("dragging"));
        let _ = E.clientX,
          c = E.clientY,
          f = s.panelWidth,
          x = s.panelHeight,
          { edge: k } = s,
          B = (I) => {
            let q = I.clientX - _,
              T = I.clientY - c,
              D = { ...s };
            (k === "right" && (D.panelWidth = Math.max(Ve, Math.min(Zt, f - q))),
              k === "left" && (D.panelWidth = Math.max(Ve, Math.min(Zt, f + q))),
              k === "top" && (D.panelHeight = Math.max(Ye, Math.min(Qt, x + T))),
              k === "bottom" && (D.panelHeight = Math.max(Ye, Math.min(Qt, x - T))),
              (s = D),
              ae(r, o, i, s));
          },
          H = () => {
            (i.classList.remove("dragging"),
              document.removeEventListener("mousemove", B),
              document.removeEventListener("mouseup", H),
              tn(s));
          };
        (document.addEventListener("mousemove", B), document.addEventListener("mouseup", H));
      }));
    let l = () => ae(r, o, i, s);
    window.addEventListener("resize", l);
    function y(E) {
      ((d = E),
        Xt(E),
        b.forEach((_, c) => _.classList.toggle("active", c === E)),
        o.classList.add("open"),
        ae(r, o, i, s),
        A(E));
    }
    function w() {
      (o.classList.remove("open"),
        b.forEach((E) => E.classList.remove("active")),
        (d = null),
        Xt(null));
    }
    function R(E) {
      v(E) && (d === E ? w() : y(E));
    }
    async function C(E) {
      if (!(g && g.id === E.projectId))
        try {
          let _ = await E.project(),
            c = window.location.host;
          if (_.domain && !Yt(c, _.domain)) {
            (xe(), he(null), (u = null), (g = null), p(), d && S(d));
            return;
          }
          ((g = _), he(_), p());
        } catch {}
    }
    function L(E, _) {
      let c = typeof window < "u" && window.location ? window.location.host : "",
        f = g?.name ?? "",
        x = f ? `${f}` : c,
        k = x ? `<span class="sub">${x}</span>` : "";
      return `
      <div class="panel-head">
        <span class="mk"></span>
        <span class="panel-title">
          <span class="panel-title-icon">${E}</span>
          <span class="panel-title-label">${_}</span>
          ${k}
        </span>
        <span class="live"><span class="dot"></span>LIVE</span>
        <button class="close" id="se-close" aria-label="Close">${Hr}</button>
      </div>`;
    }
    function A(E) {
      let { icon: _, label: c } = ie[E];
      if (!u) {
        S(E);
        return;
      }
      let f = new pe(e.adminUrl, u.token, u.projectId);
      (C(f).then(() => {
        if (d && !v(d)) {
          w();
          return;
        }
        let H = a.querySelector(".panel-head");
        if (H && d) {
          let { icon: I, label: q } = ie[d],
            T = document.createElement("div");
          ((T.innerHTML = L(I, q)),
            H.replaceWith(T.firstElementChild),
            a.querySelector("#se-close")?.addEventListener("click", w));
        }
      }),
        (a.innerHTML = `
      ${L(_, c)}
      <div class="panel-body" id="se-body"></div>
      <div class="panel-subfoot" id="se-subfoot"></div>
      <div class="panel-footer">
        <span class="foot-status"><span class="dot"></span><span>SDK <b>connected</b></span></span>
        <button class="ibtn" id="se-share" title="Build a URL that applies the current overrides for any visitor">Share URL</button>
        <button class="ibtn" id="se-apply-url" title="Persist current overrides to the address bar and reload">Apply via URL</button>
        <button class="ibtn danger" id="se-signout">Sign out</button>
        <button class="ibtn danger" id="se-clearall">Clear overrides</button>
      </div>`),
        a.querySelector("#se-close").addEventListener("click", w),
        a.querySelector("#se-signout").addEventListener("click", () => {
          (xe(), he(null), (u = null), (g = null), p(), S(E));
        }),
        a.querySelector("#se-clearall").addEventListener("click", () => {
          (it(), A(E));
        }),
        a.querySelector("#se-apply-url").addEventListener("click", () => {
          lt();
        }),
        a.querySelector("#se-share").addEventListener("click", async () => {
          let H = Me({ ...Re(), openDevtools: !0 });
          try {
            await navigator.clipboard.writeText(H);
            let I = a.querySelector("#se-share"),
              q = I.textContent;
            ((I.textContent = "Copied \u2713"), setTimeout(() => (I.textContent = q), 1500));
          } catch {
            prompt("Copy this URL:", H);
          }
        }));
      let x = a.querySelector("#se-body"),
        k = a.querySelector("#se-subfoot");
      ({
        gates: () => dt(x, f),
        configs: () => ut(x, f),
        experiments: () => gt(x, f),
        i18n: () => jt(x, f, k, n),
        bugs: () => Gt(x, f, n),
        features: () => Vt(x, f, n),
      })
        [E]()
        .catch((H) => {
          x.innerHTML = `<div class="err">${String(H)}</div>`;
        });
    }
    function S(E) {
      let { icon: _, label: c } = ie[E];
      ((a.innerHTML = `
      ${L(_, c)}
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
        a.querySelector("#se-close").addEventListener("click", w),
        a.querySelector("#se-connect").addEventListener("click", async () => {
          let f = a.querySelector("#se-connect"),
            x = a.querySelector("#se-auth-status"),
            k = a.querySelector("#se-auth-err");
          ((f.disabled = !0),
            (f.textContent = "Opening\u2026"),
            (x.textContent = ""),
            (k.textContent = ""));
          try {
            ((u = await Qe(e, () => {
              ((x.textContent = "Waiting for approval in the opened tab\u2026"),
                (f.textContent = "Waiting\u2026"));
            })),
              A(E));
          } catch (B) {
            ((k.textContent = B instanceof Error ? B.message : String(B)),
              (x.textContent = ""),
              (f.disabled = !1),
              (f.textContent = "Retry"));
          }
        }));
    }
    document.documentElement.appendChild(t);
    let M = () => {
      document.getElementById("shipeasy-devtools") || document.documentElement.appendChild(t);
    };
    return (
      new MutationObserver(M).observe(document.documentElement, { childList: !0 }),
      W() && (V(), Q(!0, n, () => {})),
      h && requestAnimationFrame(() => y(h)),
      {
        destroy() {
          (window.removeEventListener("resize", l), t.remove());
        },
      }
    );
  }
  function Ur() {
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
  var ee = null;
  function on(e = {}) {
    if (typeof window > "u" || typeof document > "u") return;
    if (ee) {
      if (document.getElementById("shipeasy-devtools")) return;
      ee = null;
    }
    let t = { adminUrl: e.adminUrl ?? Ur() },
      { destroy: n } = rn(t);
    ee = n;
  }
  function Nr() {
    (ee?.(), (ee = null));
  }
  function sn(e = {}, t = "Shift+Alt+S") {
    if (typeof window > "u") return () => {};
    ue() && on(e);
    let n = t.split("+"),
      r = n[n.length - 1],
      o = n.includes("Shift"),
      i = n.includes("Alt") || n.includes("Option"),
      a = n.includes("Ctrl") || n.includes("Control"),
      s = n.includes("Meta") || n.includes("Cmd"),
      d = /^[a-zA-Z]$/.test(r) ? `Key${r.toUpperCase()}` : null;
    function u(g) {
      (d ? g.code === d : g.key.toLowerCase() === r.toLowerCase()) &&
        g.shiftKey === o &&
        g.altKey === i &&
        g.ctrlKey === a &&
        g.metaKey === s &&
        (ee ? Nr() : on(e));
    }
    return (window.addEventListener("keydown", u), () => window.removeEventListener("keydown", u));
  }
  if (typeof window < "u") {
    let e = window.__se_devtools_config ?? {},
      t = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => sn(e)));
      };
    if (
      (document.readyState === "complete" ? t() : window.addEventListener("load", t, { once: !0 }),
      W())
    ) {
      let n = !1,
        r = new MutationObserver(() => o()),
        o = () => {
          n ||
            ((n = !0),
            requestAnimationFrame(() => {
              ((n = !1),
                r.disconnect(),
                V(),
                r.observe(document.body, { childList: !0, subtree: !0, attributes: !0 }));
            }));
        },
        i = () => {
          requestAnimationFrame(() => requestAnimationFrame(() => o()));
        };
      document.readyState === "complete" ? i() : window.addEventListener("load", i, { once: !0 });
      let a = () => {
        let d = document.getElementById("shipeasy-devtools");
        if (!d?.shadowRoot) {
          setTimeout(a, 100);
          return;
        }
        Q(!0, d.shadowRoot, () => o());
      };
      (a(), window.addEventListener("se:i18n:ready", () => o(), { once: !0 }));
      let s = window;
      s.i18n?.on && s.i18n.on("update", () => o());
    }
    window.__se_devtools_ready = !0;
  }
})();
