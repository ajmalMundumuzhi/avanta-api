const express = require("express");
const { getQuote } = require("../controller/pricing.controller");

const router = express.Router();

router.get("/:propertyId/quote", getQuote);

module.exports = router;
