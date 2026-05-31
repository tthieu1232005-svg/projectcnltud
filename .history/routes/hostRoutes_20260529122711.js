const express = require('express');
const { getHostProfile, updateHostProfile, getHostBranches, getHostSpaces, getHostBookings } = require('../controllers/hostController');

const router = express.Router();

router.get('/:hostId/profile', getHostProfile);
router.put('/:hostId/profile', updateHostProfile);
router.get('/:hostId/branches', getHostBranches);
router.get('/:hostId/spaces', getHostSpaces);
router.get('/:hostId/bookings', getHostBookings);
const hostController = require('../controllers/hostController');
module.exports = router;
