
const SiteSetting = require("../models/SiteSettings");

const DEFAULT_SETTINGS = {
  siteName: "Avanta Living",
  contactEmail: "Hello.avantaliving@gmail.com",
  contactPhone: "",
  address: "",
  currency: "AUD",
  timezone: "Australia/Sydney",
  checkInTime: "15:00",
  checkOutTime: "10:00",
  defaultMinNights: 1,
  cancellationPolicyNotes: "",
};

const ALLOWED_FIELDS = Object.keys(DEFAULT_SETTINGS);

async function getSettings(req, res, next) {
  try {
    const settings = await SiteSetting.findOne()
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: settings
        ? { ...DEFAULT_SETTINGS, ...settings }
        : DEFAULT_SETTINGS,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const payload = {};

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_SETTINGS",
          message: "Provide at least one setting to update.",
        },
      });
    }

    if (
      payload.contactEmail !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contactEmail)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_EMAIL",
          message: "Enter a valid contact email address.",
        },
      });
    }

    const settings = await SiteSetting.findOneAndUpdate(
      {},
      {
        $set: {
          ...payload,
          updatedBy: req.admin._id,
        },
        $setOnInsert: {},
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Settings saved successfully.",
      data: settings,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SETTINGS",
          message: error.message,
        },
      });
    }

    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
