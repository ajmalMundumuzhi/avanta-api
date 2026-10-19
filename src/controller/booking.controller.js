
const Property = require('../models/Property')
const Booking = require('../models/Booking')
const BlockedDate = require('../models/BlockedDate')
const { calculateQuote } = require('../utils/pricing')
const crypto = require('crypto')

const HOLD_MINUTES = 15

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return date.toISOString().slice(0, 10) === value ? date : null
}

function validGuest(guest) {
  if (!guest || typeof guest !== 'object' || Array.isArray(guest)) {
    return false
  }

  const required = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'city',
    'zip',
    'country',
  ]

  return required.every(
    (key) => typeof guest[key] === 'string' && guest[key].trim()
  )
}

async function createBooking(req, res, next) {
  try {
    const {
      propertyId,
      guest,
      checkin,
      checkout,
      guests,
      marketing = false,
    } = req.body

    if (
      typeof propertyId !== 'string' ||
      !propertyId.trim() ||
      !validGuest(guest) ||
      !Number.isInteger(guests) ||
      guests < 1 ||
      typeof marketing !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BOOKING_DETAILS',
          message: 'Please provide valid guest and booking details.',
        },
      })
    }

    const start = parseDateOnly(checkin)
    const end = parseDateOnly(checkout)
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
    )

    if (!start || !end || end <= start || start < today) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BOOKING_DATES',
          message: 'Check-in and check-out dates are invalid.',
        },
      })
    }

    const property = await Property.findOne({
        propertyId,
        isActive: true,
        isPlaceholder: false,
        pricingConfigured: true,
    }).lean()

    if (!property) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROPERTY_NOT_BOOKABLE',
          message: 'This property is not available for booking.',
        },
      })
    }

    if (guests > property.guests) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GUEST_LIMIT_EXCEEDED',
          message: `This property allows up to ${property.guests} guests.`,
        },
      })
    }

    const now = new Date()

    const blocked = await BlockedDate.findOne({
      property: property._id,
      startDate: { $lt: end },
      endDate: { $gt: start },
    }).lean()

    if (blocked) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DATES_UNAVAILABLE',
          message: 'These dates are unavailable. Please choose different dates.',
        },
      })
    }

    const conflict = await Booking.findOne({
      property: property._id,
      checkin: { $lt: end },
      checkout: { $gt: start },
      $or: [
        { status: 'confirmed' },
        {
          status: 'pending',
          holdExpiresAt: { $gt: now },
        },
      ],
    }).lean()

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DATES_UNAVAILABLE',
          message: 'These dates have just become unavailable.',
        },
      })
    }

    // Always calculate the authoritative price on the server.
    const quote = calculateQuote(property, start, end, guests)

    const nights = Math.round((end - start) / 86400000)
    const holdExpiresAt = new Date(
      Date.now() + HOLD_MINUTES * 60 * 1000
    )

    const booking = await Booking.create({
      reference: `AV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      property: property._id,
      propertyId: property.propertyId,
      guest: {
        ...guest,
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim().toLowerCase(),
        phone: guest.phone.trim(),
        address: guest.address.trim(),
        address2: typeof guest.address2 === 'string' ? guest.address2.trim() : '',
        city: guest.city.trim(),
        zip: guest.zip.trim(),
        state: typeof guest.state === 'string' ? guest.state.trim() : '',
        country: guest.country.trim(),
      },
      checkin: start,
      checkout: end,
      nights,
      guests,
      priceBreakdown: quote.priceBreakdown,
      status: 'pending',
      payment: {
        provider: 'stripe',
        sessionId: null,
        paymentIntentId: null,
        status: 'unpaid',
        paidAt: null,
        refundedAmount: 0,
      },
      holdExpiresAt,
    })

    return res.status(201).json({
      success: true,
      message: 'Booking hold created. Payment is not yet completed.',
      data: {
        bookingId: booking._id,
        reference: booking.reference,
        propertyId: booking.propertyId,
        checkin,
        checkout,
        nights,
        guests,
        priceBreakdown: booking.priceBreakdown,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        holdExpiresAt: booking.holdExpiresAt,
      },
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BOOKING_VALIDATION_FAILED',
          message: error.message,
        },
      })
    }

    next(error)
  }
}

module.exports = { createBooking }
