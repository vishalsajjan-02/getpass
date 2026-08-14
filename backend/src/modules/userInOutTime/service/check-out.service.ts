import { getDb } from '../../../config/database';
import { emitAttendanceSocketEvent } from '../../../realtime/socket';
import type { UserInOutTime } from '../../../types';
import { publicUploadUrl } from '../../../utils/uploads';
import {
  ensureUserExists,
  normalizeDateKey,
  todayDate,
  workingHoursSqlSet,
} from './shared/user-in-out-time.shared';
import { resolvePunchVia, type PunchActor } from './check-in.service';
import type { PunchLocation } from './punch-location';

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
  total_working_hr: row.total_working_hr != null ? Number(row.total_working_hr) : undefined,
  ot: row.ot != null ? Number(row.ot) : undefined,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

export const checkOut = async (
  userId: string,
  photoRelativePath: string | undefined,
  actor: PunchActor,
  punchLocation?: PunchLocation,
): Promise<UserInOutTime> => {
  await ensureUserExists(userId);
  const date = todayDate();
  const via = resolvePunchVia(actor, userId);

  const existing = await getDb().query(
    `SELECT in_time, out_time
     FROM user_in_out_time
     WHERE user_id = $1 AND date = $2::date AND deleted_at IS NULL`,
    [userId, date],
  );
  const todayRow = existing.rows[0] as
    | { in_time?: string | null; out_time?: string | null }
    | undefined;

  if (!todayRow?.in_time) {
    throw Object.assign(new Error('Punch In first before Punch Out.'), { status: 400 });
  }

  // One Punch Out per user per calendar day.
  if (todayRow.out_time) {
    throw Object.assign(
      new Error('Already completed Punch In and Punch Out for today. Try again tomorrow.'),
      { status: 400 },
    );
  }

  const result = await getDb().query(
    `
    UPDATE user_in_out_time
    SET out_time = NOW(),
        ${workingHoursSqlSet('NOW()')},
        out_photo_path = COALESCE($3, out_photo_path),
        out_location = COALESCE($4, out_location),
        out_latitude = COALESCE($5, out_latitude),
        out_longitude = COALESCE($6, out_longitude),
        out_via = $7,
        out_marked_by = $8,
        updated_at = NOW()
    WHERE user_id = $1
      AND date = $2
      AND deleted_at IS NULL
      AND in_time IS NOT NULL
      AND out_time IS NULL
    RETURNING
      id, user_id, date, in_time, out_time,
      in_photo_path, out_photo_path,
      in_location, out_location, in_latitude, in_longitude, out_latitude, out_longitude,
      in_via, out_via, in_marked_by, out_marked_by,
      total_working_hr, ot,
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
      new Error('Already punched out today. Only one Punch Out is allowed per day.'),
      { status: 400 },
    );
  }

  const row = mapRow(result.rows[0]);
  emitAttendanceSocketEvent({
    user_id: userId,
    date: row.date,
    state: 'left',
    in_time: row.in_time,
    out_time: row.out_time,
  });

  return row;
};
