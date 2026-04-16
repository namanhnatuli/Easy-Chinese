# Learning Engine

## Supported learning modes in v1
1. Flashcard
2. Multiple choice
3. Typing / complete word

## Flashcard
Front side may show:
- Chinese word
or
- Vietnamese meaning

Back side shows:
- simplified
- traditional
- pinyin
- han viet
- meaning
- examples

User actions:
- know
- don’t know
- skip

## Multiple choice
Prompt variants:
- Chinese -> choose Vietnamese meaning
- Vietnamese meaning -> choose Chinese word
- Pinyin -> choose word
- Example sentence with blank -> choose correct word

## Typing / complete word
Prompt variants:
- show Vietnamese meaning, user types pinyin or Chinese
- show example sentence with missing word
- show pinyin, user types simplified word

## Progress saving
Anonymous:
- optional local progress only
- no server persistence

Authenticated:
- save review events
- update word progress
- compute next review_at

## Simple spaced repetition for v1
Use a lightweight rule:
- correct:
  - increase streak_count
  - increment interval_days using simple progression: 1 -> 3 -> 7 -> 14 -> 30
- incorrect:
  - reset interval_days to 1
  - reset streak_count
- next_review_at = now + interval_days

Do not overcomplicate SM-2 in phase 1.