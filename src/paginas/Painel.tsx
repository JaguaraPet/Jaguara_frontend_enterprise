import { Link } from 'react-router';
import { Cartao } from '../componentes';
import { useUsuario } from '../sessao/useUsuario';
import { itensEmpresa } from './empresa/itensEmpresa';

/** Painel da empresa (UX-01, seção 4): atalhos só para o que o perfil permite (RN20). */
export function Painel() {
  const usuario = useUsuario();
  const atalhos = itensEmpresa.filter(
    (item) =>
      item.caminho !== '/' &&
      (!item.permissao || usuario?.permissoes.includes(item.permissao)),
  );
  return (
    <div className="pagina">
      <h1>Painel</h1>
      <p className="pagina__descricao">
        {usuario?.tipo === 'FUNCIONARIO'
          ? `Você entrou com o perfil ${usuario.perfil}.`
          : 'Tudo da sua empresa em um só lugar.'}
      </p>
      <div className="pagina__grade">
        {atalhos.map((item) => (
          <Cartao key={item.caminho} titulo={item.rotulo} subtitulo={item.descricao}>
            <Link to={item.caminho}>Abrir</Link>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
