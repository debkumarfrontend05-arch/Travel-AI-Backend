const express = require("express");
const router = express.Router();
const masterDataController = require("../controllers/masterDataController");

// Generic locations route (uses MasterData model)
router.get("/locations", masterDataController.getLocations);

// Type-specific CRUD routes
router.get("/", masterDataController.getMasterData); // Handle /api/master-data
router.post("/:type", masterDataController.addMasterData);
router.get("/:type", masterDataController.getMasterData);
router.put("/:type/:id", masterDataController.updateMasterData);
router.delete("/:type/:id", masterDataController.deleteMasterData);

module.exports = router;