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

// Design is dark-first — force dark so every surface adopts the new palette
// regardless of OS preference or previously-persisted light theme.
const themeInitScript = `
(function () {
  var root = document.documentElement;
  root.classList.add('dark');
  root.dataset.theme = 'dark';
  root.style.colorScheme = 'dark';
  try { localStorage.setItem('theme', 'dark'); } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
        <Script src="/se-devtools.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
