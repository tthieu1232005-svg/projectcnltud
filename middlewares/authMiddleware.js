const jwt = require('jsonwebtoken');

function parseCookies(cookieHeader = '') {
    return cookieHeader.split(';').reduce((cookies, cookieString) => {
        const [name, ...rest] = cookieString.trim().split('=');
        if (!name) return cookies;
        cookies[name] = decodeURIComponent(rest.join('='));
        return cookies;
    }, {});
}

// Hàm kiểm tra xem người dùng đã đăng nhập chưa (Có Token hợp lệ không)
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1];

    const cookies = parseCookies(req.headers.cookie || '');
    const tokenFromCookie = cookies.authToken || cookies.token;

    const token = tokenFromHeader || tokenFromCookie;

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

module.exports = {
    verifyToken,
    requireAdmin
};