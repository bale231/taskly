module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Richiesto da react-native-reanimated 4: va tenuto per ultimo.
    plugins: ["react-native-worklets/plugin"],
  };
};
