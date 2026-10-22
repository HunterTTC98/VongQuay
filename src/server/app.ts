import express from 'express';
import apiRouter from './api.ts';

const app = express();

app.use(express.json());

// API Router
app.use('/api', apiRouter);

// Strict 404 JSON response for any unmatched API routes so they never return HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

export default app;

