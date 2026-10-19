
const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    dialCode: { type: String, default: "+61" },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    address2: { type: String, default: "" },
    city: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    state: { type: String, default: "" },
    country: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
  },
  { _id: false }
);

const nightlyPriceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    rule: { type: String, default: "base" },
  },
  { _id: false }
);

const priceBreakdownSchema = new mongoose.Schema(
  {
    nightlyPrices: { type: [nightlyPriceSchema], default: [] },
    accommodationSubtotal: { type: Number, required: true, min: 0 },
    cleaningFee: { type: Number, default: 0, min: 0 },
    additionalFees: {
      type: [
        {
          name: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    taxes: {
      type: [
        {
          name: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "AUD", uppercase: true },
    pricingVersion: { type: String, default: "1" },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    propertyId: { type: String, required: true, index: true },
    guest: { type: guestSchema, required: true },
    checkin: { type: Date, required: true },
    checkout: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    priceBreakdown: { type: priceBreakdownSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired", "completed"],
      default: "pending",
      index: true,
    },
    payment: {
      provider: { type: String, default: "stripe" },
      sessionId: { type: String, default: null },
      paymentIntentId: { type: String, default: null },
      status: {
        type: String,
        enum: ["unpaid", "pending", "paid", "failed", "refunded", "partially_refunded"],
        default: "unpaid",
      },
      paidAt: { type: Date, default: null },
      refundedAmount: { type: Number, default: 0, min: 0 },
    },
    holdExpiresAt: { type: Date, default: null, index: true },
    cancellation: {
      cancelledAt: { type: Date, default: null },
      reason: { type: String, default: "" },
      refundAmount: { type: Number, default: 0, min: 0 },
    },
    source: { type: String, default: "website" },
  },
  { timestamps: true }
);

bookingSchema.index({ property: 1, checkin: 1, checkout: 1, status: 1 });
bookingSchema.index({ "guest.email": 1, createdAt: -1 });
bookingSchema.index({ "payment.sessionId": 1 }, { sparse: true });

module.exports = mongoose.model("Booking", bookingSchema);
