const express = require('express');

// Import toàn bộ các hàm từ Controller (Của cả BẠN và NA)
const { 
    getHomePage,
    searchBranches,
    detailPage,
    getCustomerProfile, 
    updateCustomerProfile, 
    getCustomerBookings,
    createBooking,
    confirmBooking,
    checkAvailableSpaces,
    cancelBooking,
    payRemainder,
    submitReview,
    getBranchReviews
} = require('../controllers/customerController');

// Import Middleware bảo mật
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// 1. PAGE ROUTES (Render EJS - CỦA NA)
// Tuyệt đối KHÔNG DÙNG router.use(verifyToken) ở đầu file 
// vì sẽ làm chặn luôn trang chủ của Khách vãng lai (Guest).
// ==========================================
router.get('/', getHomePage);
router.get('/search', searchBranches);
router.get('/detail', detailPage);

router.get('/payment', (req, res) => {
    res.render('customer/payment', { scripts: '<script src="/js/customer-main.js"></script>' });
});

router.get('/history', (req, res) => {
    res.render('customer/history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

router.get('/payment_history', (req, res) => {
    res.render('customer/payment_history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

router.get('/profile', (req, res) => {
    res.render('customer/profile', { scripts: '<script src="/js/customer-main.js"></script>' });
});

// ==========================================
// 2. PUBLIC API ROUTES (CỦA NA)
// Các API dùng để tra cứu trước khi đăng nhập
// ==========================================
router.post('/spaces/check', checkAvailableSpaces);
router.get('/branches/:branchId/reviews', getBranchReviews);

// ==========================================
// 3. PRIVATE API ROUTES (BẮT BUỘC CÓ TOKEN)
// Thay vì bọc toàn bộ file, ta gán trực tiếp lớp bảo vệ vào từng Route
// ==========================================
const protectCustomer = [verifyToken, authorizeRole('customer')];

// API Đặt chỗ và Xác nhận thanh toán (Frontend Na đang gọi trực tiếp)
router.post('/booking/create', verifyToken, createBooking); 
router.post('/booking/confirm', verifyToken, confirmBooking);

// Các API Quản lý cá nhân, Đơn hàng, Đánh giá, Thanh toán của BẠN (HEAD)
// Vẫn giữ biến :userId trên đường dẫn để khớp với logic trong Controller của bạn
router.get('/:userId/profile', protectCustomer, getCustomerProfile);
router.put('/:userId/profile', protectCustomer, updateCustomerProfile);
router.get('/:userId/bookings', protectCustomer, getCustomerBookings);

// Endpoint tạo đơn dự phòng theo chuẩn cấu trúc RESTful của bạn
router.post('/:userId/bookings', protectCustomer, createBooking);

// Hành động với đơn hàng
router.post('/:userId/bookings/:bookingId/review', protectCustomer, submitReview);
router.put('/:userId/bookings/:bookingId/cancel', protectCustomer, cancelBooking);
router.put('/:userId/bookings/:bookingId/pay', protectCustomer, payRemainder);

module.exports = router;