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


async function getHostDashboardStats(req, res) {
    try {
        const hostId = req.user._id; // Lấy ID Host từ JWT Token (Hà Thị Minh Na)
        const { branchId } = req.query; // Nhận 'all' hoặc ID cụ thể từ Frontend gửi lên

        // 1. Lấy danh sách tất cả chi nhánh để render ra các Tab ở Frontend
        const branches = await Branch.find({ HostID: hostId, Status: 'active' });

        // 2. Thiết lập điều kiện lọc cơ bản theo Host
        let matchSpaceCondition = { HostID: new mongoose.Types.ObjectId(hostId) };
        let matchBookingCondition = { HostID: new mongoose.Types.ObjectId(hostId) };
        let matchPaymentCondition = { HostID: new mongoose.Types.ObjectId(hostId) };

        // 🔥 LOGIC QUAN TRỌNG: Nếu lọc theo từng Chi nhánh cụ thể (branchId không phải là 'all')
        if (branchId && branchId !== 'all') {
            const bId = new mongoose.Types.ObjectId(branchId);
            
            // Lọc Space thuộc chi nhánh này
            matchSpaceCondition.BranchID = bId;

            // Với Booking và Payment, vì Schema không có sẵn trường BranchID, 
            // ta cần tìm tất cả SpaceID thuộc chi nhánh này trước để làm bộ lọc
            const targetSpaces = await Space.find({ BranchID: bId }).select('_id');
            const spaceIds = targetSpaces.map(s => s._id);

            matchBookingCondition.SpaceID = { $in: spaceIds };
            matchPaymentCondition.BookingID = { 
                $in: await Booking.find({ SpaceID: { $in: spaceIds } }).distinct('_id') 
            };
        }

        // --- BẮT ĐẦU TÍNH TOÁN SỐ LIỆU THEO ĐIỀU KIỆN ---

        // A. Tính Doanh thu thực tế thành công & Tiền treo (PaymentHistory)
        const financeStats = await PaymentHistory.aggregate([
            { $match: matchPaymentCondition },
            {
                $group: {
                    _id: null,
                    revenue: {
                        $sum: { $cond: [{ $eq: ["$Status", "successful"] }, "$Amount", 0] }
                    },
                    pendingAmount: {
                        $sum: { $cond: [{ $eq: ["$Status", "pending"] }, "$Amount", 0] }
                    }
                }
            }
        ]);

        const finance = financeStats[0] || { revenue: 0, pendingAmount: 0 };

        // B. Tính Tổng đặt chỗ và Lượt khách duy nhất (Booking)
        const bookingStats = await Booking.aggregate([
            { $match: matchBookingCondition },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    uniqueCustomers: { $addToSet: "$CustomerID" } // Đếm lượng khách không trùng lặp
                }
            }
        ]);

        const totalBookings = bookingStats[0] ? bookingStats[0].totalBookings : 0;
        const totalOccupiedGuests = bookingStats[0] ? bookingStats[0].uniqueCustomers.length : 0;

        // C. Đếm số chỗ/phòng đang hoạt động (Spaces)
        const activeRoomsCount = await Space.countDocuments({
            ...matchSpaceCondition,
            Status: 'available'
        });

        // D. Lấy danh sách Sơ đồ trạng thái phòng LIVE
        // (Trong thực tế, bạn có thể map với Booking xem phòng nào đang được dùng tại thời điểm này)
        const spaces = await Space.find(matchSpaceCondition).select('SpaceCode Status');
        const liveFloorPlan = spaces.map(s => {
            let liveStatus = 'available'; // trống
            if (s.Status === 'occupied') liveStatus = 'occupied';
            if (s.Status === 'maintenance') liveStatus = 'maintenance';
            return {
                SpaceCode: s.SpaceCode,
                LiveStatus: liveStatus
            };
        });

        // E. Danh sách 5 Booking gần nhất
        const recentBookings = await Booking.find(matchBookingCondition)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('CustomerID', 'FullName') // Lấy tên khách hàng từ bảng Users
            .populate('SpaceID', 'SpaceCode');  // Lấy mã phòng từ bảng Spaces

        // 3. Trả kết quả đồng bộ chuẩn xác về cho Frontend nhận dữ liệu
        return res.status(200).json({
            branches,
            stats: {
                revenue: finance.revenue,
                paidAmount: finance.revenue,
                pendingAmount: finance.pending,
                totalBookings,
                totalOccupiedGuests,
                activeRoomsCount
            },
            liveFloorPlan,
            recentBookings
        });

    } catch (error) {
        console.error("Lỗi Backend Dashboard:", error);
        return res.status(500).json({ error: "Có lỗi xảy ra tại máy chủ hệ thống." });
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
  getHostBookings,
  renderDashboardView,   
  getDashboardStatsAPI  
};