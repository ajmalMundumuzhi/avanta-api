
const mongoose = require("mongoose");
const Inquiry = require("../models/Inquiry");

exports.getInquiries = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};
    const allowedStatuses = ["new", "contacted", "converted", "closed"];

    if (req.query.status && req.query.status !== "all") {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_STATUS", message: "Invalid inquiry status." },
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().slice(0, 150);
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      const conditions = [
        { "guest.firstName": regex },
        { "guest.lastName": regex },
        { "guest.email": regex },
        { "guest.phone": regex },
        { propertyId: regex },
      ];

      if (mongoose.isValidObjectId(search)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(search) });
      }

      filter.$or = conditions;
    }

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .populate("property", "title propertyId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inquiries,
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

exports.getInquiry = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INQUIRY_ID",
          message: "Invalid inquiry ID.",
        },
      });
    }

    const inquiry = await Inquiry.findById(req.params.id)
      .populate("property", "title propertyId location city")
      .lean();

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INQUIRY_NOT_FOUND",
          message: "Inquiry not found.",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { inquiry },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInquiry = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INQUIRY_ID",
          message: "Invalid inquiry ID.",
        },
      });
    }

    const allowedStatuses = ["new", "contacted", "converted", "closed"];
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Status must be new, contacted, converted, or closed.",
          },
        });
      }

      updates.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "notes")) {
      if (
        typeof req.body.notes !== "string" ||
        req.body.notes.length > 5000
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_NOTES",
            message: "Notes must be a string with at most 5000 characters.",
          },
        });
      }

      updates.notes = req.body.notes.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_UPDATES",
          message: "Provide a valid status or notes update.",
        },
      });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).populate("property", "title propertyId");

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INQUIRY_NOT_FOUND",
          message: "Inquiry not found.",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { inquiry },
    });
  } catch (error) {
    next(error);
  }
};
