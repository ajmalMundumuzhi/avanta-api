
const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/adminAuth.middleware");

router.get("/me", requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    data: { admin: req.admin },
  });
});

module.exports = router;
