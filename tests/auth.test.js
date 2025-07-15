const request = require("supertest");
const app = require("../server");
const db = require("./setup");

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
    expect(res.body.msg).toMatch(/User registered/i);
  });
});
