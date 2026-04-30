const Package = require("../model/Package");
const MasterData = require("../model/MasterData");
const Hotel = require("../model/Hotel");
const Transfer = require("../model/Transfer");
const Sightseeing = require("../model/Sightseeing");
const Meal = require("../model/Meal");

const aiService = require("../services/aiService");
const markdownService = require("../services/markdownService");

const firstDefined = (...values) => values.find(v => v !== undefined && v !== null && v !== "");

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : undefined;
  }
  return undefined;
};

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === "string" ? v : v?.name || v?.title || ""))
      .map(v => String(v).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned ? [cleaned] : [];
  }

  return [];
};

const normalizeItineraryDay = (item, index) => {
  if (!item || typeof item !== "object") {
    return {
      day: index + 1,
      hotel: "",
      transfer: "",
      sightseeing: [],
      meals: [],
      activities: [],
      info: ""
    };
  }

  const mappedSightseeing = toStringArray(firstDefined(item.sightseeing, item.sightseeings));
  const mappedMeals = toStringArray(firstDefined(item.meals, item.meal));

  return {
    day: toNumber(firstDefined(item.day, item.dayNumber, item.dayNo, index + 1)) || index + 1,
    hotel: String(firstDefined(item.hotel, item.hotelName, item.stay, "") || ""),
    transfer: String(firstDefined(item.transfer, item.transferName, "") || ""),
    sightseeing: mappedSightseeing,
    meals: mappedMeals,
    activities: toStringArray(item.activities),
    info: String(firstDefined(item.info, item.information, item.notes, item.dayTitle, item.title, "") || "")
  };
};

const normalizePackagePayload = (body = {}) => {
  const parsedBody = { ...body };

  if (typeof parsedBody.duration === "string") {
    try {
      parsedBody.duration = JSON.parse(parsedBody.duration);
    } catch (e) {}
  }

  if (typeof parsedBody.itinerary === "string") {
    try {
      parsedBody.itinerary = JSON.parse(parsedBody.itinerary);
    } catch (e) {}
  }

  const title = firstDefined(parsedBody.title, parsedBody.packageName, parsedBody.name);
  const state = firstDefined(parsedBody.state, parsedBody.region);
  const city = firstDefined(parsedBody.city, parsedBody.destination);

  const rawDays = firstDefined(parsedBody?.duration?.days, parsedBody.days, parsedBody.totalDays, parsedBody.dayCount, parsedBody.durationDays, parsedBody.packageDays);
  const rawNights = firstDefined(parsedBody?.duration?.nights, parsedBody.nights, parsedBody.totalNights, parsedBody.nightCount, parsedBody.durationNights, parsedBody.packageNights);

  const parsedDays = toNumber(rawDays);
  const parsedNights = toNumber(rawNights);

  const duration = {
    days: parsedDays ?? (parsedNights !== undefined ? parsedNights + 1 : undefined),
    nights: parsedNights ?? (parsedDays !== undefined ? Math.max(0, parsedDays - 1) : undefined)
  };

  const rawItinerary = firstDefined(parsedBody.itinerary, parsedBody.itineraries, parsedBody.dayWiseItinerary, parsedBody.daysData, parsedBody.dayPlans);
  const itinerary = Array.isArray(rawItinerary)
    ? rawItinerary.map(normalizeItineraryDay)
    : [];

  return {
    ...parsedBody,
    title,
    state,
    city,
    duration,
    itinerary
  };
};

const getUploadedFile = (req) => {
  if (req?.file) return req.file;
  if (req?.files?.coverImage?.[0]) return req.files.coverImage[0];
  if (req?.files?.image?.[0]) return req.files.image[0];
  if (req?.files?.file?.[0]) return req.files.file[0];
  return null;
};


// ---------- AI HELPERS ----------
const fetchAllMasterData = async (state, city) => {
  let [generic, hotels, transfers, sightseeing, meals] = await Promise.all([
    MasterData.find({ state, city }),
    Hotel.find({ state, city }),
    Transfer.find({}),
    Sightseeing.find({ state, city }),
    Meal.find({})
  ]);

  // If city-level data is sparse, widen search so AI/fallback still has meaningful options.
  if (!generic.length && !hotels.length && !sightseeing.length) {
    const [stateGeneric, stateHotels, stateSightseeing] = await Promise.all([
      MasterData.find({ state }),
      Hotel.find({ state }),
      Sightseeing.find({ state })
    ]);
    generic = stateGeneric;
    hotels = stateHotels;
    sightseeing = stateSightseeing;
  }

  // Last resort: use any available records.
  if (!generic.length && !hotels.length && !sightseeing.length) {
    const [allGeneric, allHotels, allSightseeing] = await Promise.all([
      MasterData.find({}).limit(100),
      Hotel.find({}).limit(100),
      Sightseeing.find({}).limit(100)
    ]);
    generic = allGeneric;
    hotels = allHotels;
    sightseeing = allSightseeing;
  }

  return [
    ...generic.map(d => ({ ...d._doc, category: d.type })),
    ...hotels.map(d => ({ ...d._doc, category: "hotel", name: d.name })),
    ...transfers.map(d => ({ ...d._doc, category: "transfer", name: d.name })),
    ...sightseeing.map(d => ({ ...d._doc, category: "sightseeing", name: d.name })),
    ...meals.map(d => ({ ...d._doc, category: "meal", name: d.name }))
  ];
};

const buildFallbackItinerary = (days, masterData = []) => {
  const pickByCategory = (category) =>
    masterData
      .filter((item) => item.category === category)
      .map((item) => item.name)
      .filter(Boolean);

  const hotels = pickByCategory("hotel");
  const transfers = pickByCategory("transfer");
  const sightseeing = pickByCategory("sightseeing");
  const meals = pickByCategory("meal");

  return Array.from({ length: days }, (_, idx) => ({
    day: idx + 1,
    hotel: hotels[idx % Math.max(hotels.length, 1)] || "",
    transfer: transfers[idx % Math.max(transfers.length, 1)] || "",
    sightseeing: sightseeing.length ? [sightseeing[idx % sightseeing.length]] : [],
    meals: meals.length ? [meals[idx % meals.length]] : [],
    activities: [
      `Check in and relax in ${cityLabel(hotels, idx)}`,
      `Explore ${cityLabel(sightseeing, idx)}`,
    ].filter((v) => v && !v.endsWith(" in ")),
    info: `Planned day ${idx + 1} using available master data selections.`,
  }));
};

const cityLabel = (list, idx) => (list[idx % Math.max(list.length, 1)] || "");

// ---------- AI ----------
exports.generateAIItinerary = async (req, res) => {
  try {
    const { title, state, city, days } = req.body;
    const normalizedDays = Number(days) || 1;

    const masterData = await fetchAllMasterData(state, city);
    let structuredPackage;
    try {
      const markdown = await aiService.generateItinerary(title, state, city, normalizedDays, masterData);
      structuredPackage = markdownService.parseMarkdown(markdown);
    } catch (aiError) {
      structuredPackage = {
        title,
        itinerary: buildFallbackItinerary(normalizedDays, masterData),
      };
      return res.status(200).json({
        ...structuredPackage,
        state,
        city,
        duration: { days: normalizedDays, nights: Math.max(0, normalizedDays - 1) },
        aiFallback: true,
        message: aiError.message,
      });
    }

    res.json({
      ...structuredPackage,
      state,
      city,
      duration: { days: normalizedDays, nights: Math.max(0, normalizedDays - 1) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// module.exports = {
//   buildWithAI,
// };







// module.exports = {
//   buildWithAI,
// };


exports.saveMarkdown = async (req, res) => {
  try {
    const payload = normalizePackagePayload(req.body);
    const saved = markdownService.saveMarkdownFile(payload);
    const newPackage = new Package(payload);
    await newPackage.save();
    return res.status(201).json({
      message: "Markdown generated and package created successfully",
      fileName: saved.fileName,
      fileUrl: saved.publicPath,
      package: newPackage,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- CRUD ----------
// exports.createPackage = async (req, res) => {
//   try {
//     const payload = normalizePackagePayload(req.body);
//     delete payload.coverImage;
//     const uploadedFile = getUploadedFile(req);
//     if (uploadedFile?.filename) {
//       const imagePath = `/uploads/packages/${uploadedFile.filename}`;
//       payload.image = imagePath;
//     }
//     const newPackage = new Package(payload);
//     await newPackage.save();
//     res.status(201).json(newPackage);
//   } catch (err) {
//     if (err?.name === "ValidationError") {
//       return res.status(400).json({ message: err.message });
//     }
//     res.status(500).json({ message: err.message });
//   }
// };

exports.createPackage = async (req, res) => {
  try {
    console.log(req.file);

    const payload = normalizePackagePayload(req.body);

    if (req.file) {
      payload.image = `/public/uploads/packages/${req.file.filename}`;
    }

    const newPackage = new Package(payload);

    await newPackage.save();

    res.status(201).json(newPackage);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
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

// exports.updatePackage = async (req, res) => {
//   try {
//     const payload = normalizePackagePayload(req.body);
//     delete payload.coverImage;
//     const uploadedFile = getUploadedFile(req);
//     if (uploadedFile?.filename) {
//       const imagePath = `/uploads/packages/${uploadedFile.filename}`;
//       payload.image = imagePath;
//     }
//     const updated = await Package.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
//     if (!updated) return res.status(404).json({ message: "Not found" });
//     res.json(updated);
//   } catch (err) {
//     if (err?.name === "ValidationError") {
//       return res.status(400).json({ message: err.message });
//     }
//     res.status(500).json({ message: err.message });
//   }
// };

exports.updatePackage = async (req, res) => {
  try {
    const payload = normalizePackagePayload(req.body);

    if (req.file) {
      payload.image = `/uploads/packages/${req.file.filename}`;
    }

    const updated = await Package.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


exports.deletePackage = async (req, res) => {
  await Package.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};
