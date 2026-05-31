const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const Space = require('../models/Space'); // Đảm bảo đã import Model Space
const mongoose = require('mongoose');
const PaymentHistory = require('../models/Payment_History'); // Thêm model để ghi nhận thanh toán lần 2

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
    const bookings = await Booking.find({ customerID: userId })
      .populate('spaceID', 'name') // Lấy thêm tên phòng để hiển thị ra lịch sử
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

// ==========================================
// CÁC HÀM HÀNH ĐỘNG MỚI BỔ SUNG CHO CUSTOMER
// ==========================================

/**
 * Khách hàng tạo đơn đặt chỗ mới (Trạng thái mặc định: pending)
 */
async function createBooking(req, res) {
  try {
    const { userId } = req.params;
    const { spaceID, startTime, endTime, totalAmount } = req.body;

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!spaceID || !startTime || !endTime || totalAmount === undefined) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đặt chỗ.' });
    }

    // Tạo đơn hàng mới
    const newBooking = await Booking.create({
      customerID: userId,
      spaceID,
      startTime,
      endTime,
      totalAmount,
      status: 'pending', // Đơn mới luôn ở trạng thái chờ thanh toán cọc/xác nhận
      percentagePaid: 0,
      CreatedAt: new Date() // Truyền tay để vượt qua validation "required: true" ở Model Booking.js
    });

    return res.status(201).json({ 
      message: 'Tạo đơn đặt chỗ thành công. Vui lòng chờ Host xác nhận.', 
      booking: newBooking 
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

/**
 * Khách hàng tự hủy đơn khi đơn vẫn đang ở trạng thái pending
 */
async function cancelBooking(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, customerID: userId });
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });
    }

    // Chỉ cho phép khách hủy nếu đơn chưa được Host xác nhận
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng đang trong trạng thái chờ.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    return res.json({ message: 'Bạn đã hủy đơn đặt chỗ thành công.', booking });
  } catch (error) {
    return sendServerError(res, error);
  }
}

/**
 * Khách hàng thanh toán phần tiền còn lại (Khi đến nhận phòng hoặc check-out)
 */
async function payRemainder(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, customerID: userId });
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    // Phải là đơn đã được confirm (đã cọc) thì mới có phần còn lại để trả
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Đơn hàng này chưa được xác nhận, không thể thanh toán tiếp.' });
    }

    // Nếu đã trả 100% rồi thì chặn lại
    if (booking.percentagePaid >= 100) {
      return res.status(400).json({ error: 'Đơn hàng này đã được thanh toán đầy đủ.' });
    }

    // Tính toán số tiền còn lại phải trả
    const remainingAmount = booking.totalAmount * (1 - booking.percentagePaid / 100);

    // Cập nhật trạng thái thanh toán của Booking lên 100%
    booking.percentagePaid = 100;
    // Tùy luồng nghiệp vụ, nếu check-out luôn thì bạn có thể set: booking.status = 'completed';
    await booking.save();

    // Ghi nhận bản ghi thanh toán thứ 2 vào lịch sử
    const payment = await PaymentHistory.create({
      bookingID: booking._id,
      amount: remainingAmount,
      paymentType: 'full_payment', // Thanh toán nốt
      paymentMethod: req.body.paymentMethod || 'cash', // Mặc định là khách trả tiền mặt tại quầy, hoặc lấy từ request
      status: 'successful'
    });

    return res.json({ 
      message: 'Thanh toán phần còn lại thành công.', 
      booking, 
      payment 
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  confirmPayment,
  createBooking,  // Export hàm mới
  cancelBooking,  // Export hàm mới
  payRemainder    // Export hàm mới
};