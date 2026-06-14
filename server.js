const MONGODB_URI = 'mongodb://127.0.0.1:27017/coworking_db';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

// ==========================================
// KHỞI TẠO SERVER VỚI HTTP VÀ SOCKET.IO
// ==========================================
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ==========================================
// CẤU HÌNH SOCKET.IO
// ==========================================
global.io = io; // Khai báo io toàn cục để các Controller dùng

io.on('connection', (socket) => {
    console.log('Một thiết bị vừa kết nối:', socket.id);
    socket.on('disconnect', () => {
        console.log('Thiết bị đã ngắt kết nối:', socket.id);
    });
});

// ==========================================
// MIDDLEWARE XỬ LÝ DỮ LIỆU & GIAO DIỆN
// ==========================================
// Tài nguyên tĩnh: phục vụ thư mục public.
app.use(express.static(path.join(__dirname, 'public')));
// Parse JSON body gửi từ client.
app.use(express.json());
// Parse form URL encoded body.
app.use(express.urlencoded({ extended: true }));

// View Engine: thiết lập EJS và layout chung cho giao diện.
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Set default locals
app.use((req, res, next) => {
    res.locals.req = req;       // Cấp quyền cho EJS đọc req
    res.locals.branches = [];   // Tránh lỗi undefined khi render
    res.locals.keyword = "";    // Tránh lỗi undefined khi render
    next();
});

// ==========================================
// KHAI BÁO CÁC API ROUTES (Trả dữ liệu JSON)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// ROUTE LỊCH SỬ THANH TOÁN (LOGIC CÓ DB - TỪ HEAD)
// ==========================================
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

// ==========================================
// KHAI BÁO CÁC WEB ROUTES (Render Giao diện EJS)
// ==========================================

// --- Luồng Đăng nhập / Đăng ký ---
app.get('/login', (req, res) => {
    res.render('customer/login');
});
app.get('/register', (req, res) => {
    res.render('customer/register');
});

// --- Luồng Khách hàng (Customer) ---
app.get('/', (req, res) => res.render('customer/home', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/search', (req, res) => res.render('customer/search', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/detail', (req, res) => res.render('customer/detail', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/payment', (req, res) => res.render('customer/payment', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/history', (req, res) => res.render('customer/history', { scripts: '<script src="/js/customer-main.js"></script>' }));
app.get('/profile', (req, res) => res.render('customer/profile', { scripts: '<script src="/js/customer-main.js"></script>' }));

// --- Luồng Chủ cơ sở (Host) ---
app.get('/host/profile', (req, res) => res.render('host/profile', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/dashboard', (req, res) => res.render('host/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/spaces', (req, res) => res.render('host/spaces', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/bookings', (req, res) => res.render('host/bookings', { scripts: '<script src="/js/host-spaces.js"></script>' }));
app.get('/host/reports', verifyToken, getHostReportsPage);
app.get('/host/payments', (req, res) => res.render('host/payments', { scripts: '<script src="/js/host-spaces.js"></script>' }));

// --- Luồng Admin ---
app.get('/admin/dashboard', (req, res) => res.render('admin/dashboard', { scripts: '<script src="/js/admin-main.js"></script>' }));
app.get('/admin/users', (req, res) => res.render('admin/users', { scripts: '<script src="/js/admin-main.js"></script>' }));
app.get('/admin/hosts', (req, res) => res.render('admin/hosts', { scripts: '<script src="/js/admin-main.js"></script>' }));

app.use('/', customerRoutes);

// ==========================================
// MIDDLEWARE XỬ LÝ LỖI TỔNG HỢP
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
        // CHÚ Ý: Bắt buộc dùng server.listen (với http.createServer) để Socket.IO hoạt động
        server.listen(PORT, () => {
            console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
        });
    })
    .catch(err => {
        console.error('❌ Không thể kết nối MongoDB, server không khởi động:', err);
        process.exit(1);
    });

module.exports = app;
