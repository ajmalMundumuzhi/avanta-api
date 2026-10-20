
const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getInquiries,
  getInquiry,
  updateInquiry,
} = require("../controller/adminInquiry.controller");

const router = express.Router();

router.use(requireAdmin);

router.get("/", getInquiries);
router.get("/:id", getInquiry);
router.patch("/:id", updateInquiry);

module.exports = router;
        