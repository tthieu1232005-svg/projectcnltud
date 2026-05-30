const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const User = require('../models/User');
function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getHostProfile(req, res) {

  try {

    // lấy userId từ token
    const userId = req.user.userId;

    // lấy thông tin user
    const user = await User.findById(userId).select('-PasswordHash');

    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy user'
      });
    }

    // lấy profile host
    const profile = await HostProfile.findOne({
      UserID: userId
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Không tìm thấy hồ sơ host'
      });
    }

    return res.status(200).json({
      user,
      profile
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error: 'Lỗi server'
    });
  }
}



// ================= UPDATE PROFILE HOST =================
async function updateHostProfile(req, res) {

  try {

    const userId = req.user.userId;

    const {
      CompanyName,
      Hotline,
      TaxCode,
      BankName,
      BankNumber
    } = req.body;

    const updatedProfile = await HostProfile.findOneAndUpdate(

      {
        UserID: userId
      },

      {
        CompanyName,
        Hotline,
        TaxCode,
        BankName,
        BankNumber
      },

      {
        new: true
      }

    );

    return res.status(200).json({
      message: 'Cập nhật profile thành công',
      profile: updatedProfile
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error: 'Lỗi update profile'
    });
  }
}

module.exports = {
  getHostProfile,
  updateHostProfile
};

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

module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings
};