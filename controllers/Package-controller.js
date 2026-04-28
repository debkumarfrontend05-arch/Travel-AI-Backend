const Package = require("../model/Package");

function normalizeString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

// Create manual package
exports.createPackage = async (req, res) => {
  try {
    const title = normalizeString(req.body?.title);
    const state = normalizeString(req.body?.state);
    const days = toNumber(req.body?.duration?.days);
    const nights = toNumber(req.body?.duration?.nights);
    const itineraryInput = Array.isArray(req.body?.itinerary) ? req.body.itinerary : [];

    if (!title || !state) {
      return res.status(400).json({ error: "title and state are required" });
    }
    if (!Number.isInteger(days) || days < 1) {
      return res.status(400).json({ error: "duration.days must be an integer >= 1" });
    }
    if (!Number.isInteger(nights) || nights < 0) {
      return res.status(400).json({ error: "duration.nights must be an integer >= 0" });
    }

    const itinerary = itineraryInput.map((item) => {
      const day = toNumber(item?.day);
      if (!Number.isInteger(day) || day < 1) {
        throw new Error("Every itinerary item must have day as integer >= 1");
      }

      return {
        day,
        hotel: normalizeString(item?.hotel),
        sights: normalizeStringArray(item?.sights),
        meals: normalizeStringArray(item?.meals),
        info: normalizeString(item?.info)
      };
    });

    const newPackage = await Package.create({
      title,
      state,
      duration: { days, nights },
      itinerary,
      createdVia: "manual"
    });

    res.status(201).json(newPackage);
  } catch (err) {
    if (err.name === "ValidationError" || err.message.includes("itinerary")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

// Get all packages
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });

    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload markdown (to be implemented later)
exports.uploadMarkdown = async (_req, res) => {
  return res.status(501).json({
    error: "Markdown package creation is not enabled yet. Use manual creation for now."
  });
};