# Chinese Learning App

A web app for learning Chinese vocabulary and grammar with:
- Next.js
- Supabase
- Google SSO
- anonymous / user / admin roles
- lesson-based learning
- vocabulary and grammar management
- progress tracking and statistics

## Main features
- User authentication with Google SSO
- Role-based authorization
- Public learning for anonymous users
- Saved progress for logged-in users
- Admin management for words, lessons, grammar
- Multiple learning modes:
  - flashcard
  - multiple choice
  - typing / complete word
- Learning statistics dashboard
- User settings:
  - language
  - theme
  - text font
- Admin bulk word import from CSV or JSON
- Native automated test baseline for core learning and auth logic

## Settings behavior
- authenticated users can persist:
  - `preferred_language`
  - `preferred_theme`
  - `preferred_font`
- anonymous visitors still get the default public experience and are not required to save settings
- theme and font preferences are applied across the main app shell, dashboard, review queue, and focused study surfaces
- language preference now supports `en`, `vi`, and `zh`
- locale-aware routes use a visible locale prefix such as `/en/lessons` or `/zh/review`, while middleware rewrites them back to the existing App Router pages internally
- authenticated users persist language to `profiles.preferred_language`; anonymous users keep it in a cookie/localStorage fallback

## Product concept
The app organizes content by:
- HSK level
- topic
- lesson
- grammar level
- radicals / tags

## Development approach
This repository is intended to be built incrementally with Codex using the docs in `/docs` and prompts in `/prompts`.

## Environment setup
Create `.env` from `.env.example` and provide:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
NEXT_PUBLIC_APP_NAME=Chinese Learning App
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

Environment values are validated at runtime for the core Supabase/public app settings. Invalid or missing required values now fail early instead of producing silent auth or data errors.

For local Supabase Google OAuth, also set:

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
```

## Admin bootstrap
The app does not have a public admin signup flow and does not auto-promote the first user.

Admin role assignment is server-side only:
- every normal sign-in defaults to `role = user`
- if a signed-in email is present in `ADMIN_EMAILS`, the server writes `role = admin` into `public.profiles`
- if an existing user's email is added to `ADMIN_EMAILS` later, the next authenticated server-side profile sync upgrades that user
- existing admins are not auto-downgraded by allowlist removal; demotion should be a deliberate manual operation

Configure `ADMIN_EMAILS` as a comma-separated list:

```env
ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

### Local development
1. Start Supabase and the app normally.
2. Apply the latest migrations so the profile-role hardening is active:
   `npm run supabase:db:push`
3. Add your Google account email to `ADMIN_EMAILS` in `.env`.
4. Copy the local Supabase keys from `npm run supabase:status`:
   - `Publishable` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Secret` -> `SUPABASE_SERVICE_ROLE_KEY`
5. Restart the Next.js app after changing env vars.
6. Sign in again so the server profile sync updates your stored role.

### Production
1. Set `ADMIN_EMAILS` in your deployment environment.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in your deployment environment.
3. Apply the latest database migration, including `0003_admin_bootstrap_hardening.sql`.
4. Redeploy or restart the application.
5. Have the target admin sign in again.

## Production notes
- authenticated surfaces rely on both middleware checks and server-side permission checks
- public content remains published-only
- study progress, dashboard stats, and review queue are user-scoped through both query filters and existing RLS
- user settings are profile-backed and should be tested once in each environment after deployment:
  - sign in
  - save theme / font / language
  - reload `/en/dashboard`, `/en/review`, and `/en/settings` or the equivalent current locale routes
  - verify preferences still apply

## Testing
This project uses the native Node test runner for a lightweight baseline without adding a larger test framework.

Run:

```bash
npm test
npm run test:coverage
```

Current automated coverage focuses on high-value logic:
- permissions and protected-route helpers
- admin bootstrap role resolution
- answer evaluation
- spaced repetition / interval progression
- study progress persistence orchestration
- progress and review summary aggregation
- review queue due-item filtering
- bulk import parsing and duplicate detection
- locale resolution and locale-aware routing helpers

## Bulk import runbook
Admins can import vocabulary from `/admin/import`.

Supported formats:
- CSV
- JSON

Bundled templates:
- `public/templates/words-import-template.csv`
- `public/templates/words-import-template.json`

Required fields:
- `slug`
- `simplified`
- `hanzi`
- `pinyin`
- `vietnamese_meaning`
- `hsk_level`

Optional supported fields:
- `traditional`
- `han_viet`
- `english_meaning`
- `topic_slug`
- `radical`
- `published`
- `notes`
- `examples` for JSON
- `examples_json` for CSV

Import behavior:
- validates required fields before insert
- skips obvious duplicates found in the file or already in the database
- inserts `word_examples` when valid example payloads are supplied
- reports row-level validation failures back to the admin UI

## Deployment checklist
Before launch:
1. Apply all Supabase migrations, including `0004_phase9_query_hardening.sql` and `0005_default_profile_locale_en.sql`.
2. Verify Google OAuth redirect URLs in Supabase for local and production environments.
3. Confirm `ADMIN_EMAILS` and `SUPABASE_SERVICE_ROLE_KEY` are set in production.
4. Run `npm test` and `npm run typecheck`.
5. Sign in as:
   - anonymous learner
   - normal authenticated learner
   - admin
6. Verify these flows:
   - lesson study saves progress
   - `/review` is driven by due `next_review_at`
   - `/dashboard` loads user-scoped stats
   - `/settings` persists theme/font/language
   - locale switcher preserves the current page while moving between `/en/*`, `/vi/*`, and `/zh/*`
   - `/admin/import` can import a small template file
7. Check structured logs for:
   - auth callback
   - profile bootstrap
   - settings save
   - review persistence
   - admin word writes/imports

### Manual fallback
If you need a direct database fallback, run the SQL in [supabase/manual-promote-admin.sql](/Users/trananh/Work/Projects/chinese-learning-app/supabase/manual-promote-admin.sql:1) after replacing the email value.

### Why this is secure
- clients cannot promote themselves by writing `profiles.role`
- admin role resolution is based on server environment only
- profile role sync writes through the server-only service-role client
- route protection still exists in middleware and server-side permission checks
