
const Property = require("../models/Property");

const getProperties = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 24
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_PAGINATION",
          message: "Page must be positive and limit must be between 1 and 24."
        }
      });
    }

    const filter = {
      isActive: true,
      isPlaceholder: false
    };

    if (req.query.guests !== undefined) {
      const guests = Number(req.query.guests);

      if (!Number.isInteger(guests) || guests < 1) {
        return res.status(400).json({
          error: {
            code: "INVALID_GUESTS",
            message: "Guests must be a positive integer."
          }
        });
      }

      filter.guests = { $gte: guests };
    }

    if (req.query.bedrooms !== undefined) {
      const bedrooms = Number(req.query.bedrooms);

      if (!Number.isInteger(bedrooms) || bedrooms < 0) {
        return res.status(400).json({
          error: {
            code: "INVALID_BEDROOMS",
            message: "Bedrooms must be a non-negative integer."
          }
        });
      }

      filter.bedrooms = { $gte: bedrooms };
    }

    if (req.query.featured !== undefined) {
      if (!["true", "false"].includes(req.query.featured)) {
        return res.status(400).json({
          error: {
            code: "INVALID_FEATURED",
            message: "Featured must be true or false."
          }
        });
      }

      filter.isFeatured = req.query.featured === "true";
    }

    const sortOptions = {
      recommended: { sortOrder: 1, createdAt: -1 },
      rating: { rating: -1, sortOrder: 1 },
      newest: { createdAt: -1 }
    };

    const sortName = req.query.sort || "recommended";

    if (!sortOptions[sortName]) {
      return res.status(400).json({
        error: {
          code: "INVALID_SORT",
          message: "Sort must be recommended, rating, or newest."
        }
      });
    }

    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .select("-createdBy -updatedBy -__v")
        .sort(sortOptions[sortName])
        .skip(skip)
        .limit(limit)
        .lean(false),

      Property.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};


const getPropertyById = async (req, res, next) => {
  try {
    const propertyId = req.params.id.trim();

    if (!propertyId) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "A valid property ID is required."
        }
      });
    }

    const property = await Property.findOne({
      propertyId,
      isActive: true,
      isPlaceholder: false
    }).select("-createdBy -updatedBy -__v");

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "The requested property was not found."
        }
      });
    }

    return res.status(200).json({
      data: property
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getProperties,
  getPropertyById,
};
