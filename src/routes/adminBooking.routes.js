
const express = require("express");
const router = express.Router();

const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getBookings,
  getBooking,
  updateBookingStatus,
} = require("../controller/adminBookingController");

router.use(requireAdmin);

router.get("/", getBookings);
router.get("/:id", getBooking);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;
