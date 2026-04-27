# @shipeasy/react

React adapter for the [Shipeasy](https://shipeasy.ai) SDK. Provider,
hooks, devtools overlay integration, and i18n.

> Source-available under the [Shipeasy-SAL 1.0](./LICENSE).

## Install

```bash
npm install @shipeasy/sdk @shipeasy/react
# or
pnpm add @shipeasy/sdk @shipeasy/react
```

## Quickstart

```tsx
// app/providers.tsx
"use client";
import { ShipeasyProvider, ShipEasyI18nProvider } from "@shipeasy/react";

export function Providers({ children, user }) {
  return (
    <ShipeasyProvider
      sdkKey={process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY!}
      adminUrl="https://shipeasy.ai"
    >
      <ShipEasyI18nProvider>
        {/* call identify() once on mount with whatever session info you have */}
        {children}
      </ShipEasyI18nProvider>
    </ShipeasyProvider>
  );
}
```

```tsx
// any client component
import { useFlag, useConfig, useExperiment, useShipEasyI18n } from "@shipeasy/react";

function CheckoutButton() {
  const newCheckout = useFlag("new_checkout");
  const limits = useConfig<{ max: number }>("upload_limits");
  const { params } = useExperiment("hero_cta", { label: "Sign up" });
  const { t } = useShipEasyI18n();
  return <button>{t("checkout.cta")}</button>;
}
```

All hooks honor URL-driven session overrides set by the devtools overlay
(`?se_ks_<gate>=true`, `?se_config_<name>=…`, `?se_exp_<name>=variant_b`),
so your QA team can flip values per session without touching the
dashboard.

## Devtools overlay

Press `Shift+Alt+S` (or append `?se=1`) to mount the overlay. The
provider boots the devtools script lazily — no asset cost on a normal
page load.

## Documentation

[docs.shipeasy.ai](https://docs.shipeasy.ai)

## License

[Shipeasy-SAL 1.0](./LICENSE).
