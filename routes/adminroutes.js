const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// 🔒 Áp dụng ổ khóa bảo vệ cho TOÀN BỘ API của Admin bên dưới
router.use(verifyToken, requireAdmin);

// Các endpoint này sẽ có dạng: /api/admin/stats và /api/admin/users
router.get('/stats', adminController.getAdminDashboard);
router.get('/users', adminController.listUsers);

// =====================================
// API QUẢN LÝ CHỦ CƠ SỞ (HOST)
// =====================================
router.get('/pending-hosts', adminController.getPendingHosts);       // <--- Đã thêm dòng này
router.patch('/hosts/:id/verify', adminController.verifyHost);       // <--- Đã thêm dòng này

// =====================================
// API NHẬT KÝ HOẠT ĐỘNG
// =====================================
router.get('/activitylog', (req, res) => res.render('admin/activitylog'));
router.get('/activity-logs', adminController.getActivityLogs);

// API để lấy dữ liệu chi tiết cho Popup
router.get('/entity-detail', adminController.getEntityDetail);

module.exports = router;