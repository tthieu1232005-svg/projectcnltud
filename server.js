const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');

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

// Tài nguyên tĩnh: dùng chung (public) + Customer (Customer/public) + Host (Host/public)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Customer/public')));
app.use(express.static(path.join(__dirname, 'Host/public')));

// --- Middleware xử lý dữ liệu ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// View Engine: root project — Customer/, Host/, views/ (layout & partials dùng chung)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname));
app.set('layout', 'views/layout');

// --- Luồng Khách hàng (Customer) ---
app.get('/', (req, res) => {
    res.render('Customer/pages/home', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/search', (req, res) => {
    res.render('Customer/pages/search', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/detail', (req, res) => {
    res.render('Customer/pages/detail', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/payment', (req, res) => {
    res.render('Customer/pages/payment', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/history', (req, res) => {
    res.render('Customer/pages/history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/payment_history', (req, res) => {
    res.render('Customer/pages/payment_history', { scripts: '<script src="/js/customer-main.js"></script>' });
});

app.get('/profile', (req, res) => {
    res.render('Customer/pages/profile', { scripts: '<script src="/js/customer-main.js"></script>' });
});

// --- Luồng Dùng chung (đặt trong Customer) ---
app.get('/login', (req, res) => {
    res.render('Customer/pages/login');
});

app.get('/register', (req, res) => {
    res.render('Customer/pages/register');
});

// --- Luồng Chủ cơ sở (Host) ---
app.get('/host/profile', (req, res) => {
    res.render('Host/pages/profile', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/dashboard', (req, res) => {
    res.render('Host/pages/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/spaces', (req, res) => {
    res.render('Host/pages/spaces', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/bookings', (req, res) => {
    res.render('Host/pages/bookings', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/reports', (req, res) => {
    res.render('Host/pages/reports', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

app.get('/host/payments', (req, res) => {
    res.render('Host/pages/payments', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

// --- Admin: (chưa triển khai) ---

// --- Middleware xử lý lỗi ---
app.use((err, req, res, next) => {
    console.error('❌ Lỗi server:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi server'
    });
});


