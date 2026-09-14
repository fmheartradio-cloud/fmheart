# FM Heart — Digital Media Platform

Modern Sinhala-first media website for **FM Heart** (`fmheart.lk`).

## Stack

- Next.js 16 · React 19 · Tailwind CSS 4 · Turso (SQLite)
- Hosting: **Vercel** (Singapore `sin1`)
- Live stream: `https://cast3.my-control-panel.com/proxy/fmheartn/stream`
- Fonts: Gemunu Libre · Abhaya Libre · Noto Sans Sinhala · Yaldevi

## Fresh accounts (recommended)

Turso (free, no credit card) + Vercel:

👉 See **[SETUP-ACCOUNTS.md](./SETUP-ACCOUNTS.md)**

```bash
npm install
# Set TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, ADMIN_PASSWORD in .env.local
npm run dev
```

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/live` | Full live radio player |
| `/news`, `/news/[slug]` | News |
| `/gossip`, `/gossip/[slug]` | Gossip |
| `/admin` | CMS (email + ADMIN_PASSWORD) |
| `/sitemap.xml` | SEO sitemap |
| `/rss.xml` | RSS feed |

## Deploy

```bash
npx vercel login
npx vercel --prod
```

Vercel Environment Variables එකට `.env.local` එකේ `NEXT_PUBLIC_*` values දාන්න.

## Logos

Official assets: `public/logo/`
