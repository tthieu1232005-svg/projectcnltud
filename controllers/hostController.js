const HostProfile = require("../models/Host_Profile");
const Branch = require("../models/Branch");
const Space = require("../models/Space");
const Booking = require("../models/Booking");

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: "Lỗi máy chủ, vui lòng thử lại sau." });
}

// ==================== HOST PROFILE ====================
async function getHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    const profile = await HostProfile.findOne({ UserID: hostId }).lean();
    if (!profile)
      return res.status(404).json({ error: "Hồ sơ không tìm thấy." });
    return res.json({ profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateHostProfile(req, res) {
  try {
    const { hostId } = req.params;
    const profile = await HostProfile.findOneAndUpdate(
      { UserID: hostId },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return res.json({ message: "Cập nhật hồ sơ thành công.", profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==================== BRANCHES ====================
async function getHostBranches(req, res) {
  try {
    const { hostId } = req.params;
    const branches = await Branch.find({ HostID: hostId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function createBranch(req, res) {
  try {
    const { hostId } = req.params;

    // SỬA LỖI: Đọc mảng ảnh từ req.files thay vì req.file
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => images.push(`/uploads/${file.filename}`));
    }

    const branch = await Branch.create({
      HostID: hostId,
      Name: req.body.name,
      Address: req.body.address,
      Description: req.body.note || "",
      City: req.body.city || "Thành phố Hồ Chí Minh",
      District: req.body.district || "",
      OpeningTime: req.body.openingTime || "07:00",
      ClosingTime: req.body.closingTime || "22:00",
      Images: images,
    });
    return res.status(201).json(branch);
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateBranch(req, res) {
  try {
    const { hostId, branchId } = req.params;

    const updateData = {
      Name: req.body.name || undefined,
      Address: req.body.address || undefined,
      Description: req.body.note !== undefined ? req.body.note : undefined,
      OpeningTime: req.body.openingTime || undefined,
      ClosingTime: req.body.closingTime || undefined,
    };

    // SỬA LỖI: Sử dụng $push để thêm ảnh mới vào mảng cũ, hoặc thay thế mảng tuỳ logic của bạn
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      // Ở đây dùng $push để giữ lại ảnh cũ, chỉ thêm ảnh mới lên
      const branch = await Branch.findOneAndUpdate(
        { _id: branchId, HostID: hostId },
        { $set: updateData, $push: { Images: { $each: newImages } } },
        { new: true },
      ).lean();

      if (!branch)
        return res.status(404).json({ error: "Chi nhánh không tìm thấy." });
      return res.json({ message: "Cập nhật cơ sở thành công.", branch });
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, HostID: hostId },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!branch)
      return res.status(404).json({ error: "Chi nhánh không tìm thấy." });
    return res.json({ message: "Cập nhật cơ sở thành công.", branch });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==================== SPACES ====================
async function getHostSpaces(req, res) {
  try {
    const { hostId } = req.params;
    const spaces = await Space.find({ HostID: hostId })
      .populate("BranchID", "Name")
      .lean();
    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function getBranchSpaces(req, res) {
  try {
    const { branchId } = req.params;
    const spaces = await Space.find({ BranchID: branchId }).lean();
    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function createSpace(req, res) {
  try {
    const { hostId, branchId } = req.params;
    const branch = await Branch.findOne({
      _id: branchId,
      HostID: hostId,
    }).lean();
    if (!branch)
      return res.status(404).json({ error: "Chi nhánh không tồn tại." });

    // SỬA LỖI: Đọc mảng ảnh từ req.files thay vì req.file
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => images.push(`/uploads/${file.filename}`));
    }

    const space = await Space.create({
      BranchID: branchId,
      HostID: hostId,
      SpaceCode: req.body.id,
      Name: req.body.name || req.body.id,
      Category: mapCategory(req.body.type),
      PricePerHour: Number(String(req.body.price || "0").replace(/\D/g, "")),
      Status: mapStatus(req.body.status),
      Images: images,
    });
    return res.status(201).json(space);
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ error: "Mã không gian đã tồn tại." });
    return sendServerError(res, error);
  }
}

async function updateSpace(req, res) {
  try {
    const { hostId, spaceId } = req.params;

    const updateData = {
      PricePerHour:
        req.body.pricePerHour !== undefined
          ? Number(String(req.body.pricePerHour).replace(/\D/g, ""))
          : undefined,
      Status: req.body.status || undefined,
      Name: req.body.name || undefined,
    };

    // SỬA LỖI: Sử dụng $push để đẩy thêm loạt ảnh mới vào mảng Images hiện tại
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      const space = await Space.findOneAndUpdate(
        { _id: spaceId, HostID: hostId },
        { $set: updateData, $push: { Images: { $each: newImages } } },
        { new: true },
      ).lean();
      if (!space)
        return res.status(404).json({ error: "Không gian không tìm thấy." });
      return res.json({ message: "Cập nhật không gian thành công.", space });
    }

    const space = await Space.findOneAndUpdate(
      { _id: spaceId, HostID: hostId },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!space)
      return res.status(404).json({ error: "Không gian không tìm thấy." });
    return res.json({ message: "Cập nhật không gian thành công.", space });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==================== BOOKINGS ====================
async function getHostBookings(req, res) {
  try {
    const { hostId } = req.params;
    const bookings = await Booking.find({ HostID: hostId })
      .populate("CustomerID", "FullName Email")
      .populate("SpaceID", "SpaceCode Name")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==================== HELPERS ====================
function mapCategory(type) {
  const map = {
    "Phòng họp": "meeting_room",
    "Chỗ ngồi tự do": "desk",
    "Văn phòng": "office",
    "Sự kiện": "event",
    meeting_room: "meeting_room",
    desk: "desk",
    office: "office",
    event: "event",
  };
  return map[type] || "desk";
}

function mapStatus(status) {
  const map = {
    ready: "available",
    preparing: "available",
    occupied: "available",
    suspended: "inactive",
    available: "available",
    maintenance: "maintenance",
    inactive: "inactive",
  };
  return map[status] || "available";
}

async function deleteBranchImage(req, res) {
  try {
    const { hostId, branchId } = req.params;
    const { imageUrl } = req.body;
    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, HostID: hostId },
      { $pull: { Images: imageUrl } },
      { new: true },
    );
    if (!branch)
      return res.status(404).json({ error: "Không tìm thấy cơ sở." });
    return res.json({ message: "Đã xóa ảnh thành công.", branch });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function deleteSpaceImage(req, res) {
  try {
    const { hostId, spaceId } = req.params;
    const { imageUrl } = req.body;
    const space = await Space.findOneAndUpdate(
      { _id: spaceId, HostID: hostId },
      { $pull: { Images: imageUrl } },
      { new: true },
    );
    if (!space)
      return res.status(404).json({ error: "Không tìm thấy không gian." });
    return res.json({ message: "Đã xóa ảnh thành công.", space });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  createBranch,
  updateBranch,
  deleteBranchImage,
  getHostSpaces,
  getBranchSpaces,
  createSpace,
  updateSpace,
  deleteSpaceImage,
  getHostBookings,
};
