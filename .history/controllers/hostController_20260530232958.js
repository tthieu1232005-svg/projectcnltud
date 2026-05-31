const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    const profile = await HostProfile.findOne({ userID: hostId }).lean();
    if (!profile) {
      return res.status(404).json({ error: 'Hồ sơ chủ cơ sở không tìm thấy.' });
    }

    return res.json({ profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    const update = req.body;
    const profile = await HostProfile.findOneAndUpdate(
      { userID: hostId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật hồ sơ chủ cơ sở thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

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

// 2. Hàm API xử lý tính toán số liệu thật từ MongoDB Compass
async function getHostDashboardData(req, res, next) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ status: 'error', message: 'Thiếu thông tin hostId.' });
    }

    
    // Lấy chi nhánh và phòng
    const branches = await Branch.find({ HostID: hostId }).select('_id Name').lean();
    const branchIds = branches.map(b => b._id);
    const spaces = await Space.find({ BranchID: { $in: branchIds } }).select('_id Name SpaceCode Status').lean();
    const spaceIds = spaces.map(s => s._id);

    // Tính toán tài chính từ Payment_History
    const successfulPayments = await PaymentHistory.find({ HostID: hostId, Status: 'successful' }).lean();
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.Amount, 0);

    const pendingPayments = await PaymentHistory.find({ HostID: hostId, Status: 'pending' }).lean();
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.Amount, 0);

    // Thống kê Booking & Khách hàng
    const allBookings = await Booking.find({ SpaceID: { $in: spaceIds } }).lean();
    const totalBookings = allBookings.length;
    const uniqueCustomers = [...new Set(allBookings.map(b => b.CustomerID.toString()))].length;
    const activeSpacesCount = spaces.filter(s => s.Status === 'available').length;

    // Xử lý sơ đồ trạng thái phòng Live
    const now = new Date();
    const activeBookings = await Booking.find({
      SpaceID: { $in: spaceIds },
      Status: 'confirmed',
      StartTime: { $lte: now },
      EndTime: { $gte: now }
    }).lean();

    const liveFloorPlan = spaces.map(space => {
      const isOccupied = activeBookings.some(b => b.SpaceID.toString() === space._id.toString());
      let currentStatus = 'available';
      if (space.Status === 'maintenance' || space.Status === 'inactive') {
        currentStatus = 'maintenance';
      } else if (isOccupied) {
        currentStatus = 'occupied';
      }
      return { code: space.SpaceCode, name: space.Name, status: currentStatus };
    });

    // Lấy 5 đơn đặt gần nhất
    const recentBookings = await Booking.find({ SpaceID: { $in: spaceIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'SpaceID', select: 'Name SpaceCode' })
      .populate({ path: 'CustomerID', select: 'FullName' })
      .lean();

    // Trả JSON về cho Client Fetch
    return res.json({
      branches,
      stats: { totalRevenue, totalPending, totalBookings, uniqueCustomers, activeSpacesCount },
      liveFloorPlan,
      recentBookings
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý tại HostDashboardController:', error);
    return res.status(500).json({ status: 'error', message: 'Lỗi đồng bộ dữ liệu MongoDB.' });
  }
}
// Xuất hàm mới này ra ngoài
// Cuối file controllers/hostController.js của bạn bắt buộc phải có đầy đủ như thế này:
module.exports = {
  getHostDashboardData,     // <-- Hàm render giao diện EJS gốc của bạn
 
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings
};