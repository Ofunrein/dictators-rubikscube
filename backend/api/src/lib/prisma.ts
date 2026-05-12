/**
 * prisma.ts — Lazy-initialized Prisma Client singleton
 *
 * Exports a single shared PrismaClient instance for the whole backend so we
 * don't open a new database connection pool on every import. The client is
 * created on first use (lazy) rather than at module load time so tests can
 * swap it out before anything connects.
 *
 * Key exports:
 *   - prisma — a Proxy-wrapped PrismaClient; safe to import anywhere in the backend
 *
 * Does NOT manage migrations — use `prisma migrate` in the CLI for that.
 */
import { PrismaClient } from '@prisma/client';

let _prisma: PrismaClient | undefined;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      _prisma = new PrismaClient();
    }
    const value = (_prisma as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(_prisma) : value;
  },
});
