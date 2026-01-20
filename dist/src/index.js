"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api", routes_1.default);
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
app.use((_err, _req, res, _next) => {
    console.error("Error:", _err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? _err.message : undefined
    });
});
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});
app.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
    console.log("📁 Environment: " + (process.env.NODE_ENV || "development"));
    console.log("🔗 Health check: http://localhost:" + PORT + "/health");
    console.log("🔗 API Base: http://localhost:" + PORT + "/api");
});
//# sourceMappingURL=index.js.map