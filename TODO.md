# TODO - Register backend theo MVC

## Bước 1: Rà soát yêu cầu & hiện trạng
- [x] Kiểm tra auth endpoints và controllers hiện có
- [x] Xác định `controllers/authController.js` cần chỉnh logic register

## Bước 2: Cập nhật `controllers/authController.js`
- [ ] Thêm validate email (regex + check tồn tại trong DB) và trả lỗi 400 khi email đã tồn tại
- [ ] Thêm validate password (>=6 ký tự, có chữ và số) trả lỗi 400
- [ ] Dùng `bcryptjs` để hash mật khẩu trước khi lưu
- [ ] Chuẩn hóa field names theo model (Email/PasswordHash/Role/Status)
- [ ] Tạo record profile tương ứng:
  - [ ] role=customer -> CustomerProfile(UserID, FullName)
  - [ ] role=host -> HostProfile(UserID, CompanyName, Hotline/BankName/BankNumber mặc định)
- [ ] Chuẩn REST: status code hợp lý + try/catch + JSON message error rõ ràng

## Bước 3: Chạy thử
- [ ] Restart server
- [ ] Test POST `/api/auth/register` với vài payload
- [ ] backend: thêm API lấy reviews theo branchId cho customer
- [ ] routes: gắn route API reviews theo branch
- [ ] frontend: gọi API trong public/js/customer-main.js và render reviews vào #review-items-list
- [ ] detail.ejs: render UI placeholder reviews (không tạo review chi tiết)
- [ ] chạy lint/ node -c và kiểm tra luồng /detail

