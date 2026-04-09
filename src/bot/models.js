/**
 * Prisma client for P2P Delivery bot
 * Shares the same schema as the backend
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };
export default prisma;
