const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');
// Import middleware xác thực token (nếu bạn đã viết)
// const { verifyToken } = require('../middlewares/authMiddleware'); 

// ==========================================
// PHẦN 1: ROUTE GIAO DIỆN (UI) - Trả về EJS
// URL trình duyệt: http://localhost:3000/host/profile
// ==========================================
router.get('/profile', (req, res) => {
    res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

// ==========================================
// PHẦN 2: ROUTE API - Trả về JSON (Dùng cho Fetch)
// URL cho Fetch: http://localhost:3000/host/api/profile
// ==========================================
// Lưu ý: Route này cần truyền middleware kiểm tra Token vì Frontend gửi lên 'Authorization: Bearer ${token}'
router.get('/api/profile', hostController.getHostProfileData);
router.put('/api/profile', hostController.updateHostProfileData);

module.exports = router;