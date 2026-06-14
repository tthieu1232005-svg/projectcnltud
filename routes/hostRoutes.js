const express = require('express');
const router = express.Router();

// Import Controller
const hostController = require('../controllers/hostController');

// Import Middleware
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// ====================================================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ API HOST
// Yêu cầu: Client phải gửi kèm Token hợp lệ trong Header
// ====================================================================
router.use(authMiddleware.verifyToken);

// ====================================================================
// 1. API HỒ SƠ & THỐNG KÊ
// ====================================================================
router.get('/dashboard-stats', hostController.getDashboardStatsAPI);
router.get('/profile', hostController.getProfileAPI);
router.put('/profile', upload.single('LogoFile'), hostController.updateProfileAPI);

// ====================================================================
// 2. QUẢN LÝ CƠ SỞ (BRANCHES) - CRUD
// ====================================================================
router.get('/branches', hostController.getHostBranches);
router.post('/branches', upload.single('image'), hostController.createBranch);
router.put('/branches/:branchId', upload.single('image'), hostController.updateBranch);

// ====================================================================
// 3. QUẢN LÝ KHÔNG GIAN (SPACES) - CRUD
// ====================================================================
router.get('/spaces', hostController.getHostSpaces);
router.get('/branches/:branchId/spaces', hostController.getBranchSpaces);
router.post('/branches/:branchId/spaces', upload.single('image'), hostController.createSpace);
router.put('/spaces/:spaceId', upload.single('image'), hostController.updateSpace);

// Route gộp đặc biệt cho Wizard thêm mới
router.post('/branches', upload.single('image'), hostController.createBranchAndSpaces);

// ====================================================================
// 4. QUẢN LÝ ĐƠN HÀNG (BOOKINGS)
// ====================================================================
router.get('/bookings', hostController.getHostBookings);
router.put('/bookings/:bookingId/confirm', hostController.confirmBooking);
router.put('/bookings/:bookingId/checkin', hostController.checkinBooking);
router.put('/bookings/:bookingId/cancel', hostController.cancelBooking);

module.exports = router;