const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = 3000;

// 1. Cấu hình thư mục chứa tài nguyên tĩnh (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Cấu hình View Engine (EJS) và Layout
app.use(expressLayouts);
app.set('view engine', 'ejs');
// Chỉ định file layout mặc định (chính là views/layout.ejs của bạn)
app.set('layout', 'layout'); 

// 3. Khai báo các Routes (Bộ định tuyến)
// --- Luồng Khách hàng ---
app.get('/', (req, res) => {
    res.render('pages/home'); // Tương ứng views/pages/home.ejs
});

app.get('/search', (req, res) => {
    res.render('pages/search');
});

app.get('/detail', (req, res) => {
    res.render('pages/detail');
});

app.get('/payment', (req, res) => {
    res.render('pages/payment');
});

app.get('/history', (req, res) => {
    res.render('pages/history');
});

app.get('/payment_history', (req, res) => {
    res.render('pages/payment_history');
});

// 1. Hồ sơ Khách hàng
app.get('/profile', (req, res) => {
    res.render('pages/customer_profile');
});

// 2. Hồ sơ Chủ cơ sở
app.get('/host/profile', (req, res) => {
    res.render('pages/host_profile');
});

// --- Luồng Dùng Chung ---
app.get('/login', (req, res) => {
    res.render('pages/login');
});
app.get('/register', (req, res) => {
    res.render('pages/register');
});
// --- Luồng Chủ cơ sở (Host) ---
app.get('/host/dashboard', (req, res) => {
    res.render('pages/host_dashboard');
});

app.get('/host/spaces', (req, res) => {
    res.render('pages/host_spaces');
});

app.get('/host/bookings', (req, res) => {
    res.render('pages/host_bookings');
});
app.get('/host/reports', (req, res) => {
    res.render('pages/host_reports');
});

app.get('/host/payments', (req, res) => {
    res.render('pages/host_payments');
});
// 4. Khởi động Server
app.listen(PORT, () => {
    console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
});