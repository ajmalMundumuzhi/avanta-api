
const mongoose = require("mongoose");
const Booking = require("../models/Booking");

exports.getBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};

    const allowedStatuses = [
      "pending", "confirmed", "cancelled", "expired", "completed",
    ];

    if (allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim();
      const conditions = [
        { reference: { $regex: search, $options: "i" } },
        { propertyId: { $regex: search, $options: "i" } },
        { "guest.name": { $regex: search, $options: "i" } },
        { "guest.email": { $regex: search, $options: "i" } },
      ];

      if (mongoose.isValidObjectId(search)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(search) });
      }

      filter.$or = conditions;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_BOOKING_ID", message: "Invalid booking ID." },
      });
    }

    const booking = await Booking.findById(req.params.id).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found." },
      });
    }

    res.json({ success: true, data: { booking } });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_BOOKING_ID", message: "Invalid booking ID." },
      });
    }

    const { status } = req.body;
    const allowedStatuses = ["cancelled", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BOOKING_STATUS",
          message: "Admin can set status to cancelled or completed only.",
        },
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found." },
      });
    }

    if (booking.status === status) {
      return res.json({ success: true, data: { booking } });
    }

    if (["cancelled", "expired", "completed"].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        error: {
          code: "BOOKING_STATE_CONFLICT",
          message: `Cannot change a ${booking.status} booking.`,
        },
      });
    }

    if (status === "completed" && booking.status !== "confirmed") {
      return res.status(409).json({
        success: false,
        error: {
          code: "BOOKING_STATE_CONFLICT",
          message: "Only confirmed bookings can be completed.",
        },
      });
    }

    if (status === "cancelled" && booking.payment?.status === "paid") {
      return res.status(409).json({
        success: false,
        error: {
          code: "REFUND_REVIEW_REQUIRED",
          message: "This booking is paid. Process the cancellation and refund workflow before changing its status.",
        },
      });
    }

    booking.status = status;
    await booking.save();

    res.json({ success: true, data: { booking } });
  } catch (error) {
    next(error);
  }
};
