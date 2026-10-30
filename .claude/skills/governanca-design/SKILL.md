---
name: governanca-design
description: Processo de governança de design e qualidade do projeto (antes, durante e depois de cada mudança de UI, fluxo ou componente). Use ao implementar ou revisar telas, componentes, estilos e fluxos, ao receber um BLOCKER ou WARNING dos MODs de governança, ou ao editar .claude/governance.json.
---

# Governança de design e qualidade

Seis MODs do Claude Code aplicam as regras automaticamente: `governance-center` (painel e registro), `ds-guardian`, `component-reuse-guard`, `ux-flow-sentinel`, `ui-quality-gate` e `change-scope-protector`. As regras do projeto ficam em `.claude/governance.json`. Esta skill é o processo; os MODs são a verificação.

## Severidade

- **BLOCKER**: violação comprovada de regra obrigatória com critério verificável (ex.: `gap: 12` quando existe `space[3]`; cor hex fora de `tokens.ts`; lint, typecheck ou teste falhando). O `ds-guardian` barra a edição; corrija e refaça.
- **WARNING**: inconsistência que pede revisão (ex.: `fontSize` fixo, estado de erro ausente, `Pressable` sem `accessibilityRole`). Revise e explique se mantiver.
- **INFO**: orientação (arquivos tocados, efeitos colaterais, valor de 1–2px fora da escala).
- Gosto estético nunca é BLOCKER.

## Antes

1. Releia o pedido e delimite o escopo. Se algo fora dele parecer necessário, apresente o que é, por quê e o efeito colateral, e espere a resposta.
2. Procure o que já existe: o catálogo de componentes chega no prompt (`component-reuse-guard`); confira `src/components/ui` e os tokens em `src/theme/tokens.ts`.
3. Arquivos protegidos (`scope.askBeforeEditing`) e comandos de dependência pedem confirmação da pessoa.

## Durante

- Só tokens e variantes: `color.*`, `space[n]`, `radius.*`, `font.*`, `<Text variant>`.
- Toda tela com dados: carregando (Skeleton), erro (ErrorState com tentar de novo) e vazio (EmptyState).
- Toda ação que grava: feedback de sucesso e erro. Ação destrutiva: confirmação com `style: "destructive"`.
- Toque: `accessibilityRole` e `accessibilityLabel`; mínimo 44pt (`hitSize`).
- Exceção legítima numa linha: `// governance-ignore: motivo` (o motivo é obrigatório). Exceção de arquivo: `exceptions` no `governance.json`, com `reason`.

## Depois

1. O `ui-quality-gate` roda lint, typecheck e testes relacionados ao fim do turno; `/validar` roda na hora (`/validar tudo` pega todos os arquivos com mudança no git).
2. Abra `/governanca` e resolva todo BLOCKER e validação que falhou.
3. Revise o diff (`git diff`) e mostre as evidências: comandos rodados e resultado. Não declare verificado o que não rodou.
4. Revisão visual e de UX subjetiva: use o agente `revisor-ux-ui` e diga que é avaliação, não teste.

## Manutenção das regras

- Regras globais (reaproveitáveis): no código dos MODs.
- Regras do projeto: `.claude/governance.json` (tokens e escalas, pastas de componentes e rotas, palavras destrutivas, caminhos protegidos, regras de negócio, comandos de validação, exceções).
- Depois de editar o JSON, os MODs o releem na próxima sessão.
