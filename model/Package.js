const mongoose = require("mongoose");

// 🔹 itinerary sub-schema
const itinerarySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true
  },
  hotel: {
    type: String,
    default: ""
  },
  transfer: {
    type: String,
    default: ""
  },
  sightseeing: {
    type: [String],
    default: []
  },
  meals: {
    type: [String],
    default: []
  },
  activities: {
    type: [String],
    default: []
  },
  info: {
    type: String,
    default: ""
  }
}, { _id: false });

// 🔹 main package schema
const packageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  price: {  
    type: Number,
    default: 0,
    min: 0
  },

  duration: {
    days: {
      type: Number,
      required: true
    },
    nights: {
      type: Number,
      required: true
    },
  },
  itinerary: {
    type: [itinerarySchema],
    default: []
  },
  image: {
    type: String,
    default: ""
  },
  createdVia: {
    type: String,
    enum: ["manual", "ai", "md"],
    default: "manual"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Package", packageSchema);
