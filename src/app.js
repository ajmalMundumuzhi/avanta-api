const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const healthRoutes = require("./routes/health.routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as local health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed by CORS.");
      error.statusCode = 403;
      error.code = "CORS_ORIGIN_DENIED";

      return callback(error);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    },
  },
});

const propertyRoutes = require("./routes/property.routes")
const testimonialRoutes = require("./routes/testimonial.routes");
const serviceRoutes = require("./routes/service.routes");
const inquiryRoutes = require("./routes/inquiry.routes");

app.use("/api", apiLimiter);

app.use("/api/health", healthRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/testimonials", testimonialRoutes)
app.use("/api/services", serviceRoutes);
app.use("/api/inquiries", inquiryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;