// File: server.js — điểm vào ứng dụng Express, thiết lập middleware, route và view engine.
// Import Express web framework.
const express = require('express');
// Import middleware EJS layout để hỗ trợ layout chung cho view.
const expressLayouts = require('express-ejs-layouts');
// Import module path để xử lý đường dẫn tập tin.
const path = require('path');
// Nạp biến môi trường từ file .env.
require('dotenv').config();
// Import helper kết nối MongoDB.
const { connectDB } = require('./config/db');
// Import Mongoose để dùng ObjectId và model.
const mongoose = require('mongoose');

// Đăng ký route nhóm cho phần auth.
const authRoutes = require('./routes/authRoutes');
// Đăng ký route nhóm cho khách hàng.
const customerRoutes = require('./routes/customerRoutes');
// Đăng ký route nhóm cho host.
const hostRoutes = require('./routes/hostRoutes');
// Đăng ký route nhóm cho admin.
const adminRoutes = require('./routes/adminRoutes');
// Import controller để render trang báo cáo host.
const { getHostReportsPage } = require('./controllers/hostController');
// Import middleware xác thực JWT.
const { verifyToken } = require('./middlewares/authMiddleware');

// Import model Booking để dùng trong route lịch sử thanh toán.
const Booking = require('./models/Booking');
// Import model Space để lấy thông tin tên không gian.
const Space = require('./models/Space');
// Import model User như ví dụ, hiện chưa dùng trực tiếp ở file này.
const User = require('./models/User');

// Khởi tạo ứng dụng Express.
const app = express();
// Chọn cổng chạy server, ưu tiên biến môi trường PORT.
const PORT = process.env.PORT || 3000;

// --- Kết nối MongoDB ---
connectDB().then(() => {
    // Chỉ bắt đầu server khi kết nối DB thành công.
    app.listen(PORT, () => console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`));
});

// Tài nguyên tĩnh: phục vụ thư mục public.
app.use(express.static(path.join(__dirname, 'public')));
// --- Middleware xử lý dữ liệu ---
// Parse JSON body gửi từ client.
app.use(express.json());
// Parse form URL encoded body.
app.use(express.urlencoded({ extended: true }));

// Đăng ký các route nhóm API.
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/admin', adminRoutes);

// View Engine: thiết lập EJS và layout chung cho giao diện.
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');


// === ROUTE LỊCH SỬ THANH TOÁN ===
app.get('/payment_history', verifyToken, async (req, res) => {
    try {
        // LẤY USERID THẬT TỪ TOKEN
        const userId = req.user.userId;   

        if (!userId) {
            return res.status(401).send("Vui lòng đăng nhập để xem lịch sử thanh toán.");
        }

        // Lấy các tham số lọc từ query string.
        const { branchKeyword, startDate, statusFilter } = req.query;

        // Tạo điều kiện query ban đầu chỉ lấy booking của user hiện tại.
        let query = {
            CustomerID: new mongoose.Types.ObjectId(userId)
        };

        // Map trạng thái hiển thị sang giá trị lưu trong database.
        const statusMap = {
            'Thành công': ['confirmed', 'completed'],
            'Thất bại': ['cancelled'],
            'Chờ xử lý': ['pending']
        };

        // Nếu chọn trạng thái cụ thể, thêm điều kiện tương ứng.
        if (statusFilter && statusFilter !== 'Tất cả') {
            query.Status = { $in: statusMap[statusFilter] || ['confirmed', 'cancelled', 'completed', 'pending'] };
        } else {
            // Nếu không chọn trạng thái, lấy tất cả trạng thái mặc định.
            query.Status = { $in: ['confirmed', 'cancelled', 'completed', 'pending'] };
        }

        // Nếu có ngày bắt đầu, lọc từ đầu ngày đó.
        if (startDate) {
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOfDay };
        }

        // Tìm bookings theo điều kiện đã xây.
        let bookings = await Booking.find(query)
            // Populate thông tin Space để lấy tên cơ sở.
            .populate('SpaceID', 'name')
            // Sắp xếp booking mới nhất lên đầu.
            .sort({ createdAt: -1 })
            .lean();

        // Nếu có branchKeyword, lọc thêm theo tên không gian.
        if (branchKeyword) {
            bookings = bookings.filter(b => 
                b.SpaceID?.name?.toLowerCase().includes(branchKeyword.toLowerCase())
            );
        }

        // Lấy danh sách các cơ sở để dùng trong bộ lọc view.
        const allSpaces = await Space.find({}).select('name').lean();

        // Render view payment_history với dữ liệu booking và filter.
        res.render('customer/payment_history', { 
            bookings, 
            filters: { 
                branchKeyword: branchKeyword || '', 
                startDate: startDate || '', 
                statusFilter: statusFilter || 'Tất cả' 
            },
            allSpaces,
            userId: userId,           // Truyền userId thật
            scripts: '<script src="/js/customer-main.js"></script>'
        });
    } catch (error) {
        console.error("Lỗi payment_history:", error);
        res.status(500).send("Lỗi kết nối CSDL: " + error.message);
    }
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
app.get('/host/reports', verifyToken, getHostReportsPage);
app.get('/host/payments', (req, res) => res.render('host/payments', { scripts: '<script src="/js/host-spaces.js"></script>' }));

app.get('/admin/dashboard', (req, res) => res.render('admin/dashboard', { scripts: '<script src="/js/admin-main.js"></script>' }));

app.use((err, req, res, next) => {
    res.status(500).json({ status: 'error', message: err.message });
});