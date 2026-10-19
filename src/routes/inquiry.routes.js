
const express = require("express");
const { createInquiry } = require("../controller/inquiry.controller");

const router = express.Router();

router.post("/", createInquiry);

module.exports = router;
