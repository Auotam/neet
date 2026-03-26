This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Repo & deploy

- **GitHub:** [github.com/Auotam/neet](https://github.com/Auotam/neet)
- **Default:** app is built for the **root of your domain** (e.g. `https://yoursite.com/`). No env vars needed.
- **Subpath only** (e.g. `yoursite.com/neet`): set host env `NEXT_BASE_PATH=/neet` and configure your reverse proxy so requests keep the `/neet` prefix.

### Vercel (recommended)

1. Import [Auotam/neet](https://github.com/Auotam/neet) in the Vercel dashboard.
2. Framework preset: **Next.js**; build: `npm run build`; output: default.
3. Add your **custom domain** in Project → Settings → Domains.
4. Optional env: `NEXT_BASE_PATH` only if serving under a subpath.

### Manual (Node)

On your server: `npm ci && npm run build && npm run start` (port 3000 by default), or use **PM2**. Put **nginx** or another reverse proxy in front with SSL.

## Learn More (Next.js template)

The easiest way to deploy any Next.js app is [Vercel](https://vercel.com/new). See [deploying Next.js](https://nextjs.org/docs/app/building-your-application/deploying) for other hosts.
