import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initDb } from './config/database';
import { runSeed } from './database/seed';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

(async () => {
  await initDb();
  await runSeed();
  app.listen(env.PORT, () => {
    console.log(`\n🚀 Gatepass API running on http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   API prefix  : /api\n`);
  });
})();

export default app;
