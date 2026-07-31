# GolfWithMe (web)

The real build. `next` + Supabase (Postgres, Auth, Storage), replacing the
single-file `golfwithme.html` prototype at the repo root. See the repo's
task list (20 growth-idea items) for what's shipped vs. in progress.

## One-time setup

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. In the SQL Editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql` (seeds the curated course list).
3. In **Authentication → Providers**, enable **Google** and **Apple** and
   fill in their OAuth credentials.
4. In **Authentication → URL Configuration**, add
   `http://localhost:3000/auth/callback` (and your deployed domain's
   equivalent) as a redirect URL.
5. Copy `.env.local.example` to `.env.local` and fill in the values from
   **Project Settings → API**.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed-out visitors
land on `/login`; a successful Google/Apple sign-in creates a `profiles`
row automatically (see the `handle_new_user` trigger in the migration) and
lands on `/`.

## Schema

`supabase/migrations/0001_init.sql` is the source of truth: one row per
player/round/score/post instead of the prototype's per-trip JSON blob, with
row-level security so a trip's data is only readable by its members (or
anyone, read-only, if the trip is marked public). It's been syntax- and
policy-tested against a local Postgres instance (auth schema stubbed) —
see the migration file's comments for the access model.

After schema changes on the live project, regenerate types with:

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
```

## Deploying

Push to a GitHub repo and import it on [Vercel](https://vercel.com/new),
setting the same env vars from `.env.local`.
