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
    // 1.1. Lấy token từ header do Frontend (fetch) gửi lên
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });
    }
    const token = authHeader.split(' ')[1];

    // 1.2. Giải mã token để lấy ID của Host
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
    const hostId = decoded.id || decoded._id || decoded.userId;

    // 1.3. Tìm thông tin tài khoản (User) trong DB
    const user = await User.findById(hostId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản Host này.' });
    }

    // 1.4. Tìm thông tin doanh nghiệp (HostProfile) - CHÚ Ý DÙNG UserID CHỮ HOA
    let profile = await HostProfile.findOne({ UserID: hostId });

    // Nếu chưa có hồ sơ, tự động tạo một bản ghi rỗng cho họ (điền đủ các trường required)
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

    // 1.5. Trả dữ liệu JSON về cho Frontend
    return res.json({
      user: {
        FullName: user.fullName || user.FullName || 'Chưa cập nhật',
        Email: user.email || user.Email || '',
        _id: user._id
      },
      profile: {
        // Trích xuất dữ liệu bằng chữ HOA theo Schema của bạn
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
    // 2.1. Giải mã token tương tự hàm GET
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
    const hostId = decoded.id || decoded._id || decoded.userId;

    // 2.2. Hứng dữ liệu từ Frontend gửi lên
    const {
      CompanyName,
      Hotline,
      TaxCode,
      BankName,
      BankNumber
    } = req.body;

    // 2.3. Cập nhật thông tin doanh nghiệp (Host_Profile)
    // Dùng upsert: true để nếu lỡ DB chưa có record thì tự tạo luôn
    // Dùng runValidators: true để kiểm tra dữ liệu theo Schema
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

    // 2.4. Trả về thông báo thành công cho hàm fetch
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