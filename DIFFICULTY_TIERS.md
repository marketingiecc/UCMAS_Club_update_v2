# Phan cap do kho (de xuat)

Tai lieu nay gom cac muc do kho su dung cho cac che do luyen tap va luyen thi.
Ba muc do kho: Co ban, Nang cao, Vuot troi.

## Dinh nghia chung

- `level_symbol`: ky hieu cap do (Z, A, C, D, E, F, G, H, I, K)
- `difficulty`: `basic` (Co ban), `advanced` (Nang cao), `elite` (Vuot troi)
- `mode`: `visual` (Nhin tinh), `audio` (Nghe tinh), `flash`
- `question_count`: so cau hoi trong buoi luyen tap
- `digits`: so chu so cua tung so hang
- `rows`: so dong cua mot phep tinh
- `speed_seconds`: toc do doc/hien thi (0.10s den 2.50s)

## De xuat phan cap do kho theo che do luyen tap

### Nhin tinh (visual)

- Co ban:
  - digits: 1-2
  - rows: 3-8
  - question_count: 20-50
- Nang cao:
  - digits: 2-4
  - rows: 6-15
  - question_count: 30-80
- Vuot troi:
  - digits: 3-6
  - rows: 8-25
  - question_count: 50-120

Ghi chu:
- Nhon tinh khong chi phu thuoc `digits/rows` ma con phu thuoc **quy tac ra de theo cap do** (phan bo phep tru theo tung cau, rang buoc tong tich luy/ket qua).
- Mot so cap do/nhom cau co quy tac **mot so cau khong co phep tru** (cac cau con lai co so phep tru co dinh), va quy tac **UCMAS50 guard** (cam mot so so hang tiep theo theo hang don vi cua tong tich luy). Nhung quy tac nay co the lam de kho hon du du `digits/rows` tuong duong.

### Nghe tinh (audio)

- Co ban:
  - digits: 1-2
  - rows: 3-10
  - question_count: 20-50
  - speed_seconds: 1.50-2.50
- Nang cao:
  - digits: 2-4
  - rows: 5-18
  - question_count: 30-80
  - speed_seconds: 0.80-1.50
- Vuot troi:
  - digits: 3-6
  - rows: 8-30
  - question_count: 50-120
  - speed_seconds: 0.10-0.80

### Flash

- Co ban:
  - digits: 1-2
  - rows: 3-10
  - question_count: 20-50
  - speed_seconds: 1.50-2.50
- Nang cao:
  - digits: 2-4
  - rows: 5-18
  - question_count: 30-80
  - speed_seconds: 0.80-1.50
- Vuot troi:
  - digits: 3-6
  - rows: 8-30
  - question_count: 50-120
  - speed_seconds: 0.10-0.80

## Luyen thi hoc sinh gioi (de xuat)

### Nhin tinh

- 200 cau trong 8 phut
- Co bo dem gio, duoc nop som
- Cho phep xem lai cac cau da lam

### Nghe tinh / Flash

- digits: 1-10
- rows:
  - digits 1-2: 3-100
  - digits 3-10: 3-30
- question_count: tuy chon
- speed_seconds: 0.10-2.50
- Quy tac tao de:
  - Khong co ket qua < 0
  - Khong co 2 dau "-" lien tiep
  - Tong/hieu tich luy luon duong

## Ghi chu thuc thi

- `difficulty` duoc luu vao bang lich su luyen tap va lo trinh.
- Cac tham so o tren la khoang de xuat, co the dieu chinh theo tung `level_symbol`.
