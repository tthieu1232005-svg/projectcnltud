const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
    BranchID: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    SpaceCode: { type: String, required: true },
    Type: { type: String, required: true },
    PricePerHour: { type: Number, required: true },
    Status: { type: String, enum: ['available', 'booked', 'maintenance'], default: 'available' }
});

module.exports = mongoose.model('Space', spaceSchema);