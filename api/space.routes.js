const express = require('express');
const router = express.Router();
const spaceController = require('../features/space/controller');
const { verifyHost } = require('../middleware/auth');

router.post('/spaces', verifyHost, spaceController.createSpace);
router.get('/spaces', spaceController.getAllSpaces);

module.exports = router;