const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // 1. LIÊN KẾT (RELATIONSHIPS)
    SpaceID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Space',
        required: true,
        index: true // Tối ưu cho API: Lấy toàn bộ review của 1 Space
    },
    CustomerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    BookingID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true // QUAN TRỌNG: Đảm bảo 1 lượt thuê phòng chỉ được đánh giá 1 lần
    },

    // 2. NỘI DUNG ĐÁNH GIÁ (CONTENT)
    Rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    Comment: {
        type: String,
        trim: true, // Tự động xóa khoảng trắng thừa
        default: ""
    }

}, {
    collection: 'reviews',
    timestamps: true // Tự động sinh createdAt và updatedAt
});

// 3. CHỈ MỤC PHỨC HỢP (COMPOSITE INDEX)
// Tránh việc 1 user đánh giá 1 space quá nhiều lần liên tiếp một cách bất thường
reviewSchema.index({ CustomerID: 1, SpaceID: 1 });

module.exports = mongoose.model('Review', reviewSchema);