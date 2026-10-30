# Funções novas (2026-09-30)

As sete funções que faltavam. Backend no worktree `Servos-v3-mobile-api` (branch `feat/mobile-api`). Mesmo banco e mesmas regras do web.

| Função | Servidor | App | Web |
|---|---|---|---|
| Multi-igreja | `lib/auth/identity.ts` (perfil extra `users/{uid}__{igreja}` com `auth_uid`), `lib/join/service.ts → joinAnotherChurch`, `GET/POST /api/mobile/churches` (listar, `switch`, `join`) | Perfil → "Suas igrejas" (trocar) e "Entrar em outra igreja" (`app/outra-igreja.tsx`); link de convite de quem já tem conta cai nessa tela (`app/+native-intent.tsx`); push de outra igreja troca de igreja antes de abrir | nada muda: cada igreja vê só o seu perfil |
| Criar evento pelo app | rota do web `POST /api/events/manage` (`events.manage`) | Nova escala → "Criar evento" (`app/novo-evento.tsx`: toda semana ou data única, horário, local) | — |
| Conversa da escala | `lib/schedules/chat.ts`, `GET/POST /api/mobile/schedules/:id/chat` (coleção `schedule_chats`; recado do líder avisa a equipe, recado da equipe avisa só os líderes, em silêncio) | Escala → "Conversa da escala" (`app/conversa/[id].tsx`, atualiza a cada 10 s) | — |
| Arquivos da escala | rotas do web `/api/schedules/files` | Escala → "Arquivos" (abrir; líder anexa documento, áudio ou foto) | já existia |
| Repertório do louvor | `lib/schedules/setlist.ts`, `GET/PUT /api/mobile/schedules/:id/songs`; repertório pela rota do web `/api/songs` | Escala do Louvor → "Músicas" (tom do dia, cifra, vídeo); líder monta a lista (`app/musicas/[id].tsx`); Ministérios → "Repertório" (`app/repertorio.tsx`, `app/nova-musica.tsx`) | já existia |
| Salvar na agenda | — | Escala → "Salvar na agenda": abre a tela do próprio iOS/Android com chegada, local e lembrete 2 h antes (permissão só de escrita) | — |
| Modo escuro | — | `theme/tokens.ts`: cada cor tem par claro/escuro. iOS troca ao vivo; Android lê o tema ao abrir. QR code continua preto no branco | — |
| Painel de uso do app | `lib/analytics/usage.ts`, `GET /api/analytics/app-usage?days=7\|30\|90` (`people.manage`) | manda os eventos (`lib/analytics.ts`) | Relatórios → "Uso do app" (pessoas ativas, adoção, uso por dia, plataformas, ações, versões) |

## Multi-igreja: como funciona

- **Uma conta de login** (Firebase Auth) pode ter **um perfil por igreja**. O perfil principal continua sendo `users/{uid}`. Os outros ficam em `users/{uid}__{churchId}`, com `auth_uid = uid`.
- Tudo o que mexe na conta (senha, bloquear, token) usa `authUidOf(perfil)`.
- **Desativar** alguém numa igreja só bloqueia o login se a pessoa não tiver outra igreja ativa.
- **Login**: entra no perfil principal ativo. Se ele não estiver ativo, entra no primeiro extra ativo.
- **Push**: chega no aparelho da pessoa, seja qual for a igreja aberta, com `church_id` nos dados.
- **Cadastro pelo código com e-mail que já existe**: o erro orienta a pessoa a entrar e usar "Entrar em outra igreja".

## Primeiro acesso de quem baixa da loja

1. A liderança manda o convite (Perfil → Convidar pessoas). É uma mensagem com o link `servosapp.com/entrar?c=CÓDIGO&i=convite`.
2. **Com o app instalado**, o link abre direto a tela de cadastro, com a igreja já preenchida.
3. **Sem o app**, a página do link mostra o código, o botão "Copiar código" e o botão da loja. Na primeira abertura, o app mostra a apresentação e depois "Tenho o código da igreja". Lá, o botão "Colar" (o do sistema no iOS, sem pedir permissão) preenche o código e o convite.
4. A pessoa informa nome, e-mail e senha:
   - convite pessoal: entra direto;
   - código ou link geral: fica aguardando a aprovação da liderança (web ou app) e recebe o aviso.
5. **Quem achou o app na loja sem convite** precisa do código com a liderança. As igrejas são criadas pelo Servos web.

## Deploy

Precisa de build nativo novo (agenda, seletor de documentos, botão de colar, modo escuro no `Info.plist`). O servidor precisa de deploy **antes** de publicar o app, porque o app chama as rotas novas.

## Entrar com Google (2026-09-30)

> **2026-10-29:** o "Entrar com Apple" saiu do app por decisão do produto; fica só o Google, com o G colorido no botão. O servidor continua aceitando `apple.com`, sem uso. Risco conhecido: a regra 4.8 da App Store pede outro login equivalente (com opção de esconder o e-mail) quando há login do Google; se a revisão recusar, a saída é voltar a Apple ou tirar o Google do iPhone.

- **Servidor:** `lib/auth/social.ts` e `POST /api/auth/social` (pública; a credencial é o token do Firebase obtido no provedor). Acha a pessoa pela conta de login e, se não houver perfil nela, pelo **e-mail verificado** pelo Google — a mesma garantia do "código por e-mail". `/api/auth/google` (web) usa a mesma regra. Cadastro pendente → `PENDING_APPROVAL`; sem conta → `NO_ACCOUNT`.
- **Cadastro:** `POST /api/join/signup` aceita `idToken` no lugar de e-mail e senha. A conta de login é a do provedor (sem senha no Servos).
- **App:** `lib/socialAuth.ts` (Google Sign-In nativo → token do Firebase) e `components/auth/SocialButtons.tsx` (botão "Continuar com o Google" com o G colorido de `GoogleLogo.tsx`). Aparece no login e no cadastro pelo código.
- **Nome:** se a conta do Google não tiver nome e sobrenome, o app pergunta (no iOS).

### Para funcionar em produção (fora do código)

1. **Firebase Console → Authentication → Sign-in method:** ativar **Google**.
2. **Google Cloud → Credenciais:** IDs OAuth "Web" e "iOS" (bundle `com.servosapp.app`) e, para Android, um "Android" com o SHA-1 do certificado do EAS.
3. **Variáveis do build (EAS):** `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (ligam o Google).
4. **Atenção no Firebase:** manter "uma conta por endereço de e-mail". Se uma conta de senha tiver e-mail **não verificado** e a pessoa entrar com o Google do mesmo e-mail, o Firebase pode trocar a senha pelo Google; ela continua entrando pelo Google ou pelo código por e-mail.
