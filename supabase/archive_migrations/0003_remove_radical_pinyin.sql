-- ==========================================
-- REMOVE RADICAL PINYIN
-- ==========================================

alter table public.radicals
  drop column if exists pinyin;
