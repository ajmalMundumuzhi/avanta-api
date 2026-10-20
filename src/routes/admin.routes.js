
const express = require("express");
const router = express.Router();

const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getDashboard,
} = require("../controller/adminDashboard.controller");

router.get("/me", requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    data: { admin: req.admin },
  });
});

router.get("/dashboard", requireAdmin, getDashboard);

module.exports = router;
