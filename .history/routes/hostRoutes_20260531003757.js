const express = require('express');
const { getHostProfile, updateHostProfile, getHostBranches, getHostSpaces, getHostBookings } = require('../controllers/hostController');
const {
    verifyToken
} = require('../middlewares/authMiddleware');
const router = express.Router();

// router.get('/:hostId/profile', getHostProfile);
// router.put('/:hostId/profile', updateHostProfile);
// router.get('/:hostId/branches', getHostBranches);
// router.get('/:hostId/spaces', getHostSpaces);
// router.get('/:hostId/bookings', getHostBookings);
router.get(
    '/profile',
    verifyToken,
    getHostProfile
);


// UPDATE PROFILE
router.put(
    '/profile',
    verifyToken,
    updateHostProfile
);

module.exports = router;
