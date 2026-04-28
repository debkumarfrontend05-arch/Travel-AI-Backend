const Package = require("../model/Package");
const MasterData = require("../model/MasterData");
const Hotel = require("../model/Hotel");
const Transfer = require("../model/Transfer");
const Sightseeing = require("../model/Sightseeing");
const Meal = require("../model/Meal");

const aiService = require("../services/aiService");
const markdownService = require("../services/markdownService");

// ---------- AI HELPERS ----------
const fetchAllMasterData = async (state, city) => {
  const [generic, hotels, transfers, sightseeing, meals] = await Promise.all([
    MasterData.find({ state, city }),
    Hotel.find({ state, city }),
    Transfer.find({}),
    Sightseeing.find({ state, city }),
    Meal.find({})
  ]);

  return [
    ...generic.map(d => ({ ...d._doc, category: d.type })),
    ...hotels.map(d => ({ ...d._doc, category: "hotel", name: d.hotelName })),
    ...transfers.map(d => ({ ...d._doc, category: "transfer", name: d.transferName })),
    ...sightseeing.map(d => ({ ...d._doc, category: "sightseeing", name: d.activityName })),
    ...meals.map(d => ({ ...d._doc, category: "meal", name: d.mealName }))
  ];
};

// ---------- AI ----------
exports.generateAIItinerary = async (req, res) => {
  try {
    const { title, state, city, days } = req.body;

    const masterData = await fetchAllMasterData(state, city);
    const markdown = await aiService.generateItinerary(title, state, city, days, masterData);
    const structuredPackage = markdownService.parseMarkdown(markdown);

    res.json({
      ...structuredPackage,
      state,
      city,
      duration: { days, nights: Math.max(0, days - 1) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- CRUD ----------
exports.createPackage = async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPackages = async (req, res) => {
  const data = await Package.find().sort({ createdAt: -1 });
  res.json(data);
};

exports.getPackageById = async (req, res) => {
  const data = await Package.findById(req.params.id);
  if (!data) return res.status(404).json({ message: "Not found" });
  res.json(data);
};

exports.updatePackage = async (req, res) => {
  const updated = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
};

exports.deletePackage = async (req, res) => {
  await Package.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};