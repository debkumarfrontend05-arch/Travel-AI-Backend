const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["Airport Pickup", "Airport Drop", "Intercity", "Local"],
    default: "Airport Pickup"
  },
  vehicle: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    required: true,
    enum: ["Active", "Inactive"],
    default: "Active"
  },
  from: {
    type: String,
    trim: true
  },
  to: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  features: {
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

transferSchema.index({ name: 1, vehicle: 1 }, { unique: true });

module.exports = mongoose.model("Transfer", transferSchema);
