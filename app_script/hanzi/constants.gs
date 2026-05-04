const VOCAB_SCHEMA_VERSION = 'v2_senses';

const REVIEW_STATUS = {
  PENDING: 'pending',
  NEEDS_REVIEW: 'needs_review',
  APPROVED: 'approved'
};

const AI_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  RETRY_LATER: 'retry_later',
  ERROR: 'error'
};

const SOURCE_CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const ALLOWED_TOPIC_TAGS = [
  'hoc_tap', 'truong_hoc', 'giao_duc', 'mon_hoc', 'hoc_thuat', 'luyen_tap', 'kiem_tra', 'thi_cu',
  'ngon_ngu', 'giao_tiep', 'hoi_thoai', 'chao_hoi', 'gioi_thieu', 'cau_hoi', 'tra_loi', 'dong_y', 'tu_choi', 'bieu_dat', 'phat_am', 'viet', 'doc', 'nghe', 'noi',
  'con_nguoi', 'ca_nhan', 'gia_dinh', 'quan_he', 'ban_be', 'hon_nhan', 'tre_em', 'nguoi_lon', 'gioi_tinh', 'tinh_cach', 'tinh_trang', 'vai_tro', 'nghe_nghiep', 'chuc_danh',
  'doi_song', 'sinh_hoat', 'nha_cua', 'vat_dung', 'do_dung', 'noi_that', 'dien_may', 'an_uong', 'nau_an', 'do_an', 'do_uong', 'mua_sam', 'tieu_dung',
  'hanh_dong', 'di_chuyen', 'lam_viec', 'nghi_ngoi', 'giai_tri', 'the_thao', 'tro_choi',
  'thoi_gian', 'ngay_thang', 'nam', 'gio_time', 'qua_khu', 'hien_tai', 'tuong_lai', 'tan_suat', 'thoi_diem', 'dia_diem', 'phuong_huong', 'vi_tri', 'khong_gian',
  'thien_nhien', 'thoi_tiet', 'khi_hau', 'dong_vat', 'thuc_vat', 'cay_coi', 'song_nui', 'bien', 'mua', 'gio_wind', 'nhiet_do',
  'tru_tuong', 'y_nghia', 'tu_duy', 'nhan_thuc', 'logic', 'ly_luan', 'khai_niem', 'gia_tri', 'muc_tieu', 'y_dinh', 'quyet_dinh',
  'cam_xuc', 'tinh_cam', 'vui', 'buon', 'tuc_gian', 'so_hai', 'yeu_thich', 'ghet', 'lo_lang', 'hanh_phuc', 'met_moi',
  'suc_khoe', 'benh_tat', 'thuoc', 'bac_si', 'dieu_tri', 'co_the', 'bo_phan_co_the', 'cam_giac', 'an_toan',
  'giao_thong', 'phuong_tien', 'xe_co', 'oto', 'xe_may', 'tau', 'may_bay', 'duong_bo', 'duong_sat', 'duong_hang_khong',
  'cong_nghe', 'may_tinh', 'internet', 'phan_mem', 'ung_dung', 'du_lieu', 'ai', 'lap_trinh', 'he_thong', 'mang',
  'van_hoa', 'am_nhac', 'phim_anh', 'truyen', 'nghe_thuat', 'le_hoi', 'du_lich',
  'chinh_tri', 'phap_luat', 'luat', 'chinh_sach', 'quyen_luc', 'chinh_phu', 'xa_hoi', 'an_ninh', 'quan_su',
  'so_dem', 'so_luong', 'so_thu_tu', 'do_luong', 'don_vi', 'mau_sac', 'kich_thuoc', 'hinh_dang',
  'pho_bien', 'co_basic', 'nang_cao', 'de_nham', 'da_nghia', 'da_am', 'quan_trong', 'thuong_gap'
];

const TAG_TO_GROUP = {
  hoc_tap: 'education', truong_hoc: 'education', giao_duc: 'education', mon_hoc: 'education', hoc_thuat: 'education', luyen_tap: 'education', kiem_tra: 'education', thi_cu: 'education',
  ngon_ngu: 'communication', giao_tiep: 'communication', hoi_thoai: 'communication', chao_hoi: 'communication', gioi_thieu: 'communication', cau_hoi: 'communication', tra_loi: 'communication', dong_y: 'communication', tu_choi: 'communication', bieu_dat: 'communication', phat_am: 'communication', viet: 'communication', doc: 'communication', nghe: 'communication', noi: 'communication',
  con_nguoi: 'people', ca_nhan: 'people', gia_dinh: 'people', quan_he: 'people', ban_be: 'people', hon_nhan: 'people', tre_em: 'people', nguoi_lon: 'people', gioi_tinh: 'people', tinh_cach: 'people', tinh_trang: 'people', vai_tro: 'people', nghe_nghiep: 'people', chuc_danh: 'people',
  doi_song: 'lifestyle', sinh_hoat: 'lifestyle', nha_cua: 'lifestyle', vat_dung: 'lifestyle', do_dung: 'lifestyle', noi_that: 'lifestyle', dien_may: 'lifestyle', an_uong: 'lifestyle', nau_an: 'lifestyle', do_an: 'lifestyle', do_uong: 'lifestyle', mua_sam: 'lifestyle', tieu_dung: 'lifestyle',
  hanh_dong: 'action', di_chuyen: 'action', lam_viec: 'action', nghi_ngoi: 'action', giai_tri: 'action', the_thao: 'action', tro_choi: 'action',
  thoi_gian: 'time_space', ngay_thang: 'time_space', nam: 'time_space', gio_time: 'time_space', qua_khu: 'time_space', hien_tai: 'time_space', tuong_lai: 'time_space', tan_suat: 'time_space', thoi_diem: 'time_space', dia_diem: 'time_space', phuong_huong: 'time_space', vi_tri: 'time_space', khong_gian: 'time_space',
  thien_nhien: 'nature', thoi_tiet: 'nature', khi_hau: 'nature', dong_vat: 'nature', thuc_vat: 'nature', cay_coi: 'nature', song_nui: 'nature', bien: 'nature', mua: 'nature', gio_wind: 'nature', nhi_do: 'nature',
  tru_tuong: 'abstract', y_nghia: 'abstract', tu_duy: 'abstract', nhan_thuc: 'abstract', logic: 'abstract', ly_luan: 'abstract', khai_niem: 'abstract', gia_tri: 'abstract', muc_tieu: 'abstract', y_dinh: 'abstract', quyet_dinh: 'abstract',
  cam_xuc: 'emotion', tinh_cam: 'emotion', vui: 'emotion', buon: 'emotion', tuc_gian: 'emotion', so_hai: 'emotion', yeu_thich: 'emotion', ghet: 'emotion', lo_lang: 'emotion', hanh_phuc: 'emotion', met_moi: 'emotion',
  suc_khoe: 'health', benh_tat: 'health', thuoc: 'health', bac_si: 'health', dieu_tri: 'health', co_the: 'health', bo_phan_co_the: 'health', cam_giac: 'health', an_toan: 'health',
  giao_thong: 'transport', phuong_tien: 'transport', xe_co: 'transport', oto: 'transport', xe_may: 'transport', tau: 'transport', may_bay: 'transport', duong_bo: 'transport', duong_sat: 'transport', duong_hang_khong: 'transport',
  cong_nghe: 'technology', may_tinh: 'technology', internet: 'technology', phan_mem: 'technology', ung_dung: 'technology', du_lieu: 'technology', ai: 'technology', lap_trinh: 'technology', he_thong: 'technology', mang: 'technology',
  van_hoa: 'culture', am_nhac: 'culture', phim_anh: 'culture', truyen: 'culture', nghe_thuat: 'culture', le_hoi: 'culture', du_lich: 'culture',
  chinh_tri: 'society', phap_luat: 'society', luat: 'society', chinh_sach: 'society', quyen_luc: 'society', chinh_phu: 'society', xa_hoi: 'society', an_ninh: 'society', quan_su: 'society',
  so_dem: 'quantity', so_luong: 'quantity', so_thu_tu: 'quantity', do_luong: 'quantity', don_vi: 'quantity', mau_sac: 'quantity', kich_thuoc: 'quantity', hinh_dang: 'quantity'
};

const ALLOWED_PART_OF_SPEECH = [
  'danh_tu',
  'dong_tu',
  'tinh_tu',
  'pho_tu',
  'luong_tu',
  'dai_tu',
  'gioi_tu',
  'tro_tu',
  'so_tu',
  'da_loai_tu',
  'unknown'
];

const ALLOWED_CHARACTER_STRUCTURES = [
  'hinh_thanh',
  'hoi_y',
  'tuong_hinh',
  'chi_su',
  'gia_ta',
  'khac',
  'khong_ro'
];
