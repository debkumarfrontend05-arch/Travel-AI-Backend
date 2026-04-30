// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const path = require("path");
// const multer = require("multer");

// const packageController = require("../controllers/packageController");

// const uploadsDir = path.join(__dirname, "..", "uploads", "packages");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     fs.mkdirSync(uploadsDir, { recursive: true });
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname || "").toLowerCase();
//     const safeExt = ext || ".jpg";
//     cb(null, `pkg-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
//   }
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (!file.mimetype || !file.mimetype.startsWith("image/")) {
//       return cb(new Error("Only image files are allowed"));
//     }
//     cb(null, true);
//   }
// });

// // AI
// router.post("/generate-ai", packageController.generateAIItinerary);

// // CRUD
// router.get("/", packageController.getPackages);
// router.post(
//   "/",
//   upload.fields([
//     { name: "coverImage", maxCount: 1 },
//     { name: "image", maxCount: 1 },
//     { name: "file", maxCount: 1 }
//   ]),
//   packageController.createPackage
// );

// router.get("/:id", packageController.getPackageById);
// router.put(
//   "/:id",
//   upload.fields([
//     { name: "coverImage", maxCount: 1 },
//     { name: "image", maxCount: 1 },
//     { name: "file", maxCount: 1 }
//   ]),
//   packageController.updatePackage
// );

// router.delete("/:id", packageController.deletePackage);

// module.exports = router;






const express = require("express");
const router = express.Router();

const upload = require("../upload/config");

const packageController = require("../controllers/packageController");

// AI
router.post("/generate-ai", packageController.generateAIItinerary);
router.post("/save-markdown", packageController.saveMarkdown);

// CRUD
router.get("/", packageController.getPackages);

router.post(
  "/",
  upload.single("image"),
  packageController.createPackage
);

router.get("/:id", packageController.getPackageById);

router.put(
  "/:id",
  upload.single("image"),
  packageController.updatePackage
);

router.delete("/:id", packageController.deletePackage);

module.exports = router;
