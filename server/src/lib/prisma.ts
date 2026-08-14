import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// rejectUnauthorized: false — Supabase's pooler cert chain isn't trusted by
// every hosting platform's default CA store (e.g. Render); connection is
// still encrypted, just not strictly cert-verified.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const prisma = new PrismaClient({ adapter });
