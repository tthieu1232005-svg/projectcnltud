const mongoose = require('mongoose');

const hostProfileSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    trim: true,
    required: true
  },
  hotline: {
    type: String,
    trim: true
  },
  taxCode: {
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
  collection: 'host_profiles',
  timestamps: true
});

module.exports = mongoose.model('HostProfile', hostProfileSchema);
