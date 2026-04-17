/**
 * Tiny i18n runtime for landing-concept previews.
 *
 * Demonstrates the string-manager pattern that the real app should adopt:
 *   - Every user-visible string has a stable key (e.g. "hero.title")
 *   - Strings live in a translation map, not in markup
 *   - Interpolation: "Hello {{name}}"
 *   - Pluralization: { one: "1 flag", other: "{{count}} flags" }
 *   - Locale switch re-renders without reload
 *   - A "key overlay" dev mode reveals untranslated / orphan keys
 *
 * Usage in HTML:
 *   <h1 data-i18n="hero.title"></h1>
 *   <p data-i18n="hero.sub" data-i18n-vars='{"count": 1200}'></p>
 *   <p data-i18n="events.count" data-i18n-plural="5"></p>
 *
 * Each concept page defines its own translations before loading this script:
 *   <script>window.CONCEPT_TRANSLATIONS = { en: {...}, es: {...}, ... }</script>
 *   <script src="_shared/i18n.js"></script>
 */
(function () {
  const STORAGE_KEY = "shipeasy-landing-locale";
  const DEFAULT_LOCALE = "en";

  function getNested(obj, path) {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, k) => {
      return vars[k] != null ? String(vars[k]) : `{{${k}}}`;
    });
  }

  function pickPlural(entry, count) {
    if (typeof entry !== "object" || entry == null) return entry;
    if (count === 0 && entry.zero) return entry.zero;
    if (count === 1 && entry.one) return entry.one;
    return entry.other;
  }

  function t(locale, key, opts) {
    const bundle = window.CONCEPT_TRANSLATIONS?.[locale] ?? {};
    let value = getNested(bundle, key);
    if (value == null && locale !== DEFAULT_LOCALE) {
      value = getNested(window.CONCEPT_TRANSLATIONS?.[DEFAULT_LOCALE] ?? {}, key);
    }
    if (value == null) return `[${key}]`;
    if (opts?.count != null) value = pickPlural(value, opts.count);
    return interpolate(value, { ...(opts?.vars || {}), count: opts?.count });
  }

  function applyTranslations(root, locale) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const varsAttr = el.getAttribute("data-i18n-vars");
      const pluralAttr = el.getAttribute("data-i18n-plural");
      let vars = null;
      if (varsAttr) {
        try {
          vars = JSON.parse(varsAttr);
        } catch {
          vars = null;
        }
      }
      const count = pluralAttr != null ? Number(pluralAttr) : null;
      const text = t(locale, key, { vars, count });
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = text;
      else el.textContent = text;
    });
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      // Format: data-i18n-attr="placeholder:form.email,title:form.email.hint"
      const spec = el.getAttribute("data-i18n-attr");
      spec.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key) return;
        el.setAttribute(attr, t(locale, key));
      });
    });
    document.documentElement.lang = locale;
  }

  function setLocale(locale) {
    if (!window.CONCEPT_TRANSLATIONS?.[locale]) return;
    localStorage.setItem(STORAGE_KEY, locale);
    applyTranslations(document, locale);
    document.querySelectorAll("[data-locale-switch]").forEach((el) => {
      const v = el.getAttribute("data-locale-switch");
      el.classList.toggle("is-active", v === locale);
      if (el.tagName === "SELECT") el.value = locale;
    });
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { locale } }));
  }

  function currentLocale() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && window.CONCEPT_TRANSLATIONS?.[saved]) return saved;
    const browser = (navigator.language || "en").slice(0, 2);
    if (window.CONCEPT_TRANSLATIONS?.[browser]) return browser;
    return DEFAULT_LOCALE;
  }

  function mountSwitcher() {
    document.querySelectorAll("[data-locale-switch]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        setLocale(el.getAttribute("data-locale-switch"));
      });
    });
    document.querySelectorAll("select[data-locale-picker]").forEach((sel) => {
      sel.addEventListener("change", () => setLocale(sel.value));
    });
  }

  function mountDevOverlay() {
    // Press `k` to overlay translation keys beside each string (designer QA tool)
    document.addEventListener("keydown", (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        document.body.classList.toggle("i18n-keys-visible");
      }
    });
  }

  window.ShipEasyI18n = { setLocale, t, apply: applyTranslations };

  document.addEventListener("DOMContentLoaded", () => {
    mountSwitcher();
    mountDevOverlay();
    setLocale(currentLocale());
  });
})();
