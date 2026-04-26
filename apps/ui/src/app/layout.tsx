import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
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
  const i18nKey = process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY;
  const i18nProfile = process.env.NEXT_PUBLIC_SHIPEASY_I18N_PROFILE;
  const i18nApi = process.env.NEXT_PUBLIC_SHIPEASY_API_URL ?? "https://api.shipeasy.ai";

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
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
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
