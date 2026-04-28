const mongoose = require("mongoose");

const masterDataSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["hotel", "transfer", "travel", "sightseeing", "meal"]
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Prevent duplicate entries for same name, city, state and type
masterDataSchema.index({ type: 1, state: 1, city: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("MasterData", masterDataSchema);