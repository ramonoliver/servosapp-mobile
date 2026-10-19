// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // A raiz do pacote leva os 1.512 ícones para o bundle (docs/09-desempenho.md).
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phosphor-react-native",
              message: 'Importe de "@/components/ui/icons" (ícone a ícone, via phosphor-react-native/src/icons/*).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
]);
