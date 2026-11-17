const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit Metro workers on Windows to prevent EMFILE (too many open files) cache read errors.
config.maxWorkers = 2;

module.exports = config;
