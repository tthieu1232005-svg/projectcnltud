const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  spaceID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  startTime: {// Thời gian hẹn check-in
    type: Date,
    required: true
  },
  endTime: {// Thời gian hẹn check-out
    type: Date,
    required: true
  },
  totalAmount: {// Tổng số tiền phải trả, đơn vị là VND
    type: Number,
    required: true,
    min: 0
  },
  status: {// Trạng thái đặt chỗ
    type: String,
    enum: ['confirmed'//DA XAC NHAN - da thanh toan coc hoac toan bo & Now > EndTime
          , 'pending' // DANG CHO - customer nhan nut dat cho nhung chua thanh toan, pending ton tai 10-15p, thanh toan thanh cong: pending --> confirmed, chua thanh toan + het gio: pending --> cancelled
          , 'completed'//HOAN THANH - da thanh toan toan bo & Now <= EndTime
          , 'cancelled'],//DA HUY - Host nhan nut huy va Now < EndTime
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    required: true
  },
  percentagePaid: {// đã thanh toán bao nhiêu phần trăm của tổng số tiền
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, {
  collection: 'bookings',
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
