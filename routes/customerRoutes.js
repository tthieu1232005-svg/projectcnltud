const express = require('express');



// 1. Các route cũ của nhóm (Giữ nguyên 100%)

// Import các hàm từ Controller (Bao gồm 3 hàm mới)
const { 
  getCustomerProfile, 
  updateCustomerProfile, 
  getCustomerBookings,
  createBooking,
  cancelBooking,
  payRemainder, 
  confirmPayment 
} = require('../controllers/customerController');

// Import Middleware bảo mật
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ ROUTE
// ==========================================
// Dùng router.use() để áp dụng middleware bảo mật cho toàn bộ đường dẫn bên dưới.
// Yêu cầu: Phải có Token hợp lệ VÀ người dùng phải có role là 'customer'
router.use(verifyToken, authorizeRole('customer'));


// ==========================================
// CÁC API LẤY & CẬP NHẬT THÔNG TIN
// ==========================================
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);

// 2. Route lấy lịch sử booking: Sửa đổi nhẹ để hàm getCustomerBookings render ra trang EJS thay vì chỉ trả về json
router.get('/:userId/payment_history', getCustomerBookings);

// 3. Route mới: Xử lý lưu đơn hàng thật vào DB khi bấm "TÔI ĐÃ CHUYỂN KHOẢN" ở trang thanh toán
router.post('/:userId/payment/confirm', confirmPayment);

// ==========================================
// CÁC API HÀNH ĐỘNG (THAO TÁC VỚI ĐƠN HÀNG)
// ==========================================
// Khách hàng tạo đơn đặt chỗ mới (Sử dụng phương thức POST vì đây là hành động Tạo mới dữ liệu)
router.post('/:userId/bookings', createBooking);

// Khách hàng tự hủy đơn (khi đơn vẫn đang chờ xác nhận)
router.put('/:userId/bookings/:bookingId/cancel', cancelBooking);

// Khách hàng thanh toán phần tiền còn lại
router.put('/:userId/bookings/:bookingId/pay', payRemainder);

module.exports = router;