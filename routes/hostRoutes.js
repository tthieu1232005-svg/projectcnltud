const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

const {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  createBranch,
  updateBranch,
  deleteBranchImage,
  deleteSpaceImage,
  getHostSpaces,
  getBranchSpaces,
  createSpace,
  updateSpace,
  getHostBookings,
} = require("../controllers/hostController");

// --- Profile ---
router.get("/:hostId/profile", getHostProfile);
router.put("/:hostId/profile", updateHostProfile);

// --- Branches (Cơ sở) ---
router.get("/:hostId/branches", getHostBranches);
router.post("/:hostId/branches", upload.array("image", 10), createBranch);
router.put(
  "/:hostId/branches/:branchId",
  upload.array("image", 10),
  updateBranch,
);
router.post("/:hostId/branches/:branchId/delete-image", deleteBranchImage);

// --- Spaces (Không gian / Phòng) ---
router.get("/:hostId/spaces", getHostSpaces);
router.get("/:hostId/branches/:branchId/spaces", getBranchSpaces);
router.post(
  "/:hostId/branches/:branchId/spaces",
  upload.array("image", 10),
  createSpace,
);
router.put("/:hostId/spaces/:spaceId", upload.array("image", 10), updateSpace);
router.post("/:hostId/spaces/:spaceId/delete-image", deleteSpaceImage);

module.exports = router;
