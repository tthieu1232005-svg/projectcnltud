const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Review = require('../models/Review');


// ==========================================
// HÀM HỖ TRỢ
// ==========================================
function sendServerError(res, error) {
    console.error(error);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// ==========================================
// TRANG CHỈ TIẾT CHI NHÁNH
// ==========================================
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
        console.error("Lỗi tải trang chi tiết:", error);
        res.status(500).send("Lỗi server");
    }
};

// ==========================================
// TRANG CHỦ KHÁCH HÀNG
// ==========================================
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
};

// ==========================================
// TÌM KIẾM CHI NHÁNH
// ==========================================
async function searchBranches(req, res) {
    try {
        const { location } = req.query;

        let query = { Status: 'active' };

        if (location && location.trim()) {
            query.$or = [
                { District: { $regex: location, $options: 'i' } },
                { City: { $regex: location, $options: 'i' } },
                { Name: { $regex: location, $options: 'i' } }
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
};

// ==========================================
// LẤY THÔNG TIN HỒ SƠ KHÁCH HÀNG
// ==========================================
async function getCustomerProfile(req, res) {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'Thiếu userId.' });
        }

        const user = await User.findById(userId).select('-passwordHash').lean();
        if (!user) {
            return res.status(404).json({ error: 'Người dùng không tìm thấy.' });
        }

        const profile = await CustomerProfile.findOne({ userID: userId }).lean();

        return res.json({ user, profile });
        
    } catch (error) {
        return sendServerError(res, error);
    }
};

// ==========================================
// CẬP NHẬT HỒ SƠ KHÁCH HÀNG
// ==========================================
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
};

// ==========================================
// LẤY DANH SÁCH ĐẶT CHỖ CỦA KHÁCH HÀNG
// ==========================================
async function getCustomerBookings(req, res) {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'Thiếu userId.' });
        }

        const bookings = await Booking.find({ CustomerID: userId })
            .sort({ createdAt: -1 })
            .populate('SpaceID', 'Name PricePerHour')
            .populate('BranchID', 'Name Address')
            .lean();
            
        return res.json({ bookings });
        
    } catch (error) {
        return sendServerError(res, error);
    }
};

// ==========================================
// TẠO ĐẶT CHỖ MỚI
// ==========================================
async function createBooking(req, res) {
    try {
        const {
            userId,
            spaceId,
            startTime,
            endTime,
            paymentType
        } = req.body;

        if (!req.user) {
            req.user = { _id: '6a18fe8eb47ac7c746d80f4b' }; // Gán một ID user giả (đảm bảo ID này tồn tại trong DB của bạn)
        }

        if (!spaceId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Thiếu thông tin đặt chỗ' });
        }

        // Lấy thông tin phòng
        const space = await Space.findById(spaceId);
        if (!space) {
            return res.status(404).json({ error: 'Không tìm thấy phòng' });
        }

        // Xử lý thời gian
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) {
            return res.status(400).json({ error: 'Thời gian không hợp lệ' });
        }

        // Kiểm tra xung đột thời gian
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

        // Tính toán tiền
        const hours = (end - start) / (1000 * 60 * 60);
        const total = hours * space.PricePerHour;
        const deposit = paymentType === 'full' ? total : (space.DepositAmount || Math.round(total * 0.3));

        // Tạo booking
        const booking = await Booking.create({
            CustomerID: req.user._id, // Sau khi hoàn thiện hệ thống login, hãy sửa lại thành CustomerID: userId (lấy từ session/token)
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

        return res.status(201).json({ 
            message: 'Đặt chỗ thành công', 
            booking 
        });

    } catch (err) {
        console.error("Lỗi tạo booking:", err);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ==========================================
// XÁC NHẬN THANH TOÁN BOOKING
// ==========================================
async function confirmBooking(req, res) {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ error: 'Thiếu bookingId' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Không tìm thấy booking' });
        }

        booking.Status = 'confirmed';
        booking.PaidAmount = booking.DepositAmount;
        await booking.save();

        return res.json({ 
            message: 'Xác nhận thanh toán thành công', 
            booking 
        });

    } catch (err) {
        console.error("Lỗi xác nhận booking:", err);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ==========================================
// KIỂM TRA PHÒNG CÓ SẴN
// ==========================================
async function checkAvailableSpaces(req, res) {
    try {
        const { branchId, date, timeSlot, roomType } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!branchId || !date || !timeSlot || !roomType) {
            return res.status(400).json({ error: 'Thiếu dữ liệu: branchId, date, timeSlot, roomType' });
        }

        // Parse thời gian
        const [startStr, endStr] = timeSlot.split(' - ');
        if (!startStr || !endStr) {
            return res.status(400).json({ error: 'Định dạng khung giờ không hợp lệ' });
        }

        const start = new Date(`${date}T${startStr}:00`);
        const end = new Date(`${date}T${endStr}:00`);

        // Kiểm tra ngày hợp lệ
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Ngày hoặc giờ không hợp lệ' });
        }

        // Xác định loại phòng
        const category = (roomType === 'meeting') ? 'meeting_room' : 'desk';

        // Lấy tất cả phòng của chi nhánh theo loại
        const allSpaces = await Space.find({
            BranchID: branchId,
            Category: category,
            Status: 'available'
        }).lean();

        // Tìm booking trùng thời gian
        const busyBookings = await Booking.find({
            BranchID: branchId,
            Status: { $in: ['pending', 'confirmed'] },
            StartTime: { $lt: end },
            EndTime: { $gt: start }
        }).select('SpaceID').lean();

        // Lọc phòng đang bận
        const busySpaceIds = new Set(
            busyBookings.map(b => b.SpaceID.toString())
        );

        // Trả về phòng khả dụng
        const availableSpaces = allSpaces.filter(space => 
            !busySpaceIds.has(space._id.toString())
        );

        res.json({ 
            spaces: availableSpaces,
            total: availableSpaces.length
        });

    } catch (err) {
        console.error("Lỗi kiểm tra phòng trống:", err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ==========================================
// XUẤT CÁC HÀM
// ==========================================
// ==========================================
// LẤY DANH SÁCH REVIEW THEO BRANCH
// Lưu ý: Review không có BranchID trực tiếp, nên phải suy ra từ Space thuộc branch.
// ==========================================
async function getBranchReviews(req, res) {
    try {
        const { branchId } = req.params;

        if (!branchId) {
            return res.status(400).json({ error: 'Thiếu branchId.' });
        }

        const spaces = await Space.find({ BranchID: branchId }).select('_id').lean();
        const spaceIds = spaces.map(s => s._id);

        if (spaceIds.length === 0) {
            return res.json({ reviews: [] });
        }

        const reviews = await Review.find({
            SpaceID: { $in: spaceIds }
        })
            .sort({ createdAt: -1 })
            .populate('CustomerID', 'fullName avatarUrl')
            .lean();

        const formatted = reviews.map(r => ({
            _id: r._id,
            spaceId: r.SpaceID,
            customerId: r.CustomerID?._id,
            customerName: r.CustomerID?.fullName || '',
            customerAvatar: r.CustomerID?.avatarUrl || '',
            rating: r.Rating,
            comment: r.Comment,
            createdAt: r.createdAt
        }));

        return res.json({ reviews: formatted });
    } catch (err) {
        console.error('Lỗi lấy reviews theo branch:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

// ==========================================
// XUẤT CÁC HÀM
// ==========================================
module.exports = {
    detailPage,
    searchBranches,
    getHomePage,
    getCustomerProfile,
    updateCustomerProfile,
    getCustomerBookings,
    createBooking,
    confirmBooking,
    checkAvailableSpaces,
    getBranchReviews
};
