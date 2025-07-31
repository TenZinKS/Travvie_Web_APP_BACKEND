// tests/trip.test.js
import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import db from "./setup";
import Trip from "../models/Trip";

// we'll need two different users for one of the tests
let userAId, userBId, userATripId;

beforeAll(async () => {
  await db.connect();

  // create User A
  const regA = await request(app)
    .post("/api/auth/register")
    .send({
      name: "User A",
      email: `a${Date.now()}@mail.com`,
      password: "pass123",
    });
  userAId = regA.body.user._id;

  // create User B
  const regB = await request(app)
    .post("/api/auth/register")
    .send({
      name: "User B",
      email: `b${Date.now()}@mail.com`,
      password: "pass123",
    });
  userBId = regB.body.user._id;
});

afterEach(async () => {
  // clear all trips after each test
  await Trip.deleteMany({});
});

afterAll(async () => {
  await db.closeDatabase();
});

describe("Trip Routes", () => {
  it("1. should return empty array if user has no trips", async () => {
    const res = await request(app).get(`/api/trips/user/${userAId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it("2. should create a new trip", async () => {
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
        userId: userAId,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.trip.destination).toBe("Pokhara");
    userATripId = res.body.trip._id;
  });

  it("3. should fetch only this user's trips", async () => {
    // create one trip for A
    await Trip.create({
      title: "A's Trip",
      from: "X",
      destination: "Y",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "A plan",
      status: "planned",
      userId: userAId,
    });
    // and one for B
    await Trip.create({
      title: "B's Trip",
      from: "X",
      destination: "Y",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "B plan",
      status: "planned",
      userId: userBId,
    });

    const resA = await request(app).get(`/api/trips/user/${userAId}`);
    expect(resA.statusCode).toBe(200);
    expect(resA.body.every(t => t.userId === userAId)).toBe(true);
    expect(resA.body.length).toBe(1);

    const resB = await request(app).get(`/api/trips/user/${userBId}`);
    expect(resB.statusCode).toBe(200);
    expect(resB.body.every(t => t.userId === userBId)).toBe(true);
    expect(resB.body.length).toBe(1);
  });

  it("4. should return 404 when fetching trips for invalid user id", async () => {
    const res = await request(app).get("/api/trips/user/612345678901234567890123");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("5. should update title and itinerary of a planned trip", async () => {
    const trip = await Trip.create({
      title: "Old",
      from: "KTM",
      destination: "BKT",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "Old plan",
      status: "planned",
      userId: userAId,
    });
    const res = await request(app)
      .put(`/api/trips/${trip._id}`)
      .send({ title: "New Title", itinerary: "New plan" });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("New Title");
    expect(res.body.itinerary).toBe("New plan");
  });

  it("6. should return 404 when updating non-existent trip", async () => {
    const res = await request(app)
      .put("/api/trips/612345678901234567890123")
      .send({ title: "Won't work" });
    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/trip not found/i);
  });

  it("7. should forbid updating a completed trip", async () => {
    const trip = await Trip.create({
      title: "Done",
      from: "A",
      destination: "B",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "Done plan",
      status: "completed",
      userId: userAId,
    });
    const res = await request(app)
      .put(`/api/trips/${trip._id}`)
      .send({ title: "Try Edit" });
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/cannot edit a trip that is completed/i);
  });

  it("8. should delete a planned trip", async () => {
    const trip = await Trip.create({
      title: "ToDelete",
      from: "C",
      destination: "D",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "Plan",
      status: "planned",
      userId: userAId,
    });
    const res = await request(app).delete(`/api/trips/${trip._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/deleted successfully/i);
  });

  it("9. should forbid deleting an upcoming trip", async () => {
    const trip = await Trip.create({
      title: "Soon",
      from: "E",
      destination: "F",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "Plan",
      status: "upcoming",
      userId: userAId,
    });
    const res = await request(app).delete(`/api/trips/${trip._id}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/cannot delete an upcoming trip/i);
  });

  it("10. should forbid deleting a cancelled trip", async () => {
    const trip = await Trip.create({
      title: "Canceled",
      from: "G",
      destination: "H",
      startDate: new Date(),
      endDate: new Date(),
      itinerary: "Plan",
      status: "cancelled",
      userId: userAId,
    });
    const res = await request(app).delete(`/api/trips/${trip._id}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/cannot delete a trip that is completed or cancelled/i);
  });
});
