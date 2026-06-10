const express = require('express');

// Import các hàm từ Controller (Bao gồm 2 hàm mới)
const { 
  getHostProfile, 
  updateHostProfile, 
  getHostBranches, 
  getHostSpaces, 
  getHostBookings,
  confirmBooking, 
  cancelBooking,
  checkinBooking
} = require('../controllers/hostController');

// Import Middleware bảo mật
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ ROUTE
// ==========================================
// Dùng router.use() để áp dụng middleware cho tất cả các đường dẫn bên dưới.
// Yêu cầu: Phải có Token hợp lệ VÀ người dùng phải có role là 'host'
router.use(verifyToken, authorizeRole('host'));


// ==========================================
// CÁC API LẤY & CẬP NHẬT THÔNG TIN
// ==========================================
router.get('/:hostId/bookings', getHostBookings);
router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);




// ==========================================
// CÁC API HÀNH ĐỘNG (THAO TÁC VỚI ĐƠN HÀNG)
// ==========================================
// Host xác nhận đơn (Chuyển sang confirmed + Tạo Payment)
router.put('/:hostId/bookings/:bookingId/confirm', confirmBooking);

// Host từ chối đơn (Chuyển sang cancelled)
router.put('/:hostId/bookings/:bookingId/cancel', cancelBooking);

// Host check-in đơn (Chuyển sang in-use)
router.put('/:hostId/bookings/:bookingId/checkin', checkinBooking);

module.exports = router;
