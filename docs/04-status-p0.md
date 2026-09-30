# Status P0 + P1 — 2026-09-25

Backend: `Servos-v3` branch `feat/mobile-api` (worktree `../Servos-v3-mobile-api`), **sem commit e sem deploy**.
App: este repositório (Expo SDK 57, Expo Router, tabs nativas).

## Edge cases obrigatórios (§64)

✅ tratado e testado · 🟡 tratado sem teste automatizado de rota · ⏭️ P1

| # | Caso | Status | Onde |
|---|---|---|---|
| 1 | Pessoa em vários ministérios | ✅ | `mobile/ministries`, `loadAssignmentCards` (cards de todos os ministérios) |
| 2 | Várias funções | ✅ | `realFunctionNames` (leadership.test) |
| 3 | Vários líderes | ✅ | `roleInMinistry`, notificações vão a todos os líderes |
| 4 | Líder também é servo | ✅ | Home mostra a própria escala **e** a situação das equipes |
| 5 | Último líder sai | ✅ | `validateLeadership` + `departments/manage` + `department-members DELETE` → 409 `LAST_LEADER` |
| 6 | Pessoa indisponível selecionada | ✅ | `candidates.ts` → "Outros" com motivo; escalar exige override consciente, registrado no AuditLog |
| 7 | Conflito de horário | ✅ | `window.ts` (duração padrão 2h sem término) + `candidates.ts`; override com confirmação + AuditLog |
| 8 | Função descoberta | ✅ | `attention.ts` → "1 vaga de Câmera" |
| 9 | Quantidade insuficiente | ✅ | idem, por função |
| 10 | Servo recusa | ✅ | sheet "Não posso servir" → `respond` + indisponibilidade opcional; líder recebe push |
| 11 | Servo pede substituição | ✅ | `request-replacement` → REPLACEMENT_PENDING (replacement.test) |
| 12 | Substituto também recusa | ✅ | pedido do titular reabre; sem pendência duplicada (attention.test) |
| 13 | Escala alterada após confirmação | ✅ | `critical-changes` + `schedules/update` (route.test): confirmados voltam a aguardar, push com o que mudou |
| 14 | Evento cancelado | 🟡 | `events/manage` → cancela escalas futuras e avisa |
| 15 | Escala cancelada | ✅ | `cancel.ts` (exclusão de publicada vira cancelamento); resposta bloqueada com 409 |
| 16 | Ministério desativado | ✅ | exclusão com histórico → desativa; some de "Meus ministérios" e da home do líder |
| 17 | Pessoa desativada | 🟡 | cancela convocações futuras; sessão não renova (`auth/session` → 401) |
| 18 | Removido com escala futura | ✅ | 409 `HAS_FUTURE_SCHEDULES` com a lista; `reviewSchedules=true` cancela e reabre a vaga |
| 19 | Função desativada com histórico | ✅ | `ministry_functions` ativa/inativa; histórico mantém o nome; web vê só as ativas |
| 20 | Líder perde permissão | ✅ | papel derivado a cada request (`computeActorRoles`) |
| 21 | Não responde | ✅ | "N pessoas ainda não responderam" a partir de 72h |
| 22 | Push desabilitado | ✅ | central in-app + badge; Perfil leva aos Ajustes |
| 23 | Offline | ✅ | cache persistido 7 dias, faixa "Sem conexão", resposta enfileirada e retomada |
| 24 | Duplo toque em confirmar | ✅ | botão trava no envio + servidor idempotente (respond.test) |
| 25 | Dois líderes editam | ✅ | `version` em transação → 409 `VERSION_CONFLICT` (route.test) |
| 26 | Escala duplicada | ✅ | `planDuplicate`: só estrutura ou + pessoas (quem saiu fica de fora, com aviso); nasce rascunho |
| 27 | Evento com vários ministérios | ✅ | modelo existente (escala = evento + ministério) |
| 28 | Recebe nova função | ✅ | mudança de função é crítica: reabre confirmação e avisa |
| 29 | Ministério sem permissão | ✅ | `decideScheduleAccess` → 403; app mostra "Você não tem acesso" |
| 30 | Deep link p/ escala cancelada | ✅ | detalhe abre com o selo "Esta escala foi cancelada" |

## Pendências conhecidas
- **Push iOS**: ver `03-push.md` (token APNs × FCM).
- **Calendário** na aba Escalas: o briefing pede [Próximas | Calendário]. No P0 ficou [Próximas | Passadas] (§59); o calendário entra no P1, como visão secundária.
- **Meus dados** (editar perfil) no app: ainda não — o Perfil não mostra o item.
- `members/deactivate` (código existente) também apaga a conta no Firebase Auth ao desativar — reativar exige novo convite. Não alterado; vale revisar.

## P1 — entregue

| Área | Servidor | App |
|---|---|---|
| Indisponibilidade (§24) | `lib/availability/unavailability.ts` + `/api/mobile/unavailability` | Perfil → Minha disponibilidade (dia, período ou horário; motivo opcional) |
| Conflito e indisponibilidade na escalação (§25/§26) | `window.ts`, `candidates.ts`, override → 409 `NEEDS_OVERRIDE` sem confirmação; AuditLog `conflict.overridden`/`unavailability.overridden` | Seletor com "Recomendados/Outros" e diálogo "Escalar mesmo assim" |
| Sugestão de substitutos (§23/§57/§58) | ranking: função → disponível → sem conflito → serviu há mais tempo (histórico real do ministério) | "Encontrar substituto" a partir da pendência ou da pessoa |
| Gestão da escala | `assignment-service.ts` (web e app usam o mesmo), `edit-service.ts`, `cancel.ts` | Publicar, Editar (alteração crítica §27 + conflito de versão), Salvar como modelo, Cancelar, Remover pessoa |
| Equipe (§35) | `membership-service.ts` (web e app) | Busca, filtros Todos/Líderes/Servos/Inativos, alterar funções, promover/remover liderança (último líder protegido), remover com escalas futuras |
| Funções (§8/§9) | `ministry_functions` + sincronia com `function_names` do web; rename propaga para vínculos e escalas futuras | Aba Funções: criar, editar, quantidade padrão, desativar/reativar |
| Modelos e duplicação (§33) | `templates.ts`, `/api/mobile/schedules` POST | Nova escala: evento/data → modelo, duplicar (com ou sem pessoas) ou do zero; nasce rascunho |
| Escala incompleta (§30/§34) | cron passo E: escala publicada nos próximos 2 dias com pendência → aviso ao líder com o problema exato | (chega como push/central) |
| Preferências do líder (§30) | `leader-preferences.ts` aplicado a recusa, substituição, confirmação e problema | Perfil → Notificações |

### Ainda fora
- **Resumo diário de confirmações** (`confirmation_digest`): a preferência existe, o envio do resumo não.
- **Calendário** na aba Escalas (visão secundária) e **Meus dados**.
- **Push iOS**: continua dependendo da decisão em `03-push.md`.
- Mudanças que o **web** também sente no P1: readicionar pessoa cancelada/recusada reaproveita a convocação; "Você ganhou pontos" ao substituir não gera mais push (vai só para a central).
