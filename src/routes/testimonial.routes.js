
const express = require("express");
const {
  getTestimonials
} = require("../controller/testimonial.controller");

const router = express.Router();

router.get("/", getTestimonials);

module.exports = router;
