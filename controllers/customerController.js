const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');
const Review = require('../models/Review');
const Branch = require('../models/Branch');
const Space = require('../models/Space');


function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// Trang chủ khách hàng
async function getHomePage(req, res) {
  try {
    // Lấy danh sách các cơ sở (Branch)
    const branches = await Branch.find({
      Status: 'active'
    }).lean();

    // Lấy danh sách các không gian (Space) cùng với thông tin cơ sở
    res.render('customer/home', { 
     branches,
     scripts: '<script src="/js/customer-main.js"></script>'
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Tìm kiếm cơ sở theo địa điểm.
async function searchBranches(req, res){
  try {
    const { location } = req.query;
    let query = { Status: 'active' };
    if (location && location.trim()) {
      query.$or = [
        { District: { $regex: location, $options: 'i'} },
        { City: { $regex: location, $options: 'i'} },
        { Name: { $regex: location, $options: 'i'} }
      ];
    }
    const branches = await Branch.find(query).lean();
    res.render('customer/search', { 
      branches, 
      keyword: location || "",
      scripts: '<script src="/js/customer-main.js"></script>' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Trang chi tiết cơ sở và không gian
async function detailPage(req, res) {
    try {
        const { branchId } = req.query;

        if (!branchId) {
            return res.status(400).send("Thiếu ID chi nhánh");
        }

        const branch = await Branch.findById(branchId).lean();
        if (!branch) {
            return res.status(404).send("Không tìm thấy chi nhánh");
        }

        const spaces = await Space.find({
            BranchID: branchId,
            Status: 'available'
        }).sort({ Category: 1, Name: 1 }).lean();

        res.render('customer/detail', {
            branch,
            spaces,
            scripts: '<script src="/js/customer-main.js"></script>'
        });

    } catch (error) {
        return sendServerError(res, error);
    }
}

// Lấy thông tin hồ sơ khách hàng
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

// Cập nhật hồ sơ khách hàng
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

// Lấy hồ sơ của chính mình (từ token, không cần userId param)
async function getMyProfile(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-PasswordHash').lean();
    if (!user) return res.status(404).json({ error: 'Người dùng không tìm thấy.' });

    const profile = await CustomerProfile.findOne({ UserID: userId }).lean();

    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Cập nhật hồ sơ của chính mình + upload avatar
async function updateMyProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { FullName, Phone, BankName, BankNumber } = req.body;

    if (FullName) {
      await User.findByIdAndUpdate(userId, { $set: { FullName } });
    }

    const updateData = {};
    if (Phone !== undefined) updateData.Phone = Phone;
    if (BankName !== undefined) updateData.BankName = BankName;
    if (BankNumber !== undefined) updateData.BankNumber = BankNumber;

    if (req.file) {
      updateData.Avatar = req.file.path;
    }

    const profile = await CustomerProfile.findOneAndUpdate(
      { UserID: userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const user = await User.findById(userId).select('-PasswordHash').lean();

    return res.json({ message: 'Cập nhật hồ sơ thành công.', user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Lấy danh sach đặt chỗ của khách hàng
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
       
       if (b.Status === 'completed' ) {
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

// Tạo thêm hàm getReview, lấy đánh giá của một booking (nếu có) để hiển thị trên trang chi tiết đặt chỗ
async function getReview(req, res) {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({ BookingID: bookingId }).populate('CustomerID', 'FullName')
    .lean();
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá cho đơn hàng này.' });
    }

    return res.json({ review });
  } catch (error) {
    return sendServerError(res, error);
  }
}

//Lấy danh sách review theo branch
async function getBranchReviews(req, res) {
  try {
    const { branchId } = req.params;
    if (!branchId) return res.status(400).json({ error: 'Thiếu branchId.' });
 
    const spaces = await Space.find({ BranchID: branchId }).select('_id').lean();
    const spaceIds = spaces.map(s => s._id);
 
    if (spaceIds.length === 0) return res.json({ reviews: [] });
 
    const reviews = await Review.find({ SpaceID: { $in: spaceIds } })
      .sort({ createdAt: -1 })
      .populate('CustomerID', 'FullName')
      .lean();
 
    const formatted = reviews.map(r => ({
      _id: r._id,
      spaceId: r.SpaceID,
      customerId: r.CustomerID?._id,
      customerName: r.CustomerID?.FullName || '',
      rating: r.Rating,
      comment: r.Comment,
      createdAt: r.createdAt
    }));
 
    return res.json({ reviews: formatted });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Sửa createBooking
async function createBooking(req, res) {
  try {
    const { spaceId, startTime, endTime, paymentType } = req.body;

    if (!spaceId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Thiếu thông tin đặt chỗ' });
    }

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ error: 'Không tìm thấy phòng' });

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: 'Thời gian không hợp lệ' });
    }

    const conflict = await Booking.findOne({
      SpaceID: spaceId,
      Status: { $in: ['pending', 'confirmed'] },
      StartTime: { $lt: end },
      EndTime: { $gt: start }
    });
    if (conflict) return res.status(409).json({ error: 'Khung giờ đã có người đặt' });

    const hours = (end - start) / (1000 * 60 * 60);
    const total = hours * space.PricePerHour;
    const deposit = paymentType === 'full' ? total : (space.DepositAmount || Math.round(total * 0.3));

    const booking = await Booking.create({
      CustomerID: req.params.userId || req.user.userId, // Lấy userId từ token đã giải mã.
      SpaceID: spaceId,
      BranchID: space.BranchID,
      HostID: space.HostID,
      StartTime: start,
      EndTime: end,
      TotalAmount: total,
      DepositAmount: deposit,
      PaidAmount: 0,
      Status: 'pending',
      PaymentType: paymentType
    });

    return res.status(201).json({ message: 'Đặt chỗ thành công', booking });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Bỏ hàm cancelBooking vì khách hàng không thể hủy đơn.

// Xác nhận thanh toán.
async function confirmPayment(req, res) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Thiếu bookingId' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });

    if (booking.Status !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng không ở trạng thái chờ.' });
    }

    if (booking.PaidAmount > 0) {
      return res.status(400).json({ error: 'Đơn hàng đã được thanh toán.' });
    }

    // Ghi nhận tiền đã trả, KHÔNG đổi Status (chờ Host duyệt)
    booking.PaidAmount = booking.DepositAmount;
    await booking.save();

    const payment = await PaymentHistory.create({
      BookingID: booking._id,
      CustomerID: booking.CustomerID,
      HostID: booking.HostID,
      TransactionCode: `TXN-${booking._id}-${Date.now()}`,
      Amount: booking.DepositAmount,
      PaymentType: booking.PaymentType === 'full' ? 'full_payment' : 'deposit',
      PaymentMethod: 'bank_transfer',
      Status: 'successful',
      PaidAt: new Date()
    });

    return res.json({ message: 'Đã ghi nhận thanh toán, chờ chủ cơ sở xác nhận.', booking, payment });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Thanh toán phần còn lại
async function payRemainder(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    if (booking.Status !== 'confirmed') {
      return res.status(400).json({ error: 'Đơn hàng chưa được xác nhận.' });
    }

    if (booking.PaidAmount >= booking.TotalAmount) {
      return res.status(400).json({ error: 'Đơn hàng này đã được thanh toán đầy đủ.' });
    }

    const remainingAmount = booking.TotalAmount - booking.PaidAmount;

    booking.PaidAmount = booking.TotalAmount;
    await booking.save();

    const payment = await PaymentHistory.create({
      BookingID: booking._id,
      CustomerID: booking.CustomerID,
      HostID: booking.HostID,
      TransactionCode: `TXN-${booking._id}-${Date.now()}`,
      Amount: remainingAmount,
      PaymentType: 'remaining_balance',
      PaymentMethod: req.body.paymentMethod || 'bank_transfer',
      Status: 'successful',
      PaidAt: new Date()
    });

    return res.json({ message: 'Thanh toán phần còn lại thành công.', booking, payment });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Kiểm tra phòng có sẵn
async function checkAvailability(req, res) {
  try {
    const { branchId, date, timeSlot, roomType } = req.body;
 
    if (!branchId || !date || !timeSlot || !roomType) {
      return res.status(400).json({ error: 'Thiếu dữ liệu: branchId, date, timeSlot, roomType' });
    }
 
    const [startStr, endStr] = timeSlot.split(' - ');
    if (!startStr || !endStr) {
      return res.status(400).json({ error: 'Định dạng khung giờ không hợp lệ' });
    }
 
    const start = new Date(`${date}T${startStr}:00+07:00`);
    const end = new Date(`${date}T${endStr}:00+07:00`);
 
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Ngày hoặc giờ không hợp lệ' });
    }
 
    const category = (roomType === 'meeting') ? 'meeting_room' : 'desk';
 
    const allSpaces = await Space.find({
      BranchID: branchId,
      Category: category,
      Status: 'available'
    }).lean();
 
    const busyBookings = await Booking.find({
      BranchID: branchId,
      Status: { $in: ['pending', 'confirmed'] },
      StartTime: { $lt: end },
      EndTime: { $gt: start }
    }).select('SpaceID').lean();
 
    const busySpaceIds = new Set(busyBookings.map(b => b.SpaceID.toString()));
    const availableSpaces = allSpaces.filter(space => !busySpaceIds.has(space._id.toString()));
 
    return res.json({ spaces: availableSpaces, total: availableSpaces.length });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getHomePage,
  searchBranches,
  detailPage,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  createBooking,
  payRemainder,
  submitReview, 
  getReview,
  getBranchReviews,
  confirmPayment,
  checkAvailability,
  getMyProfile,
  updateMyProfile
};