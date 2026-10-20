
const mongoose = require("mongoose");

const blockedDateSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    propertyId: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: {
      type: String,
      enum: ["owner_stay", "maintenance", "external_booking", "manual"],
      required: true,
    },
    source: {
      type: String,
      enum: ["internal", "ical", "external_api"],
      default: "internal",
    },
    externalEventId: { type: String, default: null },
    notes: { type: String, default: "", maxlength: 1000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  { timestamps: true }
);

blockedDateSchema.index({ property: 1, startDate: 1, endDate: 1 });


blockedDateSchema.pre("validate", function () {
  if (
    this.startDate &&
    this.endDate &&
    this.endDate <= this.startDate
  ) {
    this.invalidate(
      "endDate",
      "End date must be after start date."
    );
  }
});


module.exports = mongoose.model("BlockedDate", blockedDateSchema);
