const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});
