const express = require("express");
const { getDatabaseStatus } = require("../config/database");

const router = express.Router();

router.get("/", (req, res) => {
  const database = getDatabaseStatus();

  res.status(200).json({
    data: {
      status: "ok",
      service: "Avanta Living API",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database,
    },
  });
});

module.exports = router;