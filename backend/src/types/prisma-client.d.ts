// Type declaration for @prisma/client
// Prisma v6 generates types to .prisma/client/ but doesn't always create
// the declaration files in @prisma/client/. This bridge file resolves the issue.
declare module '@prisma/client' {
  export * from '.prisma/client';
}

declare module '@prisma/client/runtime/library.js' {
  export * from '.prisma/client';
}
