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

async function getHostDashboardData(req, res) {
  try {
    // 1. Lấy HostID (Ở đây giả định lấy từ session hoặc req.params. Hiện tại lấy tạm từ query/params để test)
    // Khi bạn làm phần Đăng nhập (Auth), nó sẽ là req.user._id
    const hostId = req.params.hostId || req.query.hostId;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu thông tin Host ID.' });
    }

    // 2. Lấy danh sách Chi nhánh và Phòng của Host này để tính toán chéo
    const branches = await Branch.find({ HostID: hostId }).select('_id Name').lean();
    const branchIds = branches.map(b => b._id);

    const spaces = await Space.find({ BranchID: { $in: branchIds } }).select('_id Name SpaceCode Status').lean();
    const spaceIds = spaces.map(s => s._id);

    // 3. THỐNG KÊ 1: Tính Doanh thu thực nhận từ lịch sử thanh toán thành công
    const payments = await PaymentHistory.find({
      HostID: hostId,
      Status: 'successful'
    }).lean();
    const totalRevenue = payments.reduce((sum, p) => sum + p.Amount, 0);

    // Thống kê doanh thu chi tiết (Đã nhận vs Đang chờ)
    const pendingPayments = await PaymentHistory.find({
      HostID: hostId,
      Status: 'pending'
    }).lean();
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.Amount, 0);

    // 4. THỐNG KÊ 2 & 3: Tổng số lượng Booking và Tổng lượt khách (Customer) của Host này
    const allBookings = await Booking.find({ SpaceID: { $in: spaceIds } }).lean();
    const totalBookings = allBookings.length;

    // Đếm số lượng khách hàng duy nhất (không trùng lặp) đã đặt phòng
    const uniqueCustomers = [...new Set(allBookings.map(b => b.CustomerID.toString()))].length;

    // 5. THỐNG KÊ 4: Số chỗ hoạt động (Tổng số Space có trạng thái 'available')
    const activeSpacesCount = spaces.filter(s => s.Status === 'available').length;

    // 6. THỐNG KÊ 5: Sơ đồ phòng Live (Trạng thái thực tế)
    // Ghép trạng thái từ các Booking đang diễn ra ngay tại thời điểm hiện tại
    const now = new Date();
    const activeBookings = await Booking.find({
      SpaceID: { $in: spaceIds },
      Status: 'confirmed',
      StartTime: { $lte: now },
      EndTime: { $gte: now }
    }).lean();

    const liveFloorPlan = spaces.map(space => {
      // Tìm xem không gian này có đang được sử dụng hay không
      const isOccupied = activeBookings.some(b => b.SpaceID.toString() === space._id.toString());

      let currentStatus = 'available'; // Mặc định: Đang trống (emerald)
      if (space.Status === 'maintenance' || space.Status === 'inactive') {
        currentStatus = 'maintenance';
      } else if (isOccupied) {
        currentStatus = 'occupied'; // Đang sử dụng (red)
      }

      return {
        code: space.SpaceCode,
        name: space.Name,
        status: currentStatus
      };
    });

    // 7. THỐNG KÊ 6: Lấy 5 Booking gần đây nhất (Populate để lấy thông tin Tên phòng)
    const recentBookings = await Booking.find({ SpaceID: { $in: spaceIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'SpaceID', select: 'Name SpaceCode' })
      .lean();

    // 8. Gom tất cả dữ liệu lại để trả về
    return {
      branches,
      stats: {
        totalRevenue,
        totalPending,
        totalBookings,
        uniqueCustomers,
        activeSpacesCount
      },
      liveFloorPlan,
      recentBookings
    };

  } catch (error) {
    console.error("Lỗi lấy dữ liệu dashboard:", error);
    throw error;
  }
}

// Export thêm hàm này ra ngoài
module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  getHostDashboardData  
};