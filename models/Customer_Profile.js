const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    trim: true,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  bankNumber: {
    type: String,
    trim: true
  }
}, {
  collection: 'customer_profiles',
  timestamps: true
});

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
