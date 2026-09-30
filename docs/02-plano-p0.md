# Servos Mobile — Plano P0

**Decisões fechadas (2026-09-25):** D1 Expo/React Native · D2 backend em `Servos-v3/server`, branch
`feat/mobile-api` (worktree `../Servos-v3-mobile-api`), **sem deploy por mim** · D3 servo solicita,
**líder decide** (servo pode sugerir colega) · D4 uma função por pessoa por escala na V1 · D5 Geist.

## Princípios de execução
- Regra de negócio = **função pura com teste** em `server/src/lib/**`; a rota só autoriza, lê, grava e dispara efeitos (padrão já usado em `respond.ts`/`coverage.ts`).
- Mudanças **aditivas**: nenhum campo renomeado/removido; o web continua funcionando sem alteração.
- Status canônicos (PENDING/ACCEPTED/…) são **derivados na borda** a partir dos campos atuais — o banco segue com `pending/confirmed/declined` + campos novos (`replacement`, `cancelled_at`).
- App lê de **`/api/mobile/*`** (BFF de leitura, contrato estável para o app) e escreve pelas rotas existentes, corrigidas.

## Backend (ordem)
| # | Entrega | Arquivos |
|---|---|---|
| B1 | Status canônicos (escala e assignment) | `lib/schedules/lifecycle.ts` |
| B2 | Pendências da escala ("Precisa de atenção") | `lib/schedules/attention.ts` |
| B3 | Alteração crítica: diff + quem reconfirma + texto da notificação | `lib/schedules/critical-changes.ts` · `schedules/update` |
| B4 | Concorrência: `version` com 409 | `schedules/update` (transação) |
| B5 | Pedir substituição / recusar com indisponibilidade; substituto na função certa | `lib/schedules/replacement.ts` · `schedule-members` |
| B6 | Último líder; ministério com histórico só desativa; papel ≠ função | `lib/ministries/leadership.ts` · `departments/manage` |
| B7 | Remover membro com escala futura; pessoa com histórico não é excluída | `department-members` · `members/deactivate` |
| B8 | AuditLog | `lib/audit/audit.ts` + chamadas em B3–B7 |
| B9 | Sessão deslizante; push com `last_used_at` | `auth/session` · `notification-service` |
| B10 | BFF: `mobile/overview`, `mobile/schedules`, `mobile/schedules/[id]` | `app/api/mobile/**` |

## App (ordem)
| # | Entrega |
|---|---|
| M1 | Scaffold Expo Router + TS, tokens (laranja Servos, neutros "Linho", semânticos), Geist, componentes base |
| M2 | Cliente de API (`x-servos-auth`, SecureStore, 401→login), React Query com cache persistido (offline) |
| M3 | Login (+ esqueci senha via link web) |
| M4 | Tabs Início · Escalas · Ministérios · Perfil |
| M5 | Home Servo/Líder, Minhas escalas (Próximas/Passadas), Detalhe, Confirmar (otimista), Não posso servir (sheet) |
| M6 | Push nativo (FCM) + pré-permissão + deep links `servos://escala/:id` |
| M7 | Estados: skeleton, vazio, erro, offline, sem permissão, escala cancelada |

P1 (a seguir): indisponibilidade, conflito, seletor ranqueado, gestão da escala pelo líder, equipe/funções, templates, duplicação, central de notificações.
