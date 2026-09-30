import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

let initialized = false;

export async function initDb() {
  if (initialized) return;
  await prisma.$queryRaw`PRAGMA journal_mode = WAL;`;
  await prisma.$queryRaw`PRAGMA busy_timeout = 5000;`;
  initialized = true;
}

export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // In SQLite, write operations inside interactive transactions can cause SQLITE_BUSY if concurrent.
      // Because we use WAL + busy_timeout, it retries automatically at the driver level.
      return await fn(tx);
    },
    {
      maxWait: 5000, // default is 2000
      timeout: 10000 // default is 5000
    }
  );
}
