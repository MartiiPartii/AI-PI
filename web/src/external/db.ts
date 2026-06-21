import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client (the app's connection to the database).
 *
 * A single instance is reused across requests. In development Next.js clears the
 * module cache on every hot reload, which would otherwise open a new pool of
 * connections each time, so we stash the instance on `globalThis`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
