const express = require('express');
const { 
  getCustomerProfile, 
  updateCustomerProfile, 
  getCustomerBookings, 
  confirmPayment 
} = require('../controllers/customerController');

const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// 1. Các route cũ của nhóm
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);

// 2. Route lấy lịch sử thanh toán 
router.get('/:userId/payment_history', verifyToken, getCustomerBookings);

// 3. Route xác nhận thanh toán
router.post('/:userId/payment/confirm', verifyToken, confirmPayment);

module.exports = router;