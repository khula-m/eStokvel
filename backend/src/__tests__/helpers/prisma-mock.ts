/**
 * Prisma mock factory for unit tests.
 * Provides a fully mock-able prisma client singleton.
 */

// Deep mock of all Prisma models
const mockModels = [
  'user', 'stokvelGroup', 'member', 'transaction',
  'chatMessage', 'chatReply', 'announcement', 'announcementRead',
  'meeting', 'meetingAttendance',
] as const;

type MockPrismaClient = {
  [K in (typeof mockModels)[number]]: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
    groupBy: jest.Mock;
    updateMany: jest.Mock;
    upsert: jest.Mock;
  };
} & {
  $transaction: jest.Mock;
  $disconnect: jest.Mock;
};

function createMockPrisma(): MockPrismaClient {
  const mock: any = {
    $transaction: jest.fn((fn: any) => {
      // By default, execute the callback with the mock prisma itself
      if (typeof fn === 'function') {
        return fn(mock);
      }
      return Promise.resolve(fn);
    }),
    $disconnect: jest.fn(),
  };

  for (const model of mockModels) {
    mock[model] = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    };
  }

  return mock as MockPrismaClient;
}

export const prismaMock = createMockPrisma();

// Replace the real prisma export with our mock
jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
  toNumber: (value: any) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return Number(value);
  },
  sumDecimals: (values: any[]) =>
    values.reduce((sum: number, val: any) => sum + (val ? Number(val) : 0), 0),
}));

export function resetAllMocks() {
  for (const model of mockModels) {
    for (const method of Object.keys(prismaMock[model])) {
      (prismaMock[model] as any)[method].mockReset();
    }
  }
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation((fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return Promise.resolve(fn);
  });
  prismaMock.$disconnect.mockReset();
}
