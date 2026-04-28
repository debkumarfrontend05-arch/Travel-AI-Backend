const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packageController");

router.post("/generate-ai", packageController.generateAIItinerary);
router.post("/parse-md", packageController.parseMarkdownFile);
router.post("/get-prompt", packageController.getPrompt);
router.post("/", packageController.createPackage);
router.get("/", packageController.getPackages);
router.get("/:id", packageController.getPackageById);
router.delete("/:id", packageController.deletePackage);

module.exports = router;