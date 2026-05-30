const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/PaymentHistory');

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

// Thêm Model PaymentHistory nếu chưa có ở đầu file
const PaymentHistory = require('../models/PaymentHistory');

// ... Các hàm cũ (getHostProfile, getHostBranches...) GIỮ NGUYÊN ...

// Cập nhật hàm dashboard xử lý Render View trực tiếp
async function getDashboard(req, res, next) {
  try {
    // 1. Lấy hostId (Tạm thời fix cứng một ID có sẵn trong DB để test)
    // Sau này làm Login xong thì thay bằng: const hostId = req.user._id;
    const hostId = "6630f9a2e12a450012345678";

    // 2. Query Database thông qua các Model (M)
    const branches = await Branch.find({ HostID: hostId }).select('_id Name').lean();
    const branchIds = branches.map(b => b._id);

    const spaces = await Space.find({ BranchID: { $in: branchIds } }).select('_id Name SpaceCode Status').lean();
    const spaceIds = spaces.map(s => s._id);

    // Tính toán doanh thu thực nhận (successful)
    const payments = await PaymentHistory.find({ HostID: hostId, Status: 'successful' }).lean();
    const totalRevenue = payments.reduce((sum, p) => sum + p.Amount, 0);

    // Tính toán doanh thu đang chờ (pending)
    const pendingPayments = await PaymentHistory.find({ HostID: hostId, Status: 'pending' }).lean();
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.Amount, 0);

    // Tính tổng số booking và lượng khách duy nhất
    const allBookings = await Booking.find({ SpaceID: { $in: spaceIds } }).lean();
    const totalBookings = allBookings.length;
    const uniqueCustomers = [...new Set(allBookings.map(b => b.CustomerID.toString()))].length;

    // Tính số phòng đang hoạt động
    const activeSpacesCount = spaces.filter(s => s.Status === 'available').length;

    // Sơ đồ phòng live tại thời điểm hiện tại
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

    // Lấy 5 booking gần nhất
    const recentBookings = await Booking.find({ SpaceID: { $in: spaceIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'SpaceID', select: 'Name SpaceCode' })
      .lean();

    // 3. Đổ dữ liệu vào View (V) và render ra trình duyệt
    return res.render('host/dashboard', {
      data: {
        branches,
        stats: { totalRevenue, totalPending, totalBookings, uniqueCustomers, activeSpacesCount },
        liveFloorPlan,
        recentBookings
      },
      scripts: '<script src="/js/host-spaces.js"></script>'
    });

  } catch (error) {
    console.error("Lỗi khi tải trang Dashboard Host:", error);
    next(error); // Chuyển lỗi về app.js xử lý
  }
}

// Xuất hàm mới này ra ngoài
module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  getDashboard  }