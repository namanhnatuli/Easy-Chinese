# TTS Cache Architecture

## Goal
Replace browser-based pronunciation with cloud TTS and cache generated audio in Supabase Storage.

Phase 1 only adds the storage, metadata, cache-key, and lookup foundation.
It does not call Azure or Google yet on cache miss.

## Storage bucket
- Bucket name: `tts-audio`
- Recommended mode: `public`
- Reason: vocabulary and lesson pronunciation audio is non-sensitive and benefits from simple CDN-style playback
- Alternative: `private` with short-lived signed URLs generated server-side

## Metadata table
Table: `public.tts_audio_cache`

Purpose:
- track which provider/voice generated a file
- map a deterministic cache key to a storage object
- keep safe metadata queryable without exposing provider secrets

Important rule:
- business logic stays in app code
- no RPC
- no SQL business functions

## Cache key inputs
The cache key is generated in application code from:
- provider
- language code
- voice
- speaking rate
- pitch
- normalized text

Normalization rules:
- Unicode NFKC normalization
- trim outer whitespace
- collapse repeated whitespace to a single space

## Storage path pattern
Current path pattern:

`tts/{languageCode}/{voice}/{cacheKey}.mp3`

Example:

`tts/zh-cn/zh-cn-xiaoxiaoneural/ab12....mp3`

## Read/write model
Public or authenticated users:
- may read safe cache metadata rows
- may request playback through `/api/tts`

Server-side application code with service role:
- performs cache writes
- updates `last_accessed_at`
- will generate signed URLs if bucket mode is private
- will perform provider generation in Phase 2

## API foundation
`POST /api/tts`

Input:
- text
- optional provider override
- optional language/voice/rate/pitch override

Output:
- `audioUrl`
- `cacheHit`
- `cacheKey`
- `mimeType`
- `characterCount`

## Phase 2 direction
On cache miss:
1. call configured provider
2. upload audio to `tts-audio`
3. insert `tts_audio_cache` row with metadata
4. return resolved playback URL

Race handling:
- deterministic storage path
- `unique(cache_key)` on metadata table
- if concurrent creation causes insert conflict, fetch the existing cache row and return that instead of failing

## Provider architecture
Provider contract lives in application code and is server-only:
- `synthesizeSpeech(input)`
- returns audio buffer
- returns mime type
- returns provider metadata

Supported providers:
- `azure`
- `google`

Current primary implementation:
- Azure Speech Neural TTS
- default voice: `zh-CN-XiaoxiaoNeural`
- output: `audio/mpeg`

Google support:
- modular alternative provider
- intended as fallback or switchable provider
- verify current pricing and free-tier details before enabling in production

## Validation and cost guardrails
Current guardrails:
- non-empty text required
- max request size enforced in app code via `TTS_MAX_CHARACTERS_PER_REQUEST`
- only supported provider names accepted
- only supported language codes accepted
- only supported voices accepted per provider
- character count logged for every request
- lightweight best-effort IP rate limiting on `/api/tts`

Current language scope:
- `zh-CN` only

Recommended production usage:
- keep requests to vocabulary words, example sentences, and lesson phrases
- avoid arbitrary long-form paragraph synthesis through this public route
