const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spaceID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Space',
    required: true
  },
  rating: {// Đánh giá sao, từ 1 đến 5
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  collection: 'reviews',
  timestamps: false
});

module.exports = mongoose.model('Review', reviewSchema);
