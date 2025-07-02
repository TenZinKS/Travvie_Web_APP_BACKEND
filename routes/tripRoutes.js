const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");

// ✅ Create new trip
router.post("/", async (req, res) => {
  try {
    const trip = new Trip({
      title: req.body.title,
      destination: req.body.destination,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      itinerary: req.body.itinerary,
      status: req.body.status || "planned",
      userId: req.body.userId,
    });

    await trip.save();
    res.json({ msg: "Trip created successfully", trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to create trip" });
  }
});

// ✅ Get all trips for one user
router.get("/user/:userId", async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.params.userId });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch trips" });
  }
});

// ✅ Update a trip (e.g. mark as completed, cancelled, etc.)
router.put("/:tripId", async (req, res) => {
  try {
    const updated = await Trip.findByIdAndUpdate(
      req.params.tripId,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: "Failed to update trip" });
  }
});

// ✅ Delete a trip
router.delete("/:tripId", async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.tripId);
    res.json({ msg: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete trip" });
  }
});

module.exports = router;
