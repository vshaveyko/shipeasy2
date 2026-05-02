import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { shipeasy } from "@shipeasy/sdk/server";
import "./globals.css";

// SDK 2.1.7 stores SSR edit-labels mode on `globalThis` without AsyncLocalStorage,
// so a single `?se_edit_labels=1` request poisons every subsequent SSR in the
// same Workers isolate — making `tEl()` emit invisible label markers instead of
// the fallback string, which renders to the user as a bare key. Force the SSR
// flag off; the client still opts into edit mode via `?se_edit_labels` directly.
Object.defineProperty(globalThis, Symbol.for("@shipeasy/sdk:ssr-edit-mode"), {
  value: false,
  writable: false,
  configurable: true,
});

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
  const h = await headers();
  const seSearch = h.get("x-se-search") ?? undefined;
  const seConfig = await shipeasy({
    apiKey: process.env.SHIPEASY_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_SHIPEASY_CLIENT_KEY,
    urlOverrides: seSearch,
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
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: seConfig.getBootstrapHtml() }} />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
