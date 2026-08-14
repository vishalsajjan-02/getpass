import { getDb } from '../../../config/database';
import { emitAttendanceSocketEvent } from '../../../realtime/socket';
import type { PunchVia, UserInOutTime } from '../../../types';
import { publicUploadUrl } from '../../../utils/uploads';
import { ensureUserExists, normalizeDateKey, todayDate, workingHoursSqlSet } from './shared/user-in-out-time.shared';
import type { PunchLocation } from './punch-location';

export type PunchActor = {
  actorUserId: string;
  actorRole: string;
};

/** self = employee/manager punched their own account; gatekeeper = desk/gatekeeper (or admin) punch. */
export const resolvePunchVia = (actor: PunchActor, targetUserId: string): PunchVia => {
  if (actor.actorUserId === targetUserId) return 'self';
  return 'gatekeeper';
};

const mapRow = (row: Record<string, unknown>): UserInOutTime => ({
  id: String(row.id),
  user_id: String(row.user_id),
  date: normalizeDateKey(row.date as string | Date) ?? String(row.date).slice(0, 10),
  in_time: row.in_time ? String(row.in_time) : undefined,
  out_time: row.out_time ? String(row.out_time) : undefined,
  in_photo_path: row.in_photo_path ? String(row.in_photo_path) : undefined,
  out_photo_path: row.out_photo_path ? String(row.out_photo_path) : undefined,
  in_photo_url: publicUploadUrl(row.in_photo_path ? String(row.in_photo_path) : null),
  out_photo_url: publicUploadUrl(row.out_photo_path ? String(row.out_photo_path) : null),
  in_location: row.in_location ? String(row.in_location) : undefined,
  out_location: row.out_location ? String(row.out_location) : undefined,
  in_latitude: row.in_latitude != null ? Number(row.in_latitude) : undefined,
  in_longitude: row.in_longitude != null ? Number(row.in_longitude) : undefined,
  out_latitude: row.out_latitude != null ? Number(row.out_latitude) : undefined,
  out_longitude: row.out_longitude != null ? Number(row.out_longitude) : undefined,
  in_via: row.in_via === 'self' || row.in_via === 'gatekeeper' ? row.in_via : undefined,
  out_via: row.out_via === 'self' || row.out_via === 'gatekeeper' ? row.out_via : undefined,
  in_marked_by: row.in_marked_by ? String(row.in_marked_by) : undefined,
  out_marked_by: row.out_marked_by ? String(row.out_marked_by) : undefined,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

/**
 * If someone forgot Punch Out on a previous day, close that day at 23:59:59
 * so the new day can start cleanly with Punch In.
 */
const closeForgottenOpenPunchesBefore = async (
  userId: string,
  beforeDate: string,
): Promise<void> => {
  await getDb().query(
    `
    UPDATE user_in_out_time
    SET
      out_time = (date::timestamp + INTERVAL '1 day' - INTERVAL '1 second'),
      ${workingHoursSqlSet(`(date::timestamp + INTERVAL '1 day' - INTERVAL '1 second')`)},
      updated_at = NOW()
    WHERE user_id = $1
      AND date < $2::date
      AND deleted_at IS NULL
      AND in_time IS NOT NULL
      AND out_time IS NULL
    `,
    [userId, beforeDate],
  );
};

export const checkIn = async (
  userId: string,
  photoRelativePath: string | undefined,
  actor: PunchActor,
  punchLocation?: PunchLocation,
): Promise<UserInOutTime> => {
  await ensureUserExists(userId);
  const date = todayDate();
  const via = resolvePunchVia(actor, userId);

  // New calendar day always starts with Punch In — close any forgotten prior open days.
  await closeForgottenOpenPunchesBefore(userId, date);

  const existing = await getDb().query(
    `SELECT in_time, out_time
     FROM user_in_out_time
     WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
    [userId, date],
  );
  const todayRow = existing.rows[0] as
    | { in_time?: string | null; out_time?: string | null }
    | undefined;

  // One Punch In per user per calendar day.
  if (todayRow?.in_time) {
    throw Object.assign(
      new Error(
        todayRow.out_time
          ? 'Already completed Punch In and Punch Out for today. Try again tomorrow.'
          : 'Already punched in today. Punch out once, then wait until tomorrow for a new Punch In.',
      ),
      { status: 400 },
    );
  }

  const result = await getDb().query(
    `
    INSERT INTO user_in_out_time (
      user_id, date, in_time, in_photo_path,
      in_location, in_latitude, in_longitude,
      in_via, in_marked_by, deleted_at
    )
    VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, NULL)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      in_time        = EXCLUDED.in_time,
      in_photo_path  = COALESCE(EXCLUDED.in_photo_path, user_in_out_time.in_photo_path),
      in_location    = COALESCE(EXCLUDED.in_location, user_in_out_time.in_location),
      in_latitude    = COALESCE(EXCLUDED.in_latitude, user_in_out_time.in_latitude),
      in_longitude   = COALESCE(EXCLUDED.in_longitude, user_in_out_time.in_longitude),
      in_via         = EXCLUDED.in_via,
      in_marked_by   = EXCLUDED.in_marked_by,
      deleted_at     = NULL,
      updated_at     = NOW()
    WHERE user_in_out_time.in_time IS NULL
    RETURNING
      id, user_id, date, in_time, out_time,
      in_photo_path, out_photo_path,
      in_location, out_location, in_latitude, in_longitude, out_latitude, out_longitude,
      in_via, out_via, in_marked_by, out_marked_by,
      created_at, updated_at
    `,
    [
      userId,
      date,
      photoRelativePath ?? null,
      punchLocation?.location ?? null,
      punchLocation?.latitude ?? null,
      punchLocation?.longitude ?? null,
      via,
      actor.actorUserId,
    ],
  );

  if (!result.rows[0]) {
    throw Object.assign(
      new Error('Already punched in today. Only one Punch In is allowed per day.'),
      { status: 400 },
    );
  }

  const row = mapRow(result.rows[0]);
  emitAttendanceSocketEvent({
    user_id: userId,
    date: row.date,
    state: 'present',
    in_time: row.in_time,
    out_time: undefined,
  });

  return row;
};
