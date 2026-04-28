const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["Veg", "Non-Veg", "Jain", "Halal", "Set Menu", "Buffet"],
    default: "Veg"
  },
  cuisine: {
    type: String,
    required: true,
    trim: true
  },
  mealTime: {
    type: String,
    required: true,
    enum: ["Breakfast", "Lunch", "Dinner", "Snacks"],
    default: "Lunch"
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
  items: {
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

mealSchema.index({ name: 1, cuisine: 1 }, { unique: true });

module.exports = mongoose.model("Meal", mealSchema);
