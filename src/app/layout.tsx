import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { LazyCookie } from "@/components/common/Cookie";
import { Preloader } from "@/components/common/preloader";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";

import "@/app/globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

/** IBM 3270 — the display face of the Figma "Get Layers" frame. */
const ibm3270 = localFont({
  src: "./fonts/3270-Regular.otf",
  variable: "--font-3270",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Where scripts never run the curtain can never lift, so it is not
            shown at all — the page underneath is already complete. */}
        <noscript>
          <style>{`[data-preloader]{display:none!important}`}</style>
        </noscript>
      </head>
      {/* `suppressHydrationWarning` on the body, and only on the body.
          Browser extensions write their own attributes onto `<html>` and
          `<body>` before React hydrates — ColorZilla's `cz-shortcut-listen`,
          Grammarly's `data-gr-*`, various dark-mode add-ons — so React finds
          markup it did not produce and reports a mismatch. It is the reader's
          browser, not this page, and nothing here can render around it.

          It suppresses **one level only**: the body's own attributes and text.
          A real mismatch inside the app still reports normally, which is why it
          belongs here rather than any higher or any lower. The class list is
          the only attribute this element carries and `next/font` derives it
          deterministically, so there is nothing of ours left for it to hide. */}
      <body
        className={`${onest.variable} ${ibm3270.variable}`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          {/* No <AdaptiveGrid />: the root font-size scales purely in CSS at
              every width (globals.css), so a JS pass would only add a flash of
              unscaled layout on load. See decisions-log ADR-0024. */}
          <ReducedMotion />
          <Preloader />
          <LazyCookie />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}
