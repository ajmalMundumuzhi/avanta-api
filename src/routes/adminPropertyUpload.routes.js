
const express = require("express");
const multer = require("multer");

const { requireAdmin } = require("../middleware/adminAuth.middleware");
const {
  uploadImage,
} = require("../controller/adminImageUpload.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image files are allowed."));
    }

    callback(null, true);
  },
});

router.post("/upload-image", requireAdmin, upload.single("image"), uploadImage);

module.exports = router;
