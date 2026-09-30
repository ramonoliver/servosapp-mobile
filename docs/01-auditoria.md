# Servos Mobile — Auditoria do projeto existente

**Data:** 2026-09-25 · **Base auditada:** `../Servos-v3` (commit de 2026-09-24, 370 commits)
**Escopo:** etapa 72 do briefing (A–H). Nenhum código foi escrito ainda.

> Toda afirmação abaixo vem da leitura do código, não da documentação. Onde a
> documentação diverge do código (ex.: `_PERMISSIONS_MATRIX.md` de 22/09 está
> parcialmente desatualizado), vale o código.

---

## 0. Qual é o "projeto existente"

Existem 9 pastas Servos em `~/Documents/Projetos`. Só uma é o produto vivo:

| Pasta | O que é | Situação |
|---|---|---|
| **Servos-v3** | SPA Vite/React + API Next.js + Firebase | **Produção. Base desta auditoria.** Último commit 24/09/2026 |
| servosonline/servos | v2: Next.js + Supabase + Capacitor iOS (WebView apontando para `localhost:3111`) | Abandonado em 21/05. Útil só como referência do que **não** fazer (WebView de site) |
| servosapp, servosapp copy, copy 2 | v2 anteriores (Next + Supabase/Firebase) + muitos docs de produto | Histórico |
| Servos site, servosapp.com, Servos Plannnig | Landing pages | Fora do escopo |

**Correção de premissa do briefing:** o Servos não está "focado principalmente em escalas". A v3 é
uma plataforma completa de igreja: Pessoas, Células (rede/mapa/reuniões), Kids (check-in),
Cuidado pastoral, Oração, Comunicação, Enquetes, Repertório, Eventos, Relatórios, Ranking.
Escalas são um dos 8 módulos. **O app mobile deve ser o recorte "servir" (escalas + ministérios +
disponibilidade + notificações), não uma segunda cópia da plataforma.**

---

## A. CURRENT STATE

### Stack
| Camada | Tecnologia |
|---|---|
| Web app | React 18, Vite 5, React Router 6, Tailwind 3, shadcn/ui (Radix), vaul (drawer), sonner (toast), Phosphor + Lucide, date-fns, Sentry |
| API | Next.js 14 (App Router, só rotas `/api`), Zod, firebase-admin, Resend (e-mail), Twilio (SMS/WhatsApp), Sentry |
| Banco | **Firestore**, acessado só pelo servidor via Admin SDK. `firestore.rules` = `allow read, write: if false` |
| Acesso a dados | Adaptador próprio com API estilo Supabase (`db.from("x").select().eq()`) sobre Firestore (`lib/firebase-admin.ts`), com mapa tabela→coleção |
| Hospedagem | Firebase Hosting (SPA) + Vercel/App Hosting (API), cron diário Vercel |
| Testes | Vitest nos dois lados. **Server: 32 arquivos, 1.088 testes, todos passando.** App: testes de smoke por módulo |
| Mobile | **Nenhum app nativo.** PWA com manifest + service worker do FCM (web push) |

### Autenticação
- Firebase Auth (e-mail/senha via Identity Toolkit REST; Google via `verifyIdToken`).
- O servidor emite **token de sessão próprio** (HMAC-SHA256, 7 dias, sem refresh) em cookie
  `servos_auth` **e** no corpo da resposta. A API aceita o token no header `x-servos-auth`.
  → **Um cliente nativo já consegue autenticar sem mudar o backend.**
- Convite por link (`/entrar/:token`), convite individual, esqueci/redefinir senha, conclusão de cadastro.
- Rate limit em rotas de auth. Sessão expirada tem sinal próprio.
- Um usuário pertence a **uma** igreja (`users.church_id`). `church_id` está na sessão.

### Autorização (estado real, não o do doc de 22/09)
- Vocabulário único novo: **`capabilities.ts`** — 17 capabilities, papel **derivado** de vínculos
  reais (`person-roles.ts`: admin, pastor, coordenação, supervisor, líder de célula, **líder de
  ministério**, voluntário, membro, kids, louvor…), com **escopo por ministério** (`ctx.departmentId`).
- Migração "fase B" **parcial**: `requireCapability`/`canDerived` usado em ~12 rotas (incl.
  `schedules/update`); outras ainda usam `role` cru (`admin|leader|member`) ou checagem inline de
  `leader_ids`. Três estilos de gate convivem.
- Projeção de PII já existe em `members/list` (`people.view` vê tudo; demais só campos básicos).
- Leitura de escala é "qualquer logado" por decisão registrada (DECISIONS #2).

### Entidades (coleções Firestore)
| Conceito do briefing | Existe como | Observação |
|---|---|---|
| Organization | `churches` | 1 igreja por usuário |
| User | `users` | status `active/inactive/paused/vacation` + `active: bool`; `availability: bool[7]` semanal |
| Ministry | `ministries` (tabela lógica `departments`) | `name, description, icon, color, active, kind` + **`leader_ids[]`, `co_leader_ids[]`, `function_names[]`** |
| MinistryMembership | `members` (lógica `department_members`) | `user_id, department_id, function_name, function_names[]`. **Sem campo de papel** |
| MinistryFunction | — | **Não existe.** Funções são strings em `ministries.function_names` |
| MemberFunction | `department_members.function_names[]` | Strings; rename propagado só "1:1 quando detectável" |
| Event | `events` + `eventSlots` (ocorrências) | recorrência `weekly/biweekly/once`; `base_time`, **sem horário de término**; status `rascunho/publicado/em-andamento/encerrado/cancelado` |
| Schedule | `schedules` | `event_id + department_id + date`, `time`, `arrival_time`, `instructions`, `notes`, status `draft/active/cancelled/completed` + `published: bool`. **Sem local próprio** (vem do evento) |
| SchedulePosition | `schedule_slots` | `function_name, quantity`. **Recriados (delete+insert) a cada edição** |
| ScheduleAssignment | `scheduleMembers` | `status pending/confirmed/declined`, `decline_reason`, `substitute_id/for`, `responded_at/by`, `response_source`, `notified_at`, `is_reserve`. **Uma linha por (escala, pessoa)** |
| Troca | `swap_requests` | par-a-par: servo escolhe colega → colega aceita → líder aprova |
| Unavailability | `unavailableDates` | `date, end_date, reason, type single/range/vacation`. **Nenhuma rota para o servo criar**; só é gravada como efeito colateral de pedir troca |
| Notification | `notifications` | in-app (`read`, `action_url`) e log multicanal (`channel`) **na mesma coleção** |
| Push device | `pushTokens` (+ `deviceTokens` legado) | `token, platform, device_name, active` |
| Preferências | `notificationPreferences` | por canal (push/e-mail/WhatsApp) e categoria grossa (schedule/event/message…) |
| ScheduleTemplate | — | **Não existe** |
| AuditLog | tipo declarado em `types/index.ts` | **Nenhuma escrita no código** |
| Extras sem par no briefing | chat da escala, anexos da escala, pontos/badges/ranking, repertório | Manter; fora do escopo mobile P0 |

### Regras de escala já implementadas (bem feitas, reaproveitar)
- `lib/schedules/respond.ts` — decisão pura de resposta (self vs leader), **idempotente**
  (duplo toque em Confirmar não duplica efeito), bloqueia reconfirmar vaga já substituída.
- `lib/schedules/coverage.ts` — cobertura por função (`needed/confirmed/pending/declined/open`),
  fonte única de "3 de 4 preenchidas".
- `lib/schedules/reconcile-members.ts` — edição por diff, preserva id/status de quem ficou.
- Notificações: dedupe por `dedupeKey`, respeita preferência, não notifica escala não publicada
  (`status !== "active"` → skip).
- Líder escolhe substituto para quem recusou (`schedule-members` action `substitute`).

### Design System existente
- Tokens HSL semânticos em `app/src/index.css`: `brand-50…950` (laranja-avermelhado, matiz ~12°,
  ação primária = `brand-600`), `neutral` "Linho" 0…950, `success/warning/danger/info`,
  superfícies (`frame/sheet/card/sunken/overlay/inverse`), texto (`primary/secondary/tertiary`),
  8 cores de módulo `--pillar-*`, durações/easing. Par `.dark` definido mas **não ligado**.
- **Tipografia: Geist** (não Inter) + Bricolage Grotesque só em numerais/saudação. Escala
  semântica `micro 11 · caption 12 · meta 13 · body 14 · body-lg 16 · title 20 · page 28 · display 40`.
- `radius` base 8px. Contrato de design v2 documentado (`docs/design-contract-v2.md`).
- Componentes: 32 primitivos `ui/` (shadcn) + 65 `composite/` + layout (AppShell, Sidebar,
  Topbar, **BottomTabBar**, FocusMode).

### Telas relevantes ao mobile (web hoje)
`/inicio` (home por papel), `/minhas-escalas` (card da próxima + confirmar/recusar/pedir troca),
`/escalas` (líder), `/escalas/:id` (1.181 linhas), `/ministerios`, `/ministerios/:id`,
`/eventos`, `/agenda`, `/conta/{perfil,senha,notificacoes}`, auth (5 telas).

### Rotas de API relevantes
`auth/*` · `app/load` · `home/{voluntario,lider-ministerio,…}` · `schedules/{list,create,update,delete,swap,files}` ·
`schedule-members` (respond/set-status/substitute) · `departments/manage` · `department-members(+list)` ·
`members/{list,update,deactivate}` · `events/{list,manage}` · `notifications/{list,read,preferences,register-push}` ·
`cron/reminders` · `send-schedule-reminders` · `nav/badges`.

---

## B. GAP ANALYSIS

Legenda: ✅ existente e correto · 🔧 existe, precisa alterar · ➕ ausente · ⚠️ conflito com a arquitetura atual · ♊ duplicado

### Modelo e regras
| # | Requisito | Status | Evidência / o que fazer |
|---|---|---|---|
| 2 | Organização como raiz, pronta p/ multi-org | 🔧 | `church_id` em todo lugar e validado na sessão ✅. Mas usuário ↔ igreja é 1:1 (`users.church_id`). Multi-org real exigiria `organization_memberships`; **adiar**, só não piorar |
| 4 | Pessoa: status ACTIVE/INACTIVE/PENDING | 🔧 | Hoje `active/inactive/paused/vacation` + `active: bool` (dois campos p/ o mesmo). PENDING ≈ convite não aceito (`invitations`). Mapear, não renomear |
| 4 | Evitar hard delete com histórico | ⚠️ | `members/deactivate` `hard_delete` (admin) **apaga `scheduleMembers` da pessoa** → histórico das escalas quebra. Bloquear hard delete quando houver assignments |
| 5 | Ministério: nome, status, descrição, ícone, cor | ✅ | Falta `image_url` (opcional) ➕ |
| 6 | Múltiplos líderes via membership | ⚠️ | Liderança em **arrays no ministério** (`leader_ids`, `co_leader_ids`) — múltiplos ✅, mas não é membership. Líder também grava `function_name: "Líder"` no vínculo |
| 7 | Papel ≠ Função | ⚠️ | **Violado:** `department_members.function_name` recebe "Líder"/"Co-líder"/"Membro" ao salvar o ministério — papel gravado como função |
| 8 | Funções por ministério; várias por pessoa | 🔧 | Por ministério ✅, várias ✅ (`function_names[]`), mas são **strings**: rename frágil, sem ativa/inativa, sem quantidade padrão |
| 9 | CRUD de função + desativar + quantidade padrão | ➕ | Criar entidade `ministry_functions` |
| 10/68 | RBAC server-side, escopo por ministério | 🔧 | `canDerived` com escopo ✅ onde migrado. Rotas de escala/ministério ainda com 3 estilos de gate; `swap` e `departments/manage` checam inline. Unificar em `requireCapability` |
| 11 | Proteção do último líder | ➕ | `departments/manage` aceita `leader_ids: []`. Nenhuma validação |
| 12 | Evento genérico, multi-ministério | ✅ | `events` + várias `schedules` por evento. 🔧 falta `end_time`/duração (necessário p/ conflito) |
| 13 | Status DRAFT/PUBLISHED/COMPLETED/CANCELLED/ARCHIVED | 🔧 | `draft/active/cancelled/completed` + `published`. `active`≡PUBLISHED; falta ARCHIVED; `published` redundante com status |
| 13 | Não notificar em DRAFT | ✅ | `schedule-notifications.ts` pula `status !== "active"` |
| 14 | Posições N por função, "1 vaga não preenchida" | ✅ | `coverage.ts` (`open` por função). 🔧 slots sem id estável (recriados a cada save) |
| 15 | Assignment com assigned_at/by, replacement_user_id, last_notification_at | 🔧 | Há `responded_at/by`, `notified_at`, `substitute_id/for`. Faltam `assigned_at`, `assigned_by`, `function_id` |
| 15 | Mesma pessoa em 2 funções da mesma escala | ⚠️ | Reconciliação e swap assumem **1 linha por (escala, pessoa)**. Decidir: manter restrição (recomendado para V1) |
| 16 | Status REPLACEMENT_PENDING / REPLACED / CANCELLED | 🔧 | Hoje 3 estados + campos de substituto + `swap_requests`. Estado composto espalhado em 3 lugares |
| 21 | Recusa com fluxo (substituição **ou** indisponibilidade), motivo | 🔧 | "Não posso" recusa direto com motivo; "Pedir troca" é ação separada. Falta a escolha guiada |
| 22 | Servo solicita substituição → líder escolhe | ⚠️ | Modelo atual é **par-a-par** (servo escolhe colega, colega aceita, líder aprova). Briefing pede **líder decide**. Ver decisão D3 |
| 22 | Bug: substituto herda função errada | 🔧 | `schedule-members` `substitute`: `function_name: substituteLink.function_name \|\| declined.function_name` → o substituto entra na **função primária dele**, não na vaga liberada; a cobertura fica errada |
| 23/57/58 | Sugestão de substitutos / elegibilidade ranqueada | 🔧 | `scoring-service.ts` existe (pontuação de membro); não considera indisponibilidade datada nem conflito |
| 24 | Servo cadastra indisponibilidade | ➕ | Coleção existe, **não há rota nem tela**. Só `availability: bool[7]` (disponibilidade semanal) no perfil |
| 25 | Conflito de horário antes de escalar | ➕ | Zero detecção. Exige `end_time` |
| 26 | Indisponível durante escalação, com override | ➕ | — |
| 27 | Alteração crítica reabre confirmação | ➕ | `schedules/update` muda data/hora/chegada e **mantém `confirmed` silenciosamente** |
| 28/29 | Notificação dizendo o que mudou | ➕ | Não há diff de alteração |
| 30 | Preferências do líder (recusas, substituições, cada confirmação, resumo) | 🔧 | Preferências só por categoria grossa |
| 31 | Central: Hoje/Ontem/Anteriores, marcar todas, deep link | 🔧 | `notifications/list` + `read` + `action_url` ✅. Deep links são **rotas web** (`/escalas/:id`) → mapear |
| 32 | Push iOS/Android, token, plataforma, last_used | 🔧 | `register-push` aceita `ios/android` ✅. Falta `last_used_at`. Envio é FCM → cliente nativo precisa de **token FCM** (ver riscos) |
| 33 | Templates de escala | ➕ | — |
| 33 | Duplicar escala (estrutura / + pessoas) | ➕ | — |
| 34 | Detecção de escala incompleta com o problema exato | 🔧 | `coverage.byFunction` dá a base; falta "recusa sem substituto" como pendência explícita |
| 36 | Remover membro com escala futura | ➕ | `department-members DELETE` apaga o vínculo sem olhar escalas futuras |
| 37 | Desativar ministério em vez de excluir | ⚠️ | `departments/manage` modo delete faz **hard delete** do ministério + vínculos, apesar de existir `active` |
| 38 | AuditLog | ➕ | Tipo declarado, **zero escritas** |
| 51 | Offline / cache | ➕ | Nenhum cache de dados no cliente |
| 25 (#64) | Dois líderes editando ao mesmo tempo | ➕ | Last-write-wins. Sem `version`/`updated_at` como pré-condição |
| 59 | Próximas × Passadas | 🔧 | Verificar nas telas; API lista por janela |
| 62 | Analytics de eventos | 🔧 | `analytics/track` + `lib/analytics` existem; faltam os eventos nomeados |
| 69 | Privacidade de contatos | ✅ | Projeção por papel em `members/list` |

### Duplicações encontradas
| ♊ | Onde |
|---|---|
| Liderança | `ministries.leader_ids/co_leader_ids` **e** `department_members.function_name="Líder"` |
| Substituição | `swap_requests` (par-a-par) **e** `schedule-members action=substitute` (líder) — dois fluxos, dois modelos de dado |
| Status de pessoa | `users.status` **e** `users.active` |
| Status da escala | `schedules.status` **e** `schedules.published` |
| Push tokens | `pushTokens` **e** `deviceTokens` (legado) |
| Gate de permissão | `requireCapability` / `can()` / checagem inline de `leader_ids` |
| Notificação | Coleção `notifications` guarda aviso in-app **e** log de envio multicanal (filtrado por `!channel`) |

### Existente e correto (não mexer, só consumir)
Sessão por header · isolamento por `church_id` · Firestore fechado · resposta idempotente ·
cobertura por função · reconciliação por diff · dedupe de notificação · skip de notificação em
rascunho · projeção de PII · Zod em todas as entradas · suíte de testes do server.

---

## C. DATA MODEL (proposto — evolução aditiva do Firestore atual)

Princípio: **nada é renomeado nem apagado na migração**. Campos novos convivem com os antigos
até o web migrar; leituras aceitam os dois formatos (padrão que o projeto já usa, ex.: `filled`).

```
churches (Organization) ─┬─ users
                         ├─ ministries ─┬─ ministry_memberships ── member_functions (array de function_id)
                         │              └─ ministry_functions
                         ├─ events ── event_occurrences (eventSlots)
                         ├─ schedules (event_id + ministry_id + date)
                         │     ├─ schedule_positions (function_id, quantity)
                         │     └─ schedule_assignments (user_id, function_id, status)
                         ├─ schedule_templates
                         ├─ unavailabilities
                         ├─ notifications / push_devices / notification_preferences
                         └─ audit_logs
```

| Entidade (coleção) | Campos novos / alterados | Constraints | Índices Firestore |
|---|---|---|---|
| **ministries** | `+ status: 'active'\|'inactive'` (espelha `active`), `+ image_url?`, `+ deactivated_at?`. `leader_ids` passa a ser **derivado** das memberships (mantido por compatibilidade, escrito pelo servidor) | nome obrigatório, único por igreja (checado no servidor) | `church_id, status` |
| **ministry_functions** ➕ | `id, church_id, ministry_id, name, default_quantity, status 'active'\|'inactive', sort_order, created_at` | `(ministry_id, lower(name))` único; nunca deletar se referenciada | `ministry_id, status` |
| **ministry_memberships** (= `members`) | `+ role: 'LEADER'\|'MEMBER'`, `+ status: 'active'\|'inactive'`, `+ function_ids: string[]`, `+ left_at?`. `function_name(s)` legado mantido | 1 por `(ministry_id, user_id)`; ≥1 `LEADER` ativo por ministério ativo | `ministry_id, status`; `user_id, status` |
| **events** | `+ end_time` (ou `duration_min`, default 120) | `end > start` | já existentes |
| **schedules** | status canônico `DRAFT\|PUBLISHED\|COMPLETED\|CANCELLED\|ARCHIVED` (leitura aceita `active`), `+ end_time`, `+ location?` (override do evento), `+ version: number`, `+ updated_at`, `+ updated_by`, `+ template_id?`, `+ duplicated_from?` | 1 escala por `(event_id, ministry_id, date)` | `church_id, date`; `ministry_id, date` |
| **schedule_positions** (= `schedule_slots`) | `+ function_id`, **id estável** (upsert por `function_id`, sem delete+insert) | `quantity ≥ 1` | `schedule_id` |
| **schedule_assignments** (= `scheduleMembers`) | status canônico `PENDING\|ACCEPTED\|DECLINED\|REPLACEMENT_PENDING\|REPLACED\|CANCELLED` (leitura mapeia `confirmed→ACCEPTED`), `+ function_id`, `+ assigned_at`, `+ assigned_by`, `+ replacement_user_id` (= `substitute_id`), `+ replaces_assignment_id`, `+ replacement_reason?`, `+ last_notification_at` (= `notified_at`), `+ override: {unavailable?: bool, conflict_schedule_id?}` | 1 ativa por `(schedule_id, user_id)` — V1 | `schedule_id`; `user_id, status`; `user_id` + data (denormalizar `date`, `start_at`, `end_at` p/ consulta de conflito) |
| **schedule_templates** ➕ | `id, church_id, ministry_id, event_id?, name, positions: [{function_id, quantity}], arrival_offset_min, created_by, status` | — | `ministry_id` |
| **unavailabilities** (= `unavailableDates`) | `+ church_id` (faltava em algumas), `+ all_day: bool`, `+ start_time?/end_time?`, `+ source: 'user'\|'swap'\|'leader'` | `end_date ≥ date` | `user_id, date` |
| **push_devices** (= `pushTokens`) | `+ last_used_at`, `+ app_version`, `+ provider 'fcm'`; aposentar `deviceTokens` | 1 doc por token (id = hash do token) → sem duplicado | `user_id, active` |
| **notification_preferences** | `+ leader: {declines, replacements, schedule_issues, each_confirmation, confirmation_digest}` | defaults do briefing §30 | id = user_id |
| **notifications** | `+ kind` (ex. `assignment.created`, `schedule.changed`), `+ entity: {type, id}`, `+ changes?: [{field, from, to}]`, `+ deep_link` (formato neutro `servos://escala/:id`) | dedupe por `dedupe_key` | `user_id, created_at` |
| **audit_logs** ➕ (tipo já existe) | `id, church_id, actor_id, action, entity_type, entity_id, old_value, new_value, created_at` | append-only (só servidor escreve) | `church_id, entity_type, entity_id, created_at` |

Firestore não tem transação entre coleções sem custo: operações críticas (substituição, remover
último líder, reabrir confirmação) usam `runTransaction` do Admin SDK — **o adaptador atual não
expõe transação**; será preciso um helper novo.

---

## D. PERMISSION MODEL

Papéis do briefing ↔ papéis derivados já existentes:
**ADMIN** = `admin` (+ `pastor`/`coordenacao`, church-wide exceto configurações) ·
**LEADER** = `lider_ministerio` **escopado** por `ministry_id` · **MEMBER** = `voluntario`/`membro`.

| Ação | MEMBER | LEADER (só nos ministérios que lidera) | ADMIN |
|---|---|---|---|
| Ver próprias escalas, confirmar, recusar | ✅ (identidade) | ✅ | ✅ |
| Pedir substituição, cadastrar indisponibilidade | ✅ própria | ✅ própria | ✅ qualquer |
| Ver escala do ministério e equipe (nome, função, status) | ✅ se membro do ministério | ✅ | ✅ |
| Ver telefone/e-mail de colegas | ❌ (só do líder) | ✅ membros do ministério | ✅ |
| Criar/editar/duplicar/publicar/cancelar escala | ❌ | ✅ | ✅ |
| Escalar pessoa com conflito/indisponível (override) | ❌ | ✅ com confirmação + audit | ✅ |
| Resolver substituição, marcar resposta por alguém | ❌ | ✅ | ✅ |
| Adicionar/remover membro, alterar funções | ❌ | ✅ | ✅ |
| Criar/editar/desativar função | ❌ | ✅ | ✅ |
| Promover/remover líder | ❌ | ✅ (nunca o último) | ✅ (pode com substituto ou override registrado) |
| Criar/desativar ministério, criar evento | ❌ | ❌ criar ministério · ✅ evento do próprio ministério (regra atual) | ✅ |
| Gerir pessoas da igreja, papéis, configurações | ❌ | ❌ | ✅ |

**Escopo:** todo endpoint resolve `church_id` pela sessão (nunca do corpo), carrega a entidade por
`id + church_id`, e para ações de LEADER checa `canDerived(roles, cap, { departmentId })` contra o
ministério **atual e o de destino** (padrão já usado em `schedules/update`). "Líder perde
permissão" (#20) funciona sozinho porque o papel é derivado a cada request.

Mudança proposta: trocar os gates inline de `schedules/swap`, `schedule-members`,
`departments/manage`, `department-members` por `requireCapability` — **com testes de gate**
(`__tests__/gates.test.ts` já trava o gate de cada rota).

---

## E. USER FLOWS

1. **Servo recebe escala** — líder publica (DRAFT→PUBLISHED) → assignment PENDING, `assigned_at/by` →
   push "Você foi escalado 🙌 · Produção · Câmera · Dom 27 set · 18h · Chegada 17:30" → deep link
   abre o detalhe. Rascunho não notifica.
2. **Servo confirma** — toque em "Confirmar presença" → otimista (✓ Presença confirmada · "Nos vemos
   domingo!") → PENDING→ACCEPTED, idempotente → líder **não** recebe push (vai para badge/resumo,
   salvo preferência). Offline: enfileira e mostra "Será sincronizado quando a conexão voltar".
3. **Servo recusa** — "Não posso servir" → sheet: *Solicitar substituição* | *Só avisar que não posso*
   (+ "Marcar este dia como indisponível" opcional) + motivo opcional → confirma →
   DECLINED ou REPLACEMENT_PENDING → push ao(s) líder(es) → audit.
4. **Servo solicita substituição** — ACCEPTED/PENDING → REPLACEMENT_PENDING; pode sugerir um colega
   (opcional, ver D3) → pendência aparece em "Precisa de atenção" do líder.
5. **Líder resolve substituição** — pendência → "Encontrar substituto" → lista ranqueada (mesmo
   ministério · habilitado na função · disponível · sem conflito · última escala) → escolhe →
   transação: original REPLACED, novo assignment PENDING na **mesma função**, `replaces_assignment_id`
   → push ao novo e ao original. Substituto recusa → volta a pendência (vaga aberta), sem ciclo infinito.
6. **Líder cria escala** — escolhe evento/data → "Usar modelo" | "Duplicar anterior" (estrutura ou
   estrutura+pessoas) | do zero → posições (função × qtd) → adiciona pessoas por posição (seletor com
   Recomendados/Outros, avisos de conflito/indisponibilidade) → salvar rascunho | publicar.
7. **Líder altera escala** — edita com `version` → se mudou data/horário/chegada/local/função de
   quem confirmou: diálogo "12 pessoas já confirmaram" [Cancelar] [Salvar e solicitar nova
   confirmação] → ACCEPTED→PENDING dos afetados → push com o diff ("Chegada: 17:30 → 17:00"). Se
   outro líder salvou antes: 409 "Esta escala foi alterada por Fernanda. Recarregue para ver."
8. **Líder adiciona pessoa** — seletor → conflito/indisponível exige confirmação consciente → assignment
   PENDING (notifica só se publicada) → audit `assignment.added` (+ `conflict.overridden`).
9. **Líder altera liderança** — Equipe → pessoa → "Promover a líder" / "Remover liderança" → bloqueio
   do último líder com a mensagem do briefing → audit `leader.changed`.
10. **Admin cria Ministério** — nome + status (+ opcionais) + ≥1 líder obrigatório + funções iniciais.
    Mobile: fora do P0 (admin é web-first, §56).
11. **Admin gerencia pessoa** — desativar (preserva histórico; assignments futuros → CANCELLED com
    aviso ao líder) · hard delete só sem histórico. Mobile: fora do P0.

---

## F. SCREEN MAP (mobile)

```
Auth ─ Login · Esqueci senha · (Convite via deep link → Concluir cadastro)
Onboarding (≤3) ─ Boas-vindas · Pré-permissão de push · Sua próxima ação
Tabs
├─ Início ── (Servo) Próxima escala · Pendências · Próximas
│            (Líder, +) Situação das escalas que lidero · Precisa de atenção
│            └─ Notificações (header) → deep link
├─ Escalas ─ [Próximas | Calendário] · Passadas
│            └─ Detalhe da escala (Servo) ─ Confirmar · Não posso servir (sheet) · Equipe
│            └─ Gerenciar escala (Líder) ─ Posições · Seletor de pessoa · Encontrar substituto
│                                         · Editar (diálogo de alteração crítica) · Histórico (audit)
│            └─ Nova escala (Líder) ─ Evento/data · Modelo/Duplicar · Posições · Pessoas · Publicar
├─ Ministérios ─ Lista (meus) → Ministério ─ Visão · Equipe (líder: gerenciar) · Funções (líder) · Modelos (líder)
└─ Perfil ─ Meus dados · Meus ministérios · Minha disponibilidade (+ indisponibilidade) · Notificações · Ajuda · Sair
Transversais: Sem conexão (banner) · Toast · BottomSheet · Dialog destrutivo · Permission denied · Escala cancelada/indisponível (deep link)
```

---

## G. IMPLEMENTATION PLAN

Dependências: **backend primeiro em cada fatia** (regra, teste, rota), depois a tela.

**Fase 0 — Fundação (bloqueia tudo)**
- F0.1 Decisões D1–D3 (abaixo). F0.2 Scaffold do app, tokens, fontes, componentes base, cliente de API
  com `x-servos-auth`, storage seguro, React Query + cache persistente. F0.3 Helpers server:
  transação no adaptador, `writeAudit()`, mapeadores de status (legado ↔ canônico), deep link neutro.

**P0 — Core**
1. Auth mobile (login e-mail/senha, Google se o SDK nativo encaixar no fluxo atual, sessão segura, logout, 401→login).
2. Modelo: `ministry_functions`, `memberships.role/function_ids` com **backfill idempotente** (script em `server/scripts`) + status canônicos com leitura retrocompatível.
3. RBAC: gates de escala/ministério/membership migrados para `requireCapability` + testes.
4. Home Servo + Home Líder (endpoint agregado `home/mobile`), Minhas escalas (Próximas/Passadas), Detalhe.
5. Confirmar (otimista, idempotente) · Recusar com fluxo · notificações essenciais + audit dessas ações.
6. Push nativo: registro FCM, `last_used_at`, deep links, pré-permissão.
7. Proteções de dado que já quebram histórico hoje: bloquear hard delete de pessoa/ministério com histórico; último líder.

**P1**
Indisponibilidade (rota + tela) → conflito de horário (`end_time`) → seletor de pessoa ranqueado →
substituição conduzida pelo líder → alteração crítica + `version` → equipe/liderança/remoção com
escalas futuras → escala incompleta ("Precisa de atenção") → funções CRUD → templates → duplicação →
central de notificações + preferências do líder.

**P2**
Analytics nomeados, histórico avançado, distribuição/fairness, relatórios, multi-org real, calendário mensal.

---

## H. RISCOS

| Área | Risco | Mitigação |
|---|---|---|
| Arquitetura | Backend é **compartilhado com o web em produção**; toda mudança de regra afeta o web | Mudanças aditivas, leitura retrocompatível, testes de gate/regra antes de cada deploy |
| Arquitetura | Adaptador estilo Supabase sobre Firestore não tem transação nem `in` > 30 | Helper `runTransaction` dedicado; particionar consultas |
| Migração | Funções como string → IDs; nomes divergentes ("Camera" vs "Câmera"), `"Líder"` gravado como função | Backfill que normaliza, ignora "Líder/Co-líder/Membro" como função e gera relatório antes de gravar |
| Migração | Status novos vs web antigo lendo `confirmed` | Gravar status canônico **e** legado até o web migrar; ou manter enum legado no banco e mapear na borda (recomendado) |
| Dados | Produção pequena (7 usuários, 2 ministérios em 22/09) | Baixo risco de migração agora — **bom momento** para mudar o modelo |
| Permissões | 3 estilos de gate; migrar pode mudar quem consegue o quê | `gates.test.ts` + teste por edge case de RBAC |
| Breaking | Mudar fluxo de troca par-a-par afeta telas web existentes | Manter o par-a-par no web até decidir (D3) |
| UX | Confundir "app do servo" com "app administrativo" | Mesmo app, ferramentas de líder contextuais; admin continua web |
| Performance | `computeActorRoles` faz 5 leituras por request | Cache por request; endpoint agregado da home |
| Notificações | iOS: `expo-notifications` devolve **token APNs**, mas o servidor envia via **FCM** | Usar `@react-native-firebase/messaging` (token FCM nos dois SOs) num dev build do Expo |
| Notificações | Fadiga no líder; duplicidade | Preferências do líder + dedupe existente + resumo |
| Sessão | Token de 7 dias sem refresh → logout forçado semanal no app | Endpoint de renovação (sliding session) no P0 |
| Concorrência | Last-write-wins entre líderes | `version` + 409 |

---

## Decisões que precisam do dono antes do código

- **D1 — Stack mobile.** Recomendado: **Expo (React Native) + Expo Router + TypeScript** num app
  novo em `ServosMobile`, consumindo a API do Servos-v3. Alternativa: Capacitor sobre a SPA v3
  (mais barato, mas é exatamente o "site responsivo dentro de um app" que o briefing proíbe, e já
  foi tentado e abandonado na v2).
- **D2 — Onde mora o backend.** As regras novas (conflito, alteração crítica, audit, último líder…)
  **têm** de ir para `Servos-v3/server`, que é produção e também atende o web. Confirmar que posso
  alterar esse repositório (em branch), e como é o deploy.
- **D3 — Substituição.** Recomendado: servo "Solicita substituição" (pode **sugerir** um colega) →
  **líder decide** (briefing §22–23). O par-a-par atual vira caso particular (sugestão aceita pelo
  colega = pré-aprovado; líder confirma). Alternativa: manter os dois fluxos separados.
- **D4 — Mesma pessoa em duas funções na mesma escala:** manter proibido na V1 (recomendado)?
- **D5 — Tipografia:** o briefing diz "se usa Inter, manter Inter". O produto usa **Geist** →
  manter Geist no mobile (recomendado).
