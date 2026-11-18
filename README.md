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

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **CD** (`.github/workflows/cd.yml`): a cada merge na `main` publica a imagem `ghcr.io/jaguarapet/jaguara-web` (nginx com o build estático). Com as variáveis do CapRover configuradas, implanta em homologação; as tags `vX.Y.Z` vão para produção (ENT-01).
