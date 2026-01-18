// Fixed server test with proper template literals
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simple health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Minimal server is running",
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Test endpoint working",
    data: {
      server: "eStokvel",
      version: "1.0.0",
      status: "running"
    }
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 Minimal Server Test
📡 Port: ${PORT}
⏰ Started: ${new Date().toLocaleString()}

🔗 Test Endpoints:
   http://localhost:${PORT}/health
   http://localhost:${PORT}/test
  `);
});
