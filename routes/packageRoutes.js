const express = require("express");
const router = express.Router();

const packageController = require("../controllers/packageController");

// AI
router.post("/generate-ai", packageController.generateAIItinerary);

// CRUD
router.get("/", packageController.getPackages);
router.post("/", packageController.createPackage);
router.get("/:id", packageController.getPackageById);
router.put("/:id", packageController.updatePackage);
router.delete("/:id", packageController.deletePackage);

module.exports = router;