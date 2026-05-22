const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = 3000;

// Tài nguyên tĩnh: dùng chung (public) + Host (Host/public)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Host/public')));

// View Engine: root project — Customer/, Host/, views/ (layout & partials dùng chung)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname));
app.set('layout', 'views/layout');

// --- Luồng Khách hàng (Customer) ---
app.get('/', (req, res) => {
    res.render('Customer/pages/home');
});

app.get('/search', (req, res) => {
    res.render('Customer/pages/search');
});

app.get('/detail', (req, res) => {
    res.render('Customer/pages/detail');
});

app.get('/payment', (req, res) => {
    res.render('Customer/pages/payment');
});

app.get('/history', (req, res) => {
    res.render('Customer/pages/history');
});

app.get('/payment_history', (req, res) => {
    res.render('Customer/pages/payment_history');
});

app.get('/profile', (req, res) => {
    res.render('Customer/pages/profile');
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
    res.render('Host/pages/profile');
});

app.get('/host/dashboard', (req, res) => {
    res.render('Host/pages/dashboard');
});

app.get('/host/spaces', (req, res) => {
    res.render('Host/pages/spaces');
});

app.get('/host/bookings', (req, res) => {
    res.render('Host/pages/bookings');
});

app.get('/host/reports', (req, res) => {
    res.render('Host/pages/reports');
});

app.get('/host/payments', (req, res) => {
    res.render('Host/pages/payments');
});

// --- Admin: (chưa triển khai) ---

app.listen(PORT, () => {
    console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
});
