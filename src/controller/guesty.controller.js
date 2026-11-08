const {
  getAllListingsCached,
  getListingById,
} = require("../services/guesty.service");

function normalizeListing(listing) {
  const pictures = Array.isArray(listing.pictures)
    ? listing.pictures
    : [];

  const images = pictures
    .map((picture) => ({
      url:
        picture.regular ||
        picture.large ||
        picture.original ||
        picture.thumbnail ||
        "",
      caption: picture.caption || "",
    }))
    .filter((picture) => picture.url);

  const address = listing.address || {};
  const reviews = listing.reviews || {};

  const rating =
    reviews.avg ??
    reviews.average ??
    reviews.averageRating ??
    reviews.averageScore ??
    null;

  return {
    ...listing,

    // Raw picture fields are dropped; `image` and `images` below replace them
    pictures: undefined,
    picture: undefined,
    accountId: undefined,

    id: String(listing._id),
    propertyId: String(listing._id),

    title:
      listing.title ||
      listing.nickname ||
      "Untitled property",

    image: images[0]?.url || "",
    images,

    guests: Number(listing.accommodates) || 0,
    bedrooms: Number(listing.bedrooms) || 0,
    bathrooms: Number(listing.bathrooms) || 0,

    amenities: Array.isArray(listing.amenities)
      ? listing.amenities
      : [],

    rating,

    location:
      address.full ||
      address.city ||
      address.neighborhood ||
      null,

    address,

    publicDescription: listing.publicDescription || {},
    reviews,
  };
}

const getGuestyProperties = async (req, res, next) => {
  try {
    const result = await getAllListingsCached();

    const listings = Array.isArray(result.results)
      ? result.results
      : [];

    return res.status(200).json({
      data: listings.map(normalizeListing),
      pagination: {
        total: result.totalFetched,
        pagesFetched: result.pagesFetched,
        hasMore: result.pagesFetched >= 50,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getGuestyPropertyById = async (req, res, next) => {
  try {
    const id = req.params.id?.trim();

    if (!id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "A valid Guesty property ID is required.",
        },
      });
    }

    const result = await getListingById(id);

    const listing = result.results || result;

    if (!listing || !listing._id) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "The requested Guesty property was not found.",
        },
      });
    }

    return res.status(200).json({
      data: normalizeListing(listing),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGuestyProperties,
  getGuestyPropertyById,
};