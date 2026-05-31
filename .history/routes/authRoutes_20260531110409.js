const express = require('express');
const { registerUser, loginUser, logoutUser, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Định nghĩa route đổi mật khẩu (Bắt buộc đi qua authMiddleware để lấy thông tin req.user)
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;