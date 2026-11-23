const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.maxWorkers = 1;

// Ignora as pastas bin, obj e nós superiores da API .NET
config.resolver.blockList = [
  /.*\/DevBeDev\.API\/bin\/.*/,
  /.*\/DevBeDev\.API\/obj\/.*/,
  /.*\.dll$/,
  /.*\.exe$/
];

// Garante que o Metro observe prioritariamente a pasta do mobile
config.watchFolders = [path.resolve(__dirname)];

module.exports = config;