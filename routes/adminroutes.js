const express = require('express');
const router = express.Router();
const { getAdminDashboard, listUsers } = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// 🔒 Áp dụng ổ khóa bảo vệ cho TOÀN BỘ API của Admin bên dưới
router.use(verifyToken, requireAdmin);

// Các endpoint này sẽ có dạng: /api/admin/stats và /api/admin/users
router.get('/stats', getAdminDashboard);
router.get('/users', listUsers);

module.exports = router;