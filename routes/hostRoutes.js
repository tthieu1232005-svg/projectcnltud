const express = require('express');

// Import đúng và đầy đủ các hàm từ Controller của riêng BẠN
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

// ====================================================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ FILE REST API BÊN DƯỚI
// Yêu cầu: Phải có Token hợp lệ VÀ người dùng phải có role là 'host'
// Dữ liệu giải mã từ Token sẽ được tự động nhét vào biến req.user
// ====================================================================
router.use(verifyToken, authorizeRole('host'));


// ====================================================================
// CÁC API LẤY & CẬP NHẬT THÔNG TIN (ĐÃ KHỬ SẠCH /:hostId DƯ THỪA)
// ====================================================================
router.get('/bookings', getHostBookings);
router.get('/branches', getHostBranches);
router.get('/spaces', getHostSpaces);

router.get('/profile', getHostProfile);
router.put('/profile', updateHostProfile);


// ====================================================================
// CÁC API HÀNH ĐỘNG (THAO TÁC VỚI ĐƠN HÀNG CỦA BẠN - ĐÃ BỎ /:hostId)
// ====================================================================
// Host xác nhận đơn (Chuyển sang confirmed + Tạo Payment)
router.put('/bookings/:bookingId/confirm', confirmBooking);

// Host từ chối đơn (Chuyển sang cancelled)
router.put('/bookings/:bookingId/cancel', cancelBooking);

// Host check-in đơn (Chuyển sang in-use)
router.put('/bookings/:bookingId/checkin', checkinBooking);

module.exports = router;