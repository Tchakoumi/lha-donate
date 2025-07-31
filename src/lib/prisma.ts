import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object to prevent
// exhausting the database connection limit during development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper function to disconnect Prisma (useful in serverless environments)
export const disconnectPrisma = async () => {
  await prisma.$disconnect()
}

// Graceful shutdown handlers (only in Node.js runtime, not Edge Runtime)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  process.on('SIGINT', async () => {
    console.log('🔄 Gracefully shutting down Prisma...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🔄 Gracefully shutting down Prisma...');
    await prisma.$disconnect();
    process.exit(0);
  });
}