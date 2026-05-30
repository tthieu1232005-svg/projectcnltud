const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// 1. Hàm hiển thị trang hồ sơ Host
exports.getHostProfile = async (req, res) => {
  try {
    const { hostId } = req.params; // Lấy hostId từ URL gạch chéo

    // Tìm thông tin tài khoản và thông tin doanh nghiệp trong DB
    const user = await User.findById(hostId);
    let profile = await HostProfile.findOne({ userId: hostId });

    // Nếu Host này mới tinh chưa có hồ sơ doanh nghiệp, tự động tạo một bản ghi rỗng cho họ
    if (!profile) {
      profile = await HostProfile.create({
        userId: hostId,
        companyName: 'Chưa cập nhật'
      });
    }

    // Render ra file giao diện ejs (ví dụ file nằm ở views/host/dashboard.ejs hoặc file profile của bạn)
    // Đồng thời truyền 2 biến 'user' và 'profile' sang bên giao diện HTML
    res.render('host/dashboard', { user, profile });

  } catch (error) {
    console.error("Lỗi getHostProfile:", error);
    res.status(500).send('Lỗi hệ thống khi tải hồ sơ');
  }
};

// 2. Hàm xử lý khi Host bấm nút "Lưu thay đổi"
exports.updateHostProfile = async (req, res) => {
  try {
    const { hostId } = req.params;
    // Hứng toàn bộ dữ liệu mà Host nhập từ Form gửi lên
    const { fullName, password, companyName, hotline, taxCode, bankName, bankNumber } = req.body;

    // Cập nhật thông tin tài khoản (User) trước
    const userUpdateData = { fullName };
    if (password && password.trim() !== "") {
      // Nếu bạn có dùng thư viện mã hóa mật khẩu bcrypt thì băm nó ra, không thì để tạm chữ thô
      // const bcrypt = require('bcrypt');
      // userUpdateData.password = await bcrypt.hash(password, 10);
      userUpdateData.password = password;
    }
    await User.findByIdAndUpdate(hostId, userUpdateData);

    // Cập nhật thông tin doanh nghiệp (Host_Profile) sau
    await HostProfile.findOneAndUpdate(
      { userId: hostId },
      { companyName, hotline, taxCode, bankName, bankNumber },
      { new: true }
    );

    // Cập nhật xong xuôi thì load lại trang kèm theo cục dữ liệu mới
    res.redirect(`/host/${hostId}/profile?success=true`);

  } catch (error) {
    console.error("Lỗi updateHostProfile:", error);
    res.status(500).send('Lỗi hệ thống khi cập nhật hồ sơ');
  }
};

async function getHostBranches(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    const branches = await Branch.find({ hostID: hostId }).lean();
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostSpaces(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ branchID: { $in: branchIds } }).lean();

    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostBookings(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ branchID: { $in: branchIds } }).select('_id').lean();
    const spaceIds = spaces.map(space => space._id);

    const bookings = await Booking.find({ spaceID: { $in: spaceIds } }).sort({ createdAt: -1 }).lean();
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings
};