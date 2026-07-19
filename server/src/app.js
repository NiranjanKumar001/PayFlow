const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const usersRouter = require('./routes/users');
const salesRouter = require('./routes/sales');
const payoutsRouter = require('./routes/payouts');
const jobsRouter = require('./routes/jobs');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
// Prefix routes
app.use('/api/users', usersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/payouts', payoutsRouter);
app.use('/api/jobs', jobsRouter);

// Fallback root routes to support direct base URL environment variables
app.use('/users', usersRouter);
app.use('/sales', salesRouter);
app.use('/payouts', payoutsRouter);
app.use('/jobs', jobsRouter);

// ─── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
