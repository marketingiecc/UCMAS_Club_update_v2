# De xuat phan cap do kho va quy tac luyen tap

Tai lieu nay tong hop de xuat phan cap do kho va quy tac tao de/van hanh cho cac che do luyen tap va luyen thi.
Noi dung duoc tong hop tu ban mo ta chi tiet va de xuat SQL cho Supabase.

## 1) Phan cap do kho (ap dung cho Nhon tinh / Nghe tinh / Flash)

Ba muc do kho:
- Co ban (basic)
- Nang cao (advanced)
- Vuot troi (elite)

Tham so thong dung:
- level_symbol: Z, A, C, D, E, F, G, H, I, K
- mode: visual (Nhin tinh), audio (Nghe tinh), flash
- question_count: so cau trong 1 buoi
- digits: so chu so cua tung so hang
- rows: so dong cua 1 phep tinh
- speed_seconds: toc do doc/hien thi (0.10s den 2.50s)

Khoang de xuat (tham chieu, co the dieu chinh theo cap do):

Nhin tinh (visual)
- Co ban: digits 1-2, rows 3-8, question_count 20-50
- Nang cao: digits 2-4, rows 6-15, question_count 30-80
- Vuot troi: digits 3-6, rows 8-25, question_count 50-120

Ghi chu (Nhin tinh):
- `difficulty` la khung goi y theo `digits/rows/question_count`. Khi sinh de thuc te can ap dung **quy tac theo cap do** (phan bo phep tru theo cau, rang buoc tong tich luy/ket qua).
- Cac rule dac thu (vi du: danh sach cau khong co phep tru; UCMAS50 guard theo hang don vi cua tong tich luy) lam tang do kho va can duoc tinh den khi phan loai.

Nghe tinh (audio)
- Co ban: digits 1-2, rows 3-10, question_count 20-50, speed_seconds 1.50-2.50
- Nang cao: digits 2-4, rows 5-18, question_count 30-80, speed_seconds 0.80-1.50
- Vuot troi: digits 3-6, rows 8-30, question_count 50-120, speed_seconds 0.10-0.80

Flash
- Co ban: digits 1-2, rows 3-10, question_count 20-50, speed_seconds 1.50-2.50
- Nang cao: digits 2-4, rows 5-18, question_count 30-80, speed_seconds 0.80-1.50
- Vuot troi: digits 3-6, rows 8-30, question_count 50-120, speed_seconds 0.10-0.80

## 2) Cau truc web (tom tat)

Chua dang nhap:
- Trang chu: gioi thieu ve trang web, bai luyen tap, lo trinh hoc, cuoc thi, loi ich
- Luyen tap: hien thi cac che do luyen tap, yeu cau kich hoat tai khoan
- Cuoc thi: hien thi danh sach cuoc thi, can ma kich hoat de tham gia
- Kich hoat: nhap ma kich hoat de mo quyen luyen tap

Da dang nhap:
- Trang chu
- Luyen tap -> Trung tam luyen tap (3 tab o ben trai)
  - Tab 1: Luyen theo che do (Nhin tinh / Nghe tinh / Flash)
  - Tab 2: Luyen theo lo trinh
  - Tab 3: Luyen thi hoc sinh gioi
- Kich hoat
- Quan tri vien / Ho so hoc sinh

## 3) Luyen theo che do (Tab 1)

Nhin tinh:
- Chon cap do, chon do kho (Co ban, Nang cao, Vuot troi), so cau
- Can cu bang cap do + quy tac ra de + phan cap do kho de tao de ngau nhien
- Ket qua luu vao Lich su luyen tap

Nghe tinh:
- Chon cap do, chon do kho, so cau, ngon ngu
- Thanh truot toc do doc (0.1 den 2.5 giay)
- Tao de ngau nhien theo bang cap do + quy tac
- Ket qua luu vao Lich su luyen tap

Flash:
- Chon cap do, chon do kho, so cau
- Thanh truot toc do hien thi (0.1 den 2.5 giay)
- Tao de ngau nhien theo bang cap do + quy tac
- Ket qua luu vao Lich su luyen tap

## 4) Luyen theo lo trinh (Tab 2)

Mo ta:
- Lo trinh duoc thiet lap rieng cho tung cap do
- Hoc sinh chon cap do o Profile thi chi hien lo trinh cap do do
- Giao dien lo trinh dang "duong dua" va "vach dich"

Admin thiet ke lo trinh:
- Tab: Thiet ke lo trinh luyen tap
- Hien thi san toan bo cap do + nut tao bai luyen tap
- Pop tao bai gom: cap do, ngay (1-120), che do (audio/visual/flash),
  so cau, do kho, so chu so, so dong, toc do doc/hien thi,
  upload file JSON (neu co se giao bai nay), link JSON mau
- Moi ngay toi da 3 bai (moi che do 1 bai)

Hoc sinh luyen:
- Click tung ngay -> hien cac bai cua ngay do
- Lam xong hien bang ket qua, danh dau hoan thanh ngay
- Khong can luu lich su o Profile, luu theo ngay trong trang lo trinh
- Hoc sinh co the xem lai ket qua theo ngay

## 5) Luyen thi hoc sinh gioi (Tab 3)

Nhin tinh:
- Chon cap do, chon de nguon (tu sinh de / kho bai tap), BAT DAU
- 200 cau trong 8 phut, dem nguoc
- Duoc xem lai cau da lam, duoc nop som
- Bo cuc: ben trai thong tin hoc sinh + danh sach cau hoi
- Moi trang 50 cau, co phan trang
- Mau cau hoi: chua lam (trang), hoan thanh (xanh la)
- Hien so cau da lam va bo dem gio

Nghe tinh / Flash:
- Chon so chu so (digits) 1-10
- Chon so dong (rows)
  - digits 1-2: rows 3-100
  - digits 3-10: rows 3-30
- So cau, ngon ngu, toc do doc (0.1-2.5s)
- Quy tac tao de:
  1) Khong co ket qua < 0
  2) Khong co 2 dau "-" lien tiep
  3) Tong/hieu tich luy luon duong
  4) Khong co 2 dau "-" lien tiep trong 1 phep tinh

## 6) Quy tac hien thi lam bai theo che do

Nhin tinh:
- Hien thi theo chieu doc
- Khong hien thi dau "+"
- Co hien thi dau "-"

Nghe tinh:
- Doc theo toc do da thiet lap
- Neu 2 so hang lien tiep cung dau (+) hoac (-) thi chi doc 1 lan
- Luon bat dau va ket thuc: "Chuan bi" ... doc phep tinh ... "Bang"
- Bai luyen tap chi duoc nghe 1 lan
- Nghe xong moi duoc nhap ket qua
- Tai khoan Giao vien co nut "Xem Ket Qua" de hien dap an

Flash:
- Hien thi tung so theo toc do da thiet lap
- Khong hien thi dau "+"
- Co hien thi dau "-"
- Luon bat dau va ket thuc: "3...2...1...Bat dau..." ... "Bang"
- Bai luyen tap chi duoc xem 1 lan
- Xem xong moi duoc nhap ket qua
- Tai khoan Giao vien co nut "Xem Ket Qua" de hien dap an

## 7) De xuat SQL (Supabase)

Script dong bo Supabase da duoc dieu chinh va luu tai `supabase_training_features.sql`.
Duoi day la tom tat cac bang/truong chinh:

```sql
-- Ho so hoc sinh + trung tam
create table if not exists public.centers (...);
alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists student_code text,
  add column if not exists phone text,
  add column if not exists level_symbol text,
  add column if not exists class_name text,
  add column if not exists center_id uuid,
  add column if not exists role text,
  add column if not exists avatar_url text;

-- Ma kich hoat (tai khoan/cuoc thi) + cuoc thi
create table if not exists public.activation_codes (...);
create table if not exists public.contests (...);
create table if not exists public.contest_registrations (...);

-- Lich su luyen tap (co difficulty/digits/rows/speed/language/source)
create table if not exists public.practice_history (...);

-- Lo trinh luyen tap theo ngay (1-120, toi da 3 bai/ngay)
create table if not exists public.training_tracks (...);
create table if not exists public.training_track_days (...);
create table if not exists public.training_day_exercises (...);
create table if not exists public.training_day_results (...);
create table if not exists public.training_day_exercise_attempts (...);

-- Kho bai tap (de nguon cho luyen thi hoc sinh gioi)
create table if not exists public.exercise_bank_sets (...);
```
