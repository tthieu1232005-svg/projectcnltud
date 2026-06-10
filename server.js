const MONGODB_URI = 'mongodb://127.0.0.1:27017/coworking_db';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const hostRoutes = require('./routes/hostRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Khai báo io là biến toàn cục để các Controller khác có thể lấy ra dùng
global.io = io;

// Lắng nghe kết nối từ trình duyệt
io.on('connection', (socket) => {
    console.log('Một thiết bị vừa kết nối:', socket.id);

    socket.on('disconnect', () => {
        console.log('Thiết bị đã ngắt kết nối:', socket.id);
    });
});

// --- Middleware xử lý dữ liệu ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấp quyền cho phép trình duyệt đọc các file tĩnh (như css, js, hình ảnh)
app.use(express.static(path.join(__dirname, 'public')));

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

// ==========================================
// KHAI BÁO CÁC WEB ROUTES (Điều hướng trang)
// ==========================================

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

// --- Luồng Dùng chung (Đăng nhập / Đăng ký) ---
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

app.get('/host/dashboard', (req, res) => {
    res.render('host/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' });
});

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
    console.error('❌ Lỗi server:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi server'
    });
});

// ==========================================
// KẾT NỐI MONGODB & KHỞI ĐỘNG SERVER
// ==========================================
connectDB()
    .then(() => {
        console.log('✅ MongoDB connected, starting server...');
        // CHÚ Ý CHỖ NÀY: Dùng server.listen, TUYỆT ĐỐI KHÔNG DÙNG app.listen
        server.listen(PORT, () => {
            console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
        });
    })
    .catch(err => {
        console.error('❌ Không thể kết nối MongoDB, server không khởi động:', err);
        process.exit(1);
    });