# Entrada na igreja: código, convite e aprovação (2026-09-29)

Backend: `Servos-v3` branch `feat/mobile-api` (worktree `../Servos-v3-mobile-api`), **sem commit e sem deploy**.

## Como funciona

| Caminho | Quem usa | Resultado |
|---|---|---|
| **Código da igreja** (6 caracteres, sem I/O/0/1, ex.: `K7M-4QX`) | Pessoa que baixou o app sozinha → "Entrar com o código da igreja" | Pedido **pendente**; quem decide é a administração |
| **Link de convite** `servosapp.com/entrar?c=CÓDIGO&i=CONVITE` (QR code ou compartilhar) | Admin ou líder, em Perfil → Convidar pessoas ou no ministério → Adicionar pessoa → Convidar | Pedido **pendente**; quem decide é a administração **ou quem convidou**. Se o convite for de um ministério, a pessoa entra nele ao ser aprovada |
| **Convite pessoal** (nome + e-mail opcional; vale uma vez, por 14 dias) | Admin ou líder | Entra **já aprovada**. Se o convite tiver e-mail, só esse e-mail pode usá-lo |

Enquanto o pedido está pendente, a pessoa fica na tela "Cadastro enviado". O app consulta o pedido sozinho quando volta para a frente e a cada 30 s. Quando o pedido é aprovado, a pessoa entra direto, sem digitar a senha de novo. Se ela fizer login antes da aprovação, volta para a mesma tela de espera. Um pedido recusado mostra a mensagem de recusa.

Para quem aprova:
- A Home mostra "N pessoas aguardando aprovação" em *Precisa de atenção*.
- O Perfil tem o item "Pedidos de entrada".
- Também chega um push "Nova pessoa quer entrar".

## Servidor

- `lib/join/rules.ts` (puro, 13 testes): código, link, mensagem, validade do convite, quem decide (`canDecideJoin`) e como o login trata conta pendente ou recusada.
- `lib/join/join-token.ts`: credencial de quem aguarda aprovação. Não é sessão: só vale em `/api/join/status`. Depois da aprovação, ela pode ser trocada por uma sessão durante 7 dias.
- `lib/join/service.ts`: código da igreja (gerado na criação da igreja e, para igrejas antigas, na primeira vez que alguém abre "Convidar"), convites, cadastro, decisão em transação (dois líderes ao mesmo tempo resultam em 409), auditoria e notificações.
- Rotas públicas:
  - `GET /api/join/lookup`
  - `POST /api/join/signup`
  - `GET /api/join/status` (header `x-servos-join`)
- Rotas logadas:
  - `GET|POST /api/mobile/join/invite`
  - `POST /api/mobile/join/code` (trocar o código; só a administração)
  - `GET /api/mobile/join/requests`
  - `POST /api/mobile/join/requests/:id`
- `auth/login`: se a senha estiver certa mas o cadastro estiver pendente, responde 403 `PENDING_APPROVAL` com o join token. Se o pedido foi recusado, responde 403 `JOIN_REJECTED`. O web mostra essa mesma mensagem.
- `mobile/overview`: novos campos `access.canInvite` e `joinRequests`.
- Coleções novas: `joinInvites` e `joinRequests`. A igreja ganhou o campo `join_code`.

## O que falta do seu lado

1. **Apple Team ID**: substituir `APPLE_TEAM_ID` em `servosapp.com/.well-known/apple-app-site-association`.
2. **SHA-256 do certificado Android** (Play Console → Integridade do app): substituir `ANDROID_SHA256_FINGERPRINT` em `servosapp.com/.well-known/assetlinks.json`.
3. **Publicar no servosapp.com**:
   - a pasta `.well-known` (os dois arquivos);
   - `entrar/index.html`, a página de quem ainda não tem o app;
   - o `.htaccess`, que agora serve o arquivo da Apple como JSON.

   Isso precisa funcionar tanto em `servosapp.com` quanto em `www.servosapp.com`, sem redirecionamento.
4. **Links das lojas** na página `entrar/index.html` (`APP_STORE_URL` e `PLAY_STORE_URL`), quando o app for publicado.
5. **Novo build nativo**, para o `associatedDomains` e os `intentFilters` do `app.json` valerem. Até lá, o link `servos://entrar?c=…&i=…` já funciona.

## Web (2026-09-29)

- O link do web (`app.servosapp.com/entrar/:token`, rota `member-invitations/church-join`) agora também cria a pessoa **pendente**, pelo mesmo `signupWithCode`. Como o pedido não veio do convite de alguém, quem decide é a administração. Testes em `church-join/route.test.ts`.
- A tela final do cadastro no web agora diz "Cadastro enviado", e não mais "Cadastro concluído": a pessoa só entra depois da aprovação.
- A nova página **`/aprovacoes`** ("Pedidos de entrada", exige `people.invite`) é o destino do push "Nova pessoa quer entrar". Usa as mesmas rotas do app, com o mesmo recorte de quem vê o quê.
- Em **Pessoas**, o botão "Pedidos de entrada (N)" aparece quando há pedidos. O diálogo "Convidar por link" agora avisa que o cadastro passa por aprovação.
- Quem está pendente fica `active: false, status: "pending"`, então aparece como inativo nas listas do web.
