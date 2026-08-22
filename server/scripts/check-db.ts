// One-off local diagnostic: verifies the app can actually reach Supabase Postgres.
// Read-only (SELECT 1) — makes no schema/data changes. Safe to run anytime.
// Run with: npm run check-db
import 'dotenv/config';
import dns from 'node:dns';
import { Pool } from 'pg';

// Same IPv4-first fix as src/lib/prisma.ts — Supabase's pooler is IPv4-only and some
// networks resolve it to IPv6 first, producing a misleading ECONNREFUSED.
dns.setDefaultResultOrder('ipv4first');

function maskConnectionString(cs: string | undefined): string {
  if (!cs) return '(not set)';
  return cs.replace(/:[^:@]+@/, ':***@');
}

async function test(name: string, connectionString: string | undefined) {
  if (!connectionString) {
    console.log(`✗ ${name}: not set in .env`);
    return;
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const r = await pool.query('select 1 as ok');
    console.log(`✓ ${name}: connected (${maskConnectionString(connectionString)})`, r.rows);
  } catch (e: any) {
    console.log(`✗ ${name}: FAILED (${maskConnectionString(connectionString)})`);
    console.log(`  ${e.message}`);
    if (/tenant or user.*not found|tenant\/user.*not found/i.test(e.message)) {
      console.log(
        '  → Supavisor rejected the project reference before checking credentials. This usually means\n' +
          '    the Supabase project is paused (free tier auto-pauses after ~1 week idle) or was deleted/reset.\n' +
          '    Check the project status in the Supabase dashboard and Resume it, or update DATABASE_URL/DIRECT_URL\n' +
          '    if you created a new project.'
      );
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  await test('DATABASE_URL (pooled, :6543)', process.env.DATABASE_URL);
  await test('DIRECT_URL (direct, :5432)', process.env.DIRECT_URL);
}

main();
