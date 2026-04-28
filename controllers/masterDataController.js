const MasterData = require("../model/MasterData");
const Hotel = require("../model/Hotel");
const Transfer = require("../model/Transfer");
const Sightseeing = require("../model/Sightseeing");
const Meal = require("../model/Meal");

// Helper to get model based on type
const getModel = (type) => {
  const normalizedType = type?.toLowerCase();
  switch (normalizedType) {
    case "hotel":
    case "hotels":
      return Hotel;
    case "transfer":
    case "transfers":
      return Transfer;
    case "sightseeing":
      return Sightseeing;
    case "meal":
    case "meals":
      return Meal;
    case "master":
    case "master-data":
      return MasterData;
    default:
      return null;
  }
};

// Add Master Data
exports.addMasterData = async (req, res) => {
  try {
    const { type } = req.params;
    const Model = getModel(type);

    if (!Model) {
      return res.status(400).json({ message: `Invalid type: ${type}` });
    }

    const newData = new Model(req.body);
    await newData.save();
    res.status(201).json(newData);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate entry found." });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Add Master Data Error:", error);
    res.status(500).json({ message: "Internal Server Error: " + error.message });
  }
};

// Fetch Master Data
exports.getMasterData = async (req, res) => {
  try {
    const type = req.params.type || "master";
    const normalizedType = type?.toLowerCase();
    
    if (normalizedType === "master" || normalizedType === "master-data") {
      const { state, city } = req.query;
      const filter = {};
      if (state) filter.state = state;
      if (city) filter.city = city;

      const [hotels, transfers, sightseeing, meals, master] = await Promise.all([
        Hotel.find(filter).lean(),
        Transfer.find(filter).lean(),
        Sightseeing.find(filter).lean(),
        Meal.find(filter).lean(),
        MasterData.find(filter).lean()
      ]);

      const combined = [
        ...hotels.map(i => ({ ...i, category: "hotel" })),
        ...transfers.map(i => ({ ...i, category: "transfer" })),
        ...sightseeing.map(i => ({ ...i, category: "sightseeing" })),
        ...meals.map(i => ({ ...i, category: "meal" })),
        ...master.map(i => ({ ...i, category: i.type || "other" }))
      ];

      return res.status(200).json(combined.sort((a, b) => b.createdAt - a.createdAt));
    }

    const Model = getModel(type);
    if (!Model) {
      return res.status(400).json({ message: `Invalid type: ${type}` });
    }

    const data = await Model.find(req.query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Master Data
exports.updateMasterData = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModel(type);

    if (!Model) {
      return res.status(400).json({ message: `Invalid type: ${type}` });
    }

    const updatedData = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedData) {
      return res.status(404).json({ message: "Data not found" });
    }
    res.status(200).json(updatedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Master Data
exports.deleteMasterData = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModel(type);

    if (!Model) {
      return res.status(400).json({ message: `Invalid type: ${type}` });
    }

    const deletedData = await Model.findByIdAndDelete(id);
    if (!deletedData) {
      return res.status(404).json({ message: "Data not found" });
    }
    res.status(200).json({ message: "Data deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unique states and cities for dropdowns from all relevant models
exports.getLocations = async (req, res) => {
  try {
    const [masterLocs, hotelLocs, sightseeingLocs] = await Promise.all([
      MasterData.aggregate([{ $group: { _id: { state: "$state", city: "$city" } } }]),
      Hotel.aggregate([{ $group: { _id: { state: "$state", city: "$city" } } }]),
      Sightseeing.aggregate([{ $group: { _id: { state: "$state", city: "$city" } } }])
    ]);

    // Combine and deduplicate
    const allLocs = [...masterLocs, ...hotelLocs, ...sightseeingLocs];
    const uniqueLocs = Array.from(new Set(allLocs.map(l => JSON.stringify({ state: l._id?.state, city: l._id?.city }))))
      .map(s => JSON.parse(s))
      .filter(l => l.state && l.city);

    res.status(200).json(uniqueLocs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};