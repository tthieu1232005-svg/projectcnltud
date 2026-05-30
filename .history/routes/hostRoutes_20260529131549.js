const express = require('express');
const { getHostProfile, updateHostProfile, getHostBranches, getHostSpaces, getHostBookings, getDashboard } = require('../controllers/hostController');

const router = express.Router();

router.get('/:hostId/dashboard', getDashboard);
router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);


module.exports = router;
