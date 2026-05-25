const jwt = require('jsonwebtoken');

exports.verifyHost = (req, res, next) => {
    // Lấy token từ Header "Authorization" do Thunder Client gửi lên
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy mã Token. Vui lòng đăng nhập!" });
    }

    try {
        // Giải mã mã Token bằng Secret Key đã cấu hình trong server.js của bạn
        const decoded = jwt.verify(token, 'workhub_secret_key');
        
        // Kiểm tra xem tài khoản có phải là host không
        if (decoded.role !== 'host') {
            return res.status(403).json({ message: "Quyền truy cập bị từ chối. Chỉ dành cho tài khoản Host!" });
        }

        req.user = decoded; // Lưu thông tin đăng nhập vào req.user để các hàm sau sử dụng
        next();
    } catch (error) {
        return res.status(401).json({ message: "Mã Token không hợp lệ hoặc đã hết hạn!" });
    }
};