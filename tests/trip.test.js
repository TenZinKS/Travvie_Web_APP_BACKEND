import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import db from "./setup";
import Trip from "../models/Trip";

let userToken;
let userId;
let tripId;

beforeAll(async () => {
  await db.connect();

  // Register a user
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "Trip Tester",
    email: `triptest${Date.now()}@mail.com`,
    password: "testpass123",
  });

  userId = registerRes.body.user._id;

  // Login the same user to get token
  const loginRes = await request(app).post("/api/auth/login").send({
    email: registerRes.body.user.email,
    password: "testpass123",
  });

  userToken = loginRes.body.token;
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

describe("Trip Routes", () => {
  it("should create a new trip", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({
        title: "Trip to Pokhara",
        from: "Kathmandu",
        destination: "Pokhara",
        startDate: "2025-08-01",
        endDate: "2025-08-05",
        itinerary: "Day 1: Drive\nDay 2: Sightseeing",
        status: "planned",
        userId: userId,
      });

    expect(res.statusCode).toBe(200); // ✅ Your current controller returns 200
    expect(res.body.trip.destination).toBe("Pokhara");

    tripId = res.body.trip._id; // Save for next tests
  });

  it("should fetch all trips for user", async () => {
    // Create a trip first
    await Trip.create({
      title: "Test Fetch Trip",
      from: "Lalitpur",
      destination: "Chitwan",
      startDate: "2025-08-10",
      endDate: "2025-08-12",
      itinerary: "Test Itinerary",
      status: "planned",
      userId: userId,
    });

    const res = await request(app).get(`/api/trips/user/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should update a trip", async () => {
    const newTrip = await Trip.create({
      title: "Old Title",
      from: "Bhaktapur",
      destination: "Gorkha",
      startDate: "2025-09-01",
      endDate: "2025-09-05",
      itinerary: "Old Plan",
      status: "planned",
      userId: userId,
    });

    const res = await request(app).put(`/api/trips/${newTrip._id}`).send({
      title: "Updated Trip Title",
      destination: "Gorkha Fort",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.destination).toBe("Gorkha Fort");
    expect(res.body.title).toBe("Updated Trip Title");
  });

  it("should delete a trip", async () => {
    const deletableTrip = await Trip.create({
      title: "Temp Trip",
      from: "Itahari",
      destination: "Jhapa",
      startDate: "2025-10-01",
      endDate: "2025-10-04",
      itinerary: "Temp Plan",
      status: "planned",
      userId: userId,
    });

    const res = await request(app).delete(`/api/trips/${deletableTrip._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/deleted/i);
  });
});
