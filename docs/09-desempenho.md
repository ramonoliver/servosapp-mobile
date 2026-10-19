# Auditoria de desempenho (2026-10-19)

Referências: guia de otimização da Callstack (skill `react-native-best-practices`) e regras da Vercel para React Native (`vercel-react-native-skills`). Versões auditadas: Expo SDK 57, React Native 0.86, React 19.2, Hermes.

**Resumo.** O maior problema era o tamanho do bundle: ele levava os 1.512 ícones do Phosphor, e isso já foi corrigido (de 9,03 MB para 3,58 MB). Nas telas, o app está em bom estado: as listas grandes de verdade (escalas, notificações, candidatos, conversa) já são virtualizadas, e todas as animações rodam no thread nativo. O que sobra é de impacto médio e depende de medir no iPhone antes de mexer.

## Medições

Comando: `npx expo export --platform ios --source-maps`, bundle Hermes (`.hbc`) de produção.

| | Antes | Depois |
|---|---|---|
| Bundle iOS (`.hbc`) | **9,03 MB** | **3,58 MB** (−60%) |
| Módulos no bundle | 4.800 | 1.895 |
| Módulos do `phosphor-react-native` | 3.027 (1.512 ícones + 1.512 definições) | 122 (60 + 60) |

O bundle é o que o EAS Update baixa a cada atualização OTA e o que o Hermes carrega na abertura. Cada definição de ícone monta um `Map` com elementos React assim que é carregada. Antes, o índice do pacote carregava os 1.512 na partida.

**Ainda não medido:** o tempo de abertura (TTI) no aparelho. Para medir, faça uma partida a frio no iPhone de teste antes e depois deste PR, ou use o app start do Sentry (`tracesSampleRate: 0.1` já está ativo).

## Corrigido neste PR

| # | O quê | Por quê | Impacto | Esforço |
|---|---|---|---|---|
| 1 | `src/components/ui/icons.ts` importa cada ícone do próprio arquivo (`phosphor-react-native/src/icons/<Nome>`) | Importar da raiz do pacote levava todos os ícones para o bundle, e o tree shaking do Metro (ligado por padrão desde o SDK 54) não os removia | **Alto**: bundle −60%, partida com ~2.900 módulos a menos para avaliar, OTA menor | Baixo |
| 2 | Regra de lint `@typescript-eslint/no-restricted-imports` contra `phosphor-react-native` (o `import type` continua permitido) | Impede que alguém volte a importar da raiz | Protege o item 1 | Baixo |
| 3 | `criar-igreja.tsx`: cada cartão de culto tem um `id` local, usado como `key` | Com `key={i}`, ao remover um culto o React reaproveitava o cartão do culto seguinte (o seletor nativo de horário, os chips e o estado interno do `DateTimeField`). O `id` não vai para o servidor | Correção de comportamento | Baixo |
| 4 | `conversa/[id].tsx`: `renderItem`/`keyExtractor` fora do componente e `Bubble` com `memo` | Cada tecla no campo de mensagem re-renderiza a tela. Com um `renderItem` novo a cada render, a `FlatList` redesenhava todos os balões visíveis | Médio: digitação mais leve em conversas longas | Baixo |
| 5 | `churchToday()` reaproveita um `Intl.DateTimeFormat` criado no carregamento do módulo | A função roda no render de várias telas, do `DateTimeField` e da conversa (a cada tecla). Criar um formatador com fuso custa caro no Hermes. Outros módulos (`chat.ts`, `copy.ts`) já fazem assim | Baixo a médio | Baixo |

Detalhes do item 1:
- `tsconfig.json` (`paths`): o `.tsx` do pacote não passa no `strict`, então os tipos vêm dos `.d.ts` publicados. O Metro continua resolvendo para o `.tsx`, e o bundle foi conferido.
- `package.json` (`jest.moduleNameMapper`): o jest-expo transforma os `paths` do tsconfig em mapeamentos. Por isso, nos testes, os ícones apontam para o build CommonJS do pacote. Conferi que `@/components/ui/icons` carrega no jest.

## Próximos passos, em ordem

### P1: vale fazer antes ou logo depois do piloto

| # | O quê | Por quê | Impacto esperado | Esforço | Risco |
|---|---|---|---|---|---|
| 6 | **Medir antes de otimizar mais.** Registrar a navegação do Expo Router no Sentry (`Sentry.reactNavigationIntegration` + `useNavigationContainerRef`) e anotar a partida a frio no iPhone de teste | Hoje o Sentry só tem o app start. Sem tempo por tela, os itens 7 a 9 são palpites | Dá base para decidir o resto | Baixo | Baixo |
| 7 | **Repertório** (`repertorio.tsx`) e **equipe do ministério** (`ministerio/[id].tsx`): trocar `Screen` (ScrollView) + `.map` por `FlatList` | São as duas únicas listas sem limite dentro de uma ScrollView: uma igreja pode ter de 100 a 300 músicas, e um ministério de 10 a 80 pessoas. Todas as linhas são montadas de uma vez, e cada letra na busca re-renderiza todas | Médio a alto em igrejas grandes (abrir a tela e digitar na busca) | Médio: o "cartão" agrupado vira estilo de primeira/última linha, como já faz `selecionar-pessoa.tsx` | Médio (visual) |
| 7a | Mitigação barata enquanto o 7 não sai: `useDeferredValue(query)` no filtro e `memo` em `SongRow`/linha de membro | Mantém o campo de busca responsivo sem mudar o layout | Médio | Baixo | Baixo |
| 8 | **Fontes no build**: trocar o `useFonts` do `_layout.tsx` pelo config plugin `expo-font` (as 4 Geist embutidas no app) | Hoje as fontes carregam em JS antes de o splash sair. Embutidas, ficam disponíveis na partida (regra `fonts-config-plugin`) | Baixo a médio no TTI | Baixo, mas pede um build nativo novo (muda o fingerprint) | Baixo |

### P2: só se a medição apontar

| # | O quê | Por quê | Impacto esperado | Esforço |
|---|---|---|---|---|
| 9 | **React Compiler** (`experiments.reactCompiler: true` no `app.json`; o SDK 54+ configura o Babel sozinho) | Memoização automática no app inteiro. Faz sentido se o perfil mostrar re-renders em cascata | Médio | Baixo para ligar, médio para validar todas as telas |
| 10 | `selecionar-pessoa.tsx` e `notificacoes.tsx`: `renderItem` inline e linhas sem `memo` | Mesmo padrão do item 4, mas o `SectionList` já virtualiza e as listas são curtas (candidatos de um ministério) | Baixo | Baixo |
| 11 | `(tabs)/escalas.tsx`: `sections.map(...)` fora do `useMemo` | Cria um array novo a cada render. Só pesa se a aba re-renderizar muito | Baixo | Baixo |
| 12 | `Skeleton`: um loop de `Animated` por bloco (cerca de 9 por tela de carregamento) | Dá para compartilhar um único valor animado. Como já usa `useNativeDriver`, o custo é pequeno | Baixo | Baixo |
| 13 | `Toast`: `onDone={() => setToast(null)}` muda a cada render do provider e reinicia a animação do toast aberto | O provider quase não re-renderiza (fica acima da navegação). É mais correção do que desempenho | Baixo | Baixo |
| 14 | `react-native-svg` leva o suporte a CSS/XML (`css-tree`, `css-select`, `dom-serializer`, ~470 KB de fonte) porque o índice do pacote reexporta `SvgCss` | O app só usa `Svg`/`Path`/`Rect` e o QR Code. Tirar exige um patch no pacote | Baixo (bundle) | Médio |

### O que não vale fazer agora

- **FlashList ou Legend List.** As listas grandes já usam `FlatList`/`SectionList`, com poucas dezenas de itens. Uma lista com reciclagem só compensa com centenas de linhas heterogêneas, e traz uma dependência nativa nova, que pede outro build. Reavaliar se a conversa ou o repertório passarem disso, de preferência depois do item 7.
- **Migrar as 4 animações para Reanimated.** `AnimatedSplash`, `Mascot`, `BottomSheet`, `Toast` e `Skeleton` animam só `opacity`/`transform` com `useNativeDriver: true`, ou seja, já rodam no thread de UI. O Reanimated só ajudaria em gestos ou em animações de layout, que o app não tem.
- **Trocar ScrollView nas telas de formulário.** As 11 telas com ScrollView próprio são formulários ou passos fixos (`login`, `entrar`, `criar-igreja`, `novo-evento`, `nova-musica`, `novo-ministerio`, `meus-dados`, `excluir-conta`, `outra-igreja`, `entrar-com-codigo`, `bem-vindo`). Nelas os `.map` são de poucos itens fixos, e ScrollView é o componente certo.
- **`key={i}` nas caixas de código, nos esqueletos, nos pontos do `bem-vindo` e no cabeçalho do calendário.** As listas têm tamanho fixo e não mudam de ordem, então o índice serve.

## Como repetir a medição

```bash
npx expo export --platform ios --output-dir /tmp/servos-ios --source-maps
ls -l /tmp/servos-ios/_expo/static/js/ios/*.hbc
```

Para ver quanto cada pacote pesa, conte os `sources` do `.hbc.map` por pasta de `node_modules`. Um pacote com milhares de arquivos é sinal de import da raiz sem tree shaking.
