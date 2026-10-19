# Servos Mobile

App iOS/Android do Servos (Expo SDK 57 · Expo Router · tabs nativas · React Query com cache offline).
Consome a API do `Servos-v3` (rotas `/api/mobile/*` + rotas de escrita existentes).

Documentos: [auditoria](docs/01-auditoria.md) · [plano P0](docs/02-plano-p0.md) · [push](docs/03-push.md) · [status do P0](docs/04-status-p0.md)

## Rodar

```bash
npm install
```

**Com a API falsa (sem tocar em produção)** — login com qualquer e-mail e a senha `servos`:

```bash
node scripts/mock-api.mjs
```

```bash
EXPO_PUBLIC_API_URL=http://localhost:3999 npx expo start --dev-client --clear
```

**Com o servidor real** (branch `feat/mobile-api` do Servos-v3 rodando local ou publicada):

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --dev-client --clear
```

Build nativo (primeira vez ou após adicionar módulo nativo):

```bash
npx expo run:ios
```

> **iCloud:** esta pasta está em `~/Documents`, sincronizada pelo iCloud Drive. Isso quebra a assinatura do Xcode ("resource fork… not allowed") e o watcher do Metro (mudanças não recarregam). Para desenvolver no dia a dia, mova o projeto para fora do iCloud (ex.: `~/Developer/ServosMobile`).

## Verificar

```bash
npx tsc --noEmit && npx expo lint && npx jest
```

**CI:** o EAS Workflows roda [`.eas/workflows/ci.yml`](.eas/workflows/ci.yml) em todo push e PR para `main`: `npm ci`, lint, typecheck e `jest --ci` (só validação, sem build nem update).
Os comandos rodam com stdin fechado (`</dev/null`); sem isso o Jest fica parado esperando entrada.
Para disparar à mão: `npx eas-cli@latest workflow:run .eas/workflows/ci.yml`.

## Testes ponta a ponta (Maestro)

Os fluxos ficam em `.maestro/` (login com senha, código por e-mail, código da igreja e criar igreja) e rodam contra a API de mock, nunca contra produção. O workflow `.eas/workflows/e2e-ios.yml` faz um build de simulador iOS com o perfil `e2e` do `eas.json` e roda o Maestro num Mac do EAS. Ele não roda a cada push: só manualmente ou ao pôr o rótulo `e2e` num PR.

```bash
npx eas-cli@latest workflow:run .eas/workflows/e2e-ios.yml
```

Mudou só `.maestro/`? Reaproveite um build de simulador já feito com `-F build_id=<id do build>`.
