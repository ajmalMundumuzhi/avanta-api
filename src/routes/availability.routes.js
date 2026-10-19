
const express = require("express");
const {
  checkAvailability,
} = require("../controller/availability.controller");

const router = express.Router();

router.get("/:propertyId", checkAvailability);

module.exports = router;
