import http from 'http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initDb, getDb } from './config/database';
import { runSeed } from './database/seed';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import { initSocketServer } from './realtime/socket';
import { UPLOADS_ROOT } from './utils/uploads';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_ROOT));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

const shouldSeedOnBoot = async (): Promise<boolean> => {
  // Force full reseed when explicitly requested.
  if (process.env.FORCE_SEED === '1' || process.env.FORCE_SEED === 'true') {
    return true;
  }
  // Avoid wiping users on every `tsx watch` restart — that invalidates JWTs
  // and breaks gatekeeper Out/In (checked_out_by FK) until re-login.
  const result = await getDb().query(
    `SELECT 1 FROM users WHERE deleted_at IS NULL LIMIT 1`,
  );
  return result.rows.length === 0;
};

(async () => {
  await initDb();
  if (await shouldSeedOnBoot()) {
    await runSeed();
  } else {
    console.log('\n⏭️  Skipping seed (database already has users). Set FORCE_SEED=1 to reseed.\n');
  }
  initSocketServer(server);
  server.listen(env.PORT, () => {
    console.log(`\n🚀 Gatepass API running on http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   API prefix  : /api\n`);
  });
})();

export default app;
