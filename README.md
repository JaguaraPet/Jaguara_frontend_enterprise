# Jaguara · Web Enterprise e administração

Aplicação web da empresa, dos funcionários e do administrador, em React com Vite (ADR-007).


Novo no projeto? O [guia do ambiente de desenvolvimento (ENT-05)](https://github.com/JaguaraPet/Jaguara_doc/blob/main/docs/07-entrega/ENT-05-guia-do-ambiente.md) mostra como subir API, web e app juntos, do zero.

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

## Login e sessão

- `/entrar`: login da empresa e dos funcionários (UC-02). Mostra uma mensagem clara para senha errada, conta bloqueada por 5 minutos (RN03) e e-mail não confirmado (RN02). Tutores são orientados a usar o app.
- O access token fica só em memória e o refresh token no `localStorage` (`src/api/sessao.ts`). Ao abrir a página, a sessão é restaurada pelo refresh token; quando a API responde 401, o cliente renova o token e repete a requisição uma vez. Várias requisições ao mesmo tempo esperam a mesma renovação, porque o refresh token muda a cada uso.
- Rotas protegidas usam `RotaProtegida`, que manda para o login quem não tem o tipo de conta certo.

Para testar localmente, suba a API do Jaguara_backend com os dados do seed e entre com `clinica.patas@exemplo.com` (ou, em `/admin/entrar`, `admin@jaguara.exemplo.com`) e a senha `Jaguara@2026`.

## Layout da web Enterprise

Depois do login, a empresa e os funcionários entram no painel (UX-01, seção 4), com o menu lateral do mesmo `LayoutComMenu` da administração. O menu e os atalhos do painel mostram só o que o perfil permite (RN20): o atendente, por exemplo, não vê Funcionários nem Relatórios. O layout é responsivo de 360 a 1920 px (RNF04); abaixo de 768 px o menu vira um painel aberto pelo botão "Menu". A Agenda (`/agenda`, UC-24) mostra a semana de segunda a domingo, com navegação entre semanas, filtro por profissional ou recurso, o nome do serviço, do pet e do responsável de cada horário e o aviso dos pedidos que esperam resposta; no celular, os dias ficam um embaixo do outro. Indicadores (`/indicadores`, UC-17) abre no mês atual e deixa escolher o período e quais indicadores aparecem: atendimentos realizados, faturamento, taxa de aceite, serviços mais pedidos e atendimentos por dia, com uma tabela oculta para leitores de tela no lugar do gráfico. Relatórios (`/relatorios`, UC-18) gera o relatório de atendimentos e, para quem tem `financeiro:ler`, o financeiro, com o período escolhido, as tabelas por status, serviço, profissional e método e o botão "Baixar PDF". As telas dos demais itens chegam nas próximas tarefas.

Páginas públicas: `/confirmar-email` (link do e-mail de confirmação, RN02) e `/primeiro-acesso` (o funcionário convidado confirma o e-mail e cria a senha, UC-19).

## Tempo real

A área Enterprise abre uma conexão Socket.IO com o namespace `/tempo-real` da API (ADR-011), com o access token atual, relido a cada reconexão (`src/tempo-real`). Quando o gateway confirma o pagamento de um serviço (UC-44), a empresa vê o aviso "Pagamento confirmado" no topo da página, até fechar.

## Administração da plataforma

`/admin` é a área do administrador do Jaguara (UX-01, seção 5), com login próprio em `/admin/entrar`. Só contas do tipo administrador entram; as demais voltam para o login. O menu lateral (`src/layout/LayoutComMenu.tsx`) mostra só os itens liberados pelas permissões do perfil e vira um painel com o botão "Menu" em telas estreitas. Monitoramento e logs (`/admin/logs`, UC-25) mostra a situação da API pelo health check e os registros de auditoria, com filtro por nível e período e o nível escrito, não só a cor. Integrações (`/admin/integracoes`, UC-27) cadastra provedores com credenciais que não voltam a aparecer e testa se o serviço responde. Webhooks (`/admin/webhooks`, UC-30) cadastra a URL HTTPS do parceiro e os eventos e mostra o segredo de assinatura uma única vez. Contas de usuários (`/admin/usuarios`, UC-28) busca por nome, e-mail e status, abre o perfil com as sessões ativas e o histórico e suspende, bloqueia ou reativa com motivo obrigatório; se a auditoria falhar, o aviso diz que o status não mudou (RN34). As demais telas chegam nas próximas tarefas (UC-26 e UC-29).

## Design e componentes base

Os tokens do UX-02 ficam em `src/tema/tokens.ts`, arquivo idêntico ao do app do tutor, e viram variáveis CSS em `src/tema/variaveis.css`. O teste `tokens.test.ts` falha se os dois divergirem. A fonte Inter vem do pacote `@fontsource/inter`, sem depender de serviço externo.

| Componente | Estados e acessibilidade |
|---|---|
| `Botao` | Variantes primária, secundária, perigo e texto; hover, foco visível, desabilitado e carregando (`aria-busy`); área mínima de 44 px |
| `Campo` | `label` ligado ao campo, ajuda e erro por `aria-describedby`, `aria-invalid` e erro anunciado |
| `Cartao` | Seção com título, sobre a cor de superfície |
| `Alerta` | Sucesso, alerta, erro e informação, com cor, ícone e texto (a cor nunca é o único indicador) |

Em desenvolvimento, http://localhost:5173/componentes mostra o catálogo com todos os estados. Testes com Vitest e React Testing Library: `npm test`.

## Cliente da API

Os tipos do cliente são gerados do contrato OpenAPI do Jaguara_doc (JAG-95), sem tipos escritos à mão:

```bash
npm run api:contrato   # baixa o openapi.yaml da main do Jaguara_doc para api/openapi.yaml
npm run api:gerar      # gera src/api/esquema.ts
```

Use o cliente de `src/api/cliente.ts` (openapi-fetch); o endereço vem de `VITE_API_URL`: rotas, parâmetros e respostas são conferidos pelo TypeScript. O CI falha se `src/api/esquema.ts` não estiver igual ao gerado a partir de `api/openapi.yaml`.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| "Não foi possível entrar agora" no login | A API não está rodando ou ainda está compilando: confira http://localhost:3000/v1/health |
| Erro de CORS no navegador | A origem da web precisa estar em `URL_WEB` no `.env` da API |
| CI falha em "Cliente da API igual ao contrato" | Rode `npm run api:gerar` e versione o `src/api/esquema.ts` |

## Dependências

- Gerenciador: **npm** (versão 11 ou maior), com o `package-lock.json` versionado. Instale com `npm ci` para reproduzir exatamente as versões do lock.
- Node.js **24 LTS**, fixado no `.nvmrc` (`nvm use`). O `engine-strict` do `.npmrc` recusa versões abaixo disso.
- Atualizações: o Dependabot abre pull requests semanais para pacotes npm (correções e versões menores agrupadas) e mensais para as actions do GitHub.

## Integração e entrega contínuas

- **CI** (`.github/workflows/ci.yml`): em todo pull request, roda lint, verificação de tipos, testes e build, além da auditoria das dependências de produção. O pull request só entra com o CI verde (ADR-008).
- **CD** (`.github/workflows/cd.yml`): a cada merge na `main` publica a imagem `ghcr.io/jaguarapet/jaguara-web` (nginx com o build estático). Com as variáveis do CapRover configuradas, implanta em homologação; as tags `vX.Y.Z` vão para produção (ENT-01).
