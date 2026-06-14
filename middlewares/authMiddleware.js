const jwt = require('jsonwebtoken');

/**
 * 1. Xác thực người dùng (Kiểm tra Token)
 * Kết hợp sự chặt chẽ của auth.js và tính linh hoạt của authMiddleware.js
 */
const verifyToken = (req, res, next) => {
    try {
        // Lấy token từ header 'Authorization' (Định dạng chuẩn: "Bearer <token>")
        const authHeader = req.header('Authorization') || req.headers['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Truy cập bị từ chối. Vui lòng cung cấp Bearer Token.' 
            });
        }

        // Tách lấy chuỗi token
        const token = authHeader.split(' ')[1];

        // Sử dụng secret từ .env, có fallback để tránh crash server
        const secret = process.env.JWT_SECRET || 'workhub_fallback_secret_key_2026';

        // Giải mã token
        const decoded = jwt.verify(token, secret);

        // Gắn thông tin đã giải mã vào req.user 
        req.user = decoded;

        // Cho phép request đi tiếp vào Controller
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(403).json({ error: 'Token không hợp lệ.' });
    }
};

/**
 * 2. Phân quyền động (Kiểm tra Role)
 * Dùng để đảm bảo quyền truy cập chéo (Ví dụ: authorizeRole('customer', 'host'))
 */
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Không tìm thấy thông tin phân quyền.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Bạn không có quyền (role) để truy cập tài nguyên này.' 
            });
        }

        next();
    };
};

/**
 * 3. Phân quyền Admin cụ thể
 * Giữ lại để đảm bảo các file như adminRoutes.js không bị lỗi nếu đang gọi hàm này
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Quyền truy cập bị từ chối. Chỉ Admin mới được thực hiện hành động này.' });
    }
    next();
};

module.exports = {
    verifyToken,
    authorizeRole,
    requireAdmin
};