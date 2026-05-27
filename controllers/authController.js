const crypto = require('crypto');
const User = require('../models/User');
const CustomerProfile = require('../models/Customer_Profile');
const HostProfile = require('../models/Host_Profile');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function registerUser(req, res) {
  try {
    const { email, password, role = 'customer', fullName, companyName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc.' });
    }

    const normalizedEmail = sanitizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Email đã tồn tại.' });
    }

    const user = await User.create({
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role,
      status: 'activate'
    });

    if (role === 'customer') {
      await CustomerProfile.create({
        userID: user._id,
        fullName: String(fullName || 'Khách hàng mới').trim()
      });
    } else if (role === 'host') {
      await HostProfile.create({
        userID: user._id,
        companyName: String(companyName || 'Cơ sở mới').trim(),
        hotline: '',
        taxCode: '',
        bankName: '',
        bankNumber: ''
      });
    }

    return res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc.' });
    }

    const normalizedEmail = sanitizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    return res.json({
      message: 'Đăng nhập thành công.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

function logoutUser(req, res) {
  return res.json({ message: 'Đăng xuất thành công.' });
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser
};