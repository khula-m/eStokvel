"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
describe("Health endpoint", () => {
    it("returns healthy status", async () => {
        const res = await (0, supertest_1.default)(server_1.default).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("status", "healthy");
    });
});
//# sourceMappingURL=health.test.js.map