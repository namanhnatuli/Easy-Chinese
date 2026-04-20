-- ==========================================
-- 0002_SEED_CORE.SQL
-- Consolidated core seed data (Radicals)
-- ==========================================

-- 1. KANGXI RADICALS (214)
with raw_seed(raw_label) as (
  values
    ('Nhất 一'), ('Cổn 丨'), ('Chủ 丶'), ('Phiệt 丿'), ('Ất 乙'), ('Quyết 亅'),
    ('Nhị 二'), ('Đầu 亠'), ('Nhân 人 (亻)'), ('Nhi 儿'), ('Nhập 入'), ('Bát 八 (丷)'),
    ('Quynh 冂'), ('Mịch 冖'), ('Băng 冫'), ('Kỷ 几'), ('Khảm 凵'), ('Đao 刀 (刂)'),
    ('Lực 力'), ('Bao 勹'), ('Chủy 匕'), ('Phương 匚'), ('Hệ 匸'), ('Thập 十'),
    ('Bốc 卜'), ('Tiết 卩 (⺋)'), ('Hán 厂'), ('Tư 厶'), ('Hựu 又'), ('Khẩu 口'),
    ('Vi 囗'), ('Thổ 土'), ('Sĩ 士'), ('Tuy 夂'), ('Truy 夊'), ('Tịch 夕'),
    ('Đại 大'), ('Nữ 女'), ('Tử 子'), ('Miên 宀'), ('Thốn 寸'), ('Tiểu 小 (⺌)'),
    ('Uông 尢 (尣)'), ('Thi 尸'), ('Triệt 屮'), ('Sơn 山'), ('Xuyên 巛 (川)'), ('Công 工'),
    ('Kỷ 己'), ('Cân 巾'), ('Can 干'), ('Yêu 幺'), ('Nghiễm 广'), ('Dẫn 廴'),
    ('Củng 廾'), ('Dặc 弋'), ('Cung 弓'), ('Kệ 彐 (彑)'), ('Sam 彡'), ('Xích 彳'),
    ('Tâm 心 (忄, ⺗)'), ('Qua 戈'), ('Hộ 戶 (户)'), ('Thủ 手 (扌)'), ('Chi 支'), ('Phộc 攴 (攵)'),
    ('Văn 文'), ('Đẩu 斗'), ('Cân 斤'), ('Phương 方'), ('Vô 无 (旡)'), ('Nhật 日'),
    ('Viết 曰'), ('Nguyệt 月 (⺝ khi làm bộ thịt)'), ('Mộc 木'), ('Khiếm 欠'), ('Chỉ 止'), ('Đãi 歹 (歺)'),
    ('Ân 殳'), ('Mẫu 毋 (母 liên quan hình thể)'), ('Tỷ 比'), ('Mao 毛'), ('Thị 氏'), ('Khí 气'),
    ('Thủy 水 (氵, 氺)'), ('Hỏa 火 (灬)'), ('Trảo 爪 (爫)'), ('Phụ 父'), ('Hào 爻'), ('Phiến 爿 (丬)'),
    ('Nha 牙'), ('Ngưu 牛 (牜)'), ('Khuyển 犬 (犭)'), ('Huyền 玄'), ('Ngọc 玉 (王, ⺩)'), ('Qua 瓜'),
    ('Ngõa 瓦'), ('Cam 甘'), ('Sinh 生'), ('Dụng 用'), ('Điền 田'), ('Sơ 疋 (⺪)'),
    ('Nạch 疒'), ('Bạch 白'), ('Bì 皮'), ('Mãnh 皿'), ('Mục 目'), ('Mâu 矛'),
    ('Thỉ 矢'), ('Thạch 石'), ('Thị 示 (礻)'), ('Lộc 禸'), ('Hòa 禾'), ('Huyệt 穴'),
    ('Lập 立'), ('Trúc 竹 (⺮)'), ('Mễ 米'), ('Mịch 糸 (糹, 纟)'), ('Phẫu 缶'), ('Võng 网 (罒, 罓)'),
    ('Dương 羊 (⺶)'), ('Vũ 羽'), ('Lão 老 (耂)'), ('Nhi 而'), ('Nhĩ 耳'), ('Bút 聿 (⺻)'),
    ('Nhục 肉 (⺼)'), ('Thần 臣'), ('Tự 自'), ('Chí 至'), ('Cữu 臼'), ('Thiệt 舌'),
    ('Thuấn 舛'), ('Chu 舟'), ('Cấn 艮'), ('Sắc 色'), ('Thảo 艸 (艹)'), ('Hổ 虍'),
    ('Trùng 虫'), ('Huyết 血'), ('Hành 行'), ('Y 衣 (衤)'), ('Tây 襾 (覀)'), ('Kiến 見 (见)'),
    ('Giác 角'), ('Ngôn 言 (訁, 讠)'), ('Cốc 谷'), ('Đậu 豆'), ('Thỉ 豕'), ('Trĩ 豸'),
    ('Bối 貝 (贝)'), ('Xích 赤'), ('Tẩu 走'), ('Túc 足 (𧾷)'), ('Thân 身'), ('Xa 車 (车)'),
    ('Tân 辛'), ('Thần 辰'), ('Sước 辵 (辶)'), ('Ấp邑 (阝– phải)'), ('Dậu 酉'), ('Thích 釆'),
    ('Lý 里'), ('Kim 金 (釒, 钅)'), ('Trường 長 (长)'), ('Môn 門 (门)'), ('Phụ 阜 (阝– trái)'), ('Lệ 隶'),
    ('Tuy 隹'), ('Vũ 雨'), ('Thanh 青'), ('Phi 非'), ('Diện 面'), ('Cách 革'),
    ('Vi 韋 (韦)'), ('Âm 音'), ('Hiệt 頁 (页)'), ('Phong 風 (风)'), ('Phi 飛 (飞)'), ('Thực 食 (飠, 饣)'),
    ('Thủ 首'), ('Hương 香'), ('Mã 馬 (马)'), ('Cốt 骨'), ('Cao 高'), ('Phát 髟'),
    ('Đấu 鬥 (斗)'), ('Mạch 鬯'), ('Cách cách 鬲'), ('Quỷ 鬼'), ('Ngư 魚 (鱼)'), ('Điểu 鳥 (鸟)'),
    ('Lỗ 鹵 (卤)'), ('Lộc 鹿'), ('Mạch 麥 (麦)'), ('Ma 麻'), ('Hoàng 黃 (黄)'), ('Thử 黍'),
    ('Hắc 黑'), ('Đại 黹'), ('Thằng 黽 (黾)'), ('Đỉnh 鼎'), ('Cổ 鼓'), ('Thử 鼠'),
    ('Tỵ 鼻'), ('Tề 齊 (齐)'), ('Xỉ 齒 (齿)'), ('Long 龍 (龙)'), ('Quy 龜 (龟)'), ('Dược 龠')
),
parsed_seed as (
  select
    raw_label,
    trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[1]) as han_viet_name,
    trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[2]) as radical,
    nullif(trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[3]), '') as raw_variants
  from raw_seed
),
radical_seed as (
  select
    ps.radical,
    ps.raw_label as display_label,
    ps.han_viet_name,
    ps.han_viet_name as meaning_vi,
    0 as stroke_count,
    coalesce(
      array_remove(
        array_agg(
          distinct nullif(trim(regexp_replace(regexp_replace(coalesce(token, ''), '[–—-].*$', ''), '\s+.*$', '')), '')
        ) filter (where token is not null),
        ps.radical
      ),
      array[]::text[]
    ) as variant_forms
  from parsed_seed ps
  left join lateral unnest(case when ps.raw_variants is null then array[]::text[] else string_to_array(ps.raw_variants, ',') end) as token on true
  group by ps.radical, ps.raw_label, ps.han_viet_name
)
insert into public.radicals (radical, display_label, han_viet_name, meaning_vi, stroke_count, variant_forms)
select radical, display_label, han_viet_name, meaning_vi, stroke_count, variant_forms from radical_seed
on conflict (radical) do update set
  display_label = excluded.display_label,
  han_viet_name = excluded.han_viet_name,
  meaning_vi = excluded.meaning_vi,
  stroke_count = excluded.stroke_count,
  variant_forms = excluded.variant_forms,
  updated_at = timezone('utc', now());

-- 2. ADDITIONAL COMMON COMPONENTS (from archived 0010)
insert into public.radicals (radical, display_label, han_viet_name, meaning_vi, stroke_count)
values 
  ('电', 'Điện 电', 'Điện', 'Điện / Chớp / Sét', 5),
  ('云', 'Vân 云', 'Vân', 'Mây', 4),
  ('业', 'Nghiệp 业', 'Nghiệp', 'Nghề nghiệp / Công việc / Sự nghiệp', 5)
on conflict (radical) do update set
  display_label = excluded.display_label,
  han_viet_name = excluded.han_viet_name,
  meaning_vi = excluded.meaning_vi,
  stroke_count = excluded.stroke_count,
  updated_at = timezone('utc', now());
