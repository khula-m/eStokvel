// Correct Prisma setup for 6.19.2
import { PrismaClient, Prisma } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Transaction client type for use in prisma.$transaction callbacks.
 * Use: prisma.$transaction(async (tx: TransactionClient) => { ... })
 */
export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] extends infer T ? T : never;

/**
 * Safely convert Prisma Decimal to number
 * Use this for all monetary calculations to avoid type errors
 */
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

/**
 * Sum an array of Decimal values
 */
export function sumDecimals(values: (Prisma.Decimal | number | null | undefined)[]): number {
  return values.reduce<number>((sum, val) => sum + toNumber(val), 0);
}
