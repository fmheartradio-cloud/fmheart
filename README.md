# FM Heart — Digital Media Platform

Modern Sinhala-first media website for **FM Heart** (`fmheart.lk`).

## Stack

- Next.js 16 · React 19 · Tailwind CSS 4 · Firebase (Auth + Firestore)
- Hosting: **Vercel** (Singapore `sin1`)
- Live stream: `https://cast3.my-control-panel.com/proxy/fmheartn/stream`
- Fonts: Gemunu Libre · Abhaya Libre · Noto Sans Sinhala · Yaldevi

## Fresh accounts (recommended)

අලුත් Google + Firebase + Vercel accounts වලින් setup කරන්න:

👉 See **[SETUP-ACCOUNTS.md](./SETUP-ACCOUNTS.md)**

```bash
npm install
cp .env.example .env.local
# Fill Firebase web config from NEW project
npm run dev
```

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/live` | Full live radio player |
| `/news`, `/news/[slug]` | News |
| `/gossip`, `/gossip/[slug]` | Gossip |
| `/admin` | CMS (Firebase Auth) |
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
