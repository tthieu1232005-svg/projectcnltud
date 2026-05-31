const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');

router.get('/dashboard', hostController.renderDashboardView);
router.get('/api/dashboard-stats', hostController.getDashboardStatsAPI);

router.get('/profile', (req, res) => {
    res.render('host/profile', {
        success: false,  
        scripts: '<script src="/js/host-spaces.js"></script>'
    });
});

router.get('/api/profile', hostController.getProfileAPI);
router.put('/api/profile', hostController.updateProfileAPI);

module.exports = router;