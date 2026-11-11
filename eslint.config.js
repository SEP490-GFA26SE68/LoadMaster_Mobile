// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // These templates resolve their relative imports after being copied into src/.
    files: ["scripts/web-overrides/**/*.ts"],
    rules: { "import/no-unresolved": "off" },
  },
  {
    ignores: ["dist/**", ".expo/**"],
  }
]);
