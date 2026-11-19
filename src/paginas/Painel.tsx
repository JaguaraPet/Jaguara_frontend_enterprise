import { useNavigate } from 'react-router';
import { sessao } from '../api/sessao';
import { Botao } from '../componentes';
import { useUsuario } from '../sessao/useUsuario';

/** Painel inicial da empresa. O layout com menu lateral vem na JAG-137. */
export function Painel() {
  const usuario = useUsuario();
  const navegar = useNavigate();
  return (
    <main className="inicio">
      <h1>Painel</h1>
      <p>Você entrou com o perfil {usuario?.perfil}.</p>
      <Botao
        variante="secundaria"
        onClick={() => void sessao.sair().then(() => navegar('/entrar'))}
      >
        Sair
      </Botao>
    </main>
  );
}
