const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = 3000;

// Tài nguyên tĩnh: dùng chung (public) + Host (Host/public)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'Host/public')));


// ==================== BẮT ĐẦU PHẦN BACKEND API BÁO CÁO ====================
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Space = require('./models/Space');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Kích hoạt các Module Router nghiệp vụ
app.use('/api', require('./api/branch.routes.js'));
app.use('/api', require('./api/space.routes.js'));

// 1. Kết nối MongoDB (Chạy Local qua MongoDB Compass)
mongoose.connect('mongodb://localhost:27017/workhubdb')
    .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// 2. API AUTHENTICATION (Login / Register)
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if(!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập đủ email và mật khẩu!" });
        }

        // 1. MÃ HÓA MẬT KHẨU TRỰC TIẾP Ở ĐÂY BẰNG BCRYPT
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. LƯU MẬT KHẨU ĐÃ MÃ HÓA VÀO DATABASE
        const user = new User({ email, password: hashedPassword, role });
        await user.save();

        // 3. XÓA MẬT KHẨU TRƯỚC KHI TRẢ VỀ CHO ĐẸP BÁO CÁO
        const userObject = user.toObject();
        delete userObject.password; 

        res.status(201).json({ message: "Đăng ký thành công!", user: userObject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email không tồn tại!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu!" });

        // Tạo JWT Token
        const token = jwt.sign({ id: user._id, role: user.role }, 'workhub_secret_key', { expiresIn: '1d' });
        res.json({ message: "Đăng nhập thành công", token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. API CRUD KHÔNG GIAN (SPACES)
// Tạo mới Không gian (Create)
app.post('/api/spaces', async (req, res) => {
    try {
        if (!req.body.name || !req.body.price) {
            return res.status(400).json({ message: "Lỗi Validation: Tên và giá tiền là bắt buộc!" });
        }
        const space = new Space(req.body);
        await space.save();
        res.status(201).json(space);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách (Read)
app.get('/api/spaces', async (req, res) => {
    const spaces = await Space.find();
    res.json(spaces);
});
// ==================== KẾT THÚC PHẦN BACKEND API ====================


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
