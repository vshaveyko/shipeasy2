import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Inline script injected into <head> before the i18n CDN loader runs.
// Must be a plain string — no TypeScript, no imports.
// Marker chars: ￹ U+FFF9  ￺ U+FFFA  ￻ U+FFFB  (Interlinear Annotation)
const EDIT_LABELS_INTERCEPTOR = `(function(){
  if(!new URLSearchParams(location.search).has('se_edit_labels'))return;
  function patch(v){
    if(!v||v._se_patched)return;
    var o=v.t.bind(v);
    v.t=function(k,x){return '￹'+k+'￺'+o(k,x)+'￻';};
    v._se_patched=true;
  }
  try{
    if(window.i18n){patch(window.i18n);return;}
    Object.defineProperty(window,'i18n',{configurable:true,
      get:function(){return window._sei18n;},
      set:function(v){window._sei18n=v;patch(v);}});
  }catch(e){}
})();`;

export const metadata: Metadata = {
  title: "ShipEasy",
  description: "Ship faster with the tools you need",
};

/*
  Design is dark-first — we render `<html class="dark">` server-side so the
  page is already dark on first paint. No init script means no chrome-
  extension-induced hydration mismatch (Dashlane et al. inject siblings into
  <head> and break a React-managed inline <script> at that position).
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // These are public client-side values; hardcoded so they survive Cloudflare
  // Builds where .env.local is never present and wrangler vars don't propagate
  // to the Next.js compile step.
  const i18nKey =
    process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY ?? "sdk_client_bf273deea504461d9a8adb4896dad205";
  const i18nProfile = process.env.NEXT_PUBLIC_SHIPEASY_I18N_PROFILE ?? "en:prod";
  const i18nApi = process.env.NEXT_PUBLIC_SHIPEASY_API_URL ?? "https://cdn.shipeasy.ai";
  // Lets you run `next dev` locally but point the devtools overlay at the
  // prod admin app — pick prod's gates/configs/experiments/translations
  // without seeding a local D1. Set NEXT_PUBLIC_SHIPEASY_DEVTOOLS_ADMIN_URL
  // (e.g. https://shipeasy.ai) when you want that.
  const devtoolsAdminUrl = process.env.NEXT_PUBLIC_SHIPEASY_DEVTOOLS_ADMIN_URL;
  const devtoolsConfigJson = devtoolsAdminUrl
    ? JSON.stringify({ adminUrl: devtoolsAdminUrl })
    : null;

  return (
    <html
      lang="en"
      className="dark"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning on <head>/<body> tolerates third-party
        browser extensions (Dashlane, 1Password, LastPass, …) that inject
        siblings into these elements before React hydrates. The i18n
        loader is rendered as a plain <script> so the browser fetches it
        immediately without going through React's hydration tracking.
      */}
      <head suppressHydrationWarning>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/*
          Devtools config has to land on `window` BEFORE /se-devtools.js
          executes its IIFE, so we render a plain inline <script> in <head>
          rather than next/script — the latter serializes inline content
          into the React Flight payload and never executes.
        */}
        {devtoolsConfigJson ? (
          <script
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `window.__se_devtools_config=${devtoolsConfigJson};`,
            }}
          />
        ) : null}
        {/*
          Edit-labels interceptor: runs synchronously before the i18n CDN
          loader so the window.i18n property setter is in place when the
          loader installs the real object. When ?se_edit_labels=1 is present,
          t(key) returns an invisible Unicode marker string instead of the
          translated value. The devtools script then scans the rendered DOM,
          finds those markers in text nodes, and replaces them with
          <span data-label="key"> elements — no changes to call sites needed.
          Marker format: ￹{key}￺{value}￻
        */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: EDIT_LABELS_INTERCEPTOR }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
        {i18nKey && i18nProfile ? (
          <Script
            id="se-i18n-loader"
            strategy="beforeInteractive"
            src={`${i18nApi}/sdk/i18n/loader.js`}
            data-key={i18nKey}
            data-profile={i18nProfile}
          />
        ) : null}
        <Script src="/se-devtools.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
