module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its Babel transform into react-native-worklets.
    // The worklets plugin MUST be last. Skia pulls reanimated in via moduleWrapper.
    plugins: ['react-native-worklets/plugin'],
  };
};
