# Evolve

Weight, InBody, training and nutrition — one plan, built around your goal.
English and Arabic, light and dark, invite-only. A phone web app (add it to the Home Screen).

It shares Gauge's Supabase project, so your weigh-ins, InBody scans, measurements,
goals and lifts are already there — nothing to import.

## Setup (once)

1. **Database** — Supabase → SQL Editor → paste `supabase/evolve_setup.sql` → Run.
   Adds profile, daily calories/protein/burn, plans, and the Apple Watch sync function.
   Safe to run again.
2. **Hosting** — Vercel → Add New → Project → this repository → **Root Directory: `evolve`** → Deploy.
3. **Environment variables** (Vercel → the Evolve project → Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` — same key as Gauge (InBody photo reading).
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API keys → secret key. Only for invites.
   - `ADMIN_EMAILS` — your email (comma-separated if more). Who may send invites.
   Redeploy after adding them.
4. **Sign-in settings** (Supabase → Authentication):
   - Sign In / Providers → Email → turn **off** “Allow new users to sign up” (invite only).
   - URL Configuration → Redirect URLs → add your Evolve address, e.g. `https://evolve-xxxx.vercel.app/**`.
5. **Invite people** — in Evolve: Account → Invite someone (or Supabase → Authentication → Users → Invite user).
   They get an email, set a password, and are in. Every person's data is private (row level security).

## Apple Watch burn (free)

Account → Apple Watch sync → make your key → follow the steps to build a Shortcuts automation
that sends each day's Active + Resting energy to `/api/burn` at 11:55 pm. Or type it in by hand.

## Develop

```
npm install
npm run dev      # http://localhost:5173
npm test         # logic tests (core from Gauge + Evolve)
npm run build
```

Code map: `src/lib/` pure logic (tested) · `src/screens/` pages · `src/sheets/` bottom sheets ·
`api/` Vercel functions (`scan`, `burn`, `invite`) · `supabase/` SQL.

Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
