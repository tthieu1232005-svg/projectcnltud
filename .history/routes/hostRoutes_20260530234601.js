const express = require('express');

// BẠN HÃY KIỂM TRA ĐOẠN NÀY
const {
    getHostProfile,
    updateHostProfile,
    getHostBranches,
    getHostSpaces,
    getHostBookings,
    getHostDashboardData
} = require('../controllers/hostController'); // <-- Đường dẫn này phải trỏ đúng vào file

const router = express.Router();

// Nếu 1 trong các biến trên bị undefined, dòng dưới sẽ ném lỗi "handler must be a function"
router.get('/:hostId/dashboard-data', getHostDashboardData);
router.get('/:hostId/profile', getHostProfile); // <-- Lỗi của bạn đang nằm quanh khu vực này (Dòng 17)
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);

module.exports = router;