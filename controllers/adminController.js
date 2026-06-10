const HostProfile = require('../models/Host_Profile');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
// Hàm hỗ trợ gửi lỗi máy chủ về client (giúp code gọn hơn)
function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// Hàm này trả về số liệu tổng quan cho dashboard của admin
async function getAdminDashboard(req, res) {
  try {
    const [userCount, customerCount, hostCount, bookingCount, branchCount, spaceCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ Role: 'customer' }),
      User.countDocuments({ Role: 'host' }),
      Booking.countDocuments(),
      Branch.countDocuments(),
      Space.countDocuments()
    ]);

    return res.json({
      totals: {
        users: userCount,
        customers: customerCount,
        hosts: hostCount,
        bookings: bookingCount,
        branches: branchCount,
        spaces: spaceCount
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}
// Hàm này có thể dùng để liệt kê tất cả người dùng (dành cho admin)
async function listUsers(req, res) {
  try {
    const users = await User.find().select('-PasswordHash').lean(); // Lưu ý: PasswordHash viết hoa theo Model của bạn
    return res.json({ users });
  } catch (error) {
    return sendServerError(res, error);
  }
}


// Hàm Khóa / Mở khóa tài khoản
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params; // Lấy ID của user từ trên đường dẫn (URL)
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // Bảo mật: Không cho phép Admin tự khóa chính mình!
    // req.user.userId là ID của người đang đăng nhập (lấy từ Token)
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Bạn không thể tự khóa tài khoản của chính mình!' });
    }

    // Đảo ngược trạng thái: Nếu đang active thì thành banned, và ngược lại
    user.Status = user.Status === 'active' ? 'banned' : 'active';
    await user.save();

    return res.json({ 
      message: `Đã ${user.Status === 'banned' ? 'khóa' : 'mở khóa'} tài khoản thành công!`, 
      status: user.Status 
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}



// Lấy danh sách các Host đang chờ phê duyệt
async function getPendingHosts(req, res) {
  try {
    // Tìm các hồ sơ Host có IsVerified = false và nối với bảng User để lấy Tên + Email
    const pendingHosts = await HostProfile.find({ IsVerified: false })
      .populate('UserID', 'FullName Email Status')
      .lean();
      
    return res.json({ hosts: pendingHosts });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Hàm Phê duyệt Host
async function verifyHost(req, res) {
  try {
    const { id } = req.params; // Lấy ID của HostProfile
    const hostProfile = await HostProfile.findById(id);

    if (!hostProfile) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ Chủ cơ sở.' });
    }

    // Cập nhật trạng thái thành đã duyệt
    hostProfile.IsVerified = true;
    await hostProfile.save();

    return res.json({ message: 'Đã phê duyệt Chủ cơ sở thành công!' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Gom tất cả vào 1 module.exports duy nhất
module.exports = {
  getAdminDashboard,
  listUsers,
  toggleUserStatus,
  getPendingHosts, 
  verifyHost       
};