const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");

// ✅ Create new trip
router.post("/", async (req, res) => {
  try {
    const trip = new Trip({
      title: req.body.title,
      from: req.body.from || "",             
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
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch trips" });
  }
});

// ✅ Update a trip (e.g. mark as completed, cancelled, etc.)
router.put("/:tripId", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ msg: "Trip not found." });
    }

    if (["cancelled", "completed"].includes(trip.status)) {
      return res.status(400).json({
        msg: "Cannot edit a trip that is completed or cancelled.",
      });
    }

    // ✅ Ensure we update the 'from' field if it’s present
    const updates = {
      title: req.body.title ?? trip.title,
      from: req.body.from ?? trip.from,
      destination: req.body.destination ?? trip.destination,
      startDate: req.body.startDate ?? trip.startDate,
      endDate: req.body.endDate ?? trip.endDate,
      itinerary: req.body.itinerary ?? trip.itinerary,
      status: req.body.status ?? trip.status,
    };

    const updated = await Trip.findByIdAndUpdate(
      req.params.tripId,
      updates,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update trip" });
  }
});

// ✅ Delete a trip (prevent deletion if status is "upcoming")
router.delete("/:tripId", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ msg: "Trip not found" });
    }

    if (trip.status === "upcoming") {
      return res.status(403).json({
        msg: "Cannot delete an upcoming trip. You can only change its status.",
      });
    }

    if (["cancelled", "completed"].includes(trip.status)) {
      return res.status(400).json({
        msg: "Cannot delete a trip that is completed or cancelled.",
      });
    }

    await Trip.findByIdAndDelete(req.params.tripId);
    res.json({ msg: "Trip deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to delete trip" });
  }
});

module.exports = router;
