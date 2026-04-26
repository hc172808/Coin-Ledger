const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const localPattern = /[\\\/]\.local[\\\/].*/;
const existing = config.resolver.blockList;
const list = existing
  ? Array.isArray(existing) ? existing : [existing]
  : [];
config.resolver.blockList = [...list, localPattern];

module.exports = config;
