insert into public.topics (id, name, slug, description)
values
  ('11111111-1111-1111-1111-111111111111', 'Greetings', 'greetings', 'Basic greetings and polite expressions'),
  ('22222222-2222-2222-2222-222222222222', 'Introductions', 'introductions', 'Simple self-introduction phrases')
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description;

insert into public.radicals (id, radical, pinyin, meaning_vi, stroke_count)
values
  ('33333333-3333-3333-3333-333333333333', '讠', 'yán', 'ngôn', 2),
  ('44444444-4444-4444-4444-444444444444', '见', 'jiàn', 'thấy', 4)
on conflict (id) do update
set
  radical = excluded.radical,
  pinyin = excluded.pinyin,
  meaning_vi = excluded.meaning_vi,
  stroke_count = excluded.stroke_count;

insert into public.words (
  id,
  slug,
  simplified,
  traditional,
  hanzi,
  pinyin,
  han_viet,
  vietnamese_meaning,
  english_meaning,
  hsk_level,
  topic_id,
  radical_id,
  notes,
  is_published,
  created_by
)
values
  (
    '55555555-5555-5555-5555-555555555551',
    'ni-hao',
    '你好',
    '你好',
    '你好',
    'nǐ hǎo',
    'nhĩ hảo',
    'xin chào',
    'hello',
    1,
    '11111111-1111-1111-1111-111111111111',
    null,
    'Common greeting in daily conversation.',
    true,
    null
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    'xie-xie',
    '谢谢',
    '謝謝',
    '谢谢',
    'xiè xie',
    'tạ tạ',
    'cảm ơn',
    'thank you',
    1,
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Useful in every lesson path.',
    true,
    null
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    'zai-jian',
    '再见',
    '再見',
    '再见',
    'zài jiàn',
    'tái kiến',
    'tạm biệt',
    'goodbye',
    1,
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'Common closing phrase when leaving.',
    true,
    null
  )
on conflict (id) do update
set
  slug = excluded.slug,
  simplified = excluded.simplified,
  traditional = excluded.traditional,
  hanzi = excluded.hanzi,
  pinyin = excluded.pinyin,
  han_viet = excluded.han_viet,
  vietnamese_meaning = excluded.vietnamese_meaning,
  english_meaning = excluded.english_meaning,
  hsk_level = excluded.hsk_level,
  topic_id = excluded.topic_id,
  radical_id = excluded.radical_id,
  notes = excluded.notes,
  is_published = excluded.is_published;

insert into public.word_examples (
  id,
  word_id,
  chinese_text,
  pinyin,
  vietnamese_meaning,
  sort_order
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555551',
    '你好！很高兴认识你。',
    'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.',
    'Xin chào! Rất vui được gặp bạn.',
    1
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555552',
    '谢谢你的帮助。',
    'Xiè xie nǐ de bāngzhù.',
    'Cảm ơn sự giúp đỡ của bạn.',
    1
  )
on conflict (id) do update
set
  word_id = excluded.word_id,
  chinese_text = excluded.chinese_text,
  pinyin = excluded.pinyin,
  vietnamese_meaning = excluded.vietnamese_meaning,
  sort_order = excluded.sort_order;

insert into public.grammar_points (
  id,
  title,
  slug,
  hsk_level,
  structure_text,
  explanation_vi,
  notes,
  is_published,
  created_by
)
values
  (
    '77777777-7777-7777-7777-777777777771',
    'Particle 吗 for yes/no questions',
    'ma-question-particle',
    1,
    'Statement + 吗？',
    'Thêm 吗 vào cuối câu để biến câu trần thuật thành câu hỏi yes/no.',
    'Giữ nguyên trật tự từ của câu gốc.',
    true,
    null
  )
on conflict (id) do update
set
  title = excluded.title,
  slug = excluded.slug,
  hsk_level = excluded.hsk_level,
  structure_text = excluded.structure_text,
  explanation_vi = excluded.explanation_vi,
  notes = excluded.notes,
  is_published = excluded.is_published;

insert into public.grammar_examples (
  id,
  grammar_point_id,
  chinese_text,
  pinyin,
  vietnamese_meaning,
  sort_order
)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    '你好吗？',
    'Nǐ hǎo ma?',
    'Bạn có khỏe không?',
    1
  )
on conflict (id) do update
set
  grammar_point_id = excluded.grammar_point_id,
  chinese_text = excluded.chinese_text,
  pinyin = excluded.pinyin,
  vietnamese_meaning = excluded.vietnamese_meaning,
  sort_order = excluded.sort_order;

insert into public.lessons (
  id,
  title,
  slug,
  description,
  hsk_level,
  topic_id,
  is_published,
  sort_order,
  created_by
)
values
  (
    '99999999-9999-9999-9999-999999999991',
    'Survival Greetings',
    'survival-greetings',
    'Learn the first greeting phrases, polite responses, and one simple question structure.',
    1,
    '11111111-1111-1111-1111-111111111111',
    true,
    1,
    null
  )
on conflict (id) do update
set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  hsk_level = excluded.hsk_level,
  topic_id = excluded.topic_id,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order;

insert into public.lesson_words (lesson_id, word_id, sort_order)
values
  ('99999999-9999-9999-9999-999999999991', '55555555-5555-5555-5555-555555555551', 1),
  ('99999999-9999-9999-9999-999999999991', '55555555-5555-5555-5555-555555555552', 2),
  ('99999999-9999-9999-9999-999999999991', '55555555-5555-5555-5555-555555555553', 3)
on conflict (lesson_id, word_id) do update
set sort_order = excluded.sort_order;

insert into public.lesson_grammar_points (lesson_id, grammar_point_id, sort_order)
values
  ('99999999-9999-9999-9999-999999999991', '77777777-7777-7777-7777-777777777771', 1)
on conflict (lesson_id, grammar_point_id) do update
set sort_order = excluded.sort_order;
