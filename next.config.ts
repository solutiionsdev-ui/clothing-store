import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Drop the `X-Powered-By: Next.js` response header.
  poweredByHeader: false,

  compiler: {
    // Strip `console.*` from production bundles, keeping error/warn for
    // monitoring. Left on in dev so logs stay available.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  images: {
    // WebP only, deliberately. AVIF is smaller again, but **encoding it from a
    // source with an alpha channel is pathologically slow here** — measured on
    // one 880×1213 cut-out product photo at w=768: WebP 0.125s, AVIF still
    // unfinished after 3m20s. Every product shot and the wordmark plate are
    // transparent PNGs, so with AVIF enabled three of four product images
    // simply never arrived: the browser asked for them, the optimiser sat on
    // the encode, and only the one already in the cache appeared. In production
    // that cost is paid once per image and width, but it is paid by a real
    // visitor. WebP keeps the great majority of the saving at a thousandth of
    // the cost. Revisit if the encoder gets faster with alpha.
    formats: ["image/webp"],
    // Breakpoints `next/image` uses to build `srcset`. `deviceSizes` covers
    // full-width images (aligned with the adaptive-grid breakpoints + retina);
    // `imageSizes` covers smaller, fixed-width images and icons.
    deviceSizes: [360, 640, 768, 1024, 1280, 1440, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // React Compiler (automatic memoisation) is an opt-in performance win.
  // It requires the `babel-plugin-react-compiler` dev dependency and routes
  // the build through Babel — enable once installed:
  // reactCompiler: true,
};

export default nextConfig;
