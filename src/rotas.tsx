import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { LayoutComMenu } from './layout/LayoutComMenu';
import { Contas } from './paginas/admin/Contas';
import { Integracoes } from './paginas/admin/Integracoes';
import { itensAdmin } from './paginas/admin/itensAdmin';
import { Logs } from './paginas/admin/Logs';
import { PainelAdmin } from './paginas/admin/PainelAdmin';
import { Webhooks } from './paginas/admin/Webhooks';
import { Componentes } from './paginas/Componentes';
import { Agenda } from './paginas/empresa/Agenda';
import { RegistrarAtendimento } from './paginas/empresa/Atendimento';
import { Funcionarios } from './paginas/empresa/Funcionarios';
import { Horarios } from './paginas/empresa/Horarios';
import { Indicadores } from './paginas/empresa/Indicadores';
import { Relatorios } from './paginas/empresa/Relatorios';
import { itensEmpresa } from './paginas/empresa/itensEmpresa';
import { EmConstrucao } from './paginas/EmConstrucao';
import { Entrar } from './paginas/Entrar';
import { Painel } from './paginas/Painel';
import { ConfirmarEmail, PrimeiroAcesso } from './paginas/publicas/ConfirmarEmail';
import { RotaProtegida } from './sessao/RotaProtegida';
import { AvisosPagamento } from './tempo-real/AvisosPagamento';

export const rotas: RouteObject[] = [
  // Páginas públicas
  {
    path: '/entrar',
    element: <Entrar tipos={['EMPRESA', 'FUNCIONARIO']} titulo="Entrar no Jaguara Enterprise" destino="/" />,
  },
  { path: '/confirmar-email', element: <ConfirmarEmail /> },
  { path: '/primeiro-acesso', element: <PrimeiroAcesso /> },

  // Web Enterprise (UX-01, seção 4): empresa e funcionários.
  {
    path: '/',
    element: (
      <RotaProtegida tipos={['EMPRESA', 'FUNCIONARIO']} entrar="/entrar">
        <LayoutComMenu
          area="Enterprise"
          itens={itensEmpresa}
          sairPara="/entrar"
          extras={<AvisosPagamento />}
        />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <Painel /> },
      { path: 'agenda', element: <Agenda /> },
      { path: 'agenda/:agendamentoId/atendimento', element: <RegistrarAtendimento /> },
      { path: 'horarios', element: <Horarios /> },
      { path: 'funcionarios', element: <Funcionarios /> },
      { path: 'indicadores', element: <Indicadores /> },
      { path: 'relatorios', element: <Relatorios /> },
      ...itensEmpresa
        .filter((item) => !['/', '/agenda', '/horarios', '/funcionarios', '/indicadores', '/relatorios'].includes(item.caminho))
        .map((item) => ({ path: item.caminho.slice(1), element: <EmConstrucao titulo={item.rotulo} /> })),
    ],
  },

  // Administração da plataforma (UX-01, seção 5): só administradores.
  {
    path: '/admin/entrar',
    element: (
      <Entrar tipos={['ADMINISTRADOR']} titulo="Administração do Jaguara" destino="/admin" rodape={false} />
    ),
  },
  {
    path: '/admin',
    element: (
      <RotaProtegida tipos={['ADMINISTRADOR']} entrar="/admin/entrar">
        <LayoutComMenu area="Administração" itens={itensAdmin} sairPara="/admin/entrar" />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <PainelAdmin /> },
      { path: 'logs', element: <Logs /> },
      { path: 'integracoes', element: <Integracoes /> },
      { path: 'webhooks', element: <Webhooks /> },
      { path: 'usuarios', element: <Contas /> },
      ...itensAdmin
        .filter(
          (item) => !['/admin', '/admin/logs', '/admin/integracoes', '/admin/webhooks', '/admin/usuarios'].includes(item.caminho),
        )
        .map((item) => ({
          path: item.caminho.replace('/admin/', ''),
          element: <EmConstrucao titulo={item.rotulo} />,
        })),
    ],
  },

  // Catálogo dos componentes, só em desenvolvimento.
  ...(import.meta.env.DEV ? [{ path: '/componentes', element: <Componentes /> }] : []),
];

export const roteador = createBrowserRouter(rotas);
