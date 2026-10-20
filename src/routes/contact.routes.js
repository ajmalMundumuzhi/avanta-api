const express = require("express");
const { submitContact } = require("../controller/contact.controller");

const router = express.Router();

router.post("/", submitContact);

module.exports = router;
