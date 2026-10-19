
const express = require("express");
const { getProperties } = require("../controller/property.controller");

const router = express.Router();

router.get("/", getProperties);

module.exports = router;
