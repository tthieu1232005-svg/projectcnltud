const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');

// ==========================================
// PHẦN 1: ROUTE GIAO DIỆN (UI) - Trả về EJS
// URL trình duyệt: http://localhost:3000/host/profile
// ==========================================
router.get('/profile', (req, res) => {
    res.render('host/profile', {
        success: false, // Thêm dòng này để EJS không bị lỗi undefined
        scripts: '<script src="/js/host-spaces.js"></script>'
    });
});

// ==========================================
// PHẦN 2: ROUTE API - Trả về JSON (Dùng cho hàm Fetch ở frontend)
// URL cho Fetch: http://localhost:3000/host/api/profile
// ==========================================
router.get('/api/profile', hostController.getProfileAPI);
router.put('/api/profile', hostController.updateProfileAPI);

module.exports = router;