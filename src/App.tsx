import { RouterProvider } from 'react-router';
import { roteador } from './rotas';
import { ProvedorSessao } from './sessao/ContextoSessao';
import { ehSite } from './site/enderecos';
import { roteadorSite } from './site/rotasSite';

export function App() {
  // O domínio decide: jaguarapet.com.br é o site; app.jaguarapet.com.br, a Enterprise.
  if (ehSite()) return <RouterProvider router={roteadorSite} />;
  return (
    <ProvedorSessao>
      <RouterProvider router={roteador} />
    </ProvedorSessao>
  );
}
