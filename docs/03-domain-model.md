# Domain Model

## Main entities

### profiles
Represents user profile data.
Fields:
- id (matches auth user id)
- email
- display_name
- avatar_url
- role (user | admin)
- preferred_language
- preferred_theme
- preferred_font
- created_at
- updated_at

### words
Fields:
- id
- simplified
- traditional
- hanzi
- pinyin
- han_viet
- vietnamese_meaning
- english_meaning (optional future)
- hsk_level
- topic_id
- radical_id
- notes
- is_published
- created_by
- created_at
- updated_at

### word_examples
Fields:
- id
- word_id
- chinese_text
- pinyin
- vietnamese_meaning
- sort_order

### grammar_points
Fields:
- id
- title
- slug
- hsk_level
- structure_text
- explanation_vi
- notes
- is_published
- created_by
- created_at
- updated_at

### grammar_examples
Fields:
- id
- grammar_point_id
- chinese_text
- pinyin
- vietnamese_meaning
- sort_order

### topics
Fields:
- id
- name
- slug
- description

### radicals
Fields:
- id
- radical
- pinyin
- meaning_vi
- stroke_count

### lessons
Fields:
- id
- title
- slug
- description
- hsk_level
- topic_id
- is_published
- sort_order
- created_by
- created_at
- updated_at

### lesson_words
Join table:
- lesson_id
- word_id
- sort_order

### lesson_grammar_points
Join table:
- lesson_id
- grammar_point_id
- sort_order

### user_word_progress
Fields:
- id
- user_id
- word_id
- status (new | learning | review | mastered)
- correct_count
- incorrect_count
- streak_count
- next_review_at
- last_reviewed_at
- ease_factor
- interval_days
- created_at
- updated_at

### user_lesson_progress
Fields:
- id
- user_id
- lesson_id
- completion_percent
- last_studied_at
- completed_at

### review_events
Fields:
- id
- user_id
- word_id
- mode (flashcard | multiple_choice | typing)
- result (correct | incorrect | skipped)
- reviewed_at

## Notes
- Keep grammar progress extensible for later, but word progress is enough for v1.
- Anonymous progress should stay in local storage only if implemented.