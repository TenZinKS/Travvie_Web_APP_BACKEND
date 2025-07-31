// tests/upload.test.js
import request from "supertest";
import fs from "fs";
import path from "path";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";

import app from "../server";
import db from "./setup";
import User from "../models/User";

const UPLOAD_URL = "/api/upload";
const uploadsDir = path.join(__dirname, "../uploads");

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  // clear database
  await db.clearDatabase();
  // clean up uploads folder
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
  it("1. should 400 if missing both userId and file", async () => {
    const res = await request(app).post(UPLOAD_URL).field("foo", "bar");
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/missing userId or image/i);
  });

  it("2. should 400 if missing file (userId only)", async () => {
    const user = await User.create({ name: "A", email: "a@example.com", password: "pw" });
    const res = await request(app).post(UPLOAD_URL).field("userId", user._id.toString());
    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/missing userId or image/i);
  });

  it("3. should 400 if missing userId (file only)", async () => {
    const tmpFile = path.join(__dirname, "tmp3.txt");
    fs.writeFileSync(tmpFile, "hello");
    const res = await request(app).post(UPLOAD_URL).attach("profile", tmpFile);
    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(400);
    expect(res.body.msg).toMatch(/missing userId or image/i);
  });

  it("4. should 404 if user not found", async () => {
    const tmpFile = path.join(__dirname, "tmp1.txt");
    fs.writeFileSync(tmpFile, "test");
    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", "000000000000000000000000")
      .attach("profile", tmpFile);
    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/user not found/i);
  });

  it("5. should return 500 on invalid userId format", async () => {
    const tmpFile = path.join(__dirname, "tmp5.txt");
    fs.writeFileSync(tmpFile, "error");
    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", "not-a-valid-id")
      .attach("profile", tmpFile);
    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(500);
    expect(res.body.msg).toMatch(/server error/i);
  });

  it("6. should upload and return imageUrl on success", async () => {
    const user = await User.create({ name: "B", email: "b@example.com", password: "pw" });
    const tmpFile = path.join(__dirname, "tmp2.txt");
    fs.writeFileSync(tmpFile, "world");

    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString())
      .attach("profile", tmpFile);

    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("msg", "Image uploaded");
    expect(res.body).toHaveProperty("imageUrl");
    // file should now exist on disk under uploads/
    const saved = path.join(__dirname, "../", res.body.imageUrl);
    expect(fs.existsSync(saved)).toBe(true);
  });

  it("7. should delete old profilePic when uploading a new one", async () => {
    // create a user with an existing profilePic
    const oldFilename = `old-${Date.now()}.txt`;
    const oldPath = path.join(uploadsDir, oldFilename);
    fs.writeFileSync(oldPath, "old-content");

    const user = await User.create({
      name: "D",
      email: "d@example.com",
      password: "pw",
      profilePic: `http://localhost:4000/uploads/${oldFilename}`,
    });

    // upload a new file
    const tmpFile = path.join(__dirname, "tmp6.txt");
    fs.writeFileSync(tmpFile, "new-content");

    const res = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString())
      .attach("profile", tmpFile);

    fs.unlinkSync(tmpFile);

    expect(res.statusCode).toBe(200);
    // old file should have been deleted
    expect(fs.existsSync(oldPath)).toBe(false);
  });

  it("8. should save file preserving original extension", async () => {
    const user = await User.create({ name: "E", email: "e@example.com", password: "pw" });
    // use a .txt and a .md to test extension preservation
    const tmpTxt = path.join(__dirname, "tmp7.txt");
    fs.writeFileSync(tmpTxt, "txt");
    const resTxt = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString())
      .attach("profile", tmpTxt);
    fs.unlinkSync(tmpTxt);
    expect(path.extname(resTxt.body.imageUrl)).toBe(".txt");

    const tmpMd = path.join(__dirname, "tmp8.md");
    fs.writeFileSync(tmpMd, "md");
    const resMd = await request(app)
      .post(UPLOAD_URL)
      .field("userId", user._id.toString())
      .attach("profile", tmpMd);
    fs.unlinkSync(tmpMd);
    expect(path.extname(resMd.body.imageUrl)).toBe(".md");
  });

  it("9. should allow multiple uploads for different users", async () => {
    const u1 = await User.create({ name: "U1", email: "u1@example.com", password: "pw" });
    const u2 = await User.create({ name: "U2", email: "u2@example.com", password: "pw" });

    const file1 = path.join(__dirname, "user1.txt");
    fs.writeFileSync(file1, "one");
    const r1 = await request(app)
      .post(UPLOAD_URL)
      .field("userId", u1._id.toString())
      .attach("profile", file1);
    fs.unlinkSync(file1);

    const file2 = path.join(__dirname, "user2.txt");
    fs.writeFileSync(file2, "two");
    const r2 = await request(app)
      .post(UPLOAD_URL)
      .field("userId", u2._id.toString())
      .attach("profile", file2);
    fs.unlinkSync(file2);

    // both should have succeeded
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);

    // both files should exist
    expect(fs.existsSync(path.join(__dirname, "../", r1.body.imageUrl))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "../", r2.body.imageUrl))).toBe(true);
  });
});
