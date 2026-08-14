import type { Response } from 'express';
import { checkIn } from '../service/check-in.service';
import { checkOut } from '../service/check-out.service';
import { getDb } from '../../../config/database';
import { sendSuccess, sendError } from '../../../utils/response.utils';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import { identifyUserFromLivePhoto } from '../service/face-punch.shared';
import { parsePunchLocation } from '../service/punch-location';
import { todayDate } from '../service/shared/user-in-out-time.shared';
/**
 * Gatekeeper kiosk: identify face among all users, then Punch In or Punch Out
 * based on today's attendance state.
 */
export const autoPunchHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actorUserId = req.user?.userId;
    const actorRole = req.user?.role;
    if (!actorUserId || !actorRole) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (actorRole !== 'gatekeeper' && actorRole !== 'admin') {
      sendError(res, 'Only gatekeeper or admin can use auto punch', 403);
      return;
    }

    const file = req.file;
    if (!file?.path) {
      sendError(res, 'Live face photo is required');
      return;
    }

    const identified = await identifyUserFromLivePhoto(file.path);
    const { userId, userName, score, relativePhotoPath } = identified;
    const date = todayDate();

    const existing = await getDb().query(
      `SELECT in_time, out_time
       FROM user_in_out_time
       WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
      [userId, date],
    );
    const todayRow = existing.rows[0] as
      | { in_time?: string | null; out_time?: string | null }
      | undefined;

    // Day already complete — no more punches until tomorrow.
    if (todayRow?.in_time && todayRow?.out_time) {
      throw Object.assign(
        new Error(
          `${userName ? `${userName}: ` : ''}Already completed Punch In and Punch Out for today. Try again tomorrow.`,
        ),
        { status: 400 },
      );
    }

    const needsOut = Boolean(todayRow?.in_time && !todayRow?.out_time);
    const action: 'in' | 'out' = needsOut ? 'out' : 'in';

    const punchLocation = parsePunchLocation(req.body);
    const actor = { actorUserId, actorRole };
    const row =
      action === 'out'
        ? await checkOut(userId, relativePhotoPath, actor, punchLocation)
        : await checkIn(userId, relativePhotoPath, actor, punchLocation);

    sendSuccess(res, {
      ...row,
      punch_action: action,
      face_match_score: score,
      identified_user_name: userName,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 400;
    sendError(res, (err as Error).message, status);
  }
};
