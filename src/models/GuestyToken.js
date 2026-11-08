const mongoose = require("mongoose");

const guestyTokenSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "booking_engine" },
    accessToken: String,
    expiresAt: Number,
    blockedUntil: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuestyToken", guestyTokenSchema);