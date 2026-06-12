const express = require('express');
const router = express.Router();

// Import Controller (dùng require dạng nguyên khối để tránh sai tên hàm)
const hostController = require('../controllers/hostController');

// Import Middleware bảo mật (dùng đường dẫn chuẩn xác từ nhánh HEAD)
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
// ====================================================================
// 1. CÁC ROUTE RENDER GIAO DIỆN (VIEWS) - Không khóa API Token
// ====================================================================
router.get('/dashboard', hostController.renderDashboardView);

router.get('/profile', (req, res) => {
  res.render('host/profile', {
    success: false,
    scripts: '<script src="/js/host-profile.js"></script>'
  });
});

// ====================================================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ REST API BÊN DƯỚI
// Yêu cầu: Client phải gửi kèm Token hợp lệ trong Header
// ====================================================================
router.use(authMiddleware.verifyToken);

// ====================================================================
// 2. CÁC API THỐNG KÊ & HỒ SƠ (Gộp từ nhánh HEAD)
// ====================================================================
router.get('/api/dashboard-stats', hostController.getDashboardStatsAPI);
router.get('/api/profile', hostController.getProfileAPI);
router.put('/api/profile', upload.single('LogoFile'), hostController.updateProfileAPI);

// ====================================================================
// 3. CÁC API CƠ SỞ & KHÔNG GIAN (Gộp từ nhánh MAIN)
// ====================================================================
router.get('/branches', hostController.getHostBranches);
router.get('/spaces', hostController.getHostSpaces);

// [BỔ SUNG QUAN TRỌNG] Route POST tạo cơ sở mới mà chúng ta vừa viết thêm
// Nếu trong hostController chưa có hàm này, tạm thời nó sẽ bị bỏ qua
if (typeof hostController.createBranchAndSpaces === 'function') {
  router.post('/branches', hostController.createBranchAndSpaces);
}

// ====================================================================
// 4. CÁC API QUẢN LÝ ĐƠN HÀNG CỦA HOST (Gộp từ nhánh MAIN)
// ====================================================================
router.get('/bookings', hostController.getHostBookings);

// Host xác nhận đơn (Chuyển sang confirmed + Tạo Payment)
router.put('/bookings/:bookingId/confirm', hostController.confirmBooking);

// Host check-in đơn (Chuyển sang in-use)
router.put('/bookings/:bookingId/checkin', hostController.checkinBooking);

// Host từ chối/hủy đơn (Chuyển sang cancelled)
router.put('/bookings/:bookingId/cancel', hostController.cancelBooking);


module.exports = router;