# Cổng Dịch vụ hành chính công (DVC)

Ứng dụng Express (Node.js) gồm backend API và giao diện web theo thiết kế trong `Thiet-ke-he-thong-Dich-vu-hanh-chinh-cong.md`.

## Yêu cầu

- Node.js 18+
- MySQL 8+ (tài khoản: `root` / mật khẩu: `1234`, database: `dvc`)

## Cài đặt

### 1. Tạo database và schema

```bash
mysql -u root -p1234 -e "CREATE DATABASE IF NOT EXISTS dvc CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
mysql -u root -p1234 dvc < database_schema_and_sample_data.sql
mysql -u root -p1234 dvc < migrations/001_add_admin_role.sql
```

- `database_schema_and_sample_data.sql`: tạo bảng và dữ liệu mẫu (nếu dùng sample data có sẵn 100 users CITIZEN, 500 dossiers).
- `migrations/001_add_admin_role.sql`: thêm role `ADMIN` vào bảng `users`.

### 2. Cài dependency và chạy

```bash
npm install
npm start
```

Ứng dụng chạy tại: **http://localhost:3000**

### 3. Biến môi trường (tùy chọn)

Tạo file `.env` từ `.env.example` và chỉnh nếu cần:

- `PORT` – cổng server (mặc định 3000)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – kết nối MySQL
- `JWT_SECRET` – secret ký JWT (nên đổi trong môi trường thật)

## Luồng sử dụng

### Lần đầu truy cập (chưa có admin)

1. Mở http://localhost:3000 → hiển thị **form tạo tài khoản quản trị**.
2. Nhập username, mật khẩu, họ tên → **Tạo tài khoản quản trị**.
3. Sau khi tạo xong → chuyển sang **form đăng nhập**.

### Đã có admin

1. Trang chủ chỉ hiển thị **form đăng nhập**.
2. **Đăng ký (Công dân)**: chỉ role **CITIZEN**. Tài khoản mới có `is_active = 0`, chờ admin duyệt.
3. **Đăng nhập**: Admin duyệt tài khoản công dân trong trang Admin → sau đó công dân mới đăng nhập được.

### Phân quyền

- **ADMIN**: Duyệt/từ chối tài khoản công dân chờ duyệt; tạo tài khoản **OFFICIAL** và **REPORT_ADMIN** (không tạo CITIZEN qua form admin).
- **CITIZEN**: Chỉ tự đăng ký (role CITIZEN), chờ admin duyệt; sau khi duyệt: hồ sơ cá nhân, danh mục dịch vụ, nộp hồ sơ, xem hồ sơ của mình.
- **OFFICIAL**: Danh sách hồ sơ theo cơ quan; Tiếp nhận, Yêu cầu bổ sung, Hoàn tất (theo API thiết kế).
- **REPORT_ADMIN**: Báo cáo tổng hợp (số lượng, tỷ lệ đúng hạn, thời gian xử lý TB…).

## API chính

- `GET /api/v1/setup/check` – Kiểm tra đã có admin chưa.
- `POST /api/v1/setup/create-admin` – Tạo admin lần đầu.
- `POST /api/v1/auth/login` – Đăng nhập.
- `POST /api/v1/auth/register` – Đăng ký công dân (chờ duyệt).
- `GET /api/v1/auth/me` – Thông tin user (cần token).
- `GET/PUT /api/v1/citizens/me` – Hồ sơ công dân (CITIZEN).
- `GET /api/v1/services`, `GET /api/v1/services/:id` – Danh mục dịch vụ.
- `POST /api/v1/dossiers`, `GET /api/v1/dossiers`, `GET /api/v1/dossiers/:code` – Hồ sơ công dân.
- `GET /api/v1/official/dossiers`, `PATCH .../receive`, `.../request-supplement`, `.../complete` – Cán bộ xử lý.
- `GET /api/v1/admin/pending-accounts`, `POST .../approve`, `.../reject`, `POST /api/v1/admin/users` – Quản trị.
- `GET /api/v1/reports/summary` – Báo cáo (REPORT_ADMIN / ADMIN).

Chi tiết request/response theo tài liệu thiết kế.
