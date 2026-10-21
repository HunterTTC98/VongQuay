import express from 'express';
import apiRouter from './api.ts';

const app = express();

app.use(express.json());

// API Router
app.use('/api', apiRouter);

export default app;
