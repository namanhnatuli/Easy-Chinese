# Archived Migrations

This directory stores historical migrations that are no longer part of the active reset path.

## Active baseline

The only migrations that should be used to initialize a fresh database are:

- `supabase/migrations/0001_init_schema.sql`
- `supabase/migrations/0002_seed_core.sql`

## Archived files

These migrations were consolidated into the new baseline schema and seed flow:

- `0001_init.sql`
- `0002_vocab_sync_foundation.sql`
- `0003_remove_radical_pinyin.sql`
- `0004_vocab_sync_preview_fields.sql`
- `0005_vocab_sync_row_identity.sql`
- `0006_vocab_sync_apply_pipeline.sql`
- `0007_vocab_sync_radical_alias_resolution.sql`
- `0008_word_radicals_authoritative_sync.sql`
- `0009_fix_min_uuid_in_apply_rpc.sql`
- `0010_seed_missing_common_components.sql`
- `0011_fix_sync_apply_exception_fk_violation.sql`
- `0012_fix_ambiguous_column_refs_in_sync_apply.sql`

## Removed from active migration set

The following migration-stage fixes were intentionally folded into the consolidated baseline and are no longer part of the current migration chain:

- `0003_fix_vocab_sync_apply_input_text_fallback.sql`
- `0004_publish_synced_words_and_fix_word_radicals_rls.sql`

They should not be recreated as active migrations because business logic has been moved into the application layer.
