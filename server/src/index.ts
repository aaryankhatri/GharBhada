import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import bookingRoutes from './routes/bookings';
import visitRoutes from './routes/visits';
import paymentRoutes from './routes/payments';
import miscRoutes from './routes/misc';

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'GharBhada API' }));

// TEMP diagnostic — raw pg connection, bypassing Prisma, to see the real low-level error
app.get('/api/debug-db', async (_req, res) => {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ ok: true, result: r.rows });
  } catch (e: any) {
    res.status(500).json({
      message: e.message, code: e.code, errno: e.errno,
      address: e.address, port: e.port, syscall: e.syscall,
      nestedErrors: Array.isArray(e.errors)
        ? e.errors.map((sub: any) => ({
            message: sub.message, code: sub.code, errno: sub.errno,
            address: sub.address, port: sub.port, syscall: sub.syscall,
          }))
        : undefined,
      hostUsed: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'),
    });
  } finally {
    await pool.end().catch(() => {});
  }
});
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

app.listen(PORT, () => console.log(`GharBhada API → http://localhost:${PORT}`));
