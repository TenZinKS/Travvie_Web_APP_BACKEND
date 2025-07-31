import request from "supertest";
import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";

import app from "../server";
import db from "./setup";
import User from "../models/User";

const UPLOAD_URL = "/api/upload";

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  // clear database
  await db.clearDatabase();
  // clean up uploads folder
  const uploadsDir = path.join(__dirname, "../uploads");
  if (fs.existsSync(uploadsDir)) {
    for (const file of fs.readdirSync(uploadsDir)) {
      fs.unlinkSync(path.join(uploadsDir, file));
    }
  }
});

afterAll(async () => {
  await db.closeDatabase();
});

describe("Upload Route", () => {
  it("should 400 if missing both userId and file", async () => {
    const res = await request(app)
      .post(UPLOAD_URL)
      .field("foo", "bar");
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/missing userId or image/i);
  });

  it("should 400 if missing file", async () => {
    // create a user so userId is valid
    const user = await User.create({ name: "A", email: "a@example.com", password: "pw" });
    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString());
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/missing userId or image/i);
  });

  it("should 404 if user not found", async () => {
    // write a dummy file to attach
    const tmpFile = path.join(__dirname, "tmp.txt");
    fs.writeFileSync(tmpFile, "hello");
    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", "000000000000000000000000")
      .attach("profile", tmpFile);
    // cleanup
    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/user not found/i);
  });

  it("should upload and return imageUrl on success", async () => {
    // create a real user
    const user = await User.create({ name: "B", email: "b@example.com", password: "pw" });

    // create a dummy file
    const tmpFile = path.join(__dirname, "tmp2.txt");
    fs.writeFileSync(tmpFile, "world");

    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString())
      .attach("profile", tmpFile);

    // cleanup
    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "Image uploaded");
    expect(res.body).toHaveProperty("imageUrl");
    // file should now exist on disk under uploads/
    const saved = path.join(__dirname, "../", res.body.imageUrl);
    expect(fs.existsSync(saved)).toBe(true);
  });
});
