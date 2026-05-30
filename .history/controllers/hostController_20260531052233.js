const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// ==========================================
// 1. Hàm API lấy dữ liệu Hồ sơ (GET)
// ==========================================
async function getProfileAPI(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });
    }
    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
    const hostId = decoded.id || decoded._id || decoded.userId;

    const user = await User.findById(hostId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản Host này.' });
    }

    let profile = await HostProfile.findOne({ UserID: hostId });

    if (!profile) {
      profile = await HostProfile.create({
        UserID: hostId,
        CompanyName: 'Chưa cập nhật',
        Hotline: 'Chưa cập nhật',
        TaxCode: 'Chưa cập nhật',
        BankName: 'Chưa cập nhật',
        BankNumber: 'Chưa cập nhật',
        Logo: ''
      });
    }

    return res.json({
      user: {
        FullName: user.fullName || user.FullName || 'Chưa cập nhật',
        Email: user.email || user.Email || '',
        _id: user._id
      },
      profile: {
        CompanyName: profile.CompanyName || '',
        Hotline: profile.Hotline || '',
        TaxCode: profile.TaxCode || '',
        BankName: profile.BankName || '',
        BankNumber: profile.BankNumber || ''
      }
    });

  } catch (error) {
    console.error("Lỗi getProfileAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi tải hồ sơ' });
  }
}

// ==========================================
// 2. Hàm API cập nhật Hồ sơ (PUT)
// ==========================================
async function updateProfileAPI(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
    const hostId = decoded.id || decoded._id || decoded.userId;

    // 👉 ĐÃ THÊM: Hứng biến FullName từ Frontend gửi lên
    const {
      FullName,
      CompanyName,
      Hotline,
      TaxCode,
      BankName,
      BankNumber
    } = req.body;
    
    // 👉 ĐÃ THÊM: Nếu có đổi tên thì cập nhật vào bảng User
    if (FullName && FullName.trim() !== '') {
      // Update cả 2 trường hợp tên biến để không trượt đi đâu được
      await User.findByIdAndUpdate(hostId, {
        fullName: FullName.trim(),
        FullName: FullName.trim()
      });
    }

    await HostProfile.findOneAndUpdate(
      { UserID: hostId },
      {
        CompanyName: CompanyName,
        Hotline: Hotline,
        TaxCode: TaxCode,
        BankName: BankName,
        BankNumber: BankNumber
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({
      success: true,
      message: 'Đã cập nhật hồ sơ thành công!'
    });

  } catch (error) {
    console.error("❌ Lỗi updateProfileAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật hồ sơ' });
  }
}

// ==========================================
// CÁC HÀM CŨ GIỮ NGUYÊN BÊN DƯỚI
// ==========================================

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

// Xuất tất cả các hàm ra ngoài đồng bộ
module.exports = {
  getProfileAPI,
  updateProfileAPI,
  getHostBranches,
  getHostSpaces,
  getHostBookings
};