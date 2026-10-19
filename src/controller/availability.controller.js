
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const BlockedDate = require("../models/BlockedDate");

function sendError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message },
  });
}

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

async function checkAvailability(req, res, next) {
  try {
    const { propertyId } = req.params;
    const { checkin, checkout } = req.query;
    const guests = Number(req.query.guests);

    const startDate = parseDateOnly(checkin);
    const endDate = parseDateOnly(checkout);

    if (!startDate || !endDate) {
      return sendError(
        res,
        400,
        "INVALID_DATES",
        "Check-in and check-out must use valid YYYY-MM-DD dates."
      );
    }

    if (endDate <= startDate) {
      return sendError(
        res,
        400,
        "INVALID_DATE_RANGE",
        "Check-out must be after check-in."
      );
    }

    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > 100
    ) {
      return sendError(
        res,
        400,
        "INVALID_GUEST_COUNT",
        "Guests must be a whole number between 1 and 100."
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (startDate < today) {
      return sendError(
        res,
        400,
        "PAST_CHECKIN",
        "Check-in cannot be in the past."
      );
    }

    const property = await Property.findOne({
      propertyId,
      isActive: true,
      isPlaceholder: false,
      pricingConfigured: true,
    }).lean();

    if (!property) {
      return sendError(
        res,
        404,
        "PROPERTY_NOT_BOOKABLE",
        "This property is unavailable for booking or its pricing has not been configured."
      );
    }

    if (guests > property.guests) {
      return sendError(
        res,
        400,
        "GUEST_CAPACITY_EXCEEDED",
        `This property accommodates a maximum of ${property.guests} guests.`
      );
    }

    const nights = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86400000
    );

    const minimumNights = property.pricing?.minNights || 1;

    if (nights < minimumNights) {
      return res.status(200).json({
        data: {
          propertyId,
          available: false,
          reason: "MINIMUM_NIGHTS",
          message: `This property requires a minimum stay of ${minimumNights} nights.`,
          checkin,
          checkout,
          nights,
          minimumNights,
          currency: property.pricing?.currency || "AUD",
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
        .select("_id type startDate endDate")
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
        .select("_id status checkin checkout")
        .lean(),
    ]);

    if (blockedDate || conflictingBooking) {
      return res.status(200).json({
        data: {
          propertyId,
          available: false,
          reason: blockedDate ? "DATES_BLOCKED" : "DATES_BOOKED",
          message: "The property is not available for the selected dates.",
          checkin,
          checkout,
          nights,
          minimumNights,
          currency: property.pricing.currency || "AUD",
        },
      });
    }

    return res.status(200).json({
      data: {
        propertyId,
        available: true,
        checkin,
        checkout,
        nights,
        guests,
        minimumNights,
        currency: property.pricing.currency || "AUD",
        message: "The property is available for the selected dates.",
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { checkAvailability };
