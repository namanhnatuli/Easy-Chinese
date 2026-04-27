# AGENTS.md

## Project
Build a production-ready web app for learning Chinese using:
- Next.js (App Router, TypeScript)
- Supabase (Auth, Postgres, RLS)
- Tailwind CSS
- shadcn/ui

## Product goals
The app helps users learn Chinese vocabulary and grammar through structured lessons and multiple learning modes:
- flashcard
- multiple choice
- typing / complete word

The product supports:
- anonymous learning without saved progress
- authenticated users with saved progress
- admin content management

## Rules
1. Always propose a short implementation plan before large changes.
2. Prefer small, reviewable commits by feature.
3. Use server components by default, client components only when needed.
4. Use Supabase SSR auth patterns compatible with Next.js App Router.
5. Enforce authorization in both UI and server/data layers.
6. Prefer Row Level Security and server-side checks over client-only guards.
7. Keep business logic inside `src/features/*`.
8. Keep shared helpers inside `src/lib/*`.
9. Use Zod for form and API validation.
10. Write clean TypeScript types for all domain entities.
11. Do not introduce unnecessary libraries.
12. Build mobile-friendly responsive layouts.
13. Use accessible components and semantic HTML.
14. For admin CRUD, use reusable form components where possible.
15. When creating database schema, include indexes, constraints, and timestamps.
16. When building learning progress, design for future spaced repetition support.
17. Anonymous users may access public content but may not persist progress.
18. Admin users can perform all user operations plus content management.

## Database Architecture Rules

We DO NOT use SQL functions for business logic.

Strict rules:
- Never create SQL functions for application logic
- Never use Supabase RPC pattern
- Never implement business logic in database layer
- Database is ONLY for:
  - schema
  - constraints
  - indexes
  - relationships
  - RLS policies

All business logic must be implemented in:
- service layer
- server actions
- application code

If a task seems to require SQL logic:
→ implement it in application code instead

SQL functions are ONLY allowed for:
- trivial utility (e.g. updated_at trigger)
- and must be explicitly justified

Violating this rule is considered a bug.

## UI direction
Use a calm study-product design:
- left sidebar navigation
- top header for account/actions
- cards for lessons and levels
- dark learning panel for study modes
- simple dashboard cards for statistics

Do not copy any screenshot exactly. Use them only as inspiration.

## Coding style
- TypeScript strict mode
- descriptive names
- avoid giant files
- one concern per module
- reusable UI primitives
- explicit loading and error states

## Testing
For important business logic, create at least lightweight unit coverage where practical.

## Output expectations
When implementing a feature:
1. explain the plan
2. create/update files
3. summarize what was added
4. mention follow-up tasks