-- ==========================================
-- SEED MISSING COMMON COMPONENTS
-- ==========================================

insert into public.radicals (radical, display_label, han_viet_name, meaning_vi, stroke_count)
values 
  ('电', 'Điện 电', 'Điện', 'Điện / Chớp / Sét', 5),
  ('云', 'Vân 云', 'Vân', 'Mây', 4),
  ('业', 'Nghiệp 业', 'Nghiệp', 'Nghề nghiệp / Công việc / Sự nghiệp', 5)
on conflict (radical) do update
set
  display_label = excluded.display_label,
  han_viet_name = excluded.han_viet_name,
  meaning_vi = excluded.meaning_vi,
  stroke_count = excluded.stroke_count,
  updated_at = timezone('utc', now());
