
const express = require('express')
const router = express.Router()

const {
  handleStripeWebhook,
} = require('../controller/paymentWebhook.controller')

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
)

module.exports = router
