import { getDb } from '../../../config/database';
import { getLiveEmployeeStatusesInternal } from './shared/gatepass.shared';
import type { LiveEmployeeStatusReport } from '../../../types';

export const getLiveEmployeeStatuses = async (employeeId?: string): Promise<LiveEmployeeStatusReport[]> =>
  getLiveEmployeeStatusesInternal(getDb(), employeeId);
