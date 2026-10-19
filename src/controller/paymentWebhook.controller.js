const Stripe = require('stripe')
const Booking = require('../models/Booking')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return res.status(500).send('Webhook is not configured')
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    )
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message)
    return res.status(400).send('Invalid webhook signature')
  }

  try {
    const isSuccessfulEvent =
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'

    if (!isSuccessfulEvent) {
      return res.status(200).json({ received: true })
    }

    const session = event.data.object

    if (session.payment_status !== 'paid') {
      return res.status(200).json({ received: true })
    }

    const bookingId = session.metadata?.bookingId

    if (!bookingId) {
      console.error('Stripe Checkout Session has no bookingId metadata')
      return res.status(200).json({ received: true })
    }

    const booking = await Booking.findById(bookingId)

    if (!booking) {
      console.error('Booking not found for Stripe session:', session.id)
      return res.status(200).json({ received: true })
    }

    if (booking.payment?.sessionId !== session.id) {
      console.error('Stripe session does not match booking:', booking.reference)
      return res.status(200).json({ received: true })
    }

    if (
      booking.payment?.status === 'paid' &&
      booking.status === 'confirmed'
    ) {
      return res.status(200).json({ received: true })
    }

    if (booking.status !== 'pending') {
      console.error(
        'Paid Stripe session received for a non-pending booking:',
        booking.reference
      )
      return res.status(200).json({ received: true })
    }

    booking.payment.status = 'paid'
    booking.payment.paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null
    booking.payment.paidAt = new Date()

    booking.status = 'confirmed'

    await booking.save()

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing failed:', error)
    return res.status(500).send('Webhook processing failed')
  }
}
