import { Componentes } from './paginas/Componentes.tsx';
import { Inicio } from './paginas/Inicio.tsx';

export function App() {
  // O catálogo de componentes só existe em desenvolvimento; as rotas reais chegam com o layout (JAG-137).
  if (import.meta.env.DEV && window.location.pathname === '/componentes') {
    return <Componentes />;
  }
  return <Inicio />;
}
