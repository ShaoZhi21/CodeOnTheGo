// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add any custom configuration here
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

// Remove Node.js polyfills and add proper configuration for Expo
config.resolver.extraNodeModules = {
  // Add any additional module aliases here if needed
};

// Ensure we're using the browser version of modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('ws/') || moduleName === 'ws') {
    return {
      filePath: require.resolve('react-native-websocket'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 