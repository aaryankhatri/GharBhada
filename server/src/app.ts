import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import bookingRoutes from './routes/bookings';
import visitRoutes from './routes/visits';
import paymentRoutes from './routes/payments';
import miscRoutes from './routes/misc';

// Express app configuration only — no app.listen() here, so the exact same app can run two
// ways: index.ts calls .listen() for local dev / an always-on host (Render, a VM, etc), while
// api/index.ts (Vercel) invokes this app directly per-request as a serverless function instead
// of binding a port.
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'GharBhada API' }));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', miscRoutes);

// Error handler (multer file-size errors etc.)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'फोटोको साइज सीमा नाघ्यो (property: 5MB, नागरिकता: 2MB)' });
  }
  console.error(err);
  res.status(500).json({ error: err?.message || 'Server त्रुटि भयो' });
});

export default app;
