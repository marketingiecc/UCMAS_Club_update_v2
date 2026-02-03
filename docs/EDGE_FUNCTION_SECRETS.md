# Cấu hình Secrets cho Edge Function `invite-teacher`

Edge Function **invite-teacher** cần **hai biến môi trường** (secrets) với **đúng tên** sau.

## Cách thêm Secrets đúng

Vào **Supabase Dashboard** → **Edge Functions** → **Secrets** (hoặc **Project Settings** → **Edge Function** → **Secrets**).

### 1. Secret thứ nhất

| Ô nhập | Giá trị |
|--------|--------|
| **Name** | `SUPABASE_URL` *(gõ chính xác, không phải URL)* |
| **Value** | `https://rwtpwdyoxirfpposmdcg.supabase.co` (URL dự án của bạn, không có dấu `/` ở cuối) |

### 2. Secret thứ hai

| Ô nhập | Giá trị |
|--------|--------|
| **Name** | `SUPABASE_SERVICE_ROLE_KEY` *(gõ chính xác)* |
| **Value** | JWT **service_role** (lấy từ **Project Settings** → **API** → **Project API keys** → **service_role**) |

Ví dụ Value (chỉ là ví dụ, dùng key thật của project):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dHB3ZHlveGlyZnBwb3NtZGNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgzNTc4MSwiZXhwIjoyMDgzNDExNzgxfQ.xxxx
```

Sau khi điền xong cả hai, bấm **Save**.

## Lỗi thường gặp

- **Đặt nhầm Name**: Nếu bạn đặt **Name** = `https://rwtpwdyoxirfpposmdcg.supabase.co/` (URL) thì code không đọc được vì nó cần biến tên `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.
- **Thiếu secret**: Thiếu một trong hai → Edge Function trả về lỗi 500 "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY".
- **401 Invalid JWT**: Thường do secret **SUPABASE_SERVICE_ROLE_KEY** sai (key cũ, key project khác) hoặc chưa set. Cần set đúng **Name** = `SUPABASE_SERVICE_ROLE_KEY` và **Value** = service_role key trong **API** của đúng project.

## Kiểm tra sau khi lưu

- Trong danh sách Secrets phải thấy **hai dòng**:
  - **NAME** = `SUPABASE_URL`
  - **NAME** = `SUPABASE_SERVICE_ROLE_KEY`
- Nếu chỉ thấy một dòng mà NAME là URL thì cấu hình vẫn sai, cần thêm/sửa theo bảng trên.

---

## VITE_SUPABASE_ANON_KEY có cần trong Edge Function không?

**Không.** Edge Function **không cần** và **không nên** thêm `VITE_SUPABASE_ANON_KEY` vào Secrets của function.

- **Secrets của Edge Function** chỉ cần: `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` (như bảng trên).
- **VITE_SUPABASE_ANON_KEY** là biến dành cho **ứng dụng frontend** (trình duyệt):
  - Cấu hình trong file **.env** ở thư mục gốc project:  
    `VITE_SUPABASE_ANON_KEY=eyJ...` (anon public key từ Project Settings → API).
  - App dùng key này để đăng nhập và gửi JWT lên Edge Function; function dùng **service_role** để xác minh JWT và tạo user.

Tóm lại: Secrets của Edge Function = chỉ 2 biến (URL + service_role). Anon key chỉ setup ở .env của app.

---

## 401 Invalid JWT dù đã đăng nhập lại và đúng URL project

Nếu bạn vẫn gặp **401 Invalid JWT** sau khi đăng xuất/đăng nhập lại và đã dùng đúng `VITE_SUPABASE_URL`:

1. Vào **Supabase Dashboard** → **Edge Functions** → **Functions** → chọn **invite-teacher** → tab **Details** (hoặc **Configuration**).
2. Tìm mục **"Verify JWT with legacy secret"**.
3. **Tắt (OFF)** tuỳ chọn này rồi bấm **Save changes**.

**Lý do:** Khi bật, gateway chỉ chấp nhận JWT ký bằng **legacy JWT secret**. Nếu project dùng JWT secret mới, token đăng nhập sẽ bị từ chối trước khi tới function. Function `invite-teacher` đã tự xác thực (kiểm tra Bearer token và role admin) nên không cần gateway verify JWT bằng legacy secret.
