const express = require('express');
const router = express.Router();
const branchController = require('../features/branch/controller');
const { verifyHost } = require('../middleware/auth');

router.post('/branches', verifyHost, branchController.createBranch);
router.get('/branches', verifyHost, branchController.getAllBranches);

module.exports = router;