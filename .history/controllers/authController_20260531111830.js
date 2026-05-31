const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// Lưu ý: Đảm bảo tên file trong thư mục models của bạn khớp với 2 dòng require này
const CustomerProfile = require('../models/Customer_Profile'); 
const HostProfile = require('../models/Host_Profile');

// ================= CÁC HÀM HỖ TRỢ (HELPERS) =================
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    const e = normalizeEmail(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidPassword(password) {
    const p = String(password || '');
    return p.length >= 6 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

function sendServerError(res, error) {
    console.error('AuthController error:', error);
    if (error?.stack) console.error(error.stack);
    return res.status(500).json({ error: error?.message || 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// ================= LOGIC ĐĂNG KÝ  =================
async function registerUser(req, res) {
    try {
        const { email, password, fullName, role, companyName, hotline, bankName, bankNumber } = req.body;

        // 1. Validate Dữ liệu cơ bản
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email, Mật khẩu và Họ tên!' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Định dạng email không hợp lệ!' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Mật khẩu phải >= 6 ký tự, bao gồm cả chữ và số!' });
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedRole = String(role || '').trim().toLowerCase();
        const normalizedFullName = String(fullName).trim();

        if (!['customer', 'host'].includes(normalizedRole)) {
            return res.status(400).json({ error: 'Role phải là customer hoặc host.' });
        }

        // 2. Kiểm tra Email tồn tại
        const existingUser = await User.findOne({ Email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ error: 'Email này đã được đăng ký!' });
        }

        // 3. Hash Mật khẩu
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(String(password), salt);

        // 4. Tạo User mới
        const user = await User.create({
            Email: normalizedEmail,
            PasswordHash: passwordHash,
            FullName: normalizedFullName,
            Role: normalizedRole,
            Status: 'active'
        });

        // 5. Tạo Profile theo Role
        if (normalizedRole === 'host') {
            // BẬT LẠI TÍNH NĂNG KIỂM TRA BẮT BUỘC
            if (!companyName || !hotline || !bankName || !bankNumber) {
                await User.findByIdAndDelete(user._id);
                return res.status(400).json({ 
                    error: 'Đăng ký Host yêu cầu bổ sung: Tên công ty, Hotline, Tên ngân hàng, Số tài khoản!' 
                });
            }

            // LƯU DỮ LIỆU THẬT MÀ NGƯỜI DÙNG NHẬP VÀO
            await HostProfile.create({
                UserID: user._id,
                CompanyName: String(companyName).trim(),
                Logo: "",
                Hotline: String(hotline).trim(),
                TaxCode: "",
                VerificationDocument: "",
                IsVerified: false,
                BankName: String(bankName).trim(),
                BankNumber: String(bankNumber).trim()
            });
        } else {
            await CustomerProfile.create({
                UserID: user._id,
                Avatar: "",
                Phone: "",
                Description: "",
                JobTitle: "",
                Company: "",
                BankName: "",
                BankNumber: ""
            });
        }

        // 6. Trả về kết quả
        return res.status(201).json({
            message: 'Đăng ký thành công.',
            user: {
                id: user._id,
                email: user.Email,
                fullName: user.FullName,
                role: user.Role,
                status: user.Status
            }
        });

    } catch (error) {
        return sendServerError(res, error);
    }
}

// ================= LOGIC ĐĂNG NHẬP (PROMPT 2) =================
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        
        // 1. Kiểm tra đầu vào
        if (!email || !password) {
            return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc.' });
        }

        const normalizedEmail = normalizeEmail(email); 
        
        // 2. Tìm user theo Email
        const user = await User.findOne({ Email: normalizedEmail });
        
        // 🔒 Bảo mật: Tuyệt đối không báo lỗi chi tiết là "sai email" hay "sai password"
        if (!user) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        // Chặn tài khoản nếu đang bị khóa
        if (user.Status === 'banned') {
            return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
        }

        // 3. So sánh mật khẩu bằng hàm băm
        const isMatch = await bcrypt.compare(String(password), user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        // 4. Ký phát JWT Token
        // Payload là những thông tin CƠ BẢN mang theo (Không chứa mật khẩu)
        const payload = {
            userId: user._id,
            role: user.Role
        };

        // Ký token với thời hạn 1 ngày (dùng thuật toán HS256 mặc định)
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'workhub_fallback_secret_key_2026', // Lấy từ file .env
            { expiresIn: '1d' }
        );

        // 5. Trả về kết quả cho Frontend
        return res.status(200).json({
            message: 'Đăng nhập thành công.',
            token: token, // Dây chính là giấy thông hành để frontend cất giữ
            user: {
                id: user._id,
                email: user.Email,
                fullName: user.FullName,
                role: user.Role,
                status: user.Status
            }
        });
    } catch (error) {
        return sendServerError(res, error);
    }
}
// ================= LOGIC ĐĂNG XUẤT =================
function logoutUser(req, res) {
    return res.json({ message: 'Đăng xuất thành công.' });
}

// ================= LOGIC ĐỔI MẬT KHẨU =================
async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;

        // 1. Kiểm tra userId từ verifyToken truyền sang
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Phiên làm việc hết hạn, vui lòng đăng nhập lại!' });
        }

        // 2. Validate dữ liệu đầu vào
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!' });
        }

        // 3. Tìm User trong Database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Tài khoản không tồn tại trên hệ thống!' });
        }

        // 4. Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(String(oldPassword), user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mật khẩu cũ không chính xác!' });
        }

        // 5. Tiến hành mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(String(newPassword), salt);

        // 6. CẬP NHẬT TRỰC TIẾP XUỐNG MONGOOSE TRÁNH BỊ HOOK BYPASS
        const updateResult = await User.updateOne(
            { _id: userId },
            { $set: { PasswordHash: newPasswordHash } }
        );

        console.log("-> Kết quả cập nhật mật khẩu DB:", updateResult);

        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({ error: 'Mật khẩu mới trùng mật khẩu cũ hoặc lỗi hệ thống không thể ghi đè!' });
        }

        return res.status(200).json({ message: 'Cập nhật mật khẩu thành công!' });

    } catch (error) {
        return sendServerError(res, error);
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    changePassword
};