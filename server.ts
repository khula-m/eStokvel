import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "eStokvel API v1.0",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    hotReload: process.env.NODEMON === "true" ? "enabled" : "disabled",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (requires token)"
      }
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Development-only route to show nodemon status
if (process.env.NODE_ENV === "development") {
  app.get("/dev/status", (req, res) => {
    res.json({
      success: true,
      environment: "development",
      hotReload: true,
      watching: ["src", "prisma", "server.ts"],
      restartOnChanges: true
    });
  });
}

// Import and use auth routes
import authRoutes from "./src/routes/auth.routes";
app.use("/api/auth", authRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  const isNodemon = process.env.NODEMON === "true" || process.argv.some(arg => arg.includes("nodemon"));
  
  console.log(`
${isNodemon ? '??' : '??'} eStokvel Backend Server ${isNodemon ? '(Hot Reload Enabled)' : ''}
?? Port: ${PORT}
???  Environment: ${process.env.NODE_ENV || "development"}
? Started: ${new Date().toLocaleString()}
${isNodemon ? '?? Auto-restart on file changes: ?' : ''}

?? Available Endpoints:
   http://localhost:${PORT}/
   http://localhost:${PORT}/health
   ${process.env.NODE_ENV === "development" ? `   http://localhost:${PORT}/dev/status` : ''}
   http://localhost:${PORT}/api/auth/register
   http://localhost:${PORT}/api/auth/login

?? Test Credentials (from seed):
   Phone: 27831234567
   Password: password123

?? Check API-AUTH-TESTS.md for testing examples
  `);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Handle nodemon restart event
process.once("SIGUSR2", () => {
  console.log("?? Nodemon restart signal received...");
  server.close(() => {
    console.log("Server closed for restart");
    process.kill(process.pid, "SIGUSR2");
  });
});
