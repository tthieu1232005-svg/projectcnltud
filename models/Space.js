const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
  branchID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  spaceCode: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  pricePerHour: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['available', 'inactive', 'maintenance'],
    default: 'available'
  }
}, {
  collection: 'spaces',
  timestamps: true
});

module.exports = mongoose.model('Space', spaceSchema);
