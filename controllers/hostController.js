const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History'); // Bổ sung Model Payment_History

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

    // 1. Tìm các chi nhánh của Host này
    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    
    // 2. Tìm các không gian thuộc các chi nhánh đó
    const spaces = await Space.find({ branchID: { $in: branchIds } }).select('_id').lean();
    const spaceIds = spaces.map(space => space._id);

    // 3. Lấy danh sách booking và KẾT NỐI (populate) với bảng User và Space để lấy tên hiển thị
    const bookings = await Booking.find({ spaceID: { $in: spaceIds } })
      .populate('customerID', 'email') // Lấy email khách hàng
      .populate('spaceID', 'name') // Lấy tên phòng
      .sort({ createdAt: -1 })
      .lean();
      
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// CÁC HÀM HÀNH ĐỘNG MỚI BỔ SUNG CHO HOST
// ==========================================

/**
 * Host xác nhận đơn (Khi nhận được tiền chuyển khoản)
 */
async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;

    // 1. Tìm đơn hàng
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    // Chỉ xác nhận nếu đơn đang chờ thanh toán
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng này không ở trạng thái chờ xác nhận.' });
    }

    // 2. Tính toán số tiền Host nhận được
    // (Lấy Tổng tiền * phần trăm khách đã thanh toán)
    const amountReceived = (booking.totalAmount * booking.percentagePaid) / 100;
    
    // Xác định xem đây là thanh toán cọc hay thanh toán đủ
    const paymentType = booking.percentagePaid === 100 ? 'full_payment' : 'deposit';

    // 3. Đổi trạng thái đơn thành 'confirmed'
    booking.status = 'confirmed';
    await booking.save();

    // 4. Tạo lịch sử thanh toán thành công (Payment_History)
    const payment = await PaymentHistory.create({
      bookingID: booking._id,
      amount: amountReceived,
      paymentType: paymentType,
      paymentMethod: 'bank_transfer', // Host check tay nên mặc định là chuyển khoản
      status: 'successful'
    });

    return res.status(200).json({ 
      message: 'Xác nhận đơn và ghi nhận thanh toán thành công.',
      booking,
      payment
    });

  } catch (error) {
    return sendServerError(res, error);
  }
}

/**
 * Host từ chối đơn (Do hết phòng, khách boom, hoặc sự cố)
 */
async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể từ chối các đơn hàng đang chờ.' });
    }

    // Chuyển trạng thái sang bị hủy
    booking.status = 'cancelled';
    await booking.save();

    return res.status(200).json({ 
      message: 'Đã từ chối đơn hàng thành công.',
      booking 
    });
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
  confirmBooking, // Export hàm mới
  cancelBooking   // Export hàm mới
};