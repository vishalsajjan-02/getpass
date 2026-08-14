import fs from 'fs';
import { getDb } from '../../../config/database';
import {
  identifyLiveAmongGallery,
  verifyLiveAgainstEmbedding,
  type GalleryFace,
} from '../../../services/face.service';
import { toAbsoluteUploadPath, toRelativeUploadPath } from '../../../utils/uploads';

let galleryCache: { at: number; faces: GalleryFace[] } | null = null;
const GALLERY_TTL_MS = 30_000;

const loadGallery = async (): Promise<GalleryFace[]> => {
  if (galleryCache && Date.now() - galleryCache.at < GALLERY_TTL_MS) {
    return galleryCache.faces;
  }

  const result = await getDb().query(
    `SELECT id, name, face_embedding
     FROM users
     WHERE deleted_at IS NULL
       AND face_embedding IS NOT NULL
       AND face_image_path IS NOT NULL`,
  );

  const gallery: GalleryFace[] = [];
  for (const row of result.rows) {
    try {
      const embedding = JSON.parse(String(row.face_embedding)) as number[];
      if (Array.isArray(embedding) && embedding.length) {
        gallery.push({
          id: String(row.id),
          name: row.name ? String(row.name) : undefined,
          embedding,
        });
      }
    } catch {
      // skip corrupt embeddings
    }
  }
  galleryCache = { at: Date.now(), faces: gallery };
  return gallery;
};

/** Call after face registration so identify picks up new embeddings quickly. */
export const invalidateFaceGalleryCache = (): void => {
  galleryCache = null;
};

/** 1:1 verify against a known user (self-punch). */
export const requireFaceMatchForUser = async (
  userId: string,
  liveAbsolutePath: string,
): Promise<{ score: number; relativePhotoPath: string; userId: string; userName?: string }> => {
  const result = await getDb().query(
    `SELECT name, face_embedding, face_image_path
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  const row = result.rows[0];
  if (!row?.face_embedding || !row?.face_image_path) {
    fs.unlink(liveAbsolutePath, () => undefined);
    throw Object.assign(
      new Error('No registered face for this user. Ask an admin to register their face first.'),
      { status: 400 },
    );
  }

  let embedding: number[];
  try {
    embedding = JSON.parse(String(row.face_embedding)) as number[];
  } catch {
    fs.unlink(liveAbsolutePath, () => undefined);
    throw Object.assign(new Error('Stored face embedding is invalid'), { status: 500 });
  }

  let verify;
  try {
    verify = await verifyLiveAgainstEmbedding(liveAbsolutePath, embedding);
  } catch (err) {
    fs.unlink(liveAbsolutePath, () => undefined);
    throw err;
  }

  if (!verify.match) {
    const auditPhotoPath = toRelativeUploadPath(liveAbsolutePath);
    console.warn('[face-audit] mismatch', {
      userId,
      score: verify.score,
      threshold: verify.threshold,
      audit_photo_path: auditPhotoPath,
      at: new Date().toISOString(),
    });
    throw Object.assign(new Error('Face Mismatch – Attendance Not Marked.'), {
      status: 403,
      face_match_score: verify.score,
      face_match_threshold: verify.threshold,
      audit_photo_path: auditPhotoPath,
    });
  }

  console.info('[face-audit] match', {
    userId,
    score: verify.score,
    threshold: verify.threshold,
    photo: toRelativeUploadPath(liveAbsolutePath),
    at: new Date().toISOString(),
  });

  return {
    score: verify.score,
    relativePhotoPath: toRelativeUploadPath(liveAbsolutePath),
    userId,
    userName: row.name ? String(row.name) : undefined,
  };
};

/**
 * 1:N identify — compare live face to all registered faces (gatekeeper kiosk).
 */
export const identifyUserFromLivePhoto = async (
  liveAbsolutePath: string,
): Promise<{ score: number; relativePhotoPath: string; userId: string; userName?: string }> => {
  const gallery = await loadGallery();
  if (!gallery.length) {
    fs.unlink(liveAbsolutePath, () => undefined);
    throw Object.assign(
      new Error('No registered faces in the system. Ask an admin to register faces first.'),
      { status: 400 },
    );
  }

  let identify;
  try {
    identify = await identifyLiveAmongGallery(liveAbsolutePath, gallery);
  } catch (err) {
    fs.unlink(liveAbsolutePath, () => undefined);
    throw err;
  }

  const auditPhotoPath = toRelativeUploadPath(liveAbsolutePath);

  if (!identify.match || !identify.userId) {
    console.warn('[face-audit] identify-mismatch', {
      score: identify.score,
      threshold: identify.threshold,
      gallery_size: gallery.length,
      audit_photo_path: auditPhotoPath,
      at: new Date().toISOString(),
    });
    throw Object.assign(new Error('Face Mismatch – Attendance Not Marked.'), {
      status: 403,
      face_match_score: identify.score,
      face_match_threshold: identify.threshold,
      audit_photo_path: auditPhotoPath,
    });
  }

  console.info('[face-audit] identify-match', {
    userId: identify.userId,
    userName: identify.userName,
    score: identify.score,
    threshold: identify.threshold,
    gallery_size: gallery.length,
    photo: auditPhotoPath,
    at: new Date().toISOString(),
  });

  return {
    score: identify.score,
    relativePhotoPath: auditPhotoPath,
    userId: identify.userId,
    userName: identify.userName,
  };
};

export const loadAbsoluteFacePath = (relativePath: string): string =>
  toAbsoluteUploadPath(relativePath);
