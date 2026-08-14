import type { Response } from 'express';
import { checkOut } from '../service/check-out.service';
import { getDb } from '../../../config/database';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import {
  identifyUserFromLivePhoto,
  requireFaceMatchForUser,
} from '../service/face-punch.shared';
import { parsePunchLocation } from '../service/punch-location';
const assertCanPunch = async (req: AuthRequest, targetUserId: string): Promise<void> => {
  const role = req.user?.role;
  if (role === 'admin' || role === 'gatekeeper') return;

  if (req.user?.userId !== targetUserId) {
    throw Object.assign(new Error('You can only punch out for yourself'), { status: 403 });
  }

  const result = await getDb().query(
    `SELECT can_self_punch FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [targetUserId],
  );
  if (!result.rows[0]?.can_self_punch) {
    throw Object.assign(
      new Error('Self punch is not enabled for your account. Ask an admin for permission.'),
      { status: 403 },
    );
  }
};

export const checkOutHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bodyUserId =
      typeof req.body?.user_id === 'string'
        ? req.body.user_id
        : typeof req.body?.userId === 'string'
          ? req.body.userId
          : undefined;

    const file = req.file;
    if (!file?.path) {
      sendError(res, 'Live face photo is required for Punch Out');
      return;
    }

    const actorUserId = req.user?.userId;
    const actorRole = req.user?.role;
    if (!actorUserId || !actorRole) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const useIdentify =
      !bodyUserId && (actorRole === 'gatekeeper' || actorRole === 'admin');

    if (!bodyUserId && !useIdentify) {
      sendError(res, 'user_id is required');
      return;
    }

    let userId: string;
    let score: number;
    let relativePhotoPath: string;
    let userName: string | undefined;

    if (useIdentify) {
      const identified = await identifyUserFromLivePhoto(file.path);
      userId = identified.userId;
      score = identified.score;
      relativePhotoPath = identified.relativePhotoPath;
      userName = identified.userName;
    } else {
      userId = bodyUserId!;
      await assertCanPunch(req, userId);
      const matched = await requireFaceMatchForUser(userId, file.path);
      score = matched.score;
      relativePhotoPath = matched.relativePhotoPath;
      userName = matched.userName;
    }

    const punchLocation = parsePunchLocation(req.body);
    const row = await checkOut(userId, relativePhotoPath, { actorUserId, actorRole }, punchLocation);
    sendSuccess(res, { ...row, face_match_score: score, identified_user_name: userName });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    sendError(res, (err as Error).message, status);
  }
};
