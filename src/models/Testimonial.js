
const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "Verified guest", trim: true },
    image: { type: String, default: "" },
    quote: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isPlaceholder: { type: Boolean, default: false },
  },
  { timestamps: true }
);

testimonialSchema.index({ isPublished: 1, order: 1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);
