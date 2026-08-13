// Sandbox/offline fallback: prisma migrate को सट्टा migration SQL सिधै apply गर्छ।
// सामान्य वातावरणमा `npx prisma migrate dev` नै प्रयोग गर्नुहोस्।
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.join(__dirname, 'dev.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrationsDir = path.join(__dirname, 'migrations');
const dirs = fs.readdirSync(migrationsDir).filter(d =>
  fs.statSync(path.join(migrationsDir, d)).isDirectory()
).sort();

db.exec(`CREATE TABLE IF NOT EXISTS "_applied_migrations" (name TEXT PRIMARY KEY, appliedAt TEXT)`);

for (const dir of dirs) {
  const done = db.prepare(`SELECT 1 FROM "_applied_migrations" WHERE name = ?`).get(dir);
  if (done) { console.log(`skip: ${dir}`); continue; }
  const sql = fs.readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
  db.exec(sql);
  db.prepare(`INSERT INTO "_applied_migrations" (name, appliedAt) VALUES (?, datetime('now'))`).run(dir);
  console.log(`applied: ${dir}`);
}
db.close();
console.log('Migrations सम्पन्न →', dbPath);
