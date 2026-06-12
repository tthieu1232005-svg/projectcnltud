const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const PaymentHistory = require('../models/Payment_History');
const mongoose = require('mongoose');

// Hàm Helper
function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}
async function renderDashboardView(req, res) {
  try {
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
    const hostId = decoded.userId || decoded.id || decoded._id;

    const { branchId } = req.query;

    // 1. TÌM CHI NHÁNH CỦA HOST
    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).select('Name _id').lean();

    // 2. LỌC KHÔNG GIAN (SPACES) THEO NHÁNH HOẶC TẤT CẢ
    let spaceMatchCondition = {
      $or: [{ HostID: hostId }, { hostID: hostId }]
    };
    if (branchId && branchId !== 'all') {
      spaceMatchCondition = {
        $or: [{ BranchID: branchId }, { branchID: branchId }]
      };
    }

    const currentSpaces = await Space.find(spaceMatchCondition).select('_id SpaceCode Status').lean();
    const spaceIds = currentSpaces.map(s => s._id);

    if (spaceIds.length === 0) {
      return res.json({
        branches,
        stats: { revenue: 0, totalBookings: 0, totalOccupiedGuests: 0, activeRoomsCount: 0, paidAmount: 0, pendingAmount: 0 },
        liveFloorPlan: [],
        recentBookings: []
      });
    }

    const bookingMatchCondition = {
      $or: [{ SpaceID: { $in: spaceIds } }, { spaceID: { $in: spaceIds } }]
    };

    // 3 & 4. TÍNH TỔNG BOOKING VÀ ĐÃ THANH TOÁN (CỌC) CHỈ TỪ BẢNG BOOKING
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          $or: [{ SpaceID: { $in: spaceIds } }, { spaceID: { $in: spaceIds } }],
          Status: { $ne: 'cancelled' } // Đã thêm: Loại bỏ đơn hủy để tính tiền chuẩn
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$TotalAmount" },
          totalDeposit: { $sum: "$DepositAmount" }
        }
      }
    ]);

    const revenue = bookingStats.length > 0 ? bookingStats[0].totalRevenue : 0;
    const paidAmount = bookingStats.length > 0 ? bookingStats[0].totalDeposit : 0;
    const pendingAmount = 0;

    // 5. THỐNG KÊ SỐ LƯỢNG BOOKING & PHÒNG
    const totalBookings = await Booking.countDocuments({ ...bookingMatchCondition, Status: { $ne: 'cancelled' } });
    const totalOccupiedGuests = await Booking.countDocuments({ ...bookingMatchCondition, Status: 'completed' });
    const activeRoomsCount = currentSpaces.filter(s => s.Status === 'available').length;

    // 6. XỬ LÝ SƠ ĐỒ PHÒNG LIVE HÔM NAY
    const nowRealTime = new Date();
    const startOfDay = new Date(nowRealTime.setHours(0, 0, 0, 0));
    const endOfDay = new Date(nowRealTime.setHours(23, 59, 59, 999));

    const activeBookingsToday = await Booking.find({
      $or: [{ SpaceID: { $in: spaceIds } }, { spaceID: { $in: spaceIds } }],
      Status: { $in: ['confirmed', 'pending', 'in-use'] },
      StartTime: { $lte: endOfDay },
      EndTime: { $gte: startOfDay }
    }).lean();

    const liveFloorPlan = currentSpaces.map(space => {
      const spaceIdStr = space._id.toString();
      const bookingMatch = activeBookingsToday.find(b => {
        const bSpaceId = b.SpaceID || b.spaceID;
        return bSpaceId && bSpaceId.toString() === spaceIdStr;
      });

      let liveStatus = 'available';
      if (space.Status === 'maintenance') {
        liveStatus = 'maintenance';
      } else if (bookingMatch) {
        const actualNow = new Date();
        if (bookingMatch.StartTime <= actualNow && bookingMatch.EndTime >= actualNow) {
          liveStatus = 'occupied';
        } else if (bookingMatch.StartTime > actualNow) {
          liveStatus = 'upcoming';
        }
      }
      return {
        SpaceCode: space.SpaceCode || space.spaceCode,
        LiveStatus: liveStatus
      };
    });

    // 7. LẤY DANH SÁCH BOOKING GẦN NHẤT
    const recentBookings = await Booking.find({
      $or: [{ HostID: hostId }, { hostID: hostId }],
      Status: { $ne: 'cancelled' }
    })
      .populate('CustomerID', 'fullName FullName Email email')
      .populate('SpaceID', 'SpaceCode spaceCode Name name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 8. TRẢ VỀ JSON CHO FRONTEND
    return res.json({
      branches,
      stats: { revenue, totalBookings, totalOccupiedGuests, activeRoomsCount, paidAmount, pendingAmount },
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
  } catch (error) { // ĐÃ THÊM: Sửa lỗi đóng thiếu catch
    console.error("Lỗi getProfileAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi lấy thông tin hồ sơ.' });
  }
}

// ==========================================
// 2. Hàm API cập nhật Hồ sơ (PUT)
// ==========================================
async function updateProfileAPI(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId;

    const { FullName, CompanyName, Hotline, TaxCode, BankName, BankNumber } = req.body;

    // Cập nhật Tên trong bảng User
    if (FullName && FullName.trim() !== '') {
      await User.findByIdAndUpdate(hostId, {
        fullName: FullName.trim(),
        FullName: FullName.trim()
      });
    }

    // Chuẩn bị dữ liệu cập nhật cho HostProfile
    let updateData = {
      CompanyName,
      Hotline,
      TaxCode,
      BankName,
      BankNumber
    };

    // NẾU CÓ UPLOAD LOGO MỚI, lưu thêm đường dẫn ảnh
    if (req.file && req.file.path) {
      updateData.Logo = req.file.path; // req.file.path chứa link ảnh từ Cloudinary
    }

    // Tiến hành update
    await HostProfile.findOneAndUpdate(
      { UserID: hostId },
      updateData,
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

async function getHostBranches(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId;

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).lean();

    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH KHÔNG GIAN THEO HOST
// ==========================================
async function getHostSpaces(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId;

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).select('_id').lean();

    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({
      $or: [{ BranchID: { $in: branchIds } }, { branchID: { $in: branchIds } }]
    }).lean();

    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH ĐƠN ĐẶT CHỖ
// ==========================================
async function getHostBookings(req, res) {
  try {
    const currentTime = new Date();
    await Booking.updateMany(
      {
        $or: [{ Status: 'in-use' }, { status: 'in-use' }],
        $or: [{ EndTime: { $lt: currentTime } }, { endTime: { $lt: currentTime } }]
      },
      { $set: { Status: 'completed', status: 'completed' } },
      { strict: false }
    );
    const hostId = req.user.id || req.user._id || req.user.userId;
    const bookings = await Booking.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    })
      .populate({ path: 'CustomerID', select: 'email Email FullName', strictPopulate: false })
      .populate({
        path: 'SpaceID',
        select: 'Name Name name SpaceName spaceName SpaceCode Space_Code space_code Space_code SpaceCode_code code spaceCode spaceCode',
        populate: { path: 'BranchID', select: 'Name name' }
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// CÁC HÀM HÀNH ĐỘNG CỦA HOST
// ==========================================
async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng này không ở trạng thái chờ xác nhận.' });
    }

    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'confirmed', status: 'confirmed' } }
    );

    const total = booking.TotalAmount || booking.totalAmount || 0;
    const deposit = booking.DepositAmount || 0;

    let amountReceived = deposit;
    let paymentType = 'deposit';

    if (booking.percentagePaid !== undefined) {
      amountReceived = (total * booking.percentagePaid) / 100;
      paymentType = booking.percentagePaid === 100 ? 'full_payment' : 'deposit';
    } else {
      paymentType = deposit >= total ? 'full_payment' : 'deposit';
    }

    try {
      await PaymentHistory.create({
        BookingID: booking._id,
        CustomerID: booking.CustomerID || booking.customerID,
        HostID: booking.HostID || booking.hostID,
        TransactionCode: `TXN-CONFIRM-${Math.floor(Math.random() * 100000)}`,
        Amount: amountReceived,
        PaymentType: paymentType,
        PaymentMethod: 'bank_transfer',
        Status: 'successful'
      });
      console.log('✅ Đã ghi nhận lịch sử thanh toán thành công!');
    } catch (paymentErr) {
      console.log('⚠️ Lưu ý: Không thể ghi nhận lịch sử thanh toán:', paymentErr.message);
    }

    if (global.io) {
      global.io.emit('booking_status_updated', {
        bookingId: bookingId,
        newStatus: 'confirmed'
      });
    }

    return res.status(200).json({ message: 'Xác nhận đơn hàng thành công.' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function checkinBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể nhận phòng với đơn đã được xác nhận.' });
    }

    const total = Number(booking.TotalAmount || booking.totalAmount || 0);

    await Booking.updateOne(
      { _id: bookingId },
      {
        $set: {
          Status: 'in-use',
          status: 'in-use',
          DepositAmount: total,
          depositAmount: total,
          percentagePaid: 100
        }
      },
      { strict: false }
    );

    if (global.io) {
      global.io.emit('booking_status_updated', {
        bookingId: bookingId,
        newStatus: 'in-use'
      });
    }

    return res.status(200).json({ message: 'Nhận phòng thành công. Hệ thống đã ghi nhận thu đủ 100% tiền!' });
  } catch (error) {
    console.error("LỖI CHECK-IN THỰC SỰ LÀ:", error);
    return res.status(500).json({ error: `Chi tiết lỗi Server: ${error.message}` });
  }
}

async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;

    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ hoặc đơn đã xác nhận.' });
    }

    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'cancelled', status: 'cancelled' } }
    );

    if (global.io) {
      global.io.emit('booking_status_updated', {
        bookingId: bookingId,
        newStatus: 'cancelled'
      });
    }

    return res.status(200).json({ message: 'Đã hủy đơn hàng thành công.' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Xuất tất cả các hàm ra ngoài đồng bộ (ĐÃ BỔ SUNG CÁC HÀM CÒN THIẾU)
module.exports = {
  getProfileAPI,
  updateProfileAPI,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  renderDashboardView,
  getDashboardStatsAPI,
  confirmBooking, // Đã thêm
  checkinBooking, // Đã thêm
  cancelBooking   // Đã thêm
};