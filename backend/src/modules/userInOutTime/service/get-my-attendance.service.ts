import { getDb } from '../../../config/database';
import type { UserAttendance } from '../../../types';
import { getUserAttendance } from './shared/user-in-out-time.shared';

export const getMyAttendance = async (userId: string, date?: string): Promise<UserAttendance> => {
  return getUserAttendance(getDb(), userId, date);
};
