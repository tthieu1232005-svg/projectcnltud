const jwt = require('jsonwebtoken');

/**
 * Middleware 1: Xác thực người dùng (Kiểm tra Token)
 * Dùng để chặn các request không có token hoặc token không hợp lệ
 */
const verifyToken = (req, res, next) => {
    try {
        // Lấy token từ header 'Authorization' (Định dạng chuẩn: "Bearer <token>")
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Truy cập bị từ chối. Vui lòng cung cấp Bearer Token.' 
            });
        }

        // Tách lấy chuỗi token bỏ đi chữ "Bearer "
        const token = authHeader.split(' ')[1];

        // Kiểm tra xem đã cấu hình JWT_SECRET trong file .env chưa
        if (!process.env.JWT_SECRET) {
            console.error('Lỗi Server: Thiếu biến môi trường JWT_SECRET');
            return res.status(500).json({ error: 'Lỗi cấu hình máy chủ.' });
        }

        // Giải mã token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Gắn thông tin đã giải mã (thường chứa _id và role của User) vào req.user 
        // để các Controller phía sau (như customerController) có thể lấy ra dùng.
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
 * Middleware 2: Phân quyền (Kiểm tra Role)
 * Dùng để đảm bảo Customer không gọi được API của Host và ngược lại
 * Ví dụ cách gọi: authorizeRole('customer', 'admin')
 */
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user được tạo ra từ hàm verifyToken ở trên
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

module.exports = {
    verifyToken,
    authorizeRole
};