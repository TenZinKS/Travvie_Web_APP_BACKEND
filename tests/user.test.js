// tests/user.test.js
import request from "supertest";
import app from "../server";            
import db from "./setup";          
import User from "../models/User";
import { describe, it, beforeAll, afterEach, afterAll, expect } from "vitest";

const USERS_URL = "/api/users";

describe("User Routes", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
  });

  it("should fetch all users (excluding password and __v)", async () => {
    await User.create({ name: "Alice", email: "alice@x.com", password: "pw" });
    await User.create({ name: "Bob",   email: "bob@x.com",   password: "pw" });

    const res = await request(app).get(USERS_URL);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    for (const u of res.body) {
      expect(u).toHaveProperty("_id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
      expect(u).not.toHaveProperty("password");
      expect(u).not.toHaveProperty("__v");
    }
  });

  it("should delete a user by id", async () => {
    const user = await User.create({ name: "Charlie", email: "c@x.com", password: "pw" });
    const res = await request(app).delete(`${USERS_URL}/${user._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "User deleted successfully");
    expect(await User.findById(user._id)).toBeNull();
  });

  it("should return 404 when deleting non-existent user", async () => {
    const fakeId = "612345678901234567890123";
    const res = await request(app).delete(`${USERS_URL}/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("msg", "User not found");
  });

  it("should block and unblock a user", async () => {
    const user = await User.create({ name: "Dave", email: "d@x.com", password: "pw" });
    // block
    let res = await request(app).put(`${USERS_URL}/block/${user._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "User blocked successfully");
    expect(res.body.user.isBlocked).toBe(true);
    // unblock
    res = await request(app).put(`${USERS_URL}/block/${user._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "User unblocked successfully");
    expect(res.body.user.isBlocked).toBe(false);
  });

  it("should return 404 when blocking non-existent user", async () => {
    const fakeId = "612345678901234567890123";
    const res = await request(app).put(`${USERS_URL}/block/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("msg", "User not found");
  });

  it("should promote a user to admin", async () => {
    const user = await User.create({ name: "Eve", email: "e@x.com", password: "pw" });
    expect(user.isAdmin).toBe(false);

    const res = await request(app).put(`${USERS_URL}/promote/${user._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "User promoted to admin successfully");
    expect(res.body.user.isAdmin).toBe(true);
  });

  it("should return 400 when promoting already-admin user", async () => {
    const user = await User.create({ name: "Frank", email: "f@x.com", password: "pw", isAdmin: true });
    const res = await request(app).put(`${USERS_URL}/promote/${user._id}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("msg", "User is already an admin");
  });

  it("should return 404 when promoting non-existent user", async () => {
    const fakeId = "612345678901234567890123";
    const res = await request(app).put(`${USERS_URL}/promote/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("msg", "User not found");
  });

  it("should patch-all users missing isAdmin or isBlocked", async () => {
    // Create two users and manually unset their flags
    const u1 = await User.create({ name: "G", email: "g@x.com", password: "pw" });
    u1.isAdmin = undefined;
    u1.isBlocked = undefined;
    await u1.save();

    const u2 = await User.create({ name: "H", email: "h@x.com", password: "pw" });
    u2.isAdmin = undefined;
    await u2.save();

    const res = await request(app).patch(`${USERS_URL}/patch-all`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "Users patched successfully");
    expect(res.body).toHaveProperty("updated", 2);

    const updated1 = await User.findById(u1._id);
    expect(updated1.isAdmin).toBe(false);
    expect(updated1.isBlocked).toBe(false);

    const updated2 = await User.findById(u2._id);
    expect(updated2.isAdmin).toBe(false);
    expect(updated2.isBlocked).toBe(false);
  });
});
