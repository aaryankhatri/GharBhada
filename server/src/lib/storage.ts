import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Render's (and most PaaS) filesystems are ephemeral — anything multer writes to local disk is
// gone on the next deploy/restart. In production we buffer uploads in memory (see middleware/upload.ts)
// and push them to Supabase Storage instead. Local dev without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// set keeps using disk storage under server/uploads/, so `npm run dev` needs no cloud credentials.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const cloudStorageEnabled = Boolean(supabaseUrl && supabaseServiceKey);

let client: SupabaseClient | null = null;
if (cloudStorageEnabled) {
  client = createClient(supabaseUrl!, supabaseServiceKey!, { auth: { persistSession: false } });
}

export const BUCKET_PROPERTY_PHOTOS = 'property-photos'; // public bucket
export const BUCKET_CITIZENSHIP_DOCS = 'citizenship-docs'; // private bucket — sensitive ID documents

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Cloud storage चालु छैन — SUPABASE_URL र SUPABASE_SERVICE_ROLE_KEY .env मा राख्नुहोस्');
    this.name = 'StorageNotConfiguredError';
  }
}

function randomName(originalname: string) {
  const ext = originalname.includes('.') ? `.${originalname.split('.').pop()!.toLowerCase()}` : '';
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

/** Uploads a property photo to the public bucket; returns a permanent public URL. */
export async function uploadPropertyPhoto(file: Express.Multer.File, landlordId: number): Promise<string> {
  if (!client) throw new StorageNotConfiguredError();
  const path = `${landlordId}/${randomName(file.originalname)}`;
  const { error } = await client.storage
    .from(BUCKET_PROPERTY_PHOTOS)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  return client.storage.from(BUCKET_PROPERTY_PHOTOS).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a citizenship photo to the private bucket; returns the storage path (NOT a URL — the
 * bucket has no public access). Resolve to a viewable URL only when needed, via getCitizenshipPhotoUrl().
 */
export async function uploadCitizenshipPhoto(file: Express.Multer.File, tenantId: number): Promise<string> {
  if (!client) throw new StorageNotConfiguredError();
  const path = `${tenantId}/${randomName(file.originalname)}`;
  const { error } = await client.storage
    .from(BUCKET_CITIZENSHIP_DOCS)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  return path;
}

/** Turns a stored citizenship-photo path into a time-limited signed URL (15 min). */
export async function getCitizenshipPhotoUrl(storedPath: string): Promise<string> {
  if (!client) throw new StorageNotConfiguredError();
  const { data, error } = await client.storage
    .from(BUCKET_CITIZENSHIP_DOCS)
    .createSignedUrl(storedPath, 60 * 15);
  if (error) throw error;
  return data.signedUrl;
}
