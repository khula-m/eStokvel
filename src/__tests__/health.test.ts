import request from "supertest";
import app from "../../server";

describe("Health endpoint", () => {
  it("returns healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("status", "healthy");
  });
});
