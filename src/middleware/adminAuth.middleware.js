
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

exports.requireAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Admin authentication is required.",
        },
      });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error("ADMIN_JWT_SECRET is not configured.");
    }

    const token = header.slice(7);

    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET, {
      issuer: "avanta-living-api",
      audience: "avanta-living-admin",
    });

    if (payload.role !== "admin" || !payload.sub) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_ADMIN_TOKEN",
          message: "Invalid admin token.",
        },
      });
    }

    const admin = await AdminUser.findOne({
      _id: payload.sub,
      role: "admin",
      isActive: true,
    }).select("_id name email role");

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: "ADMIN_UNAVAILABLE",
          message: "Admin account is unavailable.",
        },
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_ADMIN_TOKEN",
          message: "Admin token is invalid or expired.",
        },
      });
    }

    next(error);
  }
};
