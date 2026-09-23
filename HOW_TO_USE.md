# Your Online Store — source

This is the complete source for **Your Online Store**. It's a Next.js app —
the full project tree, minus installed dependencies and any local secrets.

## Run it as-is

```sh
yarn install
yarn dev         # http://localhost:3000
# production: yarn build && yarn start
```

> If the project needs environment variables (e.g. an API key), copy `.env.example` to
> `.env` (or `.env.local`) and fill it in — secrets are intentionally **not** included.

## Deploy

Import the repository into Vercel — it detects Next.js and yarn on its own. Set
`NEXT_PUBLIC_SITE_URL` once a custom domain is attached; until then the site uses
the Vercel production domain.

## Branding

The logo, favicons and share image are text placeholders generated from
`siteConfig` in `src/lib/site.ts`. To use real artwork, replace `BrandMark`
(`src/components/ui/brand-mark.tsx`) and the `icon.tsx`, `apple-icon.tsx` and
`opengraph-image.tsx` files in `src/app/`.
