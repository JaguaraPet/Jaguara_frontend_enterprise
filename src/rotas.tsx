import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { LayoutComMenu } from './layout/LayoutComMenu';
import { Contas } from './paginas/admin/Contas';
import { Integracoes } from './paginas/admin/Integracoes';
import { itensAdmin } from './paginas/admin/itensAdmin';
import { Logs } from './paginas/admin/Logs';
import { PainelAdmin } from './paginas/admin/PainelAdmin';
import { PermissoesGlobais } from './paginas/admin/PermissoesGlobais';
import { Chamados } from './paginas/admin/Chamados';
import { Verificacoes } from './paginas/admin/Verificacoes';
import { Webhooks } from './paginas/admin/Webhooks';
import { Componentes } from './paginas/Componentes';
import { Agenda } from './paginas/empresa/Agenda';
import { RegistrarAtendimento } from './paginas/empresa/Atendimento';
import { Catalogo } from './paginas/empresa/Catalogo';
import { Chat } from './paginas/empresa/Chat';
import { Clientes } from './paginas/empresa/Clientes';
import { Funcionarios } from './paginas/empresa/Funcionarios';
import { Horarios } from './paginas/empresa/Horarios';
import { Indicadores } from './paginas/empresa/Indicadores';
import { NovoAgendamento } from './paginas/empresa/NovoAgendamento';
import { Pagamentos } from './paginas/empresa/Pagamentos';
import { Perfis } from './paginas/empresa/Perfis';
import { PerfilEmpresa } from './paginas/empresa/PerfilEmpresa';
import { Avaliacoes } from './paginas/empresa/Avaliacoes';
import { Plano } from './paginas/empresa/Plano';
import { Privacidade } from './paginas/empresa/Privacidade';
import { Solicitacoes } from './paginas/empresa/Solicitacoes';
import { PerfilPet } from './paginas/empresa/PerfilPet';
import { PetsVinculados } from './paginas/empresa/PetsVinculados';
import { Relatorios } from './paginas/empresa/Relatorios';
import { itensEmpresa } from './paginas/empresa/itensEmpresa';
import { EmConstrucao } from './paginas/EmConstrucao';
import { Entrar } from './paginas/Entrar';
import { Inicio } from './paginas/empresa/Inicio';
import { CadastroEmpresa } from './paginas/publicas/CadastroEmpresa';
import { Demonstracao } from './paginas/publicas/Demonstracao';
import { ConfirmarEmail, PrimeiroAcesso } from './paginas/publicas/ConfirmarEmail';
import { RecuperarSenha, RedefinirSenha } from './paginas/publicas/RecuperarSenha';
import { RotaProtegida } from './sessao/RotaProtegida';
import { rotasDoSite } from './site/rotasSite';
import { AvisosPagamento } from './tempo-real/AvisosPagamento';

export const rotas: RouteObject[] = [
  // Páginas públicas
  {
    path: '/entrar',
    element: <Entrar tipos={['EMPRESA', 'FUNCIONARIO']} titulo="Entrar no Jaguara Enterprise" destino="/" />,
  },
  { path: '/cadastro', element: <CadastroEmpresa /> },
  { path: '/demonstracao', element: <Demonstracao /> },
  { path: '/confirmar-email', element: <ConfirmarEmail /> },
  { path: '/primeiro-acesso', element: <PrimeiroAcesso /> },
  { path: '/recuperar-senha', element: <RecuperarSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },

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
      { index: true, element: <Inicio /> },
      { path: 'agenda', element: <Agenda /> },
      { path: 'agenda/novo', element: <NovoAgendamento /> },
      { path: 'agenda/:agendamentoId/atendimento', element: <RegistrarAtendimento /> },
      { path: 'solicitacoes', element: <Solicitacoes /> },
      { path: 'horarios', element: <Horarios /> },
      { path: 'catalogo', element: <Catalogo /> },
      { path: 'funcionarios', element: <Funcionarios /> },
      { path: 'perfis', element: <Perfis /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'chat', element: <Chat /> },
      { path: 'pets', element: <PetsVinculados /> },
      { path: 'pets/:petId', element: <PerfilPet /> },
      { path: 'indicadores', element: <Indicadores /> },
      { path: 'relatorios', element: <Relatorios /> },
      { path: 'pagamentos', element: <Pagamentos /> },
      { path: 'perfil-empresa', element: <PerfilEmpresa /> },
      { path: 'avaliacoes', element: <Avaliacoes /> },
      { path: 'plano', element: <Plano /> },
      { path: 'privacidade', element: <Privacidade /> },
      ...itensEmpresa
        .filter((item) => !['/', '/agenda', '/horarios', '/solicitacoes', '/catalogo', '/funcionarios', '/perfis', '/clientes', '/chat', '/pets', '/indicadores', '/relatorios', '/pagamentos', '/privacidade', '/avaliacoes', '/plano'].includes(item.caminho))
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
      { path: 'permissoes', element: <PermissoesGlobais /> },
      { path: 'chamados', element: <Chamados /> },
      { path: 'verificacoes', element: <Verificacoes /> },
      ...itensAdmin
        .filter(
          (item) => !['/admin', '/admin/logs', '/admin/integracoes', '/admin/webhooks', '/admin/usuarios', '/admin/permissoes', '/admin/chamados', '/admin/verificacoes'].includes(item.caminho),
        )
        .map((item) => ({
          path: item.caminho.replace('/admin/', ''),
          element: <EmConstrucao titulo={item.rotulo} />,
        })),
    ],
  },

  // Páginas públicas também na Enterprise: /site (em desenvolvimento) e /e/{endereço}.
  ...rotasDoSite('/site'),

  // Catálogo dos componentes, só em desenvolvimento.
  ...(import.meta.env.DEV ? [{ path: '/componentes', element: <Componentes /> }] : []),
];

export const roteador = createBrowserRouter(rotas);
