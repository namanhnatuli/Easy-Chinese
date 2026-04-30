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

Gemini AI setup:

```env
GEMINI_API_KEYS=["key1","key2","key3"]
GEMINI_MODEL_WEIGHTS=[{"model":"gemini-3.1-flash-lite-preview","weight":5},{"model":"gemini-2.5-flash","weight":2},{"model":"gemini-2.5-flash-lite","weight":1},{"model":"gemini-3-flash-preview","weight":1}]
GEMINI_MAX_RETRIES=3
GEMINI_TIMEOUT_MS=30000
GEMINI_DEFAULT_TEMPERATURE=0.4
GEMINI_DEFAULT_MAX_OUTPUT_TOKENS=2048

# Deprecated after Gemini migration
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_BASE_URL=
```

TTS setup:

```env
TTS_DEFAULT_SPEAKING_RATE=0.82
TTS_DEFAULT_PITCH=0
TTS_STORAGE_BUCKET=tts-audio
TTS_STORAGE_ACCESS=public
TTS_MAX_CHARACTERS_PER_REQUEST=280
TTS_ALLOWED_LANGUAGE_CODES=zh-CN
TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE=30
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
GOOGLE_TTS_API_KEY=
```

`TTS_PROVIDER` and provider-specific voice allowlists are no longer controlled by env. Authenticated users now choose their preferred TTS provider and voice in the Settings page, while anonymous requests fall back to the first provider that is actually configured on the server.

Environment values are validated at runtime for the core Supabase/public app settings. Invalid or missing required values now fail early instead of producing silent auth or data errors.

AI calls are now centralized in a server-only Gemini provider layer with:
- round-robin API key rotation
- weighted model selection
- retry across the next key/model on retryable failures
- feature-level logging without exposing keys or sensitive prompt data

The app no longer calls OpenAI directly.

For local Supabase Google OAuth, also set:

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
```

For Google Sheets preview sync, set one of these server-side credential formats:

```env
# Option A
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON={"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}

# Option B
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# Optional default preview target
GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID=
```

Notes:
- the service account must have access to the target spreadsheet
- credentials are used only on the server through the Google OAuth JWT bearer flow
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` may use literal newlines or `\n` escapes

## TTS cache and cost control
Pronunciation audio now uses server-side cloud TTS with Supabase Storage caching instead of browser speech synthesis.

How the cache works:
1. The client calls `POST /api/tts`.
2. The server normalizes the text and builds a deterministic cache key.
3. If `tts_audio_cache` already has that key, the existing Storage URL is returned.
4. If not, the configured provider generates audio, the app uploads it to Supabase Storage, stores cache metadata, and returns the URL.

Supabase setup:
- create or keep the `tts-audio` bucket
- prefer `public` bucket mode for non-sensitive reusable study audio
- use `private` only if you need signed URLs and shorter-lived access
- apply migrations `0003_tts_audio_cache.sql` and `0004_tts_cache_access_count.sql`

Provider notes:
- Azure Speech Neural TTS is the preferred first provider for Chinese because of its monthly free-tier allowance
- Google TTS remains supported as an alternate provider
- provider credentials must stay server-side only

Cost guardrails:
- `TTS_MAX_CHARACTERS_PER_REQUEST` blocks overly long requests
- `TTS_ALLOWED_LANGUAGE_CODES` limits which languages can generate audio
- `TTS_ALLOWED_*_VOICES` restricts voice choices to approved values
- `TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE` is an app-level anonymous throttle placeholder
- admins can pre-generate lesson, word, or example audio from `/admin/tts-cache` to improve cache hit rates before users request them

Admin visibility:
- `/admin/tts-cache` shows total cached files, characters generated, provider/voice breakdown, recent entries, hit estimates, and storage estimates
- the same page includes a stale-entry view for old unused cache records; it does not delete automatically

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
2. Reset the local database so the clean init migration is applied from scratch:
   `npm run supabase:db:reset`
3. Add your Google account email to `ADMIN_EMAILS` in `.env`.
4. Copy the local Supabase keys from `npm run supabase:status`:
   - `Publishable` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Secret` -> `SUPABASE_SERVICE_ROLE_KEY`
5. Restart the Next.js app after changing env vars.
6. Sign in again so the server profile sync updates your stored role.

### Production
1. Set `ADMIN_EMAILS` in your deployment environment.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in your deployment environment.
3. Apply the current database migration set. The active path is now `supabase/migrations/0001_init_database.sql` followed by `supabase/migrations/0002_seed_core.sql`.
4. Redeploy or restart the application.
5. Have the target admin sign in again.

## Database setup

This project now uses a clean active migration pair for fresh database setup:

- schema migration: `supabase/migrations/0001_init_database.sql`
- seed migration: `supabase/migrations/0002_seed_core.sql`
- archived iterative history: `supabase/migrations_archive/`

What changed:
- the old development-time migration chain was consolidated into a clean schema migration plus a separate seed migration
- the active migrations define the final schema and seed data directly instead of replaying historical `ALTER`/`DROP` steps
- older active migrations were moved to `supabase/migrations_archive/` for reference only

### Reset local database

Use this when you want to rebuild the local database from scratch:

```bash
npm run supabase:start
npm run supabase:db:reset
```

### Apply current migration state

Use this when you want Supabase to apply the current active migration set without a full local reset:

```bash
npm run supabase:db:push
```

### Verify the local database

After reset:

```bash
npm run supabase:status
npm run typecheck
npm test
```

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

## Google Sheets vocabulary sync
The admin sync workflow supports ongoing Google Sheets imports with staged preview, review, approval, and safe production apply.

Service account setup:
1. Create or reuse a Google Cloud service account with the Google Sheets API enabled.
2. Grant that service account access to the target spreadsheet in Google Sheets.
3. Provide credentials through either `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON` or the `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` pair.
4. Optionally set `GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID` so admins only need to provide a sheet tab name when starting preview.

Preview flow:
1. Open `/admin/content-sync`.
2. Start a preview batch with a spreadsheet ID and sheet name.
3. The server reads rows from Google Sheets, normalizes them, computes a content hash, and matches them against production `words`.
4. Rows are written into `vocab_sync_batches` and `vocab_sync_rows` with separate review and apply states.

Review and approval flow:
1. Use filters to narrow rows by change type, review status, apply status, or search text.
2. Inspect row diffs, payloads, and issues.
3. Approve only rows that should update production content.
4. Apply one row, selected rows, or all approved rows.
5. Retry failed apply rows from the same page after fixing the underlying issue.

Incremental behavior:
- unchanged rows are detected with `content_hash` and source identity data
- unchanged rows are auto-skipped during preview so they do not re-enter manual review or apply
- batch summaries separate `new`, `changed`, `unchanged`, `conflict`, `invalid`, `approved`, and `applied`
- batch retry creates a new preview batch from the same source sheet without mutating the earlier audit trail

Expected sheet columns:
- `input_text`
- `normalized_text`
- `pinyin`
- `meanings_vi`
- `han_viet`
- `traditional_variant`
- `main_radicals`
- `component_breakdown_json`
- `radical_summary`
- `hsk_level`
- `part_of_speech`
- `topic_tags`
- `examples`
- `similar_chars`
- `character_structure_type`
- `structure_explanation`
- `mnemonic`
- `notes`
- `source_confidence`
- `ambiguity_flag`
- `ambiguity_note`
- `reading_candidates`
- `review_status`
- `ai_status`
- `updated_at`
- optional `external_id`

Normalization behavior:
- trims strings and collapses internal whitespace
- parses pipe-delimited radicals, tags, and similar chars
- parses `examples` entries from `CN=...|PY=...|VI=...`
- parses `component_breakdown_json` safely
- normalizes booleans, enums, and source timestamps
- derives `source_row_key` from `normalized_text + pinyin + part_of_speech` when no `external_id` is present

Classification behavior:
- `new`: no production word match
- `changed`: one production word match, but meaningful content differs
- `unchanged`: one production word match and normalized content hash matches
- `conflict`: multiple production words match, or duplicate source identity exists within the batch
- `invalid`: parse/validation errors prevent reliable matching

Matching priority:
1. exact `external_id`
2. `source_row_key`
3. normalized text with pinyin / part-of-speech narrowing

Same Hanzi with different readings:
- the sync pipeline does not merge rows only because they share the same Hanzi
- when multiple production words share the same normalized text, pinyin and part of speech are used to keep distinct readings separate
- if more than one production word still matches after narrowing, the row is marked as `conflict` and the admin UI shows candidate guidance before approval

Apply behavior:
- approved rows use `admin_edited_payload` first, then fall back to `normalized_payload`
- existing `word.id` values are preserved for updates
- apply updates only the relevant content fields for `words`, `word_examples`, `word_tag_links`, and `word_radicals`
- unchanged approved rows are skipped instead of being applied again
- apply failures are recorded on the staging row for retry/debugging

Admin preview API:
- `POST /api/admin/vocab-sync/preview`
  - body: `{ "spreadsheetId"?: "...", "sheetName": "..." }`
- `GET /api/admin/vocab-sync/batches`
- `GET /api/admin/vocab-sync/batches/:batchId`
- `GET /api/admin/vocab-sync/batches/:batchId/rows?changeType=changed&reviewStatus=pending`

## Deployment checklist
Before launch:
1. Apply the active Supabase migration set. Fresh installs should start from `supabase/migrations/0001_init_database.sql`.
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
