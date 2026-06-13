const express = require('express');
const router = express.Router();

// Import Controller
const hostController = require('../controllers/hostController');

// Import Middleware bảo mật
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// ====================================================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ REST API BÊN DƯỚI
// Yêu cầu: Client phải gửi kèm Token hợp lệ trong Header
// ====================================================================
router.use(authMiddleware.verifyToken);

// ====================================================================
// 1. CÁC API THỐNG KÊ & HỒ SƠ 
// Đã xóa tiền tố /api/ bị thừa. URL chuẩn sẽ là: /api/hosts/profile
// ====================================================================
router.get('/dashboard-stats', hostController.getDashboardStatsAPI);
router.get('/profile', hostController.getProfileAPI);
router.put('/profile', upload.single('LogoFile'), hostController.updateProfileAPI);

// ====================================================================
// 2. CÁC API CƠ SỞ & KHÔNG GIAN
// ====================================================================
router.get('/branches', hostController.getHostBranches);
router.get('/spaces', hostController.getHostSpaces);

if (typeof hostController.createBranchAndSpaces === 'function') {
  router.post('/branches', hostController.createBranchAndSpaces);
}

// ====================================================================
// 3. CÁC API QUẢN LÝ ĐƠN HÀNG CỦA HOST
// ====================================================================
router.get('/bookings', hostController.getHostBookings);
router.put('/bookings/:bookingId/confirm', hostController.confirmBooking);
router.put('/bookings/:bookingId/checkin', hostController.checkinBooking);
router.put('/bookings/:bookingId/cancel', hostController.cancelBooking);

module.exports = router;