// tests/admin.test.js
import { beforeAll, afterEach, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import db from "./setup";

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

  it("should register a new admin", async () => {
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

  it("should not register with an existing email", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    // first registration succeeds
    await request(app)
      .post("/api/admin/signup")
      .send({
        name: "Alice Admin",
        email: adminEmail,
        password: adminPassword,
      });

    // second registration with same email fails
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

  it("should login a registered admin", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    // register admin
    await request(app)
      .post("/api/admin/signup")
      .send({
        name: "Bob Boss",
        email: adminEmail,
        password: adminPassword,
      });

    // login
    const res = await request(app)
      .post("/api/admin/login")
      .send({
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

  it("should not login with incorrect password", async () => {
    adminEmail = `admin${Date.now()}@example.com`;

    // register admin
    await request(app)
      .post("/api/admin/signup")
      .send({
        name: "Charlie Chief",
        email: adminEmail,
        password: adminPassword,
      });

    // attempt login with wrong password
    const res = await request(app)
      .post("/api/admin/login")
      .send({
        email: adminEmail,
        password: "wrongpass",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/incorrect password/i);
  });

  it("should not login a non-existent admin", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({
        email: `noone${Date.now()}@example.com`,
        password: "doesntmatter",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/admin not found/i);
  });
});
