const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  hostID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  openingTime: {
    type: String,
    required: true,
    trim: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ // Format: HH:mm
  },
  closingTime: {
    type: String,
    required: true,
    trim: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ // Format: HH:mm
  },
  stars: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  depositPercentage: {// Tỷ lệ đặt cọc, mặc định là 30%
    type: Number,
    min: 0,
    max: 1,
    default: 0.3
  }
}, {
  collection: 'branches',
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

module.exports = mongoose.model('Branch', branchSchema);
