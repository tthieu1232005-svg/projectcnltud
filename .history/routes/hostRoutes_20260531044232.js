const express = require('express');
const router = express.Router();

/// Bạn gắn ở luồng API
app.use('/api/hosts', hostRoutes);

// Rồi bạn lại gắn ở luồng UI
app.use('/host', hostRoutes);

module.exports = router;