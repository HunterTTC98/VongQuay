import express from 'express';
import { performance } from 'node:perf_hooks';
import apiRouter from './api.ts';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const startedAt = performance.now();
  res.once('finish', () => {
    if (process.env.VERCEL) {
      const duration = (performance.now() - startedAt).toFixed(1);
      console.info(`[api-timing] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// API Router
app.use('/api', apiRouter);

// Strict 404 JSON response for any unmatched API routes so they never return HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

export default app;

