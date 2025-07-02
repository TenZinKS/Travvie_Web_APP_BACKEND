const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema({
  title: String,
  destination: String,
  startDate: Date,
  endDate: Date,
  itinerary: String,
  status: { type: String, default: "planned" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("Trip", TripSchema);
