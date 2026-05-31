const express = require('express');

// Import các hàm từ Controller (Bao gồm 2 hàm mới)
const { 
  getHostProfile, 
  updateHostProfile, 
  getHostBranches, 
  getHostSpaces, 
  getHostBookings,
  confirmBooking, 
  cancelBooking 
} = require('../controllers/hostController');

// Import Middleware bảo mật
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();
const hostController = require('../controllers/hostController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/dashboard', hostController.renderDashboardView);
router.get('/api/dashboard-stats', hostController.getDashboardStatsAPI);

router.get('/profile', (req, res) => {
    res.render('host/profile', {
        success: false,  
        scripts: '<script src="/js/host-spaces.js"></script>'
    });
});

router.get('/api/profile', hostController.getProfileAPI);
router.put('/api/profile', hostController.updateProfileAPI);

module.exports = router;
// ==========================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ ROUTE
// ==========================================
// Dùng router.use() để áp dụng middleware cho tất cả các đường dẫn bên dưới.
// Yêu cầu: Phải có Token hợp lệ VÀ người dùng phải có role là 'host'
router.use(verifyToken, authorizeRole('host'));


// ==========================================
// CÁC API LẤY & CẬP NHẬT THÔNG TIN
// ==========================================
router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);


// ==========================================
// CÁC API HÀNH ĐỘNG (THAO TÁC VỚI ĐƠN HÀNG)
// ==========================================
// Host xác nhận đơn (Chuyển sang confirmed + Tạo Payment)
router.put('/:hostId/bookings/:bookingId/confirm', confirmBooking);

// Host từ chối đơn (Chuyển sang cancelled)
router.put('/:hostId/bookings/:bookingId/cancel', cancelBooking);

module.exports = router;
