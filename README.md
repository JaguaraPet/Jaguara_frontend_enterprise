# Jaguara · Web Enterprise e administração

Aplicação web da empresa, dos funcionários e do administrador, em React com Vite (ADR-007).

## Rodar

```bash
npm install
npm run dev
```

Abre em http://localhost:5173.

## Estrutura

```text
src/
  paginas/      páginas e rotas
  componentes/  componentes de interface
  tema/         tokens do UX-02
  api/          cliente da API
```

## Design e componentes base

Os tokens do UX-02 ficam em `src/tema/tokens.ts`, arquivo idêntico ao do app do tutor, e viram variáveis CSS em `src/tema/variaveis.css`. O teste `tokens.test.ts` falha se os dois divergirem. A fonte Inter vem do pacote `@fontsource/inter`, sem depender de serviço externo.

| Componente | Estados e acessibilidade |
|---|---|
| `Botao` | Variantes primária, secundária, perigo e texto; hover, foco visível, desabilitado e carregando (`aria-busy`); área mínima de 44 px |
| `Campo` | `label` ligado ao campo, ajuda e erro por `aria-describedby`, `aria-invalid` e erro anunciado |
| `Cartao` | Seção com título, sobre a cor de superfície |
| `Alerta` | Sucesso, alerta, erro e informação, com cor, ícone e texto (a cor nunca é o único indicador) |

Em desenvolvimento, http://localhost:5173/componentes mostra o catálogo com todos os estados. Testes com Vitest e React Testing Library: `npm test`.

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **CD** (`.github/workflows/cd.yml`): a cada merge na `main` publica a imagem `ghcr.io/jaguarapet/jaguara-web` (nginx com o build estático). Com as variáveis do CapRover configuradas, implanta em homologação; as tags `vX.Y.Z` vão para produção (ENT-01).
