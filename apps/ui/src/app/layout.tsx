import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { shipeasy } from "@shipeasy/sdk/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShipEasy",
  description: "Ship faster with the tools you need",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR URL-overrides (?_se_flag_X=…) are temporarily disabled.
  // proxy.ts (Next 16, Node-runtime-only) breaks opennext-cloudflare at build,
  // and a legacy edge middleware.ts crashed the worker at runtime — every
  // page returned HTTP 500. Re-add x-se-search wiring once opennext gains
  // Node-runtime proxy support.
  const seConfig = await shipeasy({
    apiKey: process.env.SHIPEASY_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY,
  });

  return (
    <html
      lang="en"
      className="dark"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning tolerates browser extensions (Dashlane et al.)
          that inject siblings into <head>/<body> before React hydrates. */}
      <head suppressHydrationWarning>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {/*
          Edit-labels marker shim: when ?se_edit_labels=1 is present, intercept
          the very first assignment of window.i18n (done synchronously by the
          inline bootstrap below, then again by the CDN loader) and wrap its
          .t() so every translation gets emitted as ￹key￺value￻. The devtools
          overlay scans the DOM for these markers to enable in-place editing.
          Must run BEFORE the bootstrap script — otherwise the inline t() has
          already populated the React tree without markers.
        */}
        {/* eslint-disable-next-line react/no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(!new URLSearchParams(location.search).has('se_edit_labels'))return;var R;function P(v){if(!v||typeof v.t!=='function'||v.__sePatched)return;var O=v.t.bind(v);v.__sePatched=true;window._sei18n_t=O;v.t=function(k,vars){var r=O(k,vars);return r===k?k:'\\uFFF9'+k+'\\uFFFA'+r+'\\uFFFB';};}Object.defineProperty(window,'i18n',{configurable:true,get:function(){return R;},set:function(v){P(v);R=v;}});})();`,
          }}
        />
        {/*
          Dev/local override: the SDK bootstrap hardcodes
          https://shipeasy.ai/se-devtools.js for the devtools loader. In dev we
          want the local /se-devtools.js bundle that ships with this app, so
          rewrite the src right when the script element is appended.
        */}
        {process.env.NODE_ENV !== "production" && (
          // eslint-disable-next-line react/no-danger
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var O=Document.prototype.appendChild;function W(n){return n&&n.tagName==='SCRIPT'&&typeof n.src==='string'&&n.src.indexOf('shipeasy.ai/se-devtools.js')!==-1;}var H=HTMLHeadElement.prototype.appendChild;HTMLHeadElement.prototype.appendChild=function(n){if(W(n))n.src='/se-devtools.js';return H.call(this,n);};})();`,
            }}
          />
        )}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: seConfig.getBootstrapHtml() }} />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
