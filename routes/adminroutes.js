const express = require('express');
const { getAdminDashboard, listUsers } = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', getAdminDashboard);
router.get('/users', listUsers);

module.exports = router;
