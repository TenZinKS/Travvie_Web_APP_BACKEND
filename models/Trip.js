const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  title: String,
  from: String,
  destination: String,
  startDate: Date,
  endDate: Date,
  itinerary: String,
  status: { type: String, default: "planned" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// ✅ Prevent model overwrite in test environments
module.exports = mongoose.models.Trip || mongoose.model("Trip", TripSchema);
