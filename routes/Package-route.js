const express = require('express');
const router = express.Router();
const { getAllPackages, createPackage, uploadMarkdown } = require("../controllers/Package-controller.js");

// getting all packages 
router.get('/all', getAllPackages);
// add packages 
router.post('/add', createPackage);
// upload md File
router.post("/upload-md", uploadMarkdown);

module.exports = router;