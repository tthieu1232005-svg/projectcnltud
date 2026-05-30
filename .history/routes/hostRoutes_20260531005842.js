// const express = require('express');
// const { getHostProfile, updateHostProfile, getHostBranches, getHostSpaces, getHostBookings, getDashboard } = require('../controllers/hostController');
// const hostController = require('../controllers/hostController');
// const router = express.Router();

// // router.get('/:hostId/dashboard', getDashboard);
// // router.get('/:hostId/profile', getHostProfile);
// // router.put('/:hostId/profile', updateHostProfile);
// // router.get('/:hostId/branches', getHostBranches);
// // router.get('/:hostId/spaces', getHostSpaces);
// // router.get('/:hostId/bookings', getHostBookings);

// // Route hiển thị trang hồ sơ
// router.get('/profile', hostController.getProfile);

// // Route xử lý cập nhật hồ sơ
// router.post('/profile/update', hostController.updateProfile);

// module.exports = router;

const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');
const { isAuthenticated } = require('../middlewares/auth'); // Nếu có middleware check đăng nhập

// Hiển thị trang hồ sơ Host
router.get('/profile', hostController.getHostProfile);

// Xử lý cập nhật hồ sơ Host (Dùng POST hoặc PUT đều được)
router.post('/profile/update', hostController.updateHostProfile);

module.exports = router;