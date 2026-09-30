# Push notifications — estado e próximos passos

## Como funciona hoje
- O servidor (`Servos-v3/server`) envia push via **FCM** (`firebase-admin` → `sendEachForMulticast`) para os tokens da coleção `pushTokens`.
- O app registra o aparelho em `POST /api/notifications/register-push` (a cada abertura, o que atualiza `last_used_at`) e o remove no logout (`DELETE`, novo).
- Tocar na notificação abre o contexto: `data.url` (rota do web, ex. `/escalas/:id`) é traduzida por `src/lib/links.ts`.
- A pré-permissão (tela "Não perca nenhuma escala") só aparece quando o aparelho **pode** receber push (`pushAvailability() === "ready"`).

## Android — falta só o arquivo
1. No console do Firebase do projeto do Servos, registre o app Android `com.servosapp.app` e baixe o `google-services.json`.
2. Salve em `ServosMobile/firebase/google-services.json` (a pasta está no `.gitignore`).
3. Gere um novo build (`npx expo run:android` ou EAS). `app.config.ts` detecta o arquivo e liga o push.

## iOS — decisão técnica pendente
`expo-notifications` no iOS devolve token **APNs**, e o FCM não aceita esse token. Opções:
- **A (recomendada):** `@react-native-firebase/app` + `@react-native-firebase/messaging` para obter token FCM no iOS. Exige o `GoogleService-Info.plist` (em `firebase/`), a chave APNs (.p8) cadastrada no Firebase e `expo-build-properties` com `ios.useFrameworks: "static"`. O servidor não muda.
- **B:** o servidor passa a enviar direto via APNs para tokens `platform=ios` (chave .p8 no servidor). O app não muda, mas o servidor ganha um segundo canal.

Até lá, no iOS, os avisos chegam pela central in-app (o sininho do Início) e o app não pede a permissão nativa.
