const express = require('express');

const {
  getHomePage,
  searchBranches,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  createBooking,
  confirmPayment, 
  payRemainder,
  submitReview,
  getReview,
  getBranchReviews,
  checkAvailability,
  getMyProfile,
  updateMyProfile
} = require('../controllers/customerController');

const { verifyToken, authorizeRole } = require('../middleware/auth');
const uploadCloud = require('../middlewares/upload');

const router = express.Router();

// ==========================================
// TRANG GIAO DIỆN (KHÔNG CẦN ĐĂNG NHẬP)
// ==========================================
router.get('/', getHomePage);
router.get('/search', searchBranches);
router.get('/branch/:branchId/reviews', getBranchReviews);

// ==========================================
// BẬT KHIÊN BẢO VỆ CHO TOÀN BỘ ROUTE BÊN DƯỚI
// ==========================================
router.use(verifyToken, authorizeRole('customer'));

// ==========================================
// THÔNG TIN KHÁCH HÀNG (HỒ SƠ CỦA CHÍNH MÌNH)
// ==========================================
router.get('/me/profile', getMyProfile);
router.put('/me/profile', uploadCloud.single('customerAvatar'), updateMyProfile);

// Route cũ (xem/sửa hồ sơ theo userId - cho admin/host)
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);

// ==========================================
// ĐẶT CHỖ
// ==========================================
router.get('/:userId/bookings', getCustomerBookings);
router.post('/:userId/bookings', createBooking);
router.post('/bookings/check-availability', checkAvailability);
router.post('/booking/confirm', confirmPayment);
router.put('/:userId/bookings/:bookingId/pay', payRemainder);

// ==========================================
// ĐÁNH GIÁ
// ==========================================
router.get('/bookings/:bookingId/review', getReview);
router.post('/:userId/bookings/:bookingId/review', submitReview);

module.exports = router;