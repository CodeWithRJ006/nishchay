import { createApp } from './app';
import { initDb } from './db';

const PORT = process.env.PORT || 3000;

async function start() {
  await initDb();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

start();
