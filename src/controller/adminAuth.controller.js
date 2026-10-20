
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required.",
        },
      });
    }

    const admin = await AdminUser.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    }).select("+passwordHash");

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error("ADMIN_JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        sub: admin._id.toString(),
        role: admin.role,
      },
      process.env.ADMIN_JWT_SECRET,
      {
        expiresIn: "8h",
        issuer: "avanta-living-api",
        audience: "avanta-living-admin",
      }
    );

    admin.lastLogin = new Date();
    await admin.save();

    return res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: 28800,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
