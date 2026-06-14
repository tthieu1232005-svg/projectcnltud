const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const Booking = require('../models/Booking');
const PaymentHistory = require('../models/Payment_History');
const Review = require('../models/Review');
const Branch = require('../models/Branch');
const Space = require('../models/Space');

// ==========================================
// HÀM HỖ TRỢ CHUNG
// ==========================================
function sendServerError(res, error) {
    console.error(error);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

// ==========================================
// KHU VỰC 1: CÁC HÀM RENDER GIAO DIỆN (CỦA NA)
// ==========================================

async function getHomePage(req, res) {
    try {
        const branches = await Branch.find({ Status: 'active' }).lean();
        res.render('customer/home', {
            branches,
            scripts: '<script src="/js/customer-main.js"></script>'
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu trang chủ:", error);
        res.status(500).send("Lỗi server");
    }
}

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
        console.error("Lỗi tải trang chi tiết:", error);
        res.status(500).send("Lỗi server");
    }
}

// ==========================================
// KHU VỰC 2: API HỒ SƠ KHÁCH HÀNG (CỦA BẠN & NA)
// ==========================================

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

// ==========================================
// KHU VỰC 3: API QUẢN LÝ ĐƠN HÀNG (KẾT HỢP)
// ==========================================

// Lấy danh sách kèm đánh giá (Logic chuẩn của bạn)
async function getCustomerBookings(req, res) {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

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

// Tạo đơn hàng thông minh (Logic check trùng lịch của Na + Cấu trúc của bạn)
async function createBooking(req, res) {
    try {
        const userId = req.params.userId || (req.user && (req.user.id || req.user._id));
        const { spaceId, startTime, endTime, paymentType } = req.body;

        if (!userId) return res.status(401).json({ error: 'Thiếu thông tin người dùng.' });
        if (!spaceId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Thiếu thông tin đặt chỗ.' });
        }

        const space = await Space.findById(spaceId);
        if (!space) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) return res.status(400).json({ error: 'Thời gian không hợp lệ.' });

        // Kiểm tra xung đột thời gian (Phòng đã có người đặt)
        const conflict = await Booking.findOne({
            SpaceID: spaceId,
            Status: { $in: ['pending', 'confirmed'] },
            $or: [
                { StartTime: { $lt: end }, EndTime: { $gt: start } }
            ]
        });

        if (conflict) {
            return res.status(409).json({ error: 'Khung giờ này đã có người đặt, vui lòng chọn giờ khác.' });
        }

        // Tính toán chi phí
        const hours = (end - start) / (1000 * 60 * 60);
        const totalAmount = hours * (space.PricePerHour || 0);
        const depositAmount = paymentType === 'full' ? totalAmount : (space.DepositAmount || Math.round(totalAmount * 0.3));

        const newBooking = await Booking.create({
            CustomerID: userId,
            SpaceID: spaceId,
            BranchID: space.BranchID,
            HostID: space.HostID,
            StartTime: start,
            EndTime: end,
            TotalAmount: totalAmount,
            DepositAmount: depositAmount,
            PaidAmount: 0,
            Status: 'pending',
            PaymentType: paymentType || 'deposit'
        });

        return res.status(201).json({ message: 'Đặt chỗ thành công.', booking: newBooking });
    } catch (err) {
        return sendServerError(res, err);
    }
}

// Logic kiểm tra phòng khả dụng của Na
async function checkAvailableSpaces(req, res) {
    try {
        const { branchId, date, timeSlot, roomType } = req.body;
        if (!branchId || !date || !timeSlot || !roomType) {
            return res.status(400).json({ error: 'Thiếu dữ liệu kiểm tra.' });
        }

        const [startStr, endStr] = timeSlot.split(' - ');
        if (!startStr || !endStr) return res.status(400).json({ error: 'Định dạng khung giờ lỗi.' });

        const start = new Date(`${date}T${startStr}:00`);
        const end = new Date(`${date}T${endStr}:00`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Ngày/giờ không hợp lệ.' });
        }

        const category = (roomType === 'meeting') ? 'meeting_room' : 'desk';
        const allSpaces = await Space.find({ BranchID: branchId, Category: category, Status: 'available' }).lean();

        const busyBookings = await Booking.find({
            BranchID: branchId,
            Status: { $in: ['pending', 'confirmed'] },
            StartTime: { $lt: end },
            EndTime: { $gt: start }
        }).select('SpaceID').lean();

        const busySpaceIds = new Set(busyBookings.map(b => b.SpaceID.toString()));
        const availableSpaces = allSpaces.filter(space => !busySpaceIds.has(space._id.toString()));

        res.json({ spaces: availableSpaces, total: availableSpaces.length });
    } catch (err) {
        return sendServerError(res, err);
    }
}

async function cancelBooking(req, res) {
    try {
        const { userId, bookingId } = req.params;
        const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
        
        if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng của bạn.' });
        if (booking.Status !== 'pending') return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ.' });

        booking.Status = 'cancelled';
        await booking.save();

        return res.json({ message: 'Bạn đã hủy đơn đặt chỗ thành công.', booking });
    } catch (error) {
        return sendServerError(res, error);
    }
}

// Na thêm hàm này để mô phỏng xác nhận nhanh
async function confirmBooking(req, res) {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ error: 'Thiếu bookingId' });

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ error: 'Không tìm thấy booking' });

        booking.Status = 'confirmed';
        booking.PaidAmount = booking.DepositAmount;
        await booking.save();

        return res.json({ message: 'Xác nhận thanh toán thành công', booking });
    } catch (err) {
        return sendServerError(res, err);
    }
}

// Logic thanh toán của BẠN
async function payRemainder(req, res) {
    try {
        const { userId, bookingId } = req.params;
        const booking = await Booking.findOne({ _id: bookingId, CustomerID: userId });
        
        if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
        if (booking.Status !== 'confirmed') return res.status(400).json({ error: 'Đơn hàng chưa được xác nhận.' });
        if (booking.DepositAmount >= booking.TotalAmount) {
            return res.status(400).json({ error: 'Đơn hàng này đã được thanh toán đầy đủ.' });
        }

        const remainingAmount = booking.TotalAmount - booking.DepositAmount;
        booking.DepositAmount = booking.TotalAmount;
        await booking.save();

        const payment = await PaymentHistory.create({
            BookingID: booking._id,
            CustomerID: userId,
            Amount: remainingAmount,
            PaymentType: 'full_payment',
            PaymentMethod: req.body.paymentMethod || 'cash',
            Status: 'successful'
        });

        return res.json({ message: 'Thanh toán phần còn lại thành công.', booking, payment });
    } catch (error) {
        return sendServerError(res, error);
    }
}

// ==========================================
// KHU VỰC 4: API ĐÁNH GIÁ (REVIEW)
// ==========================================

// Logic Submit chặt chẽ của BẠN (7 days rule)
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
            return res.json({ message: 'Cập nhật đánh giá thành công!', review });
        } else {
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

// Logic lấy Review theo Branch của NA
async function getBranchReviews(req, res) {
    try {
        const { branchId } = req.params;
        if (!branchId) return res.status(400).json({ error: 'Thiếu branchId.' });

        const spaces = await Space.find({ BranchID: branchId }).select('_id').lean();
        const spaceIds = spaces.map(s => s._id);

        if (spaceIds.length === 0) return res.json({ reviews: [] });

        const reviews = await Review.find({ SpaceID: { $in: spaceIds } })
            .sort({ createdAt: -1 })
            .populate('CustomerID', 'FullName fullName avatarUrl Avatar')
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

// ==========================================
// XUẤT MODULE
// ==========================================
module.exports = {
    getHomePage,
    searchBranches,
    detailPage,
    getCustomerProfile,
    updateCustomerProfile,
    getCustomerBookings,
    createBooking,
    checkAvailableSpaces,
    cancelBooking,
    confirmBooking,
    payRemainder,
    submitReview,
    getBranchReviews
};