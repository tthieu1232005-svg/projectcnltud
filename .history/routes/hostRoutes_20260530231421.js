const express = require('express');
const {
    getHostProfile,
    updateHostProfile,
    getHostBranches,
    getHostSpaces,
    getHostBookings,
    getHostDashboardData // <-- Import hàm mới vào
} = require('../controllers/hostController');

const router = express.Router();

// API lấy cục dữ liệu cho Dashboard bằng HostID
router.get('/:hostId/dashboard-data', getHostDashboardData);

// Các router API cũ của bạn giữ nguyên
router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);

module.exports = router;