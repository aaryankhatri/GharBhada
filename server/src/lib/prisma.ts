import 'dotenv/config';
import dns from 'node:dns';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Supabase's transaction-mode pooler is IPv4-only. Some hosts (e.g. Render)
// resolve its hostname to an IPv6 address first, and the connection gets
// refused since nothing listens there. Force IPv4 resolution first.
dns.setDefaultResultOrder('ipv4first');

// rejectUnauthorized: false — Supabase's pooler cert chain isn't trusted by
// every hosting platform's default CA store (e.g. Render); connection is
// still encrypted, just not strictly cert-verified.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const prisma = new PrismaClient({ adapter });
