import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import logger from "./utils/logger";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get("/", (_req, res) => {
  res.json({ 
    message: "eStokvel API is running!",
    version: "1.0.0",
    status: "active"
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;

