const express = require('express');
const router = express.Router();
const { getAdminDashboard, listUsers, toggleUserStatus, getPendingHosts, verifyHost } = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// 🔒 Áp dụng ổ khóa bảo vệ cho TOÀN BỘ API của Admin bên dưới
router.use(verifyToken, requireAdmin);

// Các endpoint này sẽ có dạng: /api/admin/stats và /api/admin/users
router.get('/stats', getAdminDashboard);
router.get('/users', listUsers);

// API để thay đổi trạng thái user
router.patch('/users/:id/toggle-status', toggleUserStatus);
// API để lấy danh sách host đang chờ phê duyệt và phê duyệt host
router.get('/pending-hosts', getPendingHosts);
router.patch('/hosts/:id/verify', verifyHost);

module.exports = router;