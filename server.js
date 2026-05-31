const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const hostRoutes = require('./routes/hostRoutes');
const adminRoutes = require('./routes/adminRoutes');

const Booking = require('./models/Booking'); 
const Space = require('./models/Space');
const User = require('./models/User'); // Giả sử con có model User

const app = express();
const PORT = process.env.PORT || 3000;

// --- Kết nối MongoDB ---
connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`));
});
// Tài nguyên tĩnh: dùng chung (public)
app.use(express.static(path.join(__dirname, 'public')));
// --- Middleware xử lý dữ liệu ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Cấp quyền cho toàn bộ file EJS được phép truy cập vào biến 'req'
app.use((req, res, next) => {
    res.locals.req = req;
    next();
});


// ==========================================
// KHAI BÁO CÁC API ROUTES (Xử lý dữ liệu ngầm)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/admin', adminRoutes);


// ==========================================
// CẤU HÌNH VIEW ENGINE (Render Giao diện EJS)
// ==========================================
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');


// --- 2. ROUTE LỊCH SỬ THANH TOÁN  ---
app.get('/payment_history', async (req, res) => {
    try {
        const mockUserId = "65ecef123456789012345678";
        const { branchKeyword, startDate, statusFilter } = req.query;

        let query = { CustomerID: new mongoose.Types.ObjectId(mockUserId) };

        // Logic lọc status chuẩn
        const statusMap = {
            'Thành công': ['confirmed', 'completed'],
            'Thất bại': ['cancelled'],
            'Chờ xử lý': ['pending']
        };

        if (statusFilter && statusFilter !== 'Tất cả') {
            query.Status = { $in: statusMap[statusFilter] || ['confirmed', 'cancelled', 'completed', 'pending'] };
        } else {
            query.Status = { $in: ['confirmed', 'cancelled', 'completed', 'pending'] };
        }

        if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        }

        let bookings = await Booking.find(query)
            .populate('SpaceID', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Lọc theo keyword chi nhánh (nếu có)
        if (branchKeyword) {
            bookings = bookings.filter(b => b.SpaceID?.name.toLowerCase().includes(branchKeyword.toLowerCase()));
        }

        const allSpaces = await Space.find({}).select('name').lean();

        res.render('customer/payment_history', { 
            bookings, 
            filters: { branchKeyword, startDate, statusFilter: statusFilter || 'Tất cả' },
            allSpaces,
            userId: mockUserId,
            scripts: '<script src="/js/customer-main.js"></script>'
        });
    } catch (error) {
        res.status(500).send("Lỗi kết nối CSDL: " + error.message);
    }
});
// ==========================================
// KHAI BÁO CÁC WEB ROUTES (Điều hướng trang)
// ==========================================

// --- Luồng Khách hàng (Customer) ---
app.get('/', (req, res) => {
    res.render('customer/home', { scripts: '<script src="/js/customer-main.js"></script>' });
});

// --- CÁC ROUTES KHÁC CỦA NHÓM ---
app.get('/', (req, res) => res.render('customer/home', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/search', (req, res) => res.render('customer/search', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/detail', (req, res) => res.render('customer/detail', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/payment', (req, res) => res.render('customer/payment', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/history', (req, res) => res.render('customer/history', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/profile', (req, res) => res.render('customer/profile', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/login', (req, res) => res.render('customer/login'));
app.get('/register', (req, res) => res.render('customer/register'));

app.get('/host/profile', (req, res) => res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/dashboard', (req, res) => res.render('host/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/spaces', (req, res) => res.render('host/spaces', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/bookings', (req, res) => res.render('host/bookings', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/reports', (req, res) => res.render('host/reports', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/payments', (req, res) => res.render('host/payments', { scripts: '<script src="/js/host-spaces.js"></script>' }));

app.get('/admin/dashboard', (req, res) => res.render('admin/dashboard', { scripts: '<script src="/js/admin-main.js"></script>' }));

app.get('/history', (req, res) => {
    res.render('customer/history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/payment_history', (req, res) => {
    res.render('customer/payment_history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/profile', (req, res) => {
    res.render('customer/profile', { scripts: '<script src="/js/customer-main.js"></script>' });
});

// --- Luồng Dùng chung (Đăng nhập / Đăng ký) ---
app.get('/login', (req, res) => {
    res.render('customer/login');
});

app.get('/register', (req, res) => {
    res.render('customer/register');
});

// --- Luồng Chủ cơ sở (Host) ---
// app.get('/host/profile', (req, res) => {
//     res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' });
// });

app.use('/host', hostRoutes);

// app.get('/host/dashboard', (req, res) => {
//     res.render('host/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' });
// });

app.get('/host/spaces', (req, res) => {
    res.render('host/spaces', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/bookings', (req, res) => {
    res.render('host/bookings', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/reports', (req, res) => {
    res.render('host/reports', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/payments', (req, res) => {
    res.render('host/payments', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

// --- Luồng Admin ---
app.get('/admin/dashboard', (req, res) => {
    res.render('admin/dashboard', { scripts: '<script src="/js/admin-main.js"></script>' });
});
app.get('/admin/users', (req, res) => {
    res.render('admin/users', { scripts: '<script src="/js/admin-main.js"></script>' });
});
app.get('/admin/hosts', (req, res) => {
    res.render('admin/hosts', { scripts: '<script src="/js/admin-main.js"></script>' });
});

// ==========================================
// MIDDLEWARE XỬ LÝ LỖI TỔNG
// ==========================================
app.use((err, req, res, next) => {
    res.status(500).json({ status: 'error', message: err.message });
    console.error('❌ Lỗi server:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi server'
    });
    });