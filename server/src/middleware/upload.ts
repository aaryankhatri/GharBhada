import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

function imageFilter(maxMB: number) {
  return (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
    if (!ok) return cb(new Error('JPG वा PNG मात्र अनुमति छ'));
    cb(null, true);
  };
}

// Property photos: max 5MB each, min 3 enforced in route
export const propertyPhotoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter(5),
});

// Citizenship photos: max 2MB each
export const citizenshipUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter(2),
});
