-- ==========================================
-- 0002_SEED_CORE.SQL
-- Consolidated core seed data
-- ==========================================

-- 1. TOPICS
insert into public.topics (name, slug, tag_slugs)
values
  ('Giáo dục', 'giao_duc', array['hoc_tap','truong_hoc','giao_duc','mon_hoc','hoc_thuat','luyen_tap','kiem_tra','thi_cu']),
  ('Giao tiếp', 'giao_tiep', array['ngon_ngu','giao_tiep','hoi_thoai','chao_hoi','gioi_thieu','cau_hoi','tra_loi','dong_y','tu_choi','bieu_dat','phat_am','viet','doc','nghe','noi']),
  ('Con người', 'con_nguoi', array['con_nguoi','ca_nhan','gia_dinh','quan_he','ban_be','hon_nhan','tre_em','nguoi_lon','gioi_tinh','tinh_cach','tinh_trang','vai_tro','nghe_nghiep','chuc_danh']),
  ('Đời sống', 'doi_song', array['doi_song','sinh_hoat','nha_cua','vat_dung','do_dung','noi_that','dien_may','an_uong','nau_an','do_an','do_uong','mua_sam','tieu_dung']),
  ('Hành động', 'hanh_dong', array['hanh_dong','di_chuyen','lam_viec','nghi_ngoi','giai_tri','the_thao','tro_choi']),
  ('Thời gian', 'thoi_gian', array['thoi_gian','ngay_thang','nam','gio_time','qua_khu','hien_tai','tuong_lai','tan_suat','thoi_diem','dia_diem','phuong_huong','vi_tri','khong_gian']),
  ('Thiên nhiên', 'thien_nhien', array['thien_nhien','thoi_tiet','khi_hau','dong_vat','thuc_vat','cay_coi','song_nui','bien','mua','gio_wind','nhiet_do']),
  ('Trừu tượng', 'tru_tuong', array['tru_tuong','y_nghia','tu_duy','nhan_thuc','logic','ly_luan','khai_niem','gia_tri','muc_tieu','y_dinh','quyet_dinh']),
  ('Cảm xúc', 'cam_xuc', array['cam_xuc','tinh_cam','vui','buon','tuc_gian','so_hai','yeu_thich','ghet','lo_lang','hanh_phuc','met_moi']),
  ('Sức khoẻ', 'suc_khoe', array['suc_khoe','benh_tat','thuoc','bac_si','dieu_tri','co_the','bo_phan_co_the','cam_giac','an_toan']),
  ('Giao thông', 'giao_thong', array['giao_thong','phuong_tien','xe_co','oto','xe_may','tau','may_bay','duong_bo','duong_sat','duong_hang_khong']),
  ('Công nghệ', 'cong_nghe', array['cong_nghe','may_tinh','internet','phan_mem','ung_dung','du_lieu','ai','lap_trinh','he_thong','mang']),
  ('Văn hoá', 'van_hoa', array['van_hoa','am_nhac','phim_anh','truyen','nghe_thuat','le_hoi','du_lich']),
  ('Xã hội', 'xa_hoi', array['chinh_tri','phap_luat','luat','chinh_sach','quyen_luc','chinh_phu','xa_hoi','an_ninh','quan_su']),
  ('Lượng từ', 'luong_tu', array['so_dem','so_luong','so_thu_tu','do_luong','don_vi','mau_sac','kich_thuoc','hinh_dang'])
on conflict (slug) do update set
  name = excluded.name,
  tag_slugs = excluded.tag_slugs;

-- 2. KANGXI RADICALS (214)
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

-- 3. ADDITIONAL COMMON COMPONENTS (from archived 0010)
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

-- 4. LEARNING ARTICLE TAGS
insert into public.learning_article_tags (name, slug)
values
  ('So sánh từ gần nghĩa', 'so-sanh-tu-gan-nghia'),
  ('Mẹo dùng từ', 'meo-dung-tu'),
  ('Ghi chú học tập', 'ghi-chu-hoc-tap')
on conflict (slug) do update set
  name = excluded.name;

-- 5. SEED LEARNING ARTICLE
with article_seed as (
  insert into public.learning_articles (
    title,
    slug,
    summary,
    content_markdown,
    hsk_level,
    article_type,
    is_published,
    published_at
  )
  values (
    '觉得 vs 认为 vs 以为',
    'jue-de-vs-ren-wei-vs-yi-wei',
    'Phân biệt ba động từ rất hay gặp khi diễn đạt suy nghĩ, nhận định và hiểu lầm trong tiếng Trung.',
    $$# 觉得 vs 认为 vs 以为

Ba từ này đều có thể dịch gần như "nghĩ", nhưng sắc thái và tình huống dùng rất khác nhau.

## 觉得

- Thường dùng để nói **cảm nhận, ấn tượng, ý kiến mang tính cá nhân**.
- Khẩu ngữ dùng rất nhiều.
- Chủ ngữ thường là người đang trực tiếp cảm thấy hoặc đánh giá điều gì đó.

> Ví dụ:
> 我觉得这本书很有意思。  
> Wǒ juéde zhè běn shū hěn yǒu yìsi.  
> Tôi cảm thấy cuốn sách này rất thú vị.

> Ví dụ:
> 你觉得他今天怎么样？  
> Nǐ juéde tā jīntiān zěnmeyàng?  
> Bạn thấy hôm nay anh ấy thế nào?

## 认为

- Thường dùng khi đưa ra **nhận định, quan điểm, đánh giá có tính lý trí hơn**.
- Dùng nhiều trong văn viết, tranh luận, phát biểu chính thức.
- Sắc thái trang trọng hơn `觉得`.

> Ví dụ:
> 我认为这个方法更有效。  
> Wǒ rènwéi zhège fāngfǎ gèng yǒuxiào.  
> Tôi cho rằng phương pháp này hiệu quả hơn.

> Ví dụ:
> 很多人认为学汉字需要时间。  
> Hěn duō rén rènwéi xué Hànzì xūyào shíjiān.  
> Nhiều người cho rằng học chữ Hán cần thời gian.

## 以为

- Dùng khi nói **đã tưởng rằng**, thường hàm ý hiểu khác với sự thật.
- Hay xuất hiện trong tình huống hiểu lầm hoặc giả định sai.
- Rất thường đi cùng thông tin sửa lại ở phía sau.

> Ví dụ:
> 我以为你今天不来了。  
> Wǒ yǐwéi nǐ jīntiān bù lái le.  
> Tôi cứ tưởng hôm nay bạn không đến.

> Ví dụ:
> 他以为老师已经走了，其实老师还在办公室。  
> Tā yǐwéi lǎoshī yǐjīng zǒu le, qíshí lǎoshī hái zài bàngōngshì.  
> Anh ấy tưởng giáo viên đã đi rồi, nhưng thật ra giáo viên vẫn còn trong văn phòng.

## Gợi ý nhớ nhanh

- `觉得`: cảm thấy, thấy rằng, ý kiến cá nhân
- `认为`: cho rằng, nhận định, văn phong trang trọng hơn
- `以为`: tưởng rằng, nhưng thực tế không đúng như vậy
$$,
    3,
    'vocabulary_compare',
    true,
    timezone('utc', now())
  )
  on conflict (slug) do update set
    title = excluded.title,
    summary = excluded.summary,
    content_markdown = excluded.content_markdown,
    hsk_level = excluded.hsk_level,
    article_type = excluded.article_type,
    is_published = excluded.is_published,
    published_at = excluded.published_at,
    updated_at = timezone('utc', now())
  returning id
)
insert into public.learning_article_tag_links (article_id, tag_id)
select article_seed.id, learning_article_tags.id
from article_seed
join public.learning_article_tags
  on learning_article_tags.slug in ('so-sanh-tu-gan-nghia', 'meo-dung-tu', 'ghi-chu-hoc-tap')
on conflict (article_id, tag_id) do nothing;
