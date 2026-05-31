const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// 1. Hàm hiển thị trang hồ sơ Host
async function getHostProfile(req, res) {
  try {
    const { hostId } = req.params; // Lấy hostId từ URL gạch chéo

    // Tìm thông tin tài khoản và thông tin doanh nghiệp trong DB
    const user = await User.findById(hostId);

    // Nếu không tìm thấy user thì chặn lại luôn để đỡ lỗi view
    if (!user) {
      return res.status(404).send('Không tìm thấy tài khoản Host này.');
    }

    let profile = await HostProfile.findOne({ userId: hostId });

    // Nếu Host này mới tinh chưa có hồ sơ doanh nghiệp, tự động tạo một bản ghi rỗng cho họ
    if (!profile) {
      profile = await HostProfile.create({
        userId: hostId,
        companyName: 'Chưa cập nhật'
      });
    }

    // ĐÃ ĐƯA VÀO ĐÚNG CHỖ: Render file profile và truyền đủ biến, kèm script
    res.render('host/profile', {
      user,
      profile,
      success: req.query.success === 'true',
      scripts: '<script src="/js/host-spaces.js"></script>'
    });

  } catch (error) {
    console.error("Lỗi getHostProfile:", error);
    res.status(500).send('Lỗi hệ thống khi tải hồ sơ');
  }
}

// 2. Hàm xử lý khi Host bấm nút "Lưu thay đổi"
// 2. Hàm xử lý khi Host bấm nút "Lưu thay đổi"
async function updateHostProfile(req, res) {
  try {
    const { hostId } = req.params;

    // Hứng dữ liệu từ form (giả sử name trong thẻ input của bạn viết hoa)
    // Nếu trong thẻ html bạn dùng name="fullName" (chữ thường), thì nhớ sửa lại ở đây cho khớp nhé.
    const {
      FullName,
      CompanyName,
      Hotline,
      TaxCode,
      BankName,
      BankNumber,
      Password, // Đã thêm để tránh lỗi undefined
      Logo      // Đã thêm để tránh lỗi undefined
    } = req.body;

    // Cập nhật thông tin tài khoản (User)
    const userUpdateData = { fullName: FullName }; // Gán giá trị biến HOA vào thuộc tính thường
    if (Password && Password.trim() !== "") {
      userUpdateData.password = Password;
    }
    await User.findByIdAndUpdate(hostId, userUpdateData);

    // Cập nhật thông tin doanh nghiệp (Host_Profile)
    await HostProfile.findOneAndUpdate(
      { userId: hostId },
      {
        companyName: CompanyName,
        logo: Logo,
        hotline: Hotline,
        taxCode: TaxCode,
        bankName: BankName,
        bankNumber: BankNumber
      },
      { new: true }
    );

    // Cập nhật xong xuôi thì quay về chính trang này kèm thông báo thành công
    res.redirect(`/host/profile/${hostId}?success=true`);

  } catch (error) {
    console.error("❌ Lỗi updateHostProfile:", error);
    res.status(500).send('Lỗi hệ thống khi cập nhật hồ sơ');
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

    const branches = await Branch.find({ hostID: hostId }).select('_id').lean();
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({ branchID: { $in: branchIds } }).select('_id').lean();
    const spaceIds = spaces.map(space => space._id);

    const bookings = await Booking.find({ spaceID: { $in: spaceIds } }).sort({ createdAt: -1 }).lean();
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// Xuất các hàm ra ngoài đồng bộ
module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings
};