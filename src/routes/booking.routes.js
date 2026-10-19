const express = require('express')
const router = express.Router()
const { createBooking } = require('../controller/booking.controller')

router.post('/', createBooking)

module.exports = router