const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');
const PaymentHistory = require('../models/Payment_History');
const jwt = require('jsonwebtoken');

// ==========================================
// HÀM HELPER KHÔNG ĐỔI
// ==========================================
const sendServerError = (res, error) => {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
};

// Middleware/Helper lấy Host ID từ token tiện dụng hơn
const getHostIdFromToken = (req) => {
  if (req.user) return req.user.id || req.user._id || req.user.userId;
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY');
  return decoded.userId || decoded.id || decoded._id;
};

// Phát tín hiệu Socket.io gọn gàng
const emitBookingUpdate = (bookingId, newStatus) => {
  if (global.io) {
    global.io.emit('booking_status_updated', { bookingId, newStatus });
  }
};

// ==========================================
// ĐIỀU HƯỚNG GIAO DIỆN
// ==========================================
async function renderDashboardView(req, res) {
  try {
    return res.render('host/dashboard', { scripts: '<script src="/js/host-spaces.js"></script>' });
  } catch (error) {
    console.error("Lỗi renderDashboardView:", error);
    return res.status(500).send("Lỗi tải trang bảng điều hành.");
  }
}

// ==========================================
// BẢNG ĐIỀU KHIỂN & THỐNG KÊ (DASHBOARD)
// ==========================================
async function getDashboardStatsAPI(req, res) {
  try {
    const hostId = getHostIdFromToken(req);
    if (!hostId) return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });

    const { branchId } = req.query;
    const hostQuery = { $or: [{ HostID: hostId }, { hostID: hostId }] };

    // 1. Tìm chi nhánh của Host
    const branches = await Branch.find(hostQuery).select('Name _id').lean();

    // 2. Lọc không gian (Spaces) theo nhánh hoặc tất cả
    const spaceMatchCondition = branchId && branchId !== 'all'
      ? { $or: [{ BranchID: branchId }, { branchID: branchId }] }
      : hostQuery;

    const currentSpaces = await Space.find(spaceMatchCondition).select('_id SpaceCode Status spaceCode').lean();
    const spaceIds = currentSpaces.map(s => s._id);

    // Default stats nếu không có phòng
    const defaultStats = {
      branches,
      stats: { revenue: 0, totalBookings: 0, totalOccupiedGuests: 0, activeRoomsCount: 0, paidAmount: 0, pendingAmount: 0 },
      liveFloorPlan: [], recentBookings: [], chartData: { labels: [], bookings: [], revenue: [] }
    };
    if (spaceIds.length === 0) return res.json(defaultStats);

    const bookingMatchCondition = { $or: [{ SpaceID: { $in: spaceIds } }, { spaceID: { $in: spaceIds } }] };

    // 3 & 4. Tính doanh thu từ Aggregate ngắt các đơn đã huỷ
    const [bookingStats, totalBookings, totalOccupiedGuests] = await Promise.all([
      Booking.aggregate([
        { $match: { ...bookingMatchCondition, Status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: "$TotalAmount" }, totalDeposit: { $sum: "$DepositAmount" } } }
      ]),
      Booking.countDocuments({ ...bookingMatchCondition, Status: { $ne: 'cancelled' } }),
      Booking.countDocuments({ ...bookingMatchCondition, Status: 'completed' })
    ]);

    const revenue = bookingStats[0]?.totalRevenue || 0;
    const paidAmount = bookingStats[0]?.totalDeposit || 0;
    const activeRoomsCount = currentSpaces.filter(s => s.Status === 'available').length;

    // 5. Xử lý sơ đồ phòng Live hôm nay
    const nowRealTime = new Date();
    const startOfDay = new Date(new Date(nowRealTime).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(nowRealTime).setHours(23, 59, 59, 999));

    const activeBookingsToday = await Booking.find({
      ...bookingMatchCondition,
      Status: { $in: ['confirmed', 'pending', 'in-use'] },
      StartTime: { $lte: endOfDay },
      EndTime: { $gte: startOfDay }
    }).lean();

    const liveFloorPlan = currentSpaces.map(space => {
      const spaceIdStr = space._id.toString();
      const bookingMatch = activeBookingsToday.find(b => (b.SpaceID || b.spaceID)?.toString() === spaceIdStr);

      let liveStatus = space.Status === 'maintenance' ? 'maintenance' : 'available';
      if (liveStatus !== 'maintenance' && bookingMatch) {
        liveStatus = bookingMatch.StartTime <= nowRealTime && bookingMatch.EndTime >= nowRealTime ? 'occupied' : 'upcoming';
      }
      return { SpaceCode: space.SpaceCode || space.spaceCode, LiveStatus: liveStatus };
    });

    // 6. Đơn đặt phòng gần nhất
    const recentBookings = await Booking.find(hostQuery)
      .populate('CustomerID', 'fullName FullName Email email')
      .populate('SpaceID', 'SpaceCode spaceCode Name name')
      .sort({ createdAt: -1 }).limit(5).lean();

    // 7. Thống kê biểu đồ 7 ngày qua
    const sevenDaysAgo = new Date(new Date().setHours(0, 0, 0, 0));
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const chartDataRaw = await Booking.aggregate([
      { $match: { ...bookingMatchCondition, Status: { $ne: 'cancelled' }, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, revenue: { $sum: "$TotalAmount" } } },
      { $sort: { "_id": 1 } }
    ]);

    const chartData = { labels: [], bookings: [], revenue: [] };
    for (let i = 0; i <= 6; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const found = chartDataRaw.find(item => item._id === dateString);

      chartData.labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      chartData.bookings.push(found ? found.count : 0);
      chartData.revenue.push(found ? found.revenue : 0);
    }

    return res.json({
      branches,
      stats: { revenue, totalBookings, totalOccupiedGuests, activeRoomsCount, paidAmount, pendingAmount: 0 },
      liveFloorPlan,
      recentBookings,
      chartData
    });
  } catch (error) {
    console.error("Lỗi getDashboardStatsAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi tải số liệu thống kê!' });
  }
}

// ==========================================
// HỒ SƠ HOST (PROFILE API)
// ==========================================
async function getProfileAPI(req, res) {
  try {
    const hostId = getHostIdFromToken(req);
    if (!hostId) return res.status(401).json({ error: 'Không tìm thấy Token xác thực.' });

    const user = await User.findById(hostId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản Host này.' });

    const profile = await HostProfile.findOneAndUpdate(
      { UserID: hostId },
      { $setOnInsert: { CompanyName: 'Chưa cập nhật', Hotline: 'Chưa cập nhật', TaxCode: 'Chưa cập nhật', BankName: 'Chưa cập nhật', BankNumber: 'Chưa cập nhật', Logo: '' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return res.json({
      user: { FullName: user.fullName || user.FullName || 'Chưa cập nhật', Email: user.email || user.Email || '', _id: user._id },
      profile: { CompanyName: profile.CompanyName, Hotline: profile.Hotline, TaxCode: profile.TaxCode, BankName: profile.BankName, BankNumber: profile.BankNumber, Logo: profile.Logo }
    });
  } catch (error) {
    console.error("Lỗi getProfileAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi lấy thông tin hồ sơ.' });
  }
}

async function updateProfileAPI(req, res) {
  try {
    const hostId = getHostIdFromToken(req);
    const { FullName, CompanyName, Hotline, TaxCode, BankName, BankNumber } = req.body;

    if (FullName?.trim()) {
      await User.findByIdAndUpdate(hostId, { fullName: FullName.trim(), FullName: FullName.trim() });
    }

    let updateData = { CompanyName, Hotline, TaxCode, BankName, BankNumber };
    if (req.file) {
      updateData.Logo = req.file.path;
    }

    await HostProfile.findOneAndUpdate({ UserID: hostId }, updateData, { returnDocument: 'after', upsert: true, runValidators: true });
    return res.json({ success: true, message: 'Đã cập nhật hồ sơ thành công!' });
  } catch (error) {
    console.error("❌ Lỗi updateProfileAPI:", error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật hồ sơ' });
  }
}

// ==========================================
// QUẢN LÝ CHI NHÁNH & PHÒNG
// ==========================================
async function getHostBranches(req, res) {
  try {
    const hostId = getHostIdFromToken(req);
    const branches = await Branch.find({ $or: [{ HostID: hostId }, { hostID: hostId }] }).lean();
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostSpaces(req, res) {
  try {
    const hostId = getHostIdFromToken(req);
    const branches = await Branch.find({ $or: [{ HostID: hostId }, { hostID: hostId }] }).select('_id').lean();
    const branchIds = branches.map(b => b._id);

    const spaces = await Space.find({ $or: [{ BranchID: { $in: branchIds } }, { branchID: { $in: branchIds } }] }).lean();
    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostBookings(req, res) {
  try {
    const currentTime = new Date();
    // Tối ưu cập nhật tự động phòng hết hạn
    await Booking.updateMany(
      { $or: [{ Status: 'in-use' }, { status: 'in-use' }], $or: [{ EndTime: { $lt: currentTime } }, { endTime: { $lt: currentTime } }] },
      { $set: { Status: 'completed', status: 'completed' } }
    );

    const hostId = getHostIdFromToken(req);
    
    // Sử dụng lớp bảo vệ populate của HEAD
    const bookings = await Booking.find({ $or: [{ HostID: hostId }, { hostID: hostId }] })
      .populate({ path: 'CustomerID', select: 'email Email FullName fullName', strictPopulate: false })
      .populate({
        path: 'SpaceID',
        select: 'Name name SpaceName spaceName SpaceCode Space_Code space_code Space_code SpaceCode_code code spaceCode spaceCode',
        populate: { path: 'BranchID', select: 'Name name' }
      })
      .sort({ createdAt: -1 }).lean();

    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// CÁC HÀNH ĐỘNG XỬ LÝ ĐƠN (XÁC NHẬN - CHECKIN - HỦY)
// ==========================================
async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    if ((booking.Status || booking.status) !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng này không ở trạng thái chờ xác nhận.' });
    }

    await Booking.updateOne({ _id: bookingId }, { $set: { Status: 'confirmed', status: 'confirmed' } });

    const total = booking.TotalAmount || booking.totalAmount || 0;
    const deposit = booking.DepositAmount || 0;
    const amountReceived = booking.percentagePaid !== undefined ? (total * booking.percentagePaid) / 100 : deposit;
    const paymentType = (booking.percentagePaid === 100 || deposit >= total) ? 'full_payment' : 'deposit';

    try {
      await PaymentHistory.create({
        BookingID: booking._id,
        CustomerID: booking.CustomerID || booking.customerID,
        HostID: booking.HostID || booking.hostID,
        TransactionCode: `TXN-CONFIRM-${Math.floor(100000 + Math.random() * 900000)}`,
        Amount: amountReceived,
        PaymentType: paymentType,
        PaymentMethod: 'bank_transfer',
        Status: 'successful'
      });
    } catch (pErr) {
      console.warn('⚠️ Lịch sử thanh toán lỗi không nghiêm trọng:', pErr.message);
    }

    emitBookingUpdate(bookingId, 'confirmed');
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

    if ((booking.Status || booking.status) !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể nhận phòng với đơn đã được xác nhận.' });
    }

    const total = Number(booking.TotalAmount || booking.totalAmount || 0);
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'in-use', status: 'in-use', DepositAmount: total, depositAmount: total, percentagePaid: 100 } }
    );

    emitBookingUpdate(bookingId, 'in-use');
    return res.status(200).json({ message: 'Nhận phòng thành công. Hệ thống đã ghi nhận đủ 100% tiền!' });
  } catch (error) {
    console.error("LỖI CHECK-IN:", error);
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

    await Booking.updateOne({ _id: bookingId }, { $set: { Status: 'cancelled', status: 'cancelled' } });
    emitBookingUpdate(bookingId, 'cancelled');

    return res.status(200).json({ message: 'Đã hủy đơn hàng thành công.' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// XUẤT MODULE
// ==========================================
module.exports = {
  renderDashboardView,
  getDashboardStatsAPI,
  getProfileAPI,
  updateProfileAPI,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  confirmBooking,
  checkinBooking,
  cancelBooking
};