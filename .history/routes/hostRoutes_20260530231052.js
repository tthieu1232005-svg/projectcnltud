const express = require('express');
const {
    getHostProfile,
    updateHostProfile,
    getHostBranches,
    getHostSpaces,
    getHostBookings,
    getHostDashboard,      // Hàm render giao diện EJS gốc của bạn
    getHostDashboardApiData  // Hàm tính toán dữ liệu từ MongoDB Compass mới thêm
} = require('../controllers/hostController');

const router = express.Router();

// ==========================================
// 🌐 NHÓM 1: ROUTE ĐIỀU HƯỚNG GIAO DIỆN (VIEW)
// URL: http://localhost:3000/host/dashboard
// ==========================================
router.get('/dashboard', getHostDashboard);


// ==========================================
// 🔌 NHÓM 2: ROUTE CẤP DỮ LIỆU SẠCH (API JSON)
// URL: http://localhost:3000/host/api/:hostId/dashboard-data
// ==========================================
router.get('/api/:hostId/dashboard-data', getHostDashboardData);

// Các API tính năng khác của bạn giữ nguyên
router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);

module.exports = router;