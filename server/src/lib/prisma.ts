import 'dotenv/config';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

// Dev: SQLite via better-sqlite3 adapter.
// Production (PostgreSQL/Supabase): @prisma/adapter-pg मा switch गर्नुहोस् —
//   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const url = process.env.DATABASE_URL ?? `file:${path.join(__dirname, '../../prisma/dev.db')}`;
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });
