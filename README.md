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

## Product concept
The app organizes content by:
- HSK level
- topic
- lesson
- grammar level
- radicals / tags

## Development approach
This repository is intended to be built incrementally with Codex using the docs in `/docs` and prompts in `/prompts`.

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

### Manual fallback
If you need a direct database fallback, run the SQL in [supabase/manual-promote-admin.sql](/Users/trananh/Work/Projects/chinese-learning-app/supabase/manual-promote-admin.sql:1) after replacing the email value.

### Why this is secure
- clients cannot promote themselves by writing `profiles.role`
- admin role resolution is based on server environment only
- profile role sync writes through the server-only service-role client
- route protection still exists in middleware and server-side permission checks
