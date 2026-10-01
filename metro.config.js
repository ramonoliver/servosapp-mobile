// Com a conta do Sentry configurada, o Metro gera os ids dos mapas de código
// (erros chegam com a linha certa). Sem ela, é a configuração padrão do Expo.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = process.env.SENTRY_ORG
  ? require("@sentry/react-native/metro").getSentryExpoConfig(__dirname)
  : getDefaultConfig(__dirname);
