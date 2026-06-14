const express = require('express');
const { registerUser, loginUser, logoutUser, forgotPassword, resetPassword} = require('../controllers/authController');
const upload = require('../middlewares/upload');
const router = express.Router();

router.post('/register', upload.single('verificationDocument'), registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// ================= LUỒNG QUÊN MẬT KHẨU MÔ PHỎNG =================
router.post('/forgot-password', forgotPassword); // Bước 1: Gửi email -> Sinh OTP in ra console
router.post('/reset-password', resetPassword);   // Bước 2: Kiểm tra OTP -> Đổi mật khẩu mới


module.exports = router;
