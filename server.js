const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const packageRoutes = require("./routes/packageRoutes");
const masterDataRoutes = require("./routes/masterDataRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️ Missing MONGO_URI in .env. Falling back to local mongodb://localhost:27017/travel-saas");
}

app.use(cors());
app.use(express.json());



app.use("/public", express.static(path.join(__dirname, "public")));



mongoose
  .connect(MONGO_URI || "mongodb://localhost:27017/travel-saas")
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Clean up stale indexes from old schema field names
    try {
      const collections = ["hotels", "transfers", "sightseeings", "meals"];
      for (const name of collections) {
        const collection = mongoose.connection.collection(name);
        try {
          await collection.dropIndexes();
          console.log(`🔄 Dropped old indexes on '${name}'`);
        } catch (e) {
          // Collection may not exist yet — that's fine
        }
      }
      // Re-sync indexes defined in current Mongoose schemas
      const Hotel = require("./model/Hotel");
      const Transfer = require("./model/Transfer");
      const Sightseeing = require("./model/Sightseeing");
      const Meal = require("./model/Meal");
      await Promise.all([
        Hotel.syncIndexes(),
        Transfer.syncIndexes(),
        Sightseeing.syncIndexes(),
        Meal.syncIndexes(),
      ]);
      console.log("✅ Indexes synced successfully");
    } catch (err) {
      console.warn("⚠️ Index sync warning:", err.message);
    }
  })
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.use("/api/packages", packageRoutes);
app.use("/api/master-data", masterDataRoutes);

app.get("/", (req, res) => {
  res.send("Travel AI SaaS Backend is Live");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
