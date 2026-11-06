# Evolve

Weight, InBody, training and nutrition — one plan, built around your goal.
English and Arabic, light and dark, invite-only. A phone web app (add it to the Home Screen).

It shares Gauge's Supabase project, so your weigh-ins, InBody scans, measurements,
goals and lifts are already there — nothing to import.

## Where it runs

Evolve is served inside Gauge's live site at **`/evolve/`** — same Vercel project, same
domain, same InBody reader (`/api/scan`) and the same accounts. Nothing to set up in Vercel.

After changing Evolve, rebuild it into Gauge and commit both folders:

```
npm run publish:gauge    # builds to gauge-project/public/evolve, copies api/burn.js + api/invite.js
```

Gauge's `vercel.json` rewrites `/evolve` to Evolve's page, and Gauge's `index.html` forwards
invite / password-reset email links to `/evolve/`.

## One-time database setup

The first time you open Evolve it shows **“Set up now”**: copy the setup, open Supabase,
paste, Run. (Same as running `supabase/evolve_setup.sql` in Supabase → SQL Editor.)
Until then weight, scans, goal and lifts work; calories/protein, profile, plans and
Apple Watch sync need it.

## Optional

- **Invites from inside the app**: add `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` to the
  Vercel project's environment variables. Without them, invite from Supabase → Authentication →
  Users → Invite user — the email link opens Evolve.
- **Invite only**: Supabase → Authentication → Sign In / Providers → turn off “Allow new users to sign up”.
- **Own address**: a separate Vercel project with Root Directory `evolve` also works
  (`evolve/vercel.json` is ready); add `ANTHROPIC_API_KEY` there.

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
