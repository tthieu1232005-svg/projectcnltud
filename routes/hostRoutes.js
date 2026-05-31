const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

const {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  createBranch,
  updateBranch,
  getHostSpaces,
  getBranchSpaces,
  createSpace,
  updateSpace,
  getHostBookings,
} = require("../controllers/hostController");

// Profile
router.get("/:hostId/profile", getHostProfile);
router.put("/:hostId/profile", updateHostProfile);

// Branches — upload.single("image") xử lý field <input name="image">
router.get("/:hostId/branches", getHostBranches);
router.post("/:hostId/branches", upload.single("image"), createBranch);
router.put("/:hostId/branches/:branchId", upload.single("image"), updateBranch);

// Spaces
router.get("/:hostId/spaces", getHostSpaces);
router.get("/:hostId/branches/:branchId/spaces", getBranchSpaces);
router.post(
  "/:hostId/branches/:branchId/spaces",
  upload.single("image"),
  createSpace,
);
router.put("/:hostId/spaces/:spaceId", upload.single("image"), updateSpace);

// Bookings
router.get("/:hostId/bookings", getHostBookings);

module.exports = router;
