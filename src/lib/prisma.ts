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