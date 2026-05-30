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

// URL đầy đủ sẽ là: http://localhost:3000/host/profile/:hostId
router.get('/profile/:hostId', hostController.getHostProfile);

// URL đầy đủ xử lý nút lưu: http://localhost:3000/host/profile/:hostId
router.post('/profile/:hostId', hostController.updateHostProfile);

module.exports = router;