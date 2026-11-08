const express = require("express");

const {
  getGuestyProperties,
  getGuestyPropertyById,
} = require("../controller/guesty.controller");

const router = express.Router();

router.get("/properties", getGuestyProperties);
router.get("/properties/:id", getGuestyPropertyById);

module.exports = router;