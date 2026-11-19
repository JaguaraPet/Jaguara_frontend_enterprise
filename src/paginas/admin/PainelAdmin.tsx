import { Link } from 'react-router';
import { Cartao } from '../../componentes';
import { itensAdmin } from './itensAdmin';

/** Painel inicial da administração da plataforma (UX-01, seção 5). */
export function PainelAdmin() {
  return (
    <div className="pagina">
      <h1>Administração</h1>
      <p className="pagina__descricao">
        Acompanhe a plataforma e atenda empresas e tutores.
      </p>
      <div className="pagina__grade">
        {itensAdmin
          .filter((item) => item.caminho !== '/admin')
          .map((item) => (
            <Cartao key={item.caminho} titulo={item.rotulo} subtitulo={item.descricao}>
              <Link to={item.caminho}>Abrir</Link>
            </Cartao>
          ))}
      </div>
    </div>
  );
}
