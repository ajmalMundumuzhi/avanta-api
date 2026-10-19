
const Testimonial = require("../models/Testimonial");

const getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({
      isPublished: true,
      isPlaceholder: { $ne: true }
    })
      .select("name role image quote order")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      data: testimonials
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTestimonials
};
