const express = require('express');
const {
    getHostProfile,
    updateHostProfile,
    getHostBranches,
    getHostSpaces,
    getHostBookings,
    getHostDashboard,      // <-- Kiểm tra xem dưới Controller có hàm tên y hệt này chưa
    getHostDashboardData   // <-- Kiểm tra xem dưới Controller có hàm tên y hệt này chưa
} = require('../controllers/hostController');

const router = express.Router();

// ... các dòng route bên dưới giữ nguyên ...