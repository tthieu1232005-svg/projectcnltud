const jwt = require('jsonwebtoken');

// Hàm kiểm tra xem người dùng đã đăng nhập chưa (Có Token hợp lệ không)
function verifyToken(req, res, next) {
    // Thông thường token sẽ được gửi qua header Authorization: Bearer <token>
    // Hoặc trong dự án EJS, có thể bạn sẽ gửi qua Cookie. 
    // Giả sử ở đây chúng ta lấy từ Header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'workhub_fallback_secret_key_2026');
        req.user = decoded; // Lưu thông tin giải mã (userId, role) vào req để các bước sau dùng
        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
}

// Hàm kiểm tra quyền Admin
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Quyền truy cập bị từ chối. Chỉ Admin mới được thực hiện hành động này.' });
    }
    next();
}

//Kiểm tra quyền truy cập theo vai trò (ví dụ: customer, host)
function authorizeRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Quyền truy cập bị từ chối.' });
        }
        next();
    };
}

module.exports = {
    verifyToken,
    requireAdmin
};