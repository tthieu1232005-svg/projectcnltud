const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History'); // Thêm model để ghi nhận thanh toán lần 2

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
      .populate('spaceID', 'name') // Lấy thêm tên phòng để hiển thị ra lịch sử
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ bookings });
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
  createBooking,  // Export hàm mới
  cancelBooking,  // Export hàm mới
  payRemainder    // Export hàm mới
};