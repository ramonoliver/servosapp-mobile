# P2, pendências técnicas e revisão de UX (2026-09-29)

Backend: `Servos-v3` branch `feat/mobile-api`, **sem commit e sem deploy**.

## Funcionalidades

| Item | Servidor | App |
|---|---|---|
| Resumo diário de confirmações | `lib/schedules/confirmation-digest.ts`, cron passo F (07h, um aviso por líder/dia, idempotente, respeita a preferência) | chega como push/central |
| Entrar com código por e-mail | `lib/auth/email-code.ts`, `POST /api/auth/email-code` e `/verify` (6 dígitos, 10 min, 5 tentativas, reenvio após 45 s, só o hash guardado, sem revelar se o e-mail existe) | Login → "Receber código por e-mail" |
| Entrar com Google | já existia `/api/auth/google` (token do Firebase) | botão aparece só com `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` e `EXPO_PUBLIC_FIREBASE_API_KEY` (ver `.env.example`) |
| Meus dados | `GET /api/mobile/me`; salvar usa as rotas do web (`profile/update`, `upload-photo`, `change-password`) | Perfil → cartão com nome → foto, nome, celular, nascimento, senha |
| Calendário | `GET /api/mobile/schedules?month=AAAA-MM` | Escalas → Calendário (ponto por status, legenda, "Próxima: …" em dia vazio) |
| Histórico da escala | `schedule_id` no AuditLog + `lib/schedules/history.ts` + `GET /api/mobile/schedules/:id/history` | Escala → Mais → Histórico (também em escala passada/cancelada) |
| Relatório e distribuição | `lib/ministries/report.ts` + `GET /api/mobile/ministries/:id/report?days=30\|90\|180` | Ministério → "Relatório": confirmação, vagas cobertas, quem serve muito/pouco/recusa |
| Analytics nomeados | `lib/analytics/events.ts` (lista fechada, sem dado pessoal) + `POST /api/mobile/analytics` → coleção `analyticsEvents` | `lib/analytics.ts` (fila em disco, envio a cada 20 s e ao sair do app) |

## Pendências técnicas resolvidas

- **Desativar pessoa**: agora só **bloqueia** o login (antes apagava a conta no Firebase). Reativar desbloqueia; quem foi desativado no modelo antigo tem a conta recriada com o mesmo id, sem senha (entra com "Esqueci minha senha" ou código por e-mail). `lib/auth/auth-account.ts`.
- **Teste do web que quebrava com a data** (`MinisteriosListagem.test.tsx`): datas relativas a hoje.
- **Pendente no web**: aparece como "Aguardando aprovação" (antes "Inativo") e não se edita pela lista.
- **Página de aprovação do web**: 5 testes de componente (`PedidosEntrada.test.tsx`) e verificada no navegador contra o mock.

## Primeiro acesso

- **Splash animado** (`components/brand/AnimatedSplash.tsx`): o splash nativo passa para uma camada idêntica, o símbolo sobe, "Servos" aparece e tudo se dissolve no app (~1 s). Com "Reduzir movimento", só um fade.
- **Apresentação** antes do login (`app/bem-vindo.tsx`): 3 telas ilustradas com os componentes reais do app; "Pular"; no fim, "Entrar" ou "Tenho o código da igreja". Aparece uma vez por aparelho.
- O onboarding pós-login (boas-vindas e pedido de notificação com contexto) continua.

## Revisão de UX/UI (o que mudou)

- Home: saudação menor, com a data acima; sem emoji; o selo "Amanhã" no cartão escuro ficou discreto, deixando "Confirmar presença" como o único laranja forte.
- Login: hierarquia clara. Senha em primeiro plano, "ou entre sem senha" (código/Google) em segundo, e "Primeira vez? Entrar com o código da igreja" por último.
- Escala: as ferramentas do líder ganharam o título "Gerenciar escala". Antes ficavam soltas logo abaixo das ações da própria pessoa.
- Ministério: "Relatório" como texto no cabeçalho (ícone sozinho não era reconhecível).
- Perfil: cartão "Meus dados" no topo; seção "Liderança" para convidar e aprovar.
- Campo de data no iOS alinhado com os demais campos.
- Estados vazios sem emoji e com o próximo passo explicado.

## Correção de plataforma encontrada no QA

No SDK 57 o `fetch` global é o `expo/fetch`, que **não aceita** o formato `{ uri, name, type }` do React Native no FormData. A foto agora vai como `File` do `expo-file-system` (`api/client.ts → apiUpload`).

## Multi-igreja real: não implementado, e por quê

Hoje cada pessoa tem **um** documento em `users`, com `church_id`, papel, célula e disponibilidade. O e-mail é único no Firebase Auth. Para uma pessoa estar em duas igrejas é preciso separar **identidade** (login, nome, foto) de **vínculo com a igreja** (papel, status, ministérios, célula). Isso mexe no modelo que o web usa em produção, em todas as rotas que leem `users.church_id`.

Proposta, para decidir antes de fazer:

1. Nova coleção `church_members` (`user_id`, `church_id`, `role`, `cell_role`, `status`, `active`, `joined_at`), com backfill de um vínculo por usuário atual.
2. A sessão continua com um `church_id` ativo. Nova rota `POST /api/auth/switch-church` emite a sessão da outra igreja se houver vínculo ativo.
3. `requireApiActor` passa a ler papel e status do **vínculo** (igreja da sessão), não de `users`.
4. Entrar em outra igreja pelo código cria só o vínculo pendente (sem conta nova).
5. App: seletor de igreja no Perfil quando houver mais de uma.

Estimativa: o maior impacto é no web (todas as leituras de papel). Recomendo fazer depois do primeiro deploy do app, com a migração testada numa cópia do banco.
