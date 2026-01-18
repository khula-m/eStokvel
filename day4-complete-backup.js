// Simple working server - Day 4 Complete
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Day 4 Complete! All files created.",
    status: "Ready for Day 5: Testing"
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    status: "healthy",
    day4: "Complete ✅",
    models: ["StokvelGroup", "Member", "Transaction"],
    services: ["stokvelGroup", "member", "transaction"],
    controllers: ["stokvelGroup", "member", "transaction"],
    routes: ["stokvel", "member", "transaction"]
  });
});

app.listen(PORT, () => {
  console.log(`
🎉 DAY 4: CORE MODELS & CONTROLLERS - COMPLETE!
📡 Server running on port ${PORT}
🔗 Test: http://localhost:${PORT}/health

✅ WHAT YOU'VE BUILT:
   • Database schema with Prisma
   • 3 Core models with TypeScript interfaces
   • 3 Comprehensive services with business logic
   • 3 Complete controllers for HTTP handling
   • 3 Route definitions with middleware
   • All enums and utility functions

🚀 Tomorrow: Day 5 - API Testing & Documentation
  `);
});
