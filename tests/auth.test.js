import { beforeAll, afterEach, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import db from "./setup";

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

describe("Auth Routes", () => {

  it("should register a user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: `test${Date.now()}@example.com`,
      password: "testpassword",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/User registered/i);
  });

  it("should login a registered user", async () => {
  // Step 1: Register a user first
  const email = `login${Date.now()}@example.com`;
  const password = "testpassword";

  await request(app).post("/api/auth/register").send({
    name: "Login User",
    email,
    password,
  });

  // Step 2: Attempt to log in with correct credentials
  const res = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  // Assertions
  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty("token");
  expect(res.body.user).toHaveProperty("email", email);
});


it("should not login with incorrect password", async () => {
  const email = `wrongpass${Date.now()}@example.com`;
  const password = "correctpassword";

  // Register a user
  await request(app).post("/api/auth/register").send({
    name: "Wrong Password User",
    email,
    password,
  });

  // Attempt login with incorrect password
  const res = await request(app).post("/api/auth/login").send({
    email,
    password: "wrongpassword",
  });

  // Assertions
  expect(res.statusCode).toBe(400);
  expect(res.body.msg).toMatch(/Incorrect password/i);
});

it("should not register with an already existing email", async () => {
  const email = `user${Date.now()}@example.com`;

  // First registration (should succeed)
  await request(app).post("/api/auth/register").send({
    name: "Original User",
    email,
    password: "password123",
  });

  // Second registration with same email (should fail)
  const res = await request(app).post("/api/auth/register").send({
    name: "Duplicate User",
    email,
    password: "anotherpassword",
  });

  expect(res.statusCode).toBe(400);
  expect(res.body.msg).toMatch(/User already exists/i);

});



});
