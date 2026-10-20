
const mongoose = require("mongoose");
const Property = require("../models/Property");


async function generatePropertyId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    const exists = await Property.exists({ propertyId: id });
    if (!exists) return id;
  }

  throw new Error("Could not generate a unique property ID.");
}

function isPricingConfigured(pricing) {
  return (
    Number.isFinite(Number(pricing?.nightlyRate)) &&
    Number(pricing.nightlyRate) > 0 &&
    Number.isFinite(Number(pricing?.minNights)) &&
    Number(pricing.minNights) >= 1
  );
}

exports.getProperties = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};

    if (req.query.search?.trim()) {
      const search = req.query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { propertyId: { $regex: search, $options: "i" } },
      ];
    }

    if (["true", "false"].includes(req.query.isActive)) {
      filter.isActive = req.query.isActive === "true";
    }

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Property.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        properties,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProperty = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PROPERTY_ID", message: "Invalid property ID." },
      });
    }

    const property = await Property.findById(req.params.id).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: "PROPERTY_NOT_FOUND", message: "Property not found." },
      });
    }

    res.status(200).json({ success: true, data: { property } });
  } catch (error) {
    next(error);
  }
};



function isPricingConfigured(pricing) {
  const nightlyRate = Number(pricing?.nightlyRate);
  const minNights = Number(pricing?.minNights);

  return (
    pricing?.nightlyRate !== null &&
    pricing?.nightlyRate !== undefined &&
    pricing?.nightlyRate !== "" &&
    Number.isFinite(nightlyRate) &&
    nightlyRate > 0 &&
    Number.isFinite(minNights) &&
    minNights >= 1
  );
}

exports.createProperty = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    delete payload.propertyId;
    delete payload.createdBy;
    delete payload.updatedBy;
    delete payload.pricingConfigured;

    payload.propertyId = await generatePropertyId();
    payload.createdBy = req.admin._id;
    payload.updatedBy = req.admin._id;

    if (payload.title) {
      payload.slug = payload.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    payload.pricingConfigured = isPricingConfigured(payload.pricing);

    const property = await Property.create(payload);

    res.status(201).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.code = "DUPLICATE_PROPERTY";
      error.message = "A property with this identifier already exists.";
    }

    next(error);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Invalid property ID.",
        },
      });
    }

    const allowedFields = [
      "title",
      "location",
      "address",
      "city",
      "state",
      "country",
      "description",
      "images",
      "guests",
      "bedrooms",
      "bathrooms",
      "amenities",
      "amenityGroups",
      "pricing",
      "cancellationPolicy",
      "houseRules",
      "checkInTime",
      "checkOutTime",
      "timezone",
      "isActive",
      "isFeatured",
      "isPlaceholder",
      "sortOrder",
      "rating",
      "reviewCount",
    ];

    const payload = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    if (payload.title) {
      payload.slug = payload.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    const existingProperty = await Property.findById(req.params.id);

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found.",
        },
      });
    }

    const finalPricing = payload.pricing
      ? {
          ...(existingProperty.pricing?.toObject?.() ||
            existingProperty.pricing?.toJSON?.() ||
            existingProperty.pricing ||
            {}),
          ...payload.pricing,
        }
      : existingProperty.pricing;

    payload.pricingConfigured = isPricingConfigured(finalPricing);
    payload.updatedBy = req.admin._id;

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { returnDocument: "after", runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};


exports.toggleProperty = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PROPERTY_ID", message: "Invalid property ID." },
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "isActive must be true or false.",
        },
      });
    }

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { returnDocument: "after", runValidators: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: "PROPERTY_NOT_FOUND", message: "Property not found." },
      });
    }

    res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_PROPERTY_ID", message: "Invalid property ID." },
      });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: "PROPERTY_NOT_FOUND", message: "Property not found." },
      });
    }

    property.isActive = false;
    await property.save();

    res.status(200).json({
      success: true,
      message: "Property deactivated successfully.",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};
