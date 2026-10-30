# Publicação nas lojas (passo a passo)

Tudo o que é código já está pronto. Este guia é o que falta fazer **com as contas** (Apple, Expo, Firebase) e na ordem certa.

**Decisão (2026-10-01): lançar só no iOS.** O Android entra depois, se o iPhone funcionar bem e o retorno for positivo — ver "Fase 2: Android" no fim. Enquanto isso, a página de convite (`servosapp.com/entrar`) mostra a quem abre no Android que a versão está chegando, sem botões quebrados.

## 0. Antes de tudo (com a sua autorização)

1. **Publicar o servidor**: merge de `feat/mobile-api` em `main` do `Servos-v3` (o Vercel publica sozinho). O app novo chama rotas que só existem nessa branch: multi-igreja, conversa, músicas, login com Apple/Google e excluir conta.
2. **Subir o site** (`servosapp.com`, por FTP/cPanel): as pastas `privacidade/`, `termos/`, `suporte/`, `excluir-conta/`, `.well-known/` e o novo `politica-de-privacidade.html` (que redireciona). Gerar de novo: `python3 scripts/site/build_site.py`. A política antiga ficou em `servosapp.com/_antigo/` (não subir essa pasta).
3. **Criar a igreja de demonstração** em produção, para o revisor da Apple: uma igreja "Igreja Demonstração", um usuário `revisao@servosapp.com` com senha forte, 2 ministérios, escalas nas próximas semanas, algumas músicas e recados na conversa.

## 1. Contas

| Conta | Custo | Para quê |
|---|---|---|
| Apple Developer Program | US$ 99/ano | App Store, TestFlight, push, Entrar com Apple |
| Expo (expo.dev) | grátis (plano free dá ~15 builds iOS + 15 Android por mês) | builds na nuvem (EAS) e atualizações |
| Sentry (sentry.io) | grátis até 5 mil erros/mês | avisos de travamento |

## 2. Configurar o EAS (uma vez)

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # cria o projeto na Expo e grava o projectId no app.json
npx eas-cli@latest update:configure
```

Variáveis do build (expo.dev → projeto → Environment variables, ambiente **production**):

| Variável | Valor | Visibilidade |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | mesma chave pública do web | texto |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ID OAuth "Web" | texto |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | ID OAuth "iOS" | texto |
| `EXPO_PUBLIC_SENTRY_DSN` | DSN do projeto no Sentry | texto |
| `SENTRY_ORG` / `SENTRY_PROJECT` | slug da organização e do projeto | texto |
| `SENTRY_AUTH_TOKEN` | token de organização do Sentry | **secreto** |

Arquivo do Firebase (Console → Configurações do projeto → seus apps; criar o app iOS `com.servosapp.app` se não existir): salvar como `firebase/GoogleService-Info.plist` (fica fora do git; o `app.config.ts` usa se existir). No EAS, enviar como **arquivo secreto** com o mesmo caminho.

## 3. Notificações (push)

Apple Developer → Keys → criar uma chave com **Apple Push Notifications service (APNs)**, baixar o `.p8`. Firebase Console → Cloud Messaging → app iOS → enviar a chave (Key ID e Team ID).

## 4. Login com Google

Ver `docs/07-funcoes-novas.md` → "Para funcionar em produção".

## 5. Links universais (convite abre o app direto)

Em `scripts/site/build_site.py`, trocar `APPLE_TEAM_ID` pelo Team ID da conta paga (Apple Developer → Membership), rodar `python3 scripts/site/build_site.py` e subir a pasta `.well-known/`.

## 6. Primeiro build e TestFlight

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

No primeiro build o EAS pergunta pela conta Apple e cria certificados e o perfil sozinho (inclui Push). No App Store Connect, o app aparece em TestFlight; adicionar a igreja piloto como testadores (até 100 internos ou 10 mil externos).

Correções só de código (sem mudar módulo nativo) chegam sem nova revisão:

```bash
npx eas-cli@latest update --channel production --message "o que mudou"
```

## 7. Página na App Store (texto pronto)

Os textos abaixo já estão em `store.config.json` (EAS Metadata). Para enviá-los ao App Store Connect, rode `npx eas-cli@latest metadata:push`. O comando pede o login da Apple. A senha da conta de demonstração não fica no arquivo: preencha-a no App Store Connect, em App Review Information. Capturas e privacidade (seção 8) ainda são feitas no site.

- **Nome:** Servos
- **Subtítulo (30):** Escalas da igreja sem confusão
- **Categoria:** Estilo de vida (secundária: Produtividade)
- **Classificação:** 4+ (responder "não" a tudo; há conversa entre usuários → marcar "conteúdo gerado por usuários: não irrestrito")
- **Palavras-chave (100):** escala,igreja,voluntários,ministério,louvor,culto,equipe,agenda,servir,célula,repertório,mídia
- **URL de suporte:** https://www.servosapp.com/suporte/
- **URL de privacidade:** https://www.servosapp.com/privacidade/
- **Texto promocional:** Sua próxima escala, sempre à vista. Confirme presença com um toque.
- **Descrição:**

> O Servos organiza onde e quando você serve na sua igreja.
>
> PARA QUEM SERVE
> • Veja sua próxima escala com dia, horário de chegada, local e função.
> • Confirme presença com um toque, ou avise que não pode e peça substituição.
> • Converse com a equipe em cada escala e abra os arquivos e o repertório.
> • Salve a escala na agenda do celular, com lembrete.
> • Avise os dias em que não pode servir.
>
> PARA QUEM LIDERA
> • Monte escalas a partir de modelos ou de escalas anteriores.
> • Acompanhe quem confirmou e veja as vagas em aberto.
> • Convide pessoas com o código da igreja, link ou QR code, e aprove os pedidos de entrada.
> • Monte a lista de músicas do louvor e anexe roteiros.
>
> Serve em mais de uma igreja? Entre em todas com a mesma conta.
>
> O Servos é usado pela sua igreja: peça o código à liderança para entrar.

- **Notas para o revisor (App Review Information):**

> O Servos é usado por igrejas cadastradas. Para revisar, use a conta de demonstração (já faz parte da "Igreja Demonstração"): revisao@servosapp.com / [senha]. Excluir a conta: Perfil → Excluir minha conta. Entrar com o Google: disponível na tela de login; contas sem cadastro são orientadas a usar o código da igreja (igreja de demonstração: código [código]).

- **Capturas:** `store/app-store/iphone-6.9/` (e `iphone-6.5/`, se pedir). Ícone: `store/app-store/icone-1024.png`.

## 8. Privacidade do app (App Store Connect → App Privacy)

**Coletamos dados?** Sim. **Usados para rastreamento (tracking)?** Não, em nenhum item.

| Tipo de dado | Coletado | Ligado à identidade | Finalidade |
|---|---|---|---|
| Nome | sim | sim | Funcionalidade do app |
| E-mail | sim | sim | Funcionalidade do app |
| Telefone | sim | sim | Funcionalidade do app |
| Fotos (foto de perfil, anexos) | sim | sim | Funcionalidade do app |
| Outro conteúdo do usuário (recados, respostas, motivos) | sim | sim | Funcionalidade do app |
| ID do usuário | sim | sim | Funcionalidade do app, Análise |
| ID do dispositivo (token de push) | sim | sim | Funcionalidade do app |
| Interação com o produto (eventos de uso) | sim | não | Análise |
| Dados de falhas | sim | não | Funcionalidade do app (diagnóstico) |

Não coletamos: localização, contatos, saúde, finanças, histórico de navegação, pesquisas, compras, áudio.

## 9. Depois do piloto

1. Uma a duas semanas com a igreja piloto no TestFlight.
2. Preencher `APP_STORE_URL` em `servosapp.com/entrar/index.html`.
3. Enviar para revisão na App Store.

---

# Fase 2: Android (depois do iOS)

O código já está pronto para Android: compila, gera o projeto nativo sem erro e as permissões desnecessárias estão bloqueadas. **Nunca foi aberto num aparelho Android** — testar antes de liberar.

1. **Conta:** Google Play Console (US$ 25 uma vez).
2. **Firebase:** criar o app Android `com.servosapp.app`, salvar `firebase/google-services.json` (arquivo secreto no EAS). Push no Android funciona só com esse arquivo.
3. **Google login:** ID OAuth "Android" com o SHA-1 do certificado do EAS.
4. **Build de teste:**

```bash
npx eas-cli@latest build --platform android --profile preview      # APK para instalar direto
npx eas-cli@latest build --platform android --profile production   # para o Play
npx eas-cli@latest submit --platform android --latest              # vai para "teste interno"
```

5. **Links universais:** Play Console → Integridade do app → SHA-256 do certificado → `ANDROID_SHA256` em `scripts/site/build_site.py` → gerar e subir `.well-known/`.
6. **Página de convite:** preencher `PLAY_STORE_URL` em `servosapp.com/entrar/index.html`. O botão "Baixar no Google Play" aparece sozinho e o aviso "chegando" some.
7. **Imagens:** já prontas em `store/google-play/` (capturas 1080×1920, ícone 512 e gráfico de recursos 1024×500).



## Google Play → Segurança dos dados

- Coleta dados: **sim**. Compartilha com terceiros: **não** (fornecedores que operam o serviço não contam como compartilhamento). Criptografia em trânsito: **sim**. Usuário pode pedir exclusão: **sim** → URL `https://www.servosapp.com/excluir-conta/`.
- Tipos: Informações pessoais (nome, e-mail, telefone, IDs do usuário), Fotos e vídeos (fotos), Mensagens (outras mensagens no app), Atividade no app (interações), Informações e desempenho do app (registros de falhas), IDs do dispositivo. Todos: coletados, obrigatórios exceto fotos e telefone (opcionais), finalidade "Funcionalidade do app" (+ "Análise" para atividade e falhas).
- **Política de privacidade:** https://www.servosapp.com/privacidade/
- **Permissões declaradas:** agenda (leitura e escrita — salvar a escala na agenda), notificações. Câmera, microfone e sobreposição de tela estão bloqueados no build.
- **Público-alvo:** 13 anos ou mais.

