import { Prisma, PrismaClient as PrismaMain } from '../../generated/client';
import { PrismaClient as PrismaRetool } from '../../generated/retool';
import { configs } from '../config';

const log: Prisma.LogLevel[] = [];

// Enable query logging for the Prisma client
if (configs.QN_DB_LOGGER) {
  log.push('query', 'info', 'warn', 'error');
}

// This is the Prisma client that will be used by the main application
export const prismaMain = new PrismaMain({
  log
});

// This is the Prisma client that will be used by Retool
export const prismaRetool = new PrismaRetool({
  log
});
