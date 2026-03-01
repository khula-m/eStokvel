const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// Workspace root is 3 levels up (frontend/mobile/eStokvelMobile -> eStokvel)
const workspaceRoot = path.resolve(projectRoot, '..', '..', '..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root so Metro can find hoisted packages
config.watchFolders = [workspaceRoot];

// Resolve from both local and workspace-root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

