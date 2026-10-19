
const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      default: null,
    },
    alt: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const amenityGroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const seasonalRateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    nightlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const additionalFeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    calculation: {
      type: String,
      enum: ["fixed_per_booking", "per_night", "per_guest_per_night"],
      default: "fixed_per_booking",
    },
    taxable: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const taxSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    appliesTo: {
      type: [String],
      enum: ["accommodation", "cleaning", "additional_fees"],
      default: ["accommodation"],
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    nightlyRate: {
      type: Number,
      default: null,
      min: 0,
    },
    cleaningFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    minNights: {
      type: Number,
      default: 1,
      min: 1,
    },
    currency: {
      type: String,
      default: "AUD",
      uppercase: true,
      trim: true,
    },
    weekendRates: {
      // JavaScript day numbers: Sunday = 0, Saturday = 6.
      type: [
        {
          dayOfWeek: {
            type: Number,
            required: true,
            min: 0,
            max: 6,
          },
          nightlyRate: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      default: [],
    },
    seasonalRates: {
      type: [seasonalRateSchema],
      default: [],
    },
    taxes: {
      type: [taxSchema],
      default: [],
    },
    additionalFees: {
      type: [additionalFeeSchema],
      default: [],
    },
    pricingNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const cancellationRuleSchema = new mongoose.Schema(
  {
    daysBeforeArrival: {
      type: Number,
      required: true,
      min: 0,
    },
    refundPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const cancellationPolicySchema = new mongoose.Schema(
  {
    rules: {
      type: [cancellationRuleSchema],
      default: [
        { daysBeforeArrival: 14, refundPercentage: 100 },
        { daysBeforeArrival: 7, refundPercentage: 50 },
      ],
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    // Stable ID used by existing frontend URLs, e.g. "441841".
    propertyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[a-zA-Z0-9_-]+$/,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "Sydney",
      trim: true,
    },

    state: {
      type: String,
      default: "NSW",
      trim: true,
    },

    country: {
      type: String,
      default: "Australia",
      trim: true,
    },

    description: {
      type: [String],
      default: [],
    },

    images: {
      type: [imageSchema],
      default: [],
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
    },

    bedrooms: {
      type: Number,
      required: true,
      min: 0,
    },

    bathrooms: {
      type: Number,
      required: true,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    amenities: {
      type: [String],
      default: [],
    },

    amenityGroups: {
      type: [amenityGroupSchema],
      default: [],
    },

    pricing: {
      type: pricingSchema,
      default: () => ({}),
    },

    cancellationPolicy: {
      type: cancellationPolicySchema,
      default: () => ({}),
    },

    houseRules: {
      type: [String],
      default: [],
    },

    checkInTime: {
      type: String,
      default: "15:00",
    },

    checkOutTime: {
      type: String,
      default: "10:00",
    },

    timezone: {
      type: String,
      default: "Australia/Sydney",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPlaceholder: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    pricingConfigured: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret.propertyId;
        delete ret._id;
        delete ret.__v;
        delete ret.propertyId;
        return ret;
      },
    },
  }
);

propertySchema.index({ isActive: 1, isFeatured: 1, sortOrder: 1 });
propertySchema.index({ bedrooms: 1, guests: 1 });
propertySchema.index({ rating: -1 });

module.exports = mongoose.model("Property", propertySchema);
