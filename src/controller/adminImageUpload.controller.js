
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "IMAGE_REQUIRED",
          message: "Please select an image to upload.",
        },
      });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        success: false,
        error: {
          code: "CLOUDINARY_NOT_CONFIGURED",
          message: "Cloudinary credentials are not configured.",
        },
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "avanta-living/properties",
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );

      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    return res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadImage };
