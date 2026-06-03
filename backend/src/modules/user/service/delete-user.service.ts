import { getDb } from '../../../config/database';
import { getUserById } from './shared/user.shared';

export const deleteUser = async (id: string): Promise<void> => {
  await getUserById(id);
  await getDb().query('DELETE FROM users WHERE id = $1', [id]);
};
