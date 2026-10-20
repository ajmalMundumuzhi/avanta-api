
const express = require("express");
const router = express.Router();

const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  toggleProperty,
  deleteProperty,
} = require("../controller/adminProperty.controller");

router.use(requireAdmin);

router.get("/", getProperties);
router.get("/:id", getProperty);
router.post("/", createProperty);
router.patch("/:id", updateProperty);
router.patch("/:id/status", toggleProperty);
router.delete("/:id", deleteProperty);

module.exports = router;
