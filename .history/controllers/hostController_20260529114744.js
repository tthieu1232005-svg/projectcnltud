const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');

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

async function getDashboard(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    // 1. LẤY THÔNG TIN PROFILE HOST (Sửa lỗi chí mạng hostProfile bị thiếu)
    const hostProfile = await HostProfile.findOne({ userID: hostId }).lean();

    // 2. LẤY DANH SÁCH CHI NHÁNH VÀ KHÔNG GIAN
    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ branchID: { $in: branchIds } }).lean();
    const spaceIds = spaces.map(space => space._id);

    // 3. TÍNH TOÁN CÁC SỐ LIỆU THỐNG KÊ
    const totalSpaces = spaces.length;
    const totalBookings = await Booking.countDocuments({ spaceID: { $in: spaceIds } });

    // TÍNH LƯỢT KHÁCH THỰC TẾ (Đếm số lượng khách hàng độc nhất không trùng lặp)
    const uniqueCustomers = await Booking.distinct('customerID', { spaceID: { $in: spaceIds } });
    const totalGuests = uniqueCustomers.length;

    // DOANH THU (Dùng Aggregation để tính tổng)
    const revenueData = await Booking.aggregate([
      { $match: { spaceID: { $in: spaceIds } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // 4. BOOKING GẦN NHẤT (Lấy 5 cái mới nhất)
    const recentBookings = await Booking.find({ spaceID: { $in: spaceIds } })
      .populate('customerID', 'name')    // Lấy tên khách hàng từ bảng User
      .populate('spaceID', 'spaceCode') // SỬA THÀNH spaceCode cho khớp với DB của fen nha!
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 5. TRẢ DỮ LIỆU RA GIAO DIỆN (EJS)
    return res.render('host/dashboard', {
      layout: 'layout',
      title: 'Bảng điều hành WorkHub',
      currentRole: 'host',              // Phân quyền "Chính phái" để mở khóa Sidebar tự động
      hostInfo: hostProfile,            // Bây giờ đã có dữ liệu thật từ DB, hết lỗi nhé!
      hostId: hostId,
      totalBookings: totalBookings,
      totalSpaces: totalSpaces,
      totalRevenue: totalRevenue,
      receivedRevenue: totalRevenue,
      pendingRevenue: 0,
      totalGuests: totalGuests,         // Gửi tổng số lượt khách thực tế sang EJS
      recentBookings: recentBookings,
      liveSpaces: spaces,
      scripts: '<script src="/js/host-spaces.js"></script>'
    });

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