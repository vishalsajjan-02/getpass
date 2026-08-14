import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomUUID } from 'crypto';

export const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
export const FACES_DIR = path.join(UPLOADS_ROOT, 'faces');
export const PUNCH_DIR = path.join(UPLOADS_ROOT, 'punch');

for (const dir of [UPLOADS_ROOT, FACES_DIR, PUNCH_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image uploads are allowed'));
    return;
  }
  cb(null, true);
};

const diskStorage = (subdir: 'faces' | 'punch') =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, subdir === 'faces' ? FACES_DIR : PUNCH_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  });

export const faceUpload = multer({
  storage: diskStorage('faces'),
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const punchUpload = multer({
  storage: diskStorage('punch'),
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

/** Relative path stored in DB, e.g. faces/uuid.jpg */
export const toRelativeUploadPath = (absolutePath: string): string => {
  const rel = path.relative(UPLOADS_ROOT, absolutePath).replace(/\\/g, '/');
  return rel;
};

export const toAbsoluteUploadPath = (relativePath: string): string =>
  path.join(UPLOADS_ROOT, relativePath);

export const publicUploadUrl = (relativePath?: string | null): string | undefined => {
  if (!relativePath) return undefined;
  return `/uploads/${relativePath.replace(/^\/+/, '')}`;
};
