const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');
const Review = require('../models/Review');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const logActivity = require('../utils/auditLogger'); // Bắt buộc giữ lại hệ thống Log của BẠN



const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary để gọi API hủy ảnh cũ
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// ==========================================
// HÀM HỖ TRỢ CHUNG
// ==========================================
function sendServerError(res, error) {
  console.error("Lỗi Controller:", error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// ==========================================
// KHU VỰC 1: CÁC HÀM RENDER GIAO DIỆN
// ==========================================
async function getHomePage(req, res) {
  try {
    const branches = await Branch.find({ Status: 'active' }).lean();
    res.render('customer/home', { 
      branches,
      scripts: '<script src="/js/customer-main.js"></script>'
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

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
      scripts: '<script src="/js/customer-main.js"></script>' 
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function detailPage(req, res) {
    try {
        const { branchId } = req.query;
        if (!branchId) return res.status(400).send("Thiếu ID chi nhánh");

        const branch = await Branch.findById(branchId).lean();
        if (!branch) return res.status(404).send("Không tìm thấy chi nhánh");

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

// ==========================================
// KHU VỰC 2: API HỒ SƠ KHÁCH HÀNG (KẾT HỢP NA & BẠN)
// ==========================================

// Hàm lấy profile thông qua param (Dành cho Admin hoặc tham chiếu chéo)
async function getCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const profile = await CustomerProfile.findOne({ UserID: userId }).lean();
    const user = await User.findById(userId).select('-PasswordHash -passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'Người dùng không tìm thấy.' });

    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Hàm cập nhật profile thông qua param
async function updateCustomerProfile(req, res) {
  try {
    const { userId } = req.params;
    const update = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const profile = await CustomerProfile.findOneAndUpdate(
      { UserID: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật hồ sơ thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// (CỦA NA) Lấy hồ sơ của chính mình từ Token
async function getMyProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-PasswordHash -passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'Người dùng không tìm thấy.' });

    const profile = await CustomerProfile.findOne({ UserID: userId }).lean();
    return res.json({ user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// (CỦA NA) Cập nhật hồ sơ của chính mình + Upload Avatar
// ==========================================
// CẬP NHẬT HỒ SƠ CỦA CHÍNH MÌNH + DỌN AVATAR CŨ (CLOUDINARY)
// ==========================================
async function updateMyProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { FullName, Phone, BankName, BankNumber } = req.body;

    if (FullName?.trim()) {
      await User.findByIdAndUpdate(userId, { $set: { FullName: FullName.trim() } });
    }

    const updateData = {};
    if (Phone !== undefined) updateData.Phone = Phone.trim();
    if (BankName !== undefined) updateData.BankName = BankName.trim();
    if (BankNumber !== undefined) updateData.BankNumber = BankNumber.trim();

    if (req.file) {
      updateData.Avatar = req.file.path; // Đường dẫn URL Cloudinary mới hoàn toàn

      // TIẾN HÀNH TÌM VÀ XOÁ AVATAR CŨ TRÊN CLOUDINARY
      const oldProfile = await CustomerProfile.findOne({ UserID: userId });
      
      if (oldProfile && oldProfile.Avatar) {
         try {
             // Sử dụng Regex bóc tách lấy public_id từ URL cũ của Cloudinary
             const matches = oldProfile.Avatar.match(/\/v\d+\/(.+?)\.[a-zA-Z0-9]+$/);
             if (matches && matches[1]) {
                 // Gọi lệnh tiêu diệt file cũ tận gốc trên mây
                 await cloudinary.uploader.destroy(matches[1]);
                 console.log("✅ Đã dọn dẹp Avatar Khách hàng cũ trên Cloudinary:", matches[1]);
             }
         } catch (cloudErr) {
             console.warn("⚠️ Bỏ qua lỗi xóa Avatar cũ trên Cloudinary:", cloudErr.message);
         }
      }
    }

    // Tiến hành cập nhật dữ liệu mới xuống MongoDB
    const profile = await CustomerProfile.findOneAndUpdate(
      { UserID: userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const user = await User.findById(userId).select('-PasswordHash -passwordHash').lean();

    // Giữ nguyên hệ thống Audit Log (Nhật ký hoạt động) chuẩn xác của bạn
    await logActivity(
        userId, 
        'UPDATE_PROFILE', 
        'User', 
        userId, 
        'Khách hàng vừa cập nhật hồ sơ cá nhân và thay đổi ảnh đại diện', 
        'info'
    );

    return res.json({ message: 'Cập nhật hồ sơ thành công.', user, profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}
// ==========================================
// KHU VỰC 3: API QUẢN LÝ ĐƠN HÀNG (KẾT HỢP)
// ==========================================

async function getCustomerBookings(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    // Nested Populate lấy Branch của Na + Review Logic của Bạn
    const bookings = await Booking.find({ CustomerID: userId })
      .populate({
        path: 'SpaceID',
        select: 'Name Images SpaceCode BranchID PricePerHour',
        populate: { path: 'BranchID', select: 'Name Address Hotline' }
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

// ==========================================
// 1. KIỂM TRA PHÒNG TRỐNG (ĐÃ FIX TIME TRAVEL, OVERLAP & LỆCH MÚI GIỜ)
// ==========================================
async function checkAvailability(req, res) {
  try {
    const { branchId, date, timeSlot, roomType } = req.body;

    if (!branchId || !date || !timeSlot || !roomType) {
      return res.status(400).json({ error: 'Thiếu dữ liệu: branchId, date, timeSlot, roomType' });
    }

    const [startStr, endStr] = timeSlot.split(' - ');
    if (!startStr || !endStr) return res.status(400).json({ error: 'Định dạng khung giờ không hợp lệ' });

    // [BẮT BUỘC]: Ép múi giờ +07:00 để MongoDB không bị lệch giờ (Tránh Timezone Bug)
    const start = new Date(`${date}T${startStr}:00+07:00`);
    const end = new Date(`${date}T${endStr}:00+07:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Ngày hoặc giờ không hợp lệ' });
    }

    // Lấy thời gian hiện tại chính xác (Tránh bug đặt phòng ngay phút hiện tại)
    const now = new Date();
    
    // [BẢO MẬT]: Chặn quá khứ
    if (start < now) {
      return res.status(400).json({ error: 'Không thể tra cứu phòng trống ở thời điểm trong quá khứ' });
    }

    const category = (roomType === 'meeting') ? 'meeting_room' : 'desk';

    // 1. Lấy tất cả phòng đang Sẵn sàng thuộc loại này
    const allSpaces = await Space.find({
      BranchID: branchId,
      Category: category,
      Status: 'available' 
    }).lean();

    // 2. Tìm TẤT CẢ các Booking đụng lịch trong khung giờ này
    // Điều kiện $lt (nhỏ hơn) và $gt (lớn hơn) dùng để bắt chéo thời gian
    const busyBookings = await Booking.find({
      BranchID: branchId,
      Status: { $in: ['pending', 'confirmed', 'in-use'] }, // Không đếm phòng đã Cancel hoặc Completed
      StartTime: { $lt: end },
      EndTime: { $gt: start }
    }).select('SpaceID').lean();

    // 3. Lọc ra những phòng TRỐNG (Không nằm trong danh sách bận)
    const busySpaceIds = new Set(busyBookings.map(b => b.SpaceID.toString()));
    const availableSpaces = allSpaces.filter(space => !busySpaceIds.has(space._id.toString()));

    return res.json({ spaces: availableSpaces, total: availableSpaces.length });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// 2. TẠO ĐƠN HÀNG MỚI (ĐÃ FIX STATUS & RÀNG BUỘC THỜI GIAN)
// ==========================================
// ==========================================
// 1. TẠO ĐƠN HÀNG MỚI (Thuần túy tạo Hợp đồng)
// ==========================================
async function createBooking(req, res) {
  try {
    const { spaceId, startTime, endTime } = req.body;
    const customerId = req.params.userId || req.user.userId;

    if (!spaceId || !startTime || !endTime) return res.status(400).json({ error: 'Thiếu thông tin đặt chỗ' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ error: 'Không tìm thấy phòng' });

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) return res.status(400).json({ error: 'Thời gian không hợp lệ' });
    if (start < new Date()) return res.status(400).json({ error: 'Không thể đặt phòng ở thời điểm trong quá khứ' });

    const conflict = await Booking.findOne({
      SpaceID: spaceId,
      Status: { $in: ['pending', 'confirmed', 'in-use'] },
      StartTime: { $lt: end },
      EndTime: { $gt: start }
    });
    if (conflict) return res.status(409).json({ error: 'Khung giờ này vừa có người khác đặt. Vui lòng chọn giờ khác!' });

    const hours = (end - start) / (1000 * 60 * 60);
    const total = hours * (space.PricePerHour || 0);
    const deposit = space.DepositAmount || Math.round(total * 0.3);

    // CHỈ tạo đơn, không gán thuộc tính thanh toán
    const booking = await Booking.create({
      CustomerID: customerId,
      SpaceID: spaceId,
      BranchID: space.BranchID,
      HostID: space.HostID,
      StartTime: start,
      EndTime: end,
      TotalAmount: total,
      DepositAmount: deposit,
      Status: 'pending'
    });

    await logActivity(customerId, 'CREATE_BOOKING', 'Booking', booking._id, `Khách hàng vừa tạo đơn đặt chỗ mới trị giá ${total.toLocaleString('vi-VN')}đ`, 'info');

    return res.status(201).json({ message: 'Tạo đơn đặt chỗ thành công', booking });
  } catch (error) {
    return sendServerError(res, error);
  }
}
// Giữ lại hàm Hủy phòng (phòng hờ giao diện của bạn vẫn còn nút này)
async function cancelBooking(req, res) {
    try {
        const userId = req.params.userId || req.user?.userId;
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
        
        if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });
        if (booking.Status !== 'pending') return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ xác nhận.' });

        booking.Status = 'cancelled';
        await booking.save();
        
        await logActivity(userId, 'CANCEL_BOOKING', 'Booking', booking._id, `Khách hàng đã hủy đơn đặt chỗ`, 'warning');

        return res.json({ message: 'Bạn đã hủy đơn đặt chỗ thành công.', booking });
    } catch (error) {
        return sendServerError(res, error);
    }
}

// ==========================================
// 3. KHÁCH BÁO CÁO THANH TOÁN (ĐÃ FIX STATUS PENDING & ĐÚNG AMOUNT)
// ==========================================
//==========================================
// 3. KHÁCH BÁO CÁO THANH TOÁN (ROBUST FIX)
// ==========================================
// ==========================================
// 2. KHÁCH BÁO CÁO THANH TOÁN (Lưu trực tiếp vào Biên lai)
// ==========================================
async function confirmPayment(req, res) {
  try {
    const { bookingId, paymentType } = req.body; 
    const customerId = req.user?.userId || req.params?.userId;
    
    if (!bookingId) return res.status(400).json({ error: 'Thiếu mã đơn hàng' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });

    if (booking.Status !== 'pending') return res.status(400).json({ error: 'Đơn hàng không ở trạng thái chờ.' });

    // Thuật toán quét và xác định giá trị thanh toán thực tế
    const typeStr = String(paymentType || '').toLowerCase().trim();
    const isFull = (typeStr === 'full' || typeStr === 'full_payment' || typeStr === '100');
    
    const amountToPay = isFull ? booking.TotalAmount : booking.DepositAmount;
    const actualPaymentType = isFull ? 'full_payment' : 'deposit';

    // Sinh ra Biên lai Giao dịch với Status "pending" (Chờ Host duyệt tiền về tài khoản)
    const payment = await PaymentHistory.create({
      BookingID: booking._id,
      CustomerID: booking.CustomerID,
      HostID: booking.HostID,
      TransactionCode: `TXN-${booking._id}-${Date.now()}`,
      Amount: amountToPay,
      PaymentType: actualPaymentType,
      PaymentMethod: 'bank_transfer',
      Status: 'pending', 
      PaidAt: new Date()
    });

    await logActivity(customerId, 'PAYMENT_PENDING', 'PaymentHistory', payment._id, `Khách hàng đã báo cáo thanh toán ${amountToPay.toLocaleString('vi-VN')}đ. Chờ chủ cơ sở xác nhận.`, 'info');

    return res.json({ message: 'Đã gửi yêu cầu xác nhận thanh toán thành công!', booking, payment });
  } catch (error) {
    return sendServerError(res, error);
  }
}
// ==========================================
// 3. THANH TOÁN PHẦN CÒN LẠI (Quét tổng các Biên lai cũ)
// ==========================================
async function payRemainder(req, res) {
  try {
    const { userId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    if (booking.Status !== 'confirmed' && booking.Status !== 'in-use') {
      return res.status(400).json({ error: 'Đơn hàng chưa được xác nhận để thanh toán tiếp.' });
    }

    // THUẬT TOÁN: Tính tổng số tiền đã được Host xác nhận là Thành công (successful)
    const successfulPayments = await PaymentHistory.find({ 
        BookingID: bookingId, 
        Status: 'successful' 
    });
    
    const totalPaid = successfulPayments.reduce((sum, p) => sum + p.Amount, 0);

    if (totalPaid >= booking.TotalAmount) {
      return res.status(400).json({ error: 'Đơn hàng này đã được thanh toán đầy đủ.' });
    }

    const remainingAmount = booking.TotalAmount - totalPaid;

    const payment = await PaymentHistory.create({
      BookingID: booking._id,
      CustomerID: booking.CustomerID,
      HostID: booking.HostID,
      TransactionCode: `TXN-${booking._id}-${Date.now()}`,
      Amount: remainingAmount,
      PaymentType: 'remaining_balance',
      PaymentMethod: req.body.paymentMethod || 'bank_transfer',
      Status: 'pending', // Phải chờ Host duyệt tiền
      PaidAt: new Date()
    });

    await logActivity(userId, 'PAYMENT_PENDING', 'PaymentHistory', payment._id, `Khách hàng báo cáo thanh toán nốt ${remainingAmount.toLocaleString('vi-VN')}đ.`, 'info');

    return res.json({ message: 'Đã gửi báo cáo thanh toán phần còn lại, đang chờ duyệt.', booking, payment });
  } catch (error) {
    return sendServerError(res, error);
  }
}
// ==========================================
// KHU VỰC 4: API ĐÁNH GIÁ (REVIEW)
// ==========================================

// Logic Submit chặt chẽ của BẠN (7 days rule + Ghi log)
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
            const daysSinceReview = (new Date() - new Date(review.createdAt)) / (1000 * 3600 * 24);
            if (daysSinceReview > 7) {
                return res.status(400).json({ error: 'Đã quá 7 ngày, bạn không thể chỉnh sửa đánh giá.' });
            }
            review.Rating = rating;
            review.Comment = comment;
            await review.save();

            await logActivity(userId, 'UPDATE_REVIEW', 'Review', review._id, `Khách hàng vừa cập nhật đánh giá cho đơn hàng`, 'info');
            return res.json({ message: 'Cập nhật đánh giá thành công!', review });
        } else {
            review = await Review.create({
                SpaceID: booking.SpaceID,
                CustomerID: userId,
                BookingID: bookingId,
                Rating: rating,
                Comment: comment
            });
            await logActivity(userId, 'SUBMIT_REVIEW', 'Review', review._id, `Khách hàng đã đánh giá không gian ${rating} sao`, 'info');
            return res.json({ message: 'Cảm ơn bạn đã đánh giá!', review });
        }
    } catch (error) {
        return sendServerError(res, error);
    }
}

// (CỦA NA) Lấy Review đơn lẻ
async function getReview(req, res) {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({ BookingID: bookingId })
        .populate('CustomerID', 'FullName fullName Avatar avatarUrl')
        .lean();
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá cho đơn hàng này.' });
    }

    return res.json({ review });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// (CỦA BẠN - GIỮ NGUYÊN BỞI VÌ NÓ XỬ LÝ LỖI ĐẶT TÊN BIẾN RẤT TỐT: fullName vs FullName)
async function getBranchReviews(req, res) {
    try {
        const { branchId } = req.params;
        if (!branchId) return res.status(400).json({ error: 'Thiếu branchId.' });

        const spaces = await Space.find({ BranchID: branchId }).select('_id').lean();
        const spaceIds = spaces.map(s => s._id);

        if (spaceIds.length === 0) return res.json({ reviews: [] });

        const reviews = await Review.find({ SpaceID: { $in: spaceIds } })
            .sort({ createdAt: -1 })
            .populate('CustomerID', 'FullName fullName Avatar avatarUrl')
            .lean();

        const formatted = reviews.map(r => ({
            _id: r._id,
            spaceId: r.SpaceID,
            customerId: r.CustomerID?._id,
            customerName: r.CustomerID?.FullName || r.CustomerID?.fullName || '',
            customerAvatar: r.CustomerID?.Avatar || r.CustomerID?.avatarUrl || '',
            rating: r.Rating,
            comment: r.Comment,
            createdAt: r.createdAt
        }));

        return res.json({ reviews: formatted });
    } catch (err) {
        return sendServerError(res, err);
    }
}

module.exports = {
  getHomePage,
  searchBranches,
  detailPage,
  getCustomerProfile,
  updateCustomerProfile,
  getMyProfile,
  updateMyProfile,
  getCustomerBookings,
  checkAvailability,
  createBooking,
  cancelBooking,
  confirmPayment,
  payRemainder,
  submitReview, 
  getReview,
  getBranchReviews
};