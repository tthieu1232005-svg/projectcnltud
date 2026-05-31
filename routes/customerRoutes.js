const express = require('express');
const { getCustomerProfile, updateCustomerProfile, getCustomerBookings } = require('../controllers/customerController');

const router = express.Router();

router.get('/:userId/profile', getCustomerProfile);
router.put('/:userId/profile', updateCustomerProfile);
router.get('/:userId/bookings', getCustomerBookings);

module.exports = router;
