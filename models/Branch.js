const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    HostID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Name: { type: String, required: true },
    Address: { type: String, required: true },
    Description: String,
    Stars: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'CreateAt', updatedAt: false } });

module.exports = mongoose.model('Branch', branchSchema);