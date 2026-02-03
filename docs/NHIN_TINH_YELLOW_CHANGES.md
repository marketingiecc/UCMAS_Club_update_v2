## NHIN_TINH_YELLOW_CHANGES

Tai lieu nay ghi lai cac thay doi/phan mo ta duoc to vang (PDF: `Cấu trúc đề ucmas.club - Nhìn tính mô tả AI.pdf`) va mapping sang code.

### 1) Phan bo phep tru theo cau (cot \"XUẤT HIỆN CỦA PHÉP TRỪ\")

**Pattern A: danh sach cau khong co phep tru**
- Van ban mau: `Câu 51, 57, 63, 69 không xuất hiện phép trừ, các câu còn lại phép trừ xuất hiện 1 lần/ câu.`
- Code:
  - Parse: `parseMinusCountFn(...)` (them pattern `mZeroList`)
  - Ap dung: `minusCountFn(qNo)` -> `minusRequired` trong `generateExam(...)`

**Pattern B: chi o cau chan/le + mot so cau co so phep tru dac biet**
- Van ban mau: `Phép trừ chỉ xuất hiện ở câu chẵn. Các câu 152, 156... xuất hiện 2 phép trừ/ câu..., các câu chẵn còn lại chỉ xuất hiện 1 phép trừ.`
- Code:
  - Parse: `parseMinusCountFn(...)` (pattern `mList` + gate chan/le)

### 2) Rang buoc tong tich luy UCMAS50 (cot \"Nguyên tắc 1\")

**Quy tac theo hang don vi**
- Van ban mau: `Khi tổng tích luỹ có hàng đơn vị bằng 5/6/7/8 thì số hạng tiếp theo khác ...`
- Code:
  - Bat/tat guard: `parseConstraints(...)` -> `constraints.ucmas50Guard`
  - Kiem tra: `applyUCMAS50Guard(partial, nextTerm)` (da chuyen sang dung hang don vi `partial % 10`)

**Quy tac khi tong tich luy co 2 chu so va so cuoi la 1/2/3/4**
- Van ban mau:
  - so cuoi = 1 => khong phai `-6`
  - so cuoi = 2 => khong phai `-6, -7`
  - so cuoi = 3 => khong phai `-6, -7, -8`
  - so cuoi = 4 => khong phai `-6, -7, -8, -9`
- Code:
  - `applyUCMAS50Guard(partial, nextTerm)`

### 3) Khong co 2 phep tru lien tiep trong 1 cau

- Van ban mau: `Không xuất hiện 2 phép trừ liên tiếp trong câu đó.`
- Code:
  - Neu thay trong `minus` text: `buildLevelRules(...)` se bat `constraints.noConsecutiveMinus = true`
  - Thuc thi:
    - Sua `negPositions` (repair) trong `generateAddSubQuestion(...)`
    - Chan 2 so hang am lien tiep trong DFS (`constraints.noConsecutiveMinus`)

