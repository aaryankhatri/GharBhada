// One-time setup: creates the Supabase Storage buckets GharBhada needs, if they don't exist yet.
// Run with: npm run setup-storage   (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL र SUPABASE_SERVICE_ROLE_KEY .env मा चाहिन्छ।');
  process.exit(1);
}

const supabase = createClient(url, key);

async function ensureBucket(name: string, isPublic: boolean, fileSizeLimitMB: number) {
  const { data: existing } = await supabase.storage.getBucket(name);
  if (existing) {
    console.log(`✓ Bucket "${name}" पहिले नै छ`);
    return;
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: `${fileSizeLimitMB}MB`,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
  });
  if (error) throw error;
  console.log(`✓ Bucket "${name}" बन्यो (public=${isPublic})`);
}

async function main() {
  await ensureBucket('property-photos', true, 5);
  await ensureBucket('citizenship-docs', false, 2);
  console.log('Storage setup पूरा भयो।');
}

main().catch(e => {
  console.error('Storage setup असफल भयो:', e.message || e);
  process.exit(1);
});
