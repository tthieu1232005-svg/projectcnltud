const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');


function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const profile = await HostProfile.findOne({
      $or: [{ UserID: hostId }, { userID: hostId }]
    }).lean();
    
    if (!profile) return res.status(404).json({ error: 'Hồ sơ chủ cơ sở không tìm thấy.' });
    return res.json({ profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const update = req.body;
    const profile = await HostProfile.findOneAndUpdate(
      { $or: [{ UserID: hostId }, { userID: hostId }] },
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
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).lean();
    
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getHostSpaces(req, res) {
  try {
    const { hostId } = req.params;
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).select('_id').lean();
    
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({
      $or: [{ BranchID: { $in: branchIds } }, { branchID: { $in: branchIds } }]
    }).lean();

    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH ĐƠN ĐẶT CHỖ
// ==========================================
async function getHostBookings(req, res) {
  try {
    const { hostId } = req.params;
    // CODE BẠN TÌM THẤY TRONG FILE SẼ TRÔNG NHƯ THẾ NÀY:
// async function getHostBookings(req, res) {
//   try {
//     const { hostId } = req.params;
      
       // 1. CHÈN ĐOẠN MÁY HÚT BỤI NÀY VÀO ĐÂY: TỰ ĐỘNG CHỐT ĐƠN HẾT GIỜ
       const currentTime = new Date();
       await Booking.updateMany(
         { 
           $or: [{ Status: 'in-use' }, { status: 'in-use' }],
           $or: [{ EndTime: { $lt: currentTime } }, { endTime: { $lt: currentTime } }]
         },
         { 
           $set: { Status: 'completed', status: 'completed' } 
         },
         { strict: false }
       );

   
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    // Dùng thẳng HostID để tìm Booking (Nhanh gấp 3 lần code cũ)
    const bookings = await Booking.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    })
        .populate({ path: 'CustomerID', select: 'email Email FullName', strictPopulate: false })
      .populate({
        path: 'SpaceID',
        // Space schema hiện tại dùng: SpaceCode + Name (viết hoa)
        // Thêm nhiều biến thể để tương thích dữ liệu cũ
        select: 'Name Name name SpaceName spaceName SpaceCode Space_Code space_code Space_code SpaceCode_code code spaceCode spaceCode',
        populate: { path: 'BranchID', select: 'Name name' } // POPULATE THÊM CHI NHÁNH
      })
      .sort({ createdAt: -1 })
      .lean();

      
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// CÁC HÀM HÀNH ĐỘNG CỦA HOST
// ==========================================

async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng này không ở trạng thái chờ xác nhận.' });
    }

    // FIX: Dùng updateOne chọc thẳng vào DB, bỏ qua Mongoose Validation
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'confirmed', status: 'confirmed' } }
    );

    const total = booking.TotalAmount || booking.totalAmount || 0;
    const deposit = booking.DepositAmount || 0;
    
    let amountReceived = deposit;
    let paymentType = 'deposit';

    if (booking.percentagePaid !== undefined) {
      amountReceived = (total * booking.percentagePaid) / 100;
      paymentType = booking.percentagePaid === 100 ? 'full_payment' : 'deposit';
    } else {
      paymentType = deposit >= total ? 'full_payment' : 'deposit';
    }

    // Bọc try-catch riêng cho PaymentHistory để không làm sập tiến trình duyệt đơn
    try {
      await PaymentHistory.create({
        bookingID: booking._id,
        amount: amountReceived,
        paymentType: paymentType,
        paymentMethod: 'bank_transfer',
        status: 'successful'
      });
    } catch (paymentErr) {
      console.log('Lưu ý: Không thể ghi nhận lịch sử thanh toán:', paymentErr.message);
    }

    return res.status(200).json({ message: 'Xác nhận đơn hàng thành công.' });

  } catch (error) {
    return sendServerError(res, error);
  }
}

/**
 * Host xác nhận khách đến nhận phòng (Chuyển sang in-use)
 */
async function checkinBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể nhận phòng với đơn đã được xác nhận.' });
    }

    // Đảm bảo số tiền được ép kiểu về dạng số
    const total = Number(booking.TotalAmount || booking.totalAmount || 0);

    // BẬT BÙA HỘ MỆNH: strict: false giúp bỏ qua mọi rào cản của Schema
    await Booking.updateOne(
      { _id: bookingId },
      { 
        $set: { 
          Status: 'in-use', 
          status: 'in-use',
          DepositAmount: total,       
          depositAmount: total,
          percentagePaid: 100         
        } 
      },
      { strict: false } 
    );

    return res.status(200).json({ message: 'Nhận phòng thành công. Hệ thống đã ghi nhận thu đủ 100% tiền!' });
  } catch (error) {
    // In lỗi chi tiết ra Terminal màu đen
    console.error("LỖI CHECK-IN THỰC SỰ LÀ:", error);
    
    // TRẢ THẲNG MÃ LỖI RA GIAO DIỆN ĐỂ BẮT BỆNH, BỎ QUA HÀM CỦA HỆ THỐNG
    return res.status(500).json({ error: `Chi tiết lỗi Server: ${error.message}` });
  }
}


async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    
    // Cho phép hủy cả đơn 'pending' (Host từ chối) VÀ đơn 'confirmed' (Khách vắng mặt)
    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ hoặc đơn đã xác nhận.' });
    }

    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'cancelled', status: 'cancelled' } }
    );

    return res.status(200).json({ message: 'Đã hủy đơn hàng thành công.' });
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
  confirmBooking, 
  cancelBooking,
  checkinBooking  
};