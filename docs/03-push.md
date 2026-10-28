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

## iOS — serviço de push da Expo (decidido em 2026-10-28)
O token APNs cru do iPhone não serve ao FCM. Em vez de instalar o React Native Firebase (que hoje exige `useFrameworks: "dynamic"` em todo o app iOS), o iPhone registra um token do serviço de push da Expo (`getExpoPushTokenAsync`, `ExponentPushToken[...]`), e o servidor envia esses tokens pela API da Expo (`https://exp.host/--/api/v2/push/send`). Os demais tokens seguem pelo FCM.

Para funcionar:
1. **Chave de push no EAS:** expo.dev → projeto → Credentials → iOS → `com.servosapp.app` → Push Key. Use uma chave APNs (.p8) da conta Apple ou deixe o `eas credentials` criar uma.
2. **Servidor** (`Servos-v3/server/src/services/push.service.ts`) com o envio para tokens da Expo publicado.
3. **Build novo** do app (a pré-permissão passa a aparecer no iPhone).
