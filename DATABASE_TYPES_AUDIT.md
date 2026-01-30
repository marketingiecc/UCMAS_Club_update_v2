# Rà soát database.types.ts với cấu trúc web và SQL

Tài liệu so sánh `supabase/src/types/database.types.ts` với:
- Cấu trúc SQL trong `supabase_training_features.sql`
- Các bảng/trường mà web (mockBackend, trainingService, pages) thực sự dùng

---

## 1. Tổng quan bảng

### 1.1 Bảng trong database.types.ts (Tables)

Có **55 bảng** (không kể Views/Functions):  
activation_codes, answers, assigned_practice_exams, attempts, badges, centers, contest_access_codes, contest_exams, contest_registrations, contest_section_answers, contest_section_attempts, contest_sessions, contests, custom_exam_access, custom_exams, daily_challenge_attempts, daily_challenges, entitlements, exam_rules, exercise_bank_sets, group_practice_attempts, group_practice_groups, group_practice_members, group_practice_sessions, guided_practice_attempts, guided_practice_modules, guided_practice_steps, learning_path_enrollments, learning_path_levels, learning_path_progress, learning_paths, **listens**, mixed_exam_questions, practice_attempts, practice_history, practice_topics, profiles, progress_reports, skill_categories, skill_practice_sets, skill_progress, speed_training_sessions, topic_practice_attempts, topic_practice_sets, training_day_exercise_attempts, training_day_exercises, training_day_results, training_track_days, training_tracks, user_badges, virtual_abacus_sessions.

### 1.2 Bảng trong supabase_training_features.sql

- **Block 1 (≈ 1–395):** centers, profiles (alter), activation_codes, contests, contest_registrations, practice_history, training_tracks, training_track_days, training_day_exercises, training_day_results, training_day_exercise_attempts, exercise_bank_sets, learning_paths, learning_path_levels, learning_path_enrollments, learning_path_progress, daily_challenges, daily_challenge_attempts, guided_practice_modules, guided_practice_steps, guided_practice_attempts, practice_topics, topic_practice_sets, topic_practice_attempts, speed_training_sessions, skill_categories, skill_practice_sets, skill_progress, virtual_abacus_sessions, group_practice_*, badges, user_badges, progress_reports, profiles (alter lần 2).
- **Block 2 (≈ 397–531):** Lặp/ghi đè: activation_codes, contests, contest_registrations, practice_history, training_*, exercise_bank_sets (cùng tên bảng, có thể khác cột).

Tất cả bảng trong SQL đều đã có trong database.types. **Không thiếu bảng** so với SQL.

### 1.3 Bảng web thực sự dùng (từ grep .from)

- **mockBackend / pages:** user_profile_aggregated, profiles, entitlements, attempts, answers, exam_rules, custom_exams, contests, contest_exams, contest_access_codes, contest_sessions, contest_section_attempts, contest_section_answers.
- **trainingService:** learning_paths, daily_challenges, guided_practice_modules, practice_topics, skill_categories, badges, progress_reports, speed_training_sessions.
- **practiceService (src):** practice_attempts, assigned_practice_exams, mixed_exam_questions.

**Không thấy dùng:** `listens` — không có `.from('listens')` trong repo UCMAS-Club. Có thể bảng thừa hoặc dùng ở chỗ khác (Supabase dashboard, job, v.v.).

---

## 2. Khác biệt / Thiếu trường theo từng bảng quan trọng

### 2.1 activation_codes

| Nguồn            | Trường |
|------------------|--------|
| **SQL** (training_features) | code, code_type, contest_id, used_by, used_at, expires_at, created_by, note, created_at (block 2 thêm is_used) |
| **database.types**         | code, created_at, **duration_days**, expires_at, id, **scope**, **status**, **updated_at**, used_at, used_by |

- **Kết luận:** Hai schema khác nhau.
  - SQL: hướng “mã kích hoạt” (account/contest), có `code_type`, `contest_id`, `created_by`, `note`, `is_used`.
  - database.types: hướng “kích hoạt license” (duration_days, scope, status).
- Nếu web đang dùng **duration_days / scope / status** (kích hoạt tài khoản theo gói) thì database.types đúng với DB thực tế; khi đó SQL trong repo đang mô tả schema khác (chưa áp dụng hoặc môi trường khác).
- Nếu muốn dùng đúng schema SQL (code_type, contest_id, note, is_used) thì cần **cập nhật database.types** cho activation_codes cho khớp SQL (và ngược lại nếu DB thật đang là schema “license”).

### 2.2 contests

| Nguồn            | Trường chính |
|------------------|--------------|
| **SQL**          | title, description, starts_at, ends_at, requires_activation, is_published, created_by, created_at |
| **database.types** | name, start_at, **duration_minutes**, **lobby_open_minutes**, **enable_nhin_tinh**, **enable_nghe_tinh**, **enable_flash**, **status**, created_at, created_by, updated_at |

- **Kết luận:** Schema khác nhau. Web (ContestListPage, ContestExamPage, mockBackend) dùng contest với **name, start_at, duration_minutes, lobby_open_minutes, enable_*, status** → database.types đang khớp với cách web dùng. SQL trong repo giống “bản đề xuất” khác (title/description/starts_at/ends_at). Không cần sửa database.types theo SQL nếu DB thật đang là schema hiện tại.

### 2.3 profiles

- **SQL:** alter thêm full_name, student_code, phone, level_symbol, class_name, center_id, role, avatar_url; block 2 thêm center_name (không bỏ center_id).
- **database.types:** avatar_url, center_id, center_name, class_name, created_at, full_name, id, level_symbol, phone, role, student_code, updated_at.
- **Kết luận:** Khớp. Có đủ center_id, center_name và các trường web cần. **Không thiếu trường.**

### 2.4 practice_history

- **SQL:** user_id, mode, practice_type, level_symbol, difficulty, question_count, digits, rows, speed_seconds, language, correct_count, score, duration_seconds, source, settings, created_at.
- **database.types:** correct_count, created_at, difficulty, digits, duration_seconds, id, language, level_symbol, mode, practice_type, question_count, rows, score, settings, source, speed_seconds, user_id.
- **Kết luận:** Khớp. **Không thiếu trường.**

### 2.5 training_day_exercises

- **SQL block 1:** có `json_url`.
- **SQL block 2 (479–494):** không có `json_url`, chỉ source, exercise_payload, …
- **database.types:** có **json_url** (và đủ digits, rows, speed_seconds, source, exercise_payload, …).
- **Kết luận:** Nếu DB thật có cột `json_url` thì database.types đúng. Nếu chỉ áp dụng block 2 và không có json_url thì có thể xem json_url là thừa trong types (optional vẫn chấp nhận được). Không gây lỗi.

### 2.6 progress_reports

- **SQL:** id, user_id, report_range, summary, generated_at, unique(user_id, report_range).
- **database.types:** generated_at, id, report_range, summary, user_id.
- **Kết luận:** Khớp. **Không thiếu trường.**

### 2.7 Các bảng training / learning / practice khác

- training_tracks, training_track_days, training_day_results, training_day_exercise_attempts, learning_paths, learning_path_levels, learning_path_enrollments, learning_path_progress, daily_challenges, guided_practice_*, practice_topics, topic_practice_*, speed_training_sessions, skill_*, badges, user_badges, exercise_bank_sets: so với SQL trong repo đều **đã có đủ trong database.types**, không báo thiếu cột quan trọng.

---

## 3. Thừa bảng / thừa trường

### 3.1 Bảng có khả năng thừa (ít dùng hoặc không thấy dùng trên web)

- **listens:** Không thấy `.from('listens')` trong UCMAS-Club. Có thể:
  - Bảng dùng ở service/script khác hoặc tính năng chưa làm, hoặc
  - Thừa so với tính năng hiện tại.
- **Các bảng còn lại** trong database.types đều hoặc được gọi trực tiếp (attempts, answers, contests, contest_*, profiles, entitlements, exam_rules, custom_exams, learning_paths, daily_challenges, …) hoặc nằm trong cùng schema training (training_*, practice_history, …) nên **không đề xuất xóa** trừ khi xác nhận không dùng ở bất kỳ đâu (kể cả RPC, trigger, job).

### 3.2 Thừa trường

- Không phát hiện trường nào trong database.types “thừa” so với SQL đến mức gây lỗi. Một số bảng (ví dụ contests, activation_codes) có schema khác SQL trong repo nhưng **phù hợp với cách web đang dùng**; có thể xem SQL trong repo là bản đề xuất/alternate.

---

## 4. Đề xuất hành động

1. **Thống nhất nguồn sự thật:**  
   Quyết định schema “đúng” là:
   - DB Supabase thật (đang chạy), hoặc  
   - File SQL trong repo (supabase_training_features.sql).  
   Sau đó:
   - Nếu DB thật là chuẩn: sinh lại `database.types.ts` từ Supabase (hoặc chỉnh tay cho đúng DB thật).
   - Nếu SQL trong repo là chuẩn: cập nhật DB bằng migrations từ SQL, rồi sinh lại database.types từ DB.

2. **activation_codes:**  
   - Nếu web chỉ dùng “kích hoạt license” (duration_days, scope, status): giữ nguyên database.types; có thể cập nhật SQL trong repo thành một bản “license activation” cho nhất quán.  
   - Nếu cần dùng schema SQL (code_type, contest_id, note, is_used): thêm/sửa các cột tương ứng trong database.types và cập nhật code gọi activation_codes.

3. **contests:**  
   Giữ database.types như hiện tại vì khớp với cách web dùng (name, duration_minutes, lobby_open_minutes, enable_*, status). Chỉ chỉnh SQL trong repo nếu muốn mô tả đúng schema DB thật.

4. **listens:**  
   - Nếu xác nhận không dùng: có thể ghi chú trong code/types là “reserved / unused” hoặc bỏ trong bản types tạo tay (nếu không dùng codegen).  
   - Nếu dùng ở chỗ khác: giữ nguyên.

5. **Đồng bộ web với Supabase:**  
   - Đảm bảo UCMAS-Club có bản `database.types.ts` đúng với DB (copy từ `supabase/src/types/database.types.ts` hoặc path tương ứng trong monorepo).  
   - Hiện tại import là `../types/database.types`; nếu file nằm trong repo supabase thì cần path/workspace phù hợp để web resolve đúng file.

---

## 5. Tóm tắt

| Hạng mục              | Kết quả |
|------------------------|--------|
| Thiếu bảng trong DB types so với SQL | Không |
| Thiếu trường quan trọng (profiles, practice_history, progress_reports, training_*) | Không |
| Khác biệt schema (activation_codes, contests) | Có — cần thống nhất theo DB thật hoặc theo SQL đã chọn |
| Bảng có khả năng thừa (ít dùng) | listens |
| Thừa trường gây lỗi   | Không |

Kết luận: **database.types.ts về cơ bản đã đúng với toàn bộ cấu trúc bảng và trường mà web đang dùng.** Cần làm rõ và thống nhất schema cho **activation_codes** và **contests** với DB/SQL, và xử lý bảng **listens** (dùng hay bỏ).

---

## 6. Ghi chú đường dẫn (UCMAS-Club)

- Web import: `import { Database } from '../types/database.types'` (từ `services/mockBackend.ts`).
- Đường dẫn tương đương: `UCMAS-Club/types/database.types.ts` (hoặc `database.types/index.ts`).
- File `database.types.ts` đầy đủ nằm ở: **supabase/src/types/database.types.ts**.
- Nếu build báo lỗi không tìm thấy module: copy/symlink `supabase/src/types/database.types.ts` vào `UCMAS-Club/types/database.types.ts`, hoặc cấu hình path/workspace để trỏ đúng file.
