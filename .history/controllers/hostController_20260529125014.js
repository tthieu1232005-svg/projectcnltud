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

const mongoose = require('mongoose'); // Đảm bảo đã có dòng này ở đầu file controller

async function getDashboard(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) {
      return res.status(400).json({ error: 'Thiếu hostId.' });
    }

    // 1. Lấy thông tin profile host
    const hostProfile = await HostProfile.findOne({ userID: hostId }).lean() || { name: 'Chủ cơ sở mới' };

    // 2. Lấy danh sách chi nhánh và không gian
    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);

    const spaces = await Space.find({ branchID: { $in: branchIds } }).lean();
    // Đảm bảo lấy đúng mảng các ObjectId để đem đi Aggregate
    const spaceIds = spaces.map(space => space._id);

    // 3. Tính toán số liệu thống kê cơ bản
    const totalSpaces = spaces.length || 0;
    const totalBookings = await Booking.countDocuments({ spaceID: { $in: spaceIds } }) || 0;

    // Tính lượt khách thực tế (Số lượng khách hàng không trùng nhau)
    const uniqueCustomers = await Booking.distinct('customerID', { spaceID: { $in: spaceIds } });
    const totalGuests = uniqueCustomers.length || 0;

    // Tính Doanh thu bằng Aggregate
    let totalRevenue = 0;
    if (spaceIds.length > 0) {
      const revenueData = await Booking.aggregate([
        { $match: { spaceID: { $in: spaceIds } } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
      ]);
      totalRevenue = (revenueData.length > 0 && revenueData[0].totalRevenue) ? revenueData[0].totalRevenue : 0;
    }

module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  getDashboard
};