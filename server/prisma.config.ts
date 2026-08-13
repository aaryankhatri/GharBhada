import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Migrate needs the direct (non-pooled) connection.
    url: process.env.DIRECT_URL,
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
