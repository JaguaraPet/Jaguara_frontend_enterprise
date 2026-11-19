import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { Componentes } from './paginas/Componentes';
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
  // Catálogo dos componentes, só em desenvolvimento.
  ...(import.meta.env.DEV ? [{ path: '/componentes', element: <Componentes /> }] : []),
];

export const roteador = createBrowserRouter(rotas);
