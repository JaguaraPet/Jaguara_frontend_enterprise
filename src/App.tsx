import { RouterProvider } from 'react-router';
import { roteador } from './rotas';
import { ProvedorSessao } from './sessao/ContextoSessao';

export function App() {
  return (
    <ProvedorSessao>
      <RouterProvider router={roteador} />
    </ProvedorSessao>
  );
}
