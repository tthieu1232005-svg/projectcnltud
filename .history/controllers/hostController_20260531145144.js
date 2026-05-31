const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const PaymentHistory = require('../models/Payment_History');
const mongoose = require('mongoose');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}


async function renderDashboardView(req, res) {
  try {
    // Chỉ render trang tĩnh ban đầu, dữ liệu sẽ được Javascript phía Client fetch sau qua API
    return res.render('host/dashboard', {
      scripts: '<script src="/js/host-spaces.js"></script>'
    });
  } catch (error) {
    console.error("Lỗi renderDashboardView:", error);
    return res.status(500).send("Lỗi tải trang bảng điều hành.");
  }
}


async function getDashboardStatsAPI(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
    const hostId = decoded.id || decoded._id || decoded.userId;

    // Lọc theo chi nhánh nếu frontend có gửi lên query ?branchId=...
    const { branchId } = req.query;

    // CHUẨN HÓA ĐIỀU KIỆN LỌC (Filter)
    let spaceMatchCondition = { HostID: new mongoose.Types.ObjectId(hostId) };
    if (branchId && branchId !== 'all') {
      spaceMatchCondition.BranchID = new mongoose.Types.ObjectId(branchId);
    }

    // 1. Lấy danh sách các Chi nhánh của Host này để đổ vào thẻ Tab
    const branches = await Branch.find({ HostID: hostId }).select('Name _id').lean();

    // 2. Lấy danh sách Space ID thuộc quyền quản lý của Host dựa theo bộ lọc chi nhánh
    const currentSpaces = await Space.find(spaceMatchCondition).select('_id SpaceCode Status').lean();
    const spaceIds = currentSpaces.map(s => s._id);

    // Điều kiện chung cho các bảng Booking và Payment ăn theo list SpaceId
    const bookingMatchCondition = { SpaceID: { $in: spaceIds } };

    // --- TÍNH TOÁN 5 THẺ TỔNG QUAN ---

    // Thẻ 1 & Tài chính: Doanh thu thực nhận từ bảng payment_histories (Trạng thái successful)
    const paymentStats = await PaymentHistory.aggregate([
      { $match: { HostID: new mongoose.Types.ObjectId(hostId), BookingID: { $in: spaceIds ? await Booking.find(bookingMatchCondition).distinct('_id') : [] }, Status: 'successful' } },
      { $group: { _id: null, totalRevenue: { $sum: '$Amount' } } }
    ]);
    const revenue = paymentStats.length > 0 ? paymentStats[0].totalRevenue : 0;

    // Tính toán thêm phần Tài chính chi tiết (Đã nhận thành công và Đang chờ xử lý)
    const financialStats = await PaymentHistory.aggregate([
      { $match: { HostID: new mongoose.Types.ObjectId(hostId) } },
      {
        $group: {
          _id: null,
          paidAmount: { $sum: { $cond: [{ $eq: ["$Status", "successful"] }, "$Amount", 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ["$Status", "pending"] }, "$Amount", 0] } }
        }
      }
    ]);
    const paidAmount = financialStats.length > 0 ? financialStats[0].paidAmount : 0;
    const pendingAmount = financialStats.length > 0 ? financialStats[0].pendingAmount : 0;

    // Thẻ 2: Tổng số lượng Booking (Ngoại trừ các đơn bị huỷ 'cancelled')
    const totalBookings = await Booking.countDocuments({ ...bookingMatchCondition, Status: { $ne: 'cancelled' } });

    // Thẻ 3: Lượt khách (Tính tổng các Booking có trạng thái 'completed' - đã check-out xong)
    const totalOccupiedGuests = await Booking.countDocuments({ ...bookingMatchCondition, Status: 'completed' });

    // Thẻ 4: Số chỗ hoạt động (Đếm các Space đang có status là 'available')
    const activeRoomsCount = currentSpaces.filter(s => s.Status === 'available').length;


    // --- SƠ ĐỒ TRẠNG THÁI PHÒNG LIVE ---
    // Khởi tạo trạng thái thực tế dựa theo lịch thời gian thực (Real-time) hiện tại
    const now = new Date();

    // Lấy tất cả các booking đang hoạt động hoặc sắp tới trong ngày hôm nay
    const activeBookingsToday = await Booking.find({
      SpaceID: { $in: spaceIds },
      Status: { $in: ['confirmed', 'pending'] },
      StartTime: { $lte: new Date(now.setHours(23, 59, 59, 999)) },
      EndTime: { $gte: new Date(now.setHours(0, 0, 0, 0)) }
    }).lean();

    const nowRealTime = new Date();
    const liveFloorPlan = currentSpaces.map(space => {
      // Tìm xem phòng này có booking nào trúng khung giờ hiện tại không
      const bookingMatch = activeBookingsToday.find(b => b.SpaceID.toString() === space._id.toString());

      let liveStatus = 'available'; // Mặc định là trống (emerald)
      if (space.Status === 'maintenance') {
        liveStatus = 'maintenance';
      } else if (bookingMatch) {
        if (bookingMatch.StartTime <= nowRealTime && bookingMatch.EndTime >= nowRealTime) {
          liveStatus = 'occupied'; // Đang dùng (red)
        } else if (bookingMatch.StartTime > nowRealTime) {
          liveStatus = 'upcoming'; // Đã đặt, sắp tới (amber)
        }
      }

      return {
        SpaceCode: space.SpaceCode,
        LiveStatus: liveStatus
      };
    });


    // --- DANH SÁCH BOOKING GẦN NHẤT (TOP 5) ---
    const recentBookings = await Booking.find(bookingMatchCondition)
      .populate('CustomerID', 'fullName FullName Email')
      .populate('SpaceID', 'SpaceCode Name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Trả cục dữ liệu tổng hợp về cho Frontend render
    return res.json({
      branches,
      stats: {
        revenue,
        totalBookings,
        totalOccupiedGuests,
        activeRoomsCount,
        paidAmount,
        pendingAmount
      },
      liveFloorPlan,
      recentBookings
    });

  } catch (error) {
    console.error("Lỗi getDashboardStatsAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi tải số liệu thống kê!' });
  }
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

    // 🔍 THEO DÕI 1: Kiểm tra dữ liệu Frontend gửi lên có đúng không
    console.log("=== BẮT ĐẦU CẬP NHẬT TRANG HỒ SƠ ===");
    console.log("-> ID Host giải mã từ Token:", hostId);
    console.log("-> Họ tên nhận được:", FullName);
    
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