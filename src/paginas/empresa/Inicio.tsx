import { useUsuario } from '../../sessao/useUsuario';
import { Painel } from '../Painel';
import { Hoje } from './Hoje';

/** Tela inicial da Enterprise: o dia da clínica para quem vê a agenda; atalhos para os demais. */
export function Inicio() {
  const usuario = useUsuario();
  const veAgenda = usuario?.tipo === 'EMPRESA' || usuario?.permissoes.includes('agenda:ler');
  return veAgenda ? <Hoje /> : <Painel />;
}
