const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const upload = require('../middlewares/upload');
const router = express.Router();

router.post('/register', upload.single('verificationDoc'), registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

module.exports = router;