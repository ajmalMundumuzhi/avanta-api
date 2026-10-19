
const express = require("express");
const {
  getServices
} = require("../controller/service.controller");

const router = express.Router();

router.get("/", getServices);

module.exports = router;
