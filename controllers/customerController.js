const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const Branch = require('../models/Branch')
const Space = require('../models/Space');

exports.detailPage = async (req, res) => {
    try {
        const { branchId } = req.query;

        const branch = await Branch.findById(branchId);

        const spaces = await Space.find({
            BranchID: branchId,
            Status: 'available'
        }).sort({ Category: 1, Name: 1 });

        res.render('detail', {
            branch,
            spaces
        });

    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
};

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getHomePage(req, res) {
    try {
        const branches = await Branch.find({
            Status: 'active'
        }).lean();

        res.render('customer/home', {
            branches,
            scripts: '<script src="/js/customer-main.js"></script>'
        });

    } catch (error) {
        console.error("Lỗi lấy dữ liệu trang chủ:", error);
        res.status(500).send("Lỗi server");
    }
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
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}


async function searchBranches(req, res) {
    try {
        const { location } = req.query;

        let query = { Status: 'active' };

        if (location) {
            query.$or = [
                { District: { $regex: location, $options: 'i' } },
                { City: { $regex: location, $options: 'i' } }
            ];
        }

        const branches = await Branch.find(query).lean();

        res.render('customer/search', {
            branches,
            keyword: location || "",
            scripts: '<script src="/js/customer-main.js"></script>'
        });

    } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
        res.status(500).send("Lỗi server");
    }
}

async function createBooking(req, res) {
    try {
        const {
            userId,
            spaceId,
            startTime,
            endTime,
            paymentType
        } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Chưa đăng nhập' });
        }

        const space = await Space.findById(spaceId);
        if (!space) {
            return res.status(404).json({ error: 'Không tìm thấy phòng' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) {
            return res.status(400).json({ error: 'Thời gian không hợp lệ' });
        }

        const conflict = await Booking.findOne({
            SpaceID: spaceId,
            Status: { $in: ['pending', 'confirmed'] },
            $or: [{
                StartTime: { $lt: end },
                EndTime: { $gt: start }
            }]
        });

        if (conflict) {
            return res.status(409).json({ error: 'Khung giờ đã có người đặt' });
        }

        const hours = (end - start) / (1000 * 60 * 60);
        const total = hours * space.PricePerHour;

        const deposit = paymentType === 'full' ? total : total * 0.3;

        const booking = await Booking.create({
            CustomerID: userId,
            SpaceID: spaceId,
            HostID: space.HostID,
            StartTime: start,
            EndTime: end,
            TotalAmount: total,
            DepositAmount: deposit,
            Status: 'pending'
        });

        return res.json({ message: 'OK', booking });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
}

async function confirmBooking(req, res) {
    try {
        const { bookingId } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Không tìm thấy booking' });
        }

        booking.Status = 'confirmed';
        await booking.save();

        return res.json({ message: 'Thanh toán thành công' });

    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

async function getBranchDetail(req, res) {
    try {
        const { branchId } = req.query;

        const branch = await Branch.findById(branchId).lean();
        const spaces = await Space.find({
            BranchID: branchId,
            Status: 'available'
        }).lean();

        if (!branch) {
            return res.status(404).send("Không tìm thấy cơ sở");
        }

        res.render('customer/detail', {
            branch,
            spaces,
            scripts: '<script src="/js/customer-main.js"></script>'
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi server");
    }
}

async function checkAvailableSpaces(req, res) {
    try {
        const { type } = req.body;

        const spaces = await Space.find({
            Status: 'available',
            ...(type === 'meeting'
                ? { Category: 'meeting_room' }
                : { Category: 'desk' })
        }).lean();

        res.json({ spaces });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
  getHomePage,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerBookings,
  searchBranches,
  getBranchDetail,
  createBooking,
  confirmBooking,
  checkAvailableSpaces
};
