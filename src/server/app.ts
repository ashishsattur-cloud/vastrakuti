// src/server/app.ts
import express from 'express';
import apiRouter from './routes.ts';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Sutra Cotton Retail Management System', timestamp: new Date() });
});

// API Routes
app.use('/api', apiRouter);

export default app;
