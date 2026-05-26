const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  bookingID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentType: {// Loại thanh toán: đặt cọc hoặc thanh toán đầy đủ
    type: String,
    enum: ['deposit', 'full_payment'],
    required: true
  },
  paymentMethod: {// Phương thức thanh toán: chuyển khoản ngân hàng hoặc tiền mặt
    type: String,
    enum: ['bank_transfer', 'cash'],
    required: true
  },
  transactionDate: {// Ngày giao dịch, mặc định là ngày hiện tại
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['successful', 'refunded'],
    default: 'successful'
  }
}, {
  collection: 'payment_histories',
  timestamps: true
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
