import { getDb } from '../../../config/database';
import type { GatepassReason } from '../../../types';

export const getGatepassReasons = async (): Promise<GatepassReason[]> => {
  const result = await getDb().query(
    `SELECT id, name
     FROM gatepass_reasons
     WHERE deleted_at IS NULL
     ORDER BY CASE LOWER(name)
       WHEN 'lunch' THEN 1
       WHEN 'out' THEN 2
       ELSE 3
     END, name`,
  );
  return result.rows as GatepassReason[];
};
