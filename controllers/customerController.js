const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const Space = require('../models/Space'); // Đảm bảo đã import Model Space
const mongoose = require('mongoose');

// Hàm bổ trợ gửi thông báo lỗi hệ thống nhanh
function sendServerError(res, error) {
  console.error("🔴 Lỗi Hệ Thống Backend:", error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// 1. LẤY THÔNG TIN HỒ SƠ KHÁCH HÀNG
async function getCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const profile = await CustomerProfile.findOne({ userID: userId }).lean();
    const user = await User.findById(userId).select('-passwordHash').lean();
    
    if (!user) return res.status(404).json({ error: 'Người dùng không tìm thấy.' });
    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// 2. CẬP NHẬT HỒ SƠ KHÁCH HÀNG
async function updateCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    const update = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

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

// 3. LẤY LỊCH SỬ THANH TOÁN (ĐÃ TỐI ƯU HÓA)
async function getCustomerBookings(req, res) {
  try {
    const mockUserId = "65ecef123456789012345678"; 
    const { branchKeyword, startDate, statusFilter } = req.query;

    // Lấy toàn bộ danh sách chi nhánh để hiển thị trong ô tìm kiếm
    const allSpaces = await Space.find({}).select('name').lean();

    let query = { CustomerID: new mongoose.Types.ObjectId(mockUserId) };

    // Xử lý bộ lọc Trạng thái
    if (statusFilter && statusFilter !== 'Tất cả') {
      if (statusFilter === 'Thành công') query.Status = 'confirmed';
      if (statusFilter === 'Thất bại') query.Status = 'cancelled';
    } else {
      query.Status = { $in: ['confirmed', 'cancelled', 'completed'] };
    }

    // Xử lý bộ lọc Thời gian
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfDay };
    }

    // Truy vấn Booking và populate Space
    let bookings = await Booking.find(query)
      .populate({ path: 'SpaceID', select: 'name' })
      .sort({ createdAt: -1 }) 
      .lean();

    // Lọc theo chi nhánh (nếu có)
    if (branchKeyword) {
      bookings = bookings.filter(item => 
        item.SpaceID && item.SpaceID.name === branchKeyword
      );
    }

    return res.render('customer/payment_history', { 
      bookings: bookings || [], 
      allSpaces: allSpaces, // Truyền danh sách chi nhánh sang EJS
      filters: { 
        branchKeyword: branchKeyword || '', 
        startDate: startDate || '', 
        statusFilter: statusFilter || 'Tất cả' 
      },
      userId: mockUserId,
      scripts: '<script src="/js/customer-main.js"></script>' 
    });

  } catch (error) {
    console.error("🔴 Lỗi Hệ Thống Backend:", error);
    return res.status(500).send("Đã xảy ra lỗi khi kết nối database.");
  }
}

async function confirmPayment(req, res) {
  try {
    const { userId } = req.params;
    const { spaceId, hostId, startTime, endTime, totalAmount, paymentType, isSuccess } = req.body;

    const total = Number(totalAmount || 500000);
    const deposit = paymentType === 'deposit' ? (total * 0.3) : total;

    const newBooking = new Booking({
      CustomerID: new mongoose.Types.ObjectId(userId || "65ecef123456789012345678"),
      SpaceID: new mongoose.Types.ObjectId(spaceId),
      HostID: new mongoose.Types.ObjectId(hostId),
      StartTime: new Date(startTime || Date.now()),
      EndTime: new Date(endTime || new Date(Date.now() + 3*60*60*1000)),
      TotalAmount: total,
      DepositAmount: deposit,
      Status: isSuccess ? 'confirmed' : 'cancelled',
      Note: paymentType === 'deposit' ? 'Tiền cọc (30%)' : 'Toàn bộ (100%)'
    });

    await newBooking.save();
    return res.status(200).json({ success: true, message: '🎉 Giao dịch đã được lưu!' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  confirmPayment
};