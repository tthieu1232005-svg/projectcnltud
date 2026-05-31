const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');

router.get('/profile', (req, res) => {
    res.render('host/profile', {
        success: false, // Thêm dòng này để EJS không bị lỗi undefined
        scripts: '<script src="/js/host-spaces.js"></script>'
    });
});

router.get('/api/profile', hostController.getProfileAPI);
router.put('/api/profile', hostController.updateProfileAPI);

module.exports = router;