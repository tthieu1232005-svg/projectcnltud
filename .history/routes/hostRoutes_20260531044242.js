const express = require('express');
const router = express.Router();

// --- ROUTE HIỂN THỊ GIAO DIỆN (UI) ---
// URL thực tế: http://localhost:3000/host/profile
// Nhiệm vụ: Chỉ ném cái khung HTML (file EJS) ra ngoài trình duyệt. 
// Việc lấy dữ liệu chi tiết sẽ do hàm loadProfile() trong file host-spaces.js tự động chạy ngầm.
router.get('/profile', (req, res) => {
    res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

module.exports = router;