const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const hostRoutes = require('./routes/hostRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Kết nối MongoDB ---
connectDB()
    .then(() => {
        console.log('✅ MongoDB connected, starting server...');
        app.listen(PORT, () => {
            console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
        });
    })
    .catch(err => {
        console.error('❌ Không thể kết nối MongoDB, server không khởi động:', err);
        process.exit(1);
    });

// Tài nguyên tĩnh: dùng chung (public)
app.use(express.static(path.join(__dirname, 'public')));

// --- Middleware xử lý dữ liệu ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/admin', adminRoutes);




// View Engine: root project — Customer/, Host/, views/ (layout & partials dùng chung)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// --- Luồng Khách hàng (Customer) ---
app.get('/', (req, res) => {
    res.render('customer/home', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/search', (req, res) => {
    res.render('customer/search', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/detail', (req, res) => {
    res.render('customer/detail', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/payment', (req, res) => {
    res.render('customer/payment', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/history', (req, res) => {
    res.render('customer/history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/payment_history', (req, res) => {
    res.render('customer/payment_history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/profile', (req, res) => {
    res.render('customer/profile', { scripts: '<script src="/js/customer-main.js"></script>' });
});

// --- Luồng Dùng chung (đặt trong Customer) ---
app.get('/login', (req, res) => {
    res.render('customer/login');
});

app.get('/register', (req, res) => {
    res.render('customer/register');
});

// --- Luồng Chủ cơ sở (Host) ---
app.get('/host/profile', (req, res) => {
    res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

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

/// --- Admin: (Giao diện) ---
app.get('/admin/dashboard', (req, res) => {
    // Truyền thêm file admin-main.js vào layout
    res.render('admin/dashboard', { scripts: '<script src="/js/admin-main.js"></script>' });
});

// --- Middleware xử lý lỗi ---
app.use((err, req, res, next) => {
    console.error('❌ Lỗi server:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi server'
    });
});


