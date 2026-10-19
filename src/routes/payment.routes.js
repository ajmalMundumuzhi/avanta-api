
const express = require('express')
const router = express.Router()

const {
  createCheckoutSession,
  getCheckoutStatus,
} = require('../controller/payment.controller')

const {
    handleStripeWebhook
} = require("../controller/paymentWebhook.controller")

router.get('/session/:sessionId', getCheckoutStatus)

router.post('/checkout-session', createCheckoutSession)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
)

module.exports = router
