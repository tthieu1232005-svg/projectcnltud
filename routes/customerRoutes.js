const express = require('express');
const { 
  getCustomerProfile, 
  updateCustomerProfile, 
  getCustomerBookings, 
  confirmPayment // Bổ sung thêm hàm confirmPayment vừa viết ở controller vào đây
} = require('../controllers/customerController');

const router = express.Router();

// 1. Các route cũ của nhóm (Giữ nguyên 100%)
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);

// 2. Route lấy lịch sử booking: Sửa đổi nhẹ để hàm getCustomerBookings render ra trang EJS thay vì chỉ trả về json
router.get('/:userId/payment_history', getCustomerBookings);

// 3. Route mới: Xử lý lưu đơn hàng thật vào DB khi bấm "TÔI ĐÃ CHUYỂN KHOẢN" ở trang thanh toán
router.post('/:userId/payment/confirm', confirmPayment);

module.exports = router;