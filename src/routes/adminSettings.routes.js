
const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getSettings,
  updateSettings,
} = require("../controller/adminSettings.controller");

const router = express.Router();

router.use(requireAdmin);

router.get("/", getSettings);
router.patch("/", updateSettings);

module.exports = router;
