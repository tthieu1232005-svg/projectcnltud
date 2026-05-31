const express = require('express');
const { 
    getHomePage, 
    getCustomerProfile, 
    updateCustomerProfile, 
    getCustomerBookings,
    searchBranches, // Đã import hàm mới
    getBranchDetail,
    createBooking,
    confirmBooking,
    checkAvailableSpaces // Đã import hàm mới
} = require('../controllers/customerController');

const router = express.Router();
// 1. CÁC ROUTE CỐ ĐỊNH PHẢI ĐỂ TRƯỚC
router.get('/', getHomePage);
router.get('/search', searchBranches); // ĐƯA LÊN ĐÂY
router.get('/detail', getBranchDetail);
router.post('/booking/create', createBooking);
router.post('/booking/confirm', confirmBooking);
router.post('/spaces/check', checkAvailableSpaces);


// 2. CÁC ROUTE ĐỘNG (CÓ CHỨA PARAM) ĐỂ SAU CÙNG
router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);
router.get('/:userId/bookings', getCustomerBookings);

module.exports = router;