import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl && !databaseUrl.includes('connection_limit=')) {
  const joinChar = databaseUrl.includes('?') ? '&' : '?'
  process.env.DATABASE_URL = `${databaseUrl}${joinChar}connection_limit=1`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

