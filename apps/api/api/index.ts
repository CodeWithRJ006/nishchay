import { createApp } from '../src/app';
import { initDb } from '../src/db';

let dbInitialized = false;

const app = createApp();

app.use(async (req, res, next) => {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  next();
});

export default app;
