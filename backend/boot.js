// Boot wrapper — catches fatal errors during module loading
// before server.ts's own crash handlers are registered
process.on('uncaughtException', (err) => {
  console.error('[BOOT] FATAL uncaughtException:', err.stack || err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[BOOT] FATAL unhandledRejection:', err);
  process.exit(1);
});

console.log('[BOOT] Loading server module...');
try {
  require('./server');
  console.log('[BOOT] Server module loaded successfully');
} catch (err) {
  console.error('[BOOT] FATAL: Server failed to load:', err);
  process.exit(1);
}
