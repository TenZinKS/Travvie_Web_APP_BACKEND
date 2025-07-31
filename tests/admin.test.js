// tests/admin.test.js
import { beforeAll, afterEach, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server";
import db from "./setup";
import User from "../models/User";

describe("Admin Routes", () => {
  let adminEmail;
  const adminPassword = "strongpassword";

  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
  });

  it("1. should register a new admin", async () => {
    adminEmail = `admin${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/admin/signup")
      .send({
        name: "Alice Admin",
        email: adminEmail,
        password: adminPassword,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/account created successfully/i);
  });

  it("2. should not register with an existing email", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    // first registration
    await request(app).post("/api/admin/signup").send({
      name: "Alice Admin",
      email: adminEmail,
      password: adminPassword,
    });

    // duplicate registration
    const res2 = await request(app)
      .post("/api/admin/signup")
      .send({
        name: "Alice Admin",
        email: adminEmail,
        password: adminPassword,
      });

    expect(res2.statusCode).toBe(400);
    expect(res2.body.msg).toMatch(/admin already exists/i);
  });

  it("3. should login a registered admin", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    // register
    await request(app).post("/api/admin/signup").send({
      name: "Bob Boss",
      email: adminEmail,
      password: adminPassword,
    });

    // login
    const res = await request(app).post("/api/admin/login").send({
      email: adminEmail,
      password: adminPassword,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      email: adminEmail,
      isAdmin: true,
    });
  });

  it("4. should not login with incorrect password", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    await request(app).post("/api/admin/signup").send({
      name: "Charlie Chief",
      email: adminEmail,
      password: adminPassword,
    });

    const res = await request(app).post("/api/admin/login").send({
      email: adminEmail,
      password: "wrongpass",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/incorrect password/i);
  });

  it("5. should not login a non-existent admin", async () => {
    const res = await request(app).post("/api/admin/login").send({
      email: `noone${Date.now()}@example.com`,
      password: "whatever",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/admin not found/i);
  });

  it("6. should not allow a normal user to login as admin", async () => {
    const normalEmail = `normal${Date.now()}@example.com`;
    // register as regular user
    await request(app).post("/api/auth/register").send({
      name: "Normal User",
      email: normalEmail,
      password: adminPassword,
    });

    // attempt admin login
    const res = await request(app).post("/api/admin/login").send({
      email: normalEmail,
      password: adminPassword,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/admin not found/i);
  });

  it("7. should normalize email to lowercase", async () => {
    const mixedEmail = `MiXeD${Date.now()}@ExAMPLE.COM`;

    // signup with mixed case
    await request(app).post("/api/admin/signup").send({
      name: "Norm Admin",
      email: mixedEmail,
      password: adminPassword,
    });

    // login using lowercase
    const res = await request(app).post("/api/admin/login").send({
      email: mixedEmail.toLowerCase(),
      password: adminPassword,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(mixedEmail.toLowerCase());
  });

  it("8. should include admin id in JWT token", async () => {
    const email2 = `idtest${Date.now()}@example.com`;

    await request(app).post("/api/admin/signup").send({
      name: "ID Admin",
      email: email2,
      password: adminPassword,
    });

    const loginRes = await request(app).post("/api/admin/login").send({
      email: email2,
      password: adminPassword,
    });

    const token = loginRes.body.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    expect(decoded.id).toBe(loginRes.body.user.id);
  });

  it("9. should set isAdmin=true in DB on signup", async () => {
    const email3 = `dbadmin${Date.now()}@example.com`;

    await request(app).post("/api/admin/signup").send({
      name: "DB Admin",
      email: email3,
      password: adminPassword,
    });

    const dbUser = await User.findOne({ email: email3.toLowerCase() });
    expect(dbUser).toBeTruthy();
    expect(dbUser.isAdmin).toBe(true);
  });

  it("10. should return 400 when login missing credentials", async () => {
    const res = await request(app).post("/api/admin/login").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/admin not found/i);
  });

  it("11. should reject signup with missing fields", async () => {
    // missing both name and password
    const res = await request(app).post("/api/admin/signup").send({
      email: `broken${Date.now()}@example.com`,
    });
    // we expect your route to handle this gracefully
    expect(res.statusCode).toBe(400);
  });
});
