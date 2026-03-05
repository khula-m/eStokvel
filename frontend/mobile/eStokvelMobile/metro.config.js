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

// Fix for the empty module - get the exact path
const emptyModulePath = path.join(projectRoot, 'node_modules/metro-runtime/src/modules/empty-module.js');

// IMPORTANT: Fix Windows path resolution WITHOUT converting to file:// URLs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Special handling for the empty module that's causing the error
  if (moduleName === '_' || (moduleName && moduleName.includes('empty-module.js'))) {
    return {
      type: 'sourceFile',
      filePath: emptyModulePath,
    };
  }
  
  // Handle Windows paths - normalize backslashes to forward slashes, but DON'T add file://
  if (moduleName && typeof moduleName === 'string' && moduleName.match(/^[A-Z]:\\/i)) {
    // Just normalize the path, don't add file://
    const normalizedPath = moduleName.replace(/\\/g, '/');
    return context.resolveRequest(context, normalizedPath, platform);
  }
  
  // Default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Add extraNodeModules to help with resolution
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'metro-runtime': path.join(projectRoot, 'node_modules/metro-runtime'),
};

// Ensure Metro can find modules
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;