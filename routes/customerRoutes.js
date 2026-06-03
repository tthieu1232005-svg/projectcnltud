const express = require('express');
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
    getBranchReviews
} = require('../controllers/customerController');

const router = express.Router();

// ==========================================
// PAGE ROUTES (Render EJS)
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
// API ROUTES (Return JSON)
// ==========================================
// Booking APIs
router.post('/booking/create', createBooking);
router.post('/booking/confirm', confirmBooking);

// Space APIs
router.post('/spaces/check', checkAvailableSpaces);

// Reviews theo branch
router.get('/branches/:branchId/reviews', getBranchReviews);

// Profile APIs
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);
router.get('/:userId/bookings', getCustomerBookings);

module.exports = router;
