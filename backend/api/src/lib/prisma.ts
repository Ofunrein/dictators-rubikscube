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
