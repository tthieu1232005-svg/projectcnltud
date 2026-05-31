const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const profile = await CustomerProfile.findOne({ userID: userId }).lean();
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tìm thấy.' });
    }

    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    const update = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const profile = await CustomerProfile.findOneAndUpdate(
      { userID: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật hồ sơ thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getCustomerBookings(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const bookings = await Booking.find({ customerID: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings
};