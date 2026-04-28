const Package = require("../model/Package");
const MasterData = require("../model/MasterData");
const Hotel = require("../model/Hotel");
const Transfer = require("../model/Transfer");
const Sightseeing = require("../model/Sightseeing");
const Meal = require("../model/Meal");
const aiService = require("../services/aiService");
const markdownService = require("../services/markdownService");

// Helper to fetch all master data for a location
const fetchAllMasterData = async (state, city) => {
  const [generic, hotels, transfers, sightseeing, meals] = await Promise.all([
    MasterData.find({ state, city }),
    Hotel.find({ state, city }),
    Transfer.find({}), // Transfers might not be city-specific but we could filter if they were
    Sightseeing.find({ state, city }),
    Meal.find({}) // Meals are usually global/cuisine-based
  ]);

  // Combine and format for AI prompt
  // We can tag them so the AI knows what's what
  return [
    ...generic.map(d => ({ ...d._doc, category: d.type })),
    ...hotels.map(d => ({ ...d._doc, category: "hotel", name: d.hotelName })),
    ...transfers.map(d => ({ ...d._doc, category: "transfer", name: d.transferName })),
    ...sightseeing.map(d => ({ ...d._doc, category: "sightseeing", name: d.activityName })),
    ...meals.map(d => ({ ...d._doc, category: "meal", name: d.mealName }))
  ];
};

// Generate AI Itinerary
exports.generateAIItinerary = async (req, res) => {
  try {
    const { title, state, city, days } = req.body;
    
    // Fetch relevant master data from all collections
    const masterData = await fetchAllMasterData(state, city);
    
    const markdown = await aiService.generateItinerary(title, state, city, days, masterData);
    const structuredPackage = markdownService.parseMarkdown(markdown);
    
    // Merge with basic info
    res.status(200).json({
      ...structuredPackage,
      state,
      city,
      duration: { days, nights: Math.max(0, days - 1) }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Parse Uploaded Markdown
exports.parseMarkdownFile = async (req, res) => {
  try {
    const { markdown, state, city, days } = req.body;
    const structuredPackage = markdownService.parseMarkdown(markdown);
    
    res.status(200).json({
      ...structuredPackage,
      state,
      city,
      duration: { days: days || structuredPackage.itinerary.length, nights: Math.max(0, (days || structuredPackage.itinerary.length) - 1) }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate Prompt for copy-paste
exports.getPrompt = async (req, res) => {
  try {
    const { title, state, city, days } = req.body;
    const masterData = await fetchAllMasterData(state, city);
    const prompt = markdownService.generatePrompt(masterData, title, state, city, days);
    res.status(200).json({ prompt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save Package
exports.createPackage = async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List Packages
exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Package
exports.getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.status(200).json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Package
exports.deletePackage = async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};