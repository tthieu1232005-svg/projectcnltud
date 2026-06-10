// middlewares/upload.js
const multer = require('multer');
//
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cấu hình chìa khóa Cloudinary (Bạn nhớ thay bằng API Key thật của bạn sau nhé)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo', 
    api_key: process.env.CLOUDINARY_API_KEY || 'demo', 
    api_secret: process.env.CLOUDINARY_API_SECRET || 'demo' 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'workhub_documents',
        allowed_formats: ['jpg', 'png', 'pdf'] 
    },
});

const upload = multer({ storage: storage });
module.exports = upload;