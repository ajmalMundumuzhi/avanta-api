
const Property = require("../models/Property");
const { calculateQuote } = require("../utils/pricing");
const Booking = require("../models/Booking");
const BlockedDate = require("../models/BlockedDate");

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

async function getQuote(req, res, next) {
  try {
    const { propertyId } = req.params;
    const { checkin, checkout } = req.query;
    const guests = Number(req.query.guests);

    const startDate = parseDateOnly(checkin);
    const endDate = parseDateOnly(checkout);

    if (!startDate || !endDate || endDate <= startDate) {
      return res.status(400).json({
        error: {
          code: "INVALID_DATES",
          message: "Provide valid check-in and check-out dates.",
        },
      });
    }

    if (!Number.isInteger(guests) || guests < 1 || guests > 100) {
      return res.status(400).json({
        error: {
          code: "INVALID_GUEST_COUNT",
          message: "Guests must be a whole number between 1 and 100.",
        },
      });
    }

    const property = await Property.findOne({
      propertyId,
      isActive: true,
      isPlaceholder: false,
      pricingConfigured: true,
    }).lean();

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_BOOKABLE",
          message: "This property is not configured for booking.",
        },
      });
    }

    if (guests > property.guests) {
      return res.status(400).json({
        error: {
          code: "GUEST_CAPACITY_EXCEEDED",
          message: `This property accommodates a maximum of ${property.guests} guests.`,
        },
      });
    }

    
    const now = new Date();

    const [blockedDate, conflictingBooking] = await Promise.all([
    BlockedDate.findOne({
        property: property._id,
        startDate: { $lt: endDate },
        endDate: { $gt: startDate },
    })
        .select("_id type")
        .lean(),

    Booking.findOne({
        property: property._id,
        checkin: { $lt: endDate },
        checkout: { $gt: startDate },
        $or: [
        { status: "confirmed" },
        {
            status: "pending",
            holdExpiresAt: { $gt: now },
        },
        ],
    })
        .select("_id status")
        .lean(),
    ]);

    if (blockedDate || conflictingBooking) {
    return res.status(409).json({
        error: {
        code: "DATES_UNAVAILABLE",
        message: "This property is not available for the selected dates.",
        },
    });
    }


    const { nights, priceBreakdown } = calculateQuote(
      property,
      startDate,
      endDate,
      guests
    );

    return res.status(200).json({
      data: {
        propertyId,
        checkin,
        checkout,
        guests,
        nights,
        priceBreakdown,
      },
    });
  } catch (error) {
    if (
      error.message === "This property is not configured for booking." ||
      error.message === "A valid nightly rate has not been configured." ||
      error.message === "The cleaning fee configuration is invalid." ||
      error.message === "The minimum-night configuration is invalid." ||
      error.message === "The guest count is invalid for this property." ||
      error.message === "Check-out must be after check-in." ||
      error.message.startsWith("This property requires a minimum stay") ||
      error.message.startsWith("A nightly rate configuration is invalid.") ||
      error.message.startsWith("Unsupported fee calculation")
    ) {
      return res.status(400).json({
        error: {
          code: "QUOTE_VALIDATION_FAILED",
          message: error.message,
        },
      });
    }

    return next(error);
  }
}

module.exports = { getQuote };