const app = require('./src/app');
const { connectDB } = require('./src/db');
const path = require('path');

const PORT = process.env.PORT || 3001;

// In production, serve the built React client
if (process.env.NODE_ENV === 'production') {
  const express = require('express');
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// Connect to MongoDB, then start Express
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  [Server] Payout API Server running at http://localhost:${PORT}`);
    console.log(`  [Server] API base: http://localhost:${PORT}/api\n`);
  });
});
