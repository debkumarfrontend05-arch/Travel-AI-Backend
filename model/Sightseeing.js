const mongoose = require("mongoose");

const sightseeingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["Cultural", "Adventure", "Nature", "City Tour", "Shopping", "Entertainment", "Leisure"],
    default: "City Tour"
  },
  duration: {
    type: String,
    required: true,
    default: "Half Day"
  },
  status: {
    type: String,
    required: true,
    enum: ["Active", "Inactive"],
    default: "Active"
  },
  description: {
    type: String,
    trim: true
  },
  highlights: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

sightseeingSchema.index({ name: 1, city: 1, state: 1 }, { unique: true });

module.exports = mongoose.model("Sightseeing", sightseeingSchema);
