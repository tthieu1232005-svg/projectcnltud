const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// Hàm hỗ trợ lấy hostId an toàn (Từ Token JWT hoặc từ URL) và ép kiểu ObjectId
function getValidHostId(req) {
  const id = (req.user && req.user.userId) ? req.user.userId : req.params.hostId;
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id.toString());
  } catch (error) {
    return null;
  }
}

async function getHostProfile(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hoặc sai định dạng hostId.' });

    // Sửa thành UserID
    const profile = await HostProfile.findOne({ UserID: objectIdHost }).lean();
    if (!profile) return res.status(404).json({ error: 'Hồ sơ chủ cơ sở không tìm thấy.' });

    return res.json({ profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateHostProfile(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hostId.' });

    const update = req.body;
    const profile = await HostProfile.findOneAndUpdate(
      { UserID: objectIdHost }, // Sửa thành UserID
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostBranches(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hostId.' });

    // Sửa thành HostID
    const branches = await Branch.find({ HostID: objectIdHost }).lean();
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostSpaces(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hostId.' });

    // Sửa thành HostID và BranchID
    const branches = await Branch.find({ HostID: objectIdHost }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ BranchID: { $in: branchIds } }).lean();

    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostBookings(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hostId.' });

    // Sửa thành HostID, BranchID, SpaceID
    const branches = await Branch.find({ HostID: objectIdHost }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ BranchID: { $in: branchIds } }).select('_id').lean();
    const spaceIds = spaces.map(space => space._id);

    const bookings = await Booking.find({ SpaceID: { $in: spaceIds } }).sort({ createdAt: -1 }).lean();
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getDashboard(req, res) {
  try {
    const objectIdHost = getValidHostId(req);
    if (!objectIdHost) return res.status(400).json({ error: 'Thiếu hostId hoặc chưa đăng nhập.' });

    // 1. LẤY THÔNG TIN PROFILE HOST (Truy vấn theo UserID)
    const hostProfile = await HostProfile.findOne({ UserID: objectIdHost }).lean() || { name: 'Chủ cơ sở' };

    // 2. LẤY DANH SÁCH CHI NHÁNH VÀ KHÔNG GIAN
    const branches = await Branch.find({ HostID: objectIdHost }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);

    const spaces = await Space.find({ BranchID: { $in: branchIds } }).lean();
    const spaceIds = spaces.map(space => space._id);

    // 3. TÍNH TOÁN CÁC SỐ LIỆU THỐNG KÊ
    const totalSpaces = spaces.length;
    const totalBookings = await Booking.countDocuments({ SpaceID: { $in: spaceIds } });

    // TÍNH LƯỢT KHÁCH THỰC TẾ
    const uniqueCustomers = await Booking.distinct('CustomerID', { SpaceID: { $in: spaceIds } });
    const totalGuests = uniqueCustomers.length;

    // DOANH THU THỰC NHẬN (Lấy các booking đã hoàn thành hoặc đang dùng)
    const spaceObjectIds = spaceIds.map(id => new mongoose.Types.ObjectId(id.toString()));
    const revenueData = await Booking.aggregate([
      {
        $match: {
          SpaceID: { $in: spaceObjectIds },
          Status: { $in: ["Hoàn thành", "Đang sử dụng"] }
        }
      },
      { $group: { _id: null, totalRevenue: { $sum: "$TotalAmount" } } }
    ]);
    const receivedRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // DOANH THU ĐANG CHỜ (Các booking Đã đặt chỗ)
    const pendingData = await Booking.aggregate([
      {
        $match: {
          SpaceID: { $in: spaceObjectIds },
          Status: "Đã đặt chỗ"
        }
      },
      { $group: { _id: null, pendingRevenue: { $sum: "$TotalAmount" } } }
    ]);
    const pendingRevenue = pendingData.length > 0 ? pendingData[0].pendingRevenue : 0;
    const totalRevenue = receivedRevenue + pendingRevenue;

    // 4. BOOKING GẦN NHẤT 
    const recentBookings = await Booking.find({ SpaceID: { $in: spaceIds } })
      .populate('CustomerID', 'FullName') // Sửa thành FullName
      .populate('SpaceID', 'SpaceCode')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 5. TRẢ DỮ LIỆU RA GIAO DIỆN (EJS)
    return res.render('host/dashboard', {
      layout: 'layout',
      title: 'Bảng điều hành WorkHub',
      currentRole: 'host',
      hostInfo: hostProfile,
      hostId: req.user ? req.user.userId : req.params.hostId, // Truyền ID an toàn
      totalBookings: totalBookings,
      totalSpaces: totalSpaces,
      totalRevenue: totalRevenue,
      receivedRevenue: receivedRevenue,
      pendingRevenue: pendingRevenue, // Đã hết bị hardcode số 0
      totalGuests: totalGuests,
      recentBookings: recentBookings,
      liveSpaces: spaces,
      scripts: ['host-spaces.js']
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
  getHostBookings,
  getDashboard
};