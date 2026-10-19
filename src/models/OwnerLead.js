
const mongoose = require("mongoose");

const ownerLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    propertyAddress: { type: String, required: true, trim: true, maxlength: 500 },
    suburb: { type: String, default: "", trim: true, maxlength: 100 },
    bedrooms: { type: Number, min: 0, default: null },
    message: { type: String, default: "", trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "closed"],
      default: "new",
      index: true,
    },
    notes: { type: String, default: "", maxlength: 5000 },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

ownerLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("OwnerLead", ownerLeadSchema);
