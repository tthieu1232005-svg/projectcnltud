const express = require('express');
const { registerUser, loginUser, logoutUser, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// 📦 SỬA DÒNG NÀY: Thêm đuôi .verifyToken vào sau authMiddleware
router.post('/change-password', authMiddleware.verifyToken, changePassword);

module.exports = router;