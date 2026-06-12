const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');
const Review = require('../models/Review');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const profile = await CustomerProfile.findOne({ UserID: userId }).lean(); // Cập nhật UserID
    const user = await User.findById(userId).select('-PasswordHash').lean(); // Cập nhật PasswordHash
    if (!user) return res.status(404).json({ error: 'Người dùng không tìm thấy.' });

    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    const update = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const profile = await CustomerProfile.findOneAndUpdate(
      { UserID: userId }, // Cập nhật UserID
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật hồ sơ thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// === CẬP NHẬT TRONG FILE customerController.js ===
async function getCustomerBookings(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    // SỬA Ở ĐÂY: Thêm populate lồng nhau (Nested Populate) để lấy được Branch (Địa chỉ, Hotline)
    const bookings = await Booking.find({ CustomerID: userId })
      .populate({
        path: 'SpaceID',
        select: 'Name Images SpaceCode BranchID',
        populate: { path: 'BranchID', select: 'Name Address Hotline' } // Lấy thông tin cơ sở
      })
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const reviews = await Review.find({ BookingID: { $in: bookingIds } }).lean();
    const reviewMap = {};
    reviews.forEach(r => reviewMap[r.BookingID.toString()] = r);

    const now = new Date();
    
    const result = bookings.map(b => {
       const review = reviewMap[b._id.toString()];
       let canReview = false;
       let canEditReview = false;
       
       if (b.Status === 'completed' || b.status === 'completed') {
           if (!review) {
               canReview = true;
           } else {
               const daysSinceReview = (now - new Date(review.createdAt)) / (1000 * 3600 * 24);
               if (daysSinceReview <= 7) canEditReview = true;
           }
       }
       return { ...b, ReviewData: review, canReview, canEditReview };
    });

    return res.json({ bookings: result });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// 2. Thêm hàm mới: submitReview
async function submitReview(req, res) {
  try {
    const { userId, bookingId } = req.params;
    const { rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
    if (!booking || booking.Status !== 'completed') {
      return res.status(400).json({ error: 'Đơn hàng không hợp lệ hoặc chưa hoàn tất.' });
    }

    let review = await Review.findOne({ BookingID: bookingId });

    if (review) {
      // Sửa đánh giá (Kiểm tra 7 ngày)
      const daysSinceReview = (new Date() - new Date(review.createdAt)) / (1000 * 3600 * 24);
      if (daysSinceReview > 7) {
        return res.status(400).json({ error: 'Đã quá 7 ngày, bạn không thể chỉnh sửa đánh giá.' });
      }
      review.Rating = rating;
      review.Comment = comment;
      await review.save();
      return res.json({ message: 'Cập nhật đánh giá thành công!', review });
    } else {
      // Viết đánh giá mới
      review = await Review.create({
        SpaceID: booking.SpaceID,
        CustomerID: userId,
        BookingID: bookingId,
        Rating: rating,
        Comment: comment
      });
      return res.json({ message: 'Cảm ơn bạn đã đánh giá!', review });
    }
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function createBooking(req, res) {
  try {
    const { userId } = req.params;
    // Tạm giả định hostId được gửi lên từ client khi đặt phòng
    const { spaceID, hostId, startTime, endTime, totalAmount } = req.body;

    if (!spaceID || !hostId || !startTime || !endTime || totalAmount === undefined) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đặt chỗ.' });
    }

    // Đổi toàn bộ key sang PascalCase để khớp với nhánh main
    const newBooking = await Booking.create({
      CustomerID: userId,
      SpaceID: spaceID,
      HostID: hostId,
      StartTime: startTime,
      EndTime: endTime,
      TotalAmount: totalAmount,
      DepositAmount: 0, // Thay thế cho percentagePaid
      Status: 'pending'
    });

    return res.status(201).json({ message: 'Tạo đơn đặt chỗ thành công.', booking: newBooking });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function cancelBooking(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });

    if (booking.Status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng đang trong trạng thái chờ.' });
    }

    booking.Status = 'cancelled';
    await booking.save();

    return res.json({ message: 'Bạn đã hủy đơn đặt chỗ thành công.', booking });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function payRemainder(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    if (booking.Status !== 'confirmed') {
      return res.status(400).json({ error: 'Đơn hàng chưa được xác nhận.' });
    }

    // Logic mới: Kiểm tra nếu Tiền cọc đã bằng Tổng tiền thì chặn
    if (booking.DepositAmount >= booking.TotalAmount) {
      return res.status(400).json({ error: 'Đơn hàng này đã được thanh toán đầy đủ.' });
    }

    const remainingAmount = booking.TotalAmount - booking.DepositAmount;
    
    // Cập nhật tiền đã trả bằng tổng tiền
    booking.DepositAmount = booking.TotalAmount;
    await booking.save();

    const payment = await PaymentHistory.create({
      bookingID: booking._id,
      amount: remainingAmount,
      paymentType: 'full_payment',
      paymentMethod: req.body.paymentMethod || 'cash',
      status: 'successful'
    });

    return res.json({ message: 'Thanh toán phần còn lại thành công.', booking, payment });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  createBooking,
  cancelBooking,
  payRemainder,
  submitReview
};