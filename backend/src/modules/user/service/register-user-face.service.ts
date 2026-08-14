import { getDb } from '../../../config/database';
import { embedFaceImage } from '../../../services/face.service';
import { getUserById } from './shared/user.shared';
import { toRelativeUploadPath } from '../../../utils/uploads';
import { invalidateFaceGalleryCache } from '../../userInOutTime/service/face-punch.shared';
import type { User } from '../../../types';
import fs from 'fs';

export const registerUserFace = async (
  userId: string,
  absoluteImagePath: string,
): Promise<User> => {
  const user = await getUserById(userId);
  if (user.role !== 'employee' && user.role !== 'manager') {
    fs.unlink(absoluteImagePath, () => undefined);
    throw new Error('Face registration is only for employees and managers');
  }

  let embedding: number[];
  try {
    const result = await embedFaceImage(absoluteImagePath);
    embedding = result.embedding;
  } catch (err) {
    fs.unlink(absoluteImagePath, () => undefined);
    throw err;
  }

  const relativePath = toRelativeUploadPath(absoluteImagePath);

  // Remove previous face file if replacing
  if (user.face_image_path && user.face_image_path !== relativePath) {
    const { toAbsoluteUploadPath } = await import('../../../utils/uploads');
    fs.unlink(toAbsoluteUploadPath(user.face_image_path), () => undefined);
  }

  await getDb().query(
    `UPDATE users
     SET face_image_path = $1,
         face_embedding = $2,
         face_registered_at = NOW(),
         updated_at = NOW()
     WHERE id = $3 AND deleted_at IS NULL`,
    [relativePath, JSON.stringify(embedding), userId],
  );

  invalidateFaceGalleryCache();
  return getUserById(userId);
};

export const clearUserFace = async (userId: string): Promise<User> => {
  const user = await getUserById(userId);
  if (user.face_image_path) {
    const { toAbsoluteUploadPath } = await import('../../../utils/uploads');
    fs.unlink(toAbsoluteUploadPath(user.face_image_path), () => undefined);
  }
  await getDb().query(
    `UPDATE users
     SET face_image_path = NULL,
         face_embedding = NULL,
         face_registered_at = NULL,
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  invalidateFaceGalleryCache();
  return getUserById(userId);
};
