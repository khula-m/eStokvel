// Use require to avoid TypeScript import issues
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "eStokvel API v1.0 - Day 4 Ready",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    status: "Authentication working, Day 4 routes ready for testing"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Development-only route
if (process.env.NODE_ENV === "development") {
  app.get("/dev/status", (_req, res) => {
    res.json({
      success: true,
      environment: "development",
      hotReload: true,
      routes: ["auth", "stokvels", "members", "transactions"]
    });
  });
}

// Import routes with error handling
console.log("Loading routes...");

try {
  const authRoutes = require("./src/routes/auth.routes").default;
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded");
} catch (error) {
  console.log("❌ Failed to load auth routes:", error.message);
}

try {
  const stokvelRoutes = require("./src/routes/stokvel.routes").default;
  app.use("/api/stokvels", stokvelRoutes);
  console.log("✅ Stokvel routes loaded");
} catch (error) {
  console.log("❌ Failed to load stokvel routes:", error.message);
}

try {
  const memberRoutes = require("./src/routes/member.routes").default;
  app.use("/api/members", memberRoutes);
  console.log("✅ Member routes loaded");
} catch (error) {
  console.log("❌ Failed to load member routes:", error.message);
}

try {
  const transactionRoutes = require("./src/routes/transaction.routes").default;
  app.use("/api/transactions", transactionRoutes);
  console.log("✅ Transaction routes loaded");
} catch (error) {
  console.log("❌ Failed to load transaction routes:", error.message);
}

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: _req.path
  });
});

// Start server
app.listen(PORT, () => {
  const devStatus = process.env.NODE_ENV === "development" ? "   http://localhost:" + PORT + "/dev/status" : "";
  
  console.log("");
  console.log("🚀 eStokvel Backend Server");
  console.log("📡 Port: " + PORT);
  console.log("🌍 Environment: " + (process.env.NODE_ENV || "development"));
  console.log("⏰ Started: " + new Date().toLocaleString());
  console.log("");
  console.log("🔗 Available Endpoints:");
  console.log("   http://localhost:" + PORT + "/");
  console.log("   http://localhost:" + PORT + "/health");
  if (process.env.NODE_ENV === "development") {
    console.log("   http://localhost:" + PORT + "/dev/status");
  }
  console.log("");
  console.log("   🔐 AUTH:");
  console.log("   http://localhost:" + PORT + "/api/auth/register");
  console.log("   http://localhost:" + PORT + "/api/auth/login");
  console.log("   http://localhost:" + PORT + "/api/auth/me (requires token)");
  console.log("");
  console.log("   👥 STOKVELS (Day 4):");
  console.log("   http://localhost:" + PORT + "/api/stokvels (GET/POST - requires token)");
  console.log("   http://localhost:" + PORT + "/api/stokvels/:id (GET - requires token)");
  console.log("");
  console.log("   👤 MEMBERS (Day 4):");
  console.log("   http://localhost:" + PORT + "/api/members (POST - requires token)");
  console.log("   http://localhost:" + PORT + "/api/members/group/:groupId (GET - requires token)");
  console.log("");
  console.log("   💰 TRANSACTIONS (Day 4):");
  console.log("   http://localhost:" + PORT + "/api/transactions (GET/POST - requires token)");
  console.log("");
  console.log("🔑 Test Credentials:");
  console.log("   Phone: 27831234567 | Password: password123 | Role: TREASURER");
  console.log("");
  console.log("📚 Day 4: Core Models & Controllers - READY FOR TESTING");
  console.log("");
});
