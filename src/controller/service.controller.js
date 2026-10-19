
const ServiceCard = require("../models/ServiceCard");

const getServices = async (req, res, next) => {
  try {
    const services = await ServiceCard.find({
      isPublished: true
    })
      .select("title text order")
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      data: services
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices
};
