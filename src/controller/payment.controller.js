
const Stripe = require('stripe')
const Booking = require('../models/Booking')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId } = req.body

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BOOKING_ID_REQUIRED',
          message: 'Booking ID is required.',
        },
      })
    }

    const booking = await Booking.findById(bookingId)

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking was not found.',
        },
      })
    }

    if (
      booking.status !== 'pending' ||
      booking.payment?.status !== 'unpaid'
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_PAYABLE',
          message: 'This booking is not available for payment.',
        },
      })
    }

    if (
      !booking.holdExpiresAt ||
      new Date(booking.holdExpiresAt) <= new Date()
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'BOOKING_HOLD_EXPIRED',
          message: 'This booking hold has expired. Please book again.',
        },
      })
    }

    const amount = Number(booking.priceBreakdown?.total)
    const currency = String(
      booking.priceBreakdown?.currency || 'AUD'
    ).toLowerCase()

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !/^[a-z]{3}$/.test(currency)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BOOKING_TOTAL',
          message: 'The saved booking total is invalid.',
        },
      })
    }

    // Stripe expects the amount in the currency's smallest unit.
    // AUD uses cents.
    const unitAmount = Math.round(amount * 100)

    if (unitAmount < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_AMOUNT',
          message: 'The payment amount is too small.',
        },
      })
    }

    const frontendUrl = process.env.FRONTEND_URL

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is not configured')
    }

    
    // Stripe Checkout requires an explicit expiry to be at least
    // 30 minutes after session creation. Use a 31-minute window.
    const checkoutExpiresAt = Math.floor(
      (Date.now() + 31 * 60 * 1000) / 1000
    )

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.guest.email,
      client_reference_id: String(booking._id),
      metadata: {
        bookingId: String(booking._id),
        bookingReference: booking.reference,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `Avanta Living booking ${booking.reference}`,
              description: `${booking.nights} night(s)`,
            },
          },
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancelled?booking_id=${booking._id}`,
      expires_at: checkoutExpiresAt,
    })

    booking.payment.sessionId = session.id
    booking.holdExpiresAt = new Date(checkoutExpiresAt * 1000)

    await booking.save()


    return res.status(200).json({
      success: true,
      data: {
        checkoutUrl: session.url,
      },
    })
  } catch (error) {
    next(error)
  }
}


exports.getCheckoutStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params

    if (
      !sessionId ||
      !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'A valid Checkout Session ID is required.',
        },
      })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return res.status(200).json({
        success: true,
        data: {
          paid: false,
          confirmed: false,
          message: 'Payment has not been confirmed yet.',
        },
      })
    }

    const bookingId = session.metadata?.bookingId

    if (!bookingId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'No booking is associated with this session.',
        },
      })
    }

    const booking = await Booking.findById(bookingId)

    if (
      !booking ||
      booking.payment?.sessionId !== session.id ||
      booking.payment?.status !== 'paid' ||
      booking.status !== 'confirmed'
    ) {
      return res.status(200).json({
        success: true,
        data: {
          paid: false,
          confirmed: false,
          message: 'Booking confirmation is still processing.',
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        paid: true,
        confirmed: true,
        reference: booking.reference,
        propertyId: booking.propertyId,
        checkin: booking.checkin,
        checkout: booking.checkout,
        nights: booking.nights,
        guests: booking.guests,
        priceBreakdown: booking.priceBreakdown,
        paidAt: booking.payment.paidAt,
      },
    })
  } catch (error) {
    next(error)
  }
}
