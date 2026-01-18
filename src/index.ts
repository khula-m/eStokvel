import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);

// Basic health check at root
app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware
app.use((_err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error:", _err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? _err.message : undefined
  });
});

// 404 handler
app.use((_req: express.Request, res: express.Response) => {
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
