
const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    dialCode: { type: String, default: "+61", trim: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, default: "", trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, default: "", trim: true, maxlength: 3000 },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
      index: true,
    },
    propertyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    propertyTitle: {
      type: String,
      default: "Property enquiry",
      trim: true,
      maxlength: 200,
    },
    propertySource: {
      type: String,
      enum: ["local", "guesty"],
      default: "guesty",
    },
    guest: {
      type: guestSchema,
      required: true,
    },
    checkin: { type: Date, default: null },
    checkout: { type: Date, default: null },
    guests: { type: Number, required: true, min: 1 },
    marketingOptIn: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
      index: true,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    notes: { type: String, default: "", maxlength: 5000 },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

inquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Inquiry", inquirySchema);
