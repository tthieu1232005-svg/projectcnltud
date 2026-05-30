const mongoose = require('mongoose');

const hostProfileSchema = new mongoose.Schema({
    UserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    Avatar: {
        type: String,
        default: ''
    },

    Phone: {
        type: String,
        default: ''
    },

    Description: {
        type: String,
        default: ''
    },

    JobTitle: {
        type: String,
        default: ''
    },

    Company: {
        type: String,
        default: ''
    },

    BankName: {
        type: String,
        default: ''
    },

    BankNumber: {
        type: String,
        default: ''
    }

}, { timestamps: true });

module.exports = mongoose.model('Host_Profile', hostProfileSchema);