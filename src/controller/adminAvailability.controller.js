
const mongoose = require("mongoose");
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const BlockedDate = require("../models/BlockedDate");

exports.getAvailability = async (req, res, next) => {
  try {
    const { propertyId, start, end } = req.query;

    if (!mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PROPERTY_ID", message: "Valid propertyId is required." },
      });
    }

    const property = await Property.findById(propertyId).select("propertyId title").lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: "PROPERTY_NOT_FOUND", message: "Property not found." },
      });
    }

    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 90 * 86400000);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate >= endDate
    ) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_DATE_RANGE", message: "Provide a valid start and end date." },
      });
    }

    const [bookings, blockedDates] = await Promise.all([
      Booking.find({
        property: property._id,
        status: "confirmed",
        checkin: { $lt: endDate },
        checkout: { $gt: startDate },
      }).select("reference checkin checkout status").lean(),
      BlockedDate.find({
        property: property._id,
        startDate: { $lt: endDate },
        endDate: { $gt: startDate },
      }).lean(),
    ]);

    res.json({
      success: true,
      data: { property, bookings, blockedDates },
    });
  } catch (error) {
    next(error);
  }
};


exports.createBlock = async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate, type, source, notes } = req.body;

    if (!propertyId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Property, start date and end date are required.",
        },
      });
    }

    if (!mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Invalid property ID.",
        },
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_DATE_RANGE",
          message: "End date must be after start date.",
        },
      });
    }

    const allowedTypes = [
      "owner_stay",
      "maintenance",
      "external_booking",
      "manual",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BLOCK_TYPE",
          message: "Choose a valid blocked-date type.",
        },
      });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found.",
        },
      });
    }

    const conflict = await Booking.findOne({
      property: property._id,
      status: "confirmed",
      checkin: { $lt: end },
      checkout: { $gt: start },
    }).select("_id reference");

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: {
          code: "BOOKING_CONFLICT",
          message: `These dates overlap confirmed booking ${conflict.reference || conflict._id}.`,
        },
      });
    }

    const block = await BlockedDate.create({
      property: property._id,
      propertyId: property.propertyId,
      startDate: start,
      endDate: end,
      type,
      source: source === "internal" ? "internal" : "internal",
      notes: typeof notes === "string" ? notes.trim() : "",
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      data: { block },
    });
  } catch (error) {
    next(error);
  }
};


exports.deleteBlock = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_BLOCK_ID", message: "Invalid block ID." },
      });
    }

    const block = await BlockedDate.findByIdAndDelete(req.params.id);

    if (!block) {
      return res.status(404).json({
        success: false,
        error: { code: "BLOCK_NOT_FOUND", message: "Blocked date not found." },
      });
    }

    res.json({ success: true, message: "Blocked dates removed." });
  } catch (error) {
    next(error);
  }
};
