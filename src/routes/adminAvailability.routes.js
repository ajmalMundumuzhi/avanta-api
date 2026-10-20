
const express = require("express");
const router = express.Router();

const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getAvailability,
  createBlock,
  deleteBlock,
} = require("../controller/adminAvailability.controller");

router.use(requireAdmin);

router.get("/", getAvailability);
router.post("/blocks", createBlock);
router.delete("/blocks/:id", deleteBlock);

module.exports = router;
