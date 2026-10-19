
const mongoose = require("mongoose");

const serviceCardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceCardSchema.index({ isPublished: 1, order: 1 });

module.exports = mongoose.model("ServiceCard", serviceCardSchema);
