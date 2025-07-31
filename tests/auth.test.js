import { beforeAll, afterEach, afterAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../server";
import db from "./setup";
import User from "../models/User";

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
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        password: "testpassword",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/User registered successfully/i);
  });

  it("should not register with an already existing email", async () => {
    const email = `dup${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      name: "First",
      email,
      password: "pwd1",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Second",
      email,
      password: "pwd2",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/User already exists/i);
  });

  it("should login a registered user", async () => {
    const email = `login${Date.now()}@example.com`;
    const password = "testpassword";

    await request(app).post("/api/auth/register").send({
      name: "Login User",
      email,
      password,
    });

    const res = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", email);
  });

  it("should not login with incorrect password", async () => {
    const email = `wrongpass${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      name: "WrongPass",
      email,
      password: "rightpass",
    });

    const res = await request(app).post("/api/auth/login").send({
      email,
      password: "badpass",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/Incorrect password/i);
  });

  it("should not login a user that is an admin via auth login", async () => {
    // create an admin record directly
    const admin = await User.create({
      name: "Admin",
      email: `admin${Date.now()}@example.com`,
      password: await vi.fn(() => "irrelevant"), // bypass hashing
      isAdmin: true,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: "irrelevant",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/User not found/i);
  });

  it("should update profile name", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      name: "Old Name",
      email: `upd${Date.now()}@example.com`,
      password: "pass",
    });
    const user = await User.findOne({ email: reg.body.email });
    const res = await request(app)
      .put(`/api/auth/${user._id}`)
      .field("name", "New Name");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("name", "New Name");
  });

  it("should change password with correct currentPassword", async () => {
    const email = `chgpwd${Date.now()}@example.com`;
    const password = "oldpass";
    const reg = await request(app).post("/api/auth/register").send({
      name: "ChgPwd",
      email,
      password,
    });
    const user = await User.findOne({ email });

    const res = await request(app)
      .put(`/api/auth/change-password/${user._id}`)
      .send({
        currentPassword: password,
        newPassword: "newpass",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/Password updated successfully/i);

    // now login with new pass
    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "newpass",
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it("should not change password with incorrect currentPassword", async () => {
    const email = `badcur${Date.now()}@example.com`;
    const reg = await request(app).post("/api/auth/register").send({
      name: "BadCur",
      email,
      password: "right",
    });
    const user = await User.findOne({ email });

    const res = await request(app)
      .put(`/api/auth/change-password/${user._id}`)
      .send({
        currentPassword: "wrong",
        newPassword: "doesntmatter",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/Current password incorrect/i);
  });

  it("should delete a user", async () => {
    const email = `del${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      name: "ToDelete",
      email,
      password: "pass",
    });
    const user = await User.findOne({ email });

    const res = await request(app).delete(`/api/auth/${user._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/User deleted successfully/i);

    // now login fails
    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "pass",
    });
    expect(loginRes.statusCode).toBe(400);
  });

  it("should return 404 on delete non-existent user", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app).delete(`/api/auth/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/User not found/i);
  });
});
