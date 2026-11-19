import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { LayoutComMenu } from './layout/LayoutComMenu';
import { itensAdmin } from './paginas/admin/itensAdmin';
import { PainelAdmin } from './paginas/admin/PainelAdmin';
import { Componentes } from './paginas/Componentes';
import { EmConstrucao } from './paginas/EmConstrucao';
import { Entrar } from './paginas/Entrar';
import { Painel } from './paginas/Painel';
import { RotaProtegida } from './sessao/RotaProtegida';

export const rotas: RouteObject[] = [
  {
    path: '/entrar',
    element: <Entrar tipos={['EMPRESA', 'FUNCIONARIO']} titulo="Entrar no Jaguara Enterprise" destino="/" />,
  },
  {
    path: '/',
    element: (
      <RotaProtegida tipos={['EMPRESA', 'FUNCIONARIO']} entrar="/entrar">
        <Painel />
      </RotaProtegida>
    ),
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
      ...itensAdmin
        .filter((item) => item.caminho !== '/admin')
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
