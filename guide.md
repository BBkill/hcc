Bạn là chuyên gia thiết kế hệ thống và database MySQL có kinh nghiệm xây dựng các hệ thống dịch vụ công trực tuyến (Cổng Dịch vụ công Quốc gia kiểu Việt Nam).

Hãy tạo một file Markdown hoàn chỉnh có tên đề xuất: `Thiet-ke-he-thong-Dich-vu-hanh-chinh-cong.md`

Nội dung file phải bao gồm đầy đủ các phần sau, trình bày rõ ràng, có cấu trúc, sử dụng tiếng Việt chuyên nghiệp, dùng code block cho schema SQL và API:

1. **Tổng quan hệ thống**  
   - Mô tả ngắn gọn mục tiêu hệ thống  
   - Các đối tượng người dùng chính (Công dân, Cán bộ xử lý, Quản trị viên báo cáo)

2. **Yêu cầu nghiệp vụ chính** (tóm tắt lại từ mô tả của tôi)  
   - Tài khoản công dân chứa thông tin cá nhân cố định  
   - Danh mục các dịch vụ hành chính công  
   - Quy trình nộp → tiếp nhận → xử lý → trả kết quả hồ sơ điện tử  
   - Lưu trữ lâu dài (hàng chục năm), tra cứu mọi lúc  
   - Báo cáo, thống kê cho cơ quan nhà nước

3. **Thiết kế cơ sở dữ liệu MySQL**  
   - Vẽ sơ đồ ERD dạng text (mermaid hoặc ascii art đơn giản)  
   - Liệt kê toàn bộ bảng cần thiết với:  
     - Tên bảng  
     - Các cột (tên cột, kiểu dữ liệu, ràng buộc: NOT NULL, UNIQUE, DEFAULT, INDEX nếu cần)  
     - Khóa chính, khóa ngoại  
     - Một số cột quan trọng nên có (created_at, updated_at, deleted_at nếu soft delete)  
   - Đề xuất các bảng chính ít nhất gồm:  
     - users / citizens (công dân)  
     - administrative_services (danh mục dịch vụ hành chính)  
     - service_applications / dossiers (hồ sơ đăng ký dịch vụ)  
     - dossier_histories / dossier_logs (lịch sử xử lý từng bước)  
     - officials / processors (cán bộ xử lý)  
     - departments / agencies (cơ quan xử lý)  
     - dossier_statuses (trạng thái hồ sơ - enum hoặc bảng riêng)  
     - attachments (file đính kèm nếu cần)  
   - Đưa ra một số index quan trọng để tra cứu nhanh (theo mã hồ sơ, mã công dân, trạng thái, thời gian…)

4. **Thiết kế API (RESTful)**  
   - Sử dụng chuẩn REST, đề xuất prefix /api/v1  
   - Liệt kê các endpoint quan trọng nhất, phân theo nhóm:  
     - Authentication & Profile công dân  
     - Danh mục dịch vụ  
     - Nộp / quản lý hồ sơ (công dân)  
     - Xử lý hồ sơ (cán bộ)  
     - Tra cứu & xem lịch sử (công dân + cán bộ)  
     - Báo cáo & thống kê (quản lý / cán bộ cấp cao)  
   - Mỗi endpoint ghi rõ:  
     - Method (GET/POST/PUT/PATCH/DELETE)  
     - Path  
     - Mô tả ngắn  
     - Request body (nếu có) - dùng JSON schema đơn giản hoặc ví dụ  
     - Response thành công (200/201) - cấu trúc dữ liệu trả về  
     - Các mã lỗi phổ biến (400, 401, 403, 404, 422…)  
   - Đề xuất authentication: JWT hoặc session + role-based (công dân, cán bộ, admin)

5. **Một số lưu ý & đề xuất bổ sung** (tùy chọn nhưng nên có)  
   - Cách xử lý tra cứu lịch sử lâu năm (partitioning, archive table?)  
   - Bảo mật thông tin cá nhân (GDPR kiểu Việt Nam)  
   - Audit log  
   - Soft delete vs hard delete  
   - Versioning của hồ sơ nếu cần

Yêu cầu định dạng:
- Sử dụng heading (#, ##, ###) hợp lý
- Dùng ```sql cho schema bảng
- Dùng ```http hoặc ```text cho ví dụ API
- Bảng có cột "Mô tả" để giải thích ý nghĩa cột
- Viết bằng tiếng Việt, thuật ngữ chuyên ngành chính xác (hồ sơ, mã định danh, trạng thái xử lý, cơ quan thụ lý…)

Bắt đầu viết nội dung file Markdown ngay bây giờ. Chỉ trả về nội dung file .md thuần túy, không thêm lời giải thích bên ngoài.