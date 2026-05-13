import { initDb, closeDb } from '../config/database';

(async () => {
  await initDb();
  await closeDb();
  console.log('✅ Migration complete');
  process.exit(0);
})();
