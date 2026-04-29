# Changelog

## 2.0.0

### Breaking

- `useShipEasyI18n().t(key, fallback, variables?)` — `fallback` is now a
  required argument, mirroring `@shipeasy/sdk@2.0.0`.
- `useShipEasyI18n().tEl(key, fallback, variables?, desc?)` — same shape.
- `<ShipEasyI18nString>` now takes a required `fallback` prop. The previous
  `defaultValue` prop has been removed (use `fallback` instead).

Peer dependency: requires `@shipeasy/sdk@^2.0.0`.

### Migration

```tsx
// Before
<ShipEasyI18nString labelKey="hero.title" defaultValue="Ship faster." />;
const { t } = useShipEasyI18n();
t("hero.greeting", { name });

// After
<ShipEasyI18nString labelKey="hero.title" fallback="Ship faster." />;
const { t } = useShipEasyI18n();
t("hero.greeting", "Welcome, {{name}}", { name });
```
