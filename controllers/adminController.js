const User = require('../models/User');
const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Space = require('../models/Space');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getAdminDashboard(req, res) {
  try {
    const [userCount, customerCount, hostCount, bookingCount, branchCount, spaceCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'host' }),
      Booking.countDocuments(),
      Branch.countDocuments(),
      Space.countDocuments()
    ]);

    return res.json({
      totals: {
        users: userCount,
        customers: customerCount,
        hosts: hostCount,
        bookings: bookingCount,
        branches: branchCount,
        spaces: spaceCount
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function listUsers(req, res) {
  try {
    const users = await User.find().select('-PasswordHash').lean(); // Lưu ý: PasswordHash viết hoa theo Model của bạn
    return res.json({ users });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Gom tất cả vào 1 module.exports duy nhất
module.exports = {
  getAdminDashboard,
  listUsers
};