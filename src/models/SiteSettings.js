
const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: "Avanta Living",
      trim: true,
      maxlength: 150,
    },
    contactEmail: {
      type: String,
      default: "Hello.avantaliving@gmail.com",
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    currency: {
      type: String,
      enum: ["AUD", "USD", "INR", "GBP", "EUR", "NZD"],
      default: "AUD",
    },
    timezone: {
      type: String,
      default: "Australia/Sydney",
      trim: true,
      maxlength: 100,
    },
    checkInTime: {
      type: String,
      default: "15:00",
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    checkOutTime: {
      type: String,
      default: "10:00",
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    defaultMinNights: {
      type: Number,
      default: 1,
      min: 1,
      max: 365,
    },
    cancellationPolicyNotes: {
      type: String,
      default: "",
      maxlength: 5000,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
